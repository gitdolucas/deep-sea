import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { MapDocument } from "../game/map-types.js";
import type { BubbleColumnFxEvent } from "../game/bubble-column-fx-events.js";
import type { BubbleProjectileState } from "../game/bubble-projectiles.js";
import { spawnBubbleVolley } from "../game/bubble-projectiles.js";
import type { CannonProjectileState } from "../game/cannon-projectiles.js";
import type { EnemyTypeKey, GridPos } from "../game/types.js";
import { validateMapDocument } from "../game/map-validation.js";
import {
  buildMapBoard,
  createMapGroundFog,
  createPathCellMesh,
  type PathCellMaterialKey,
  worldFromGrid,
  worldGroundGridSpan,
} from "./board.js";
import { buildDecorationsGroup } from "./decorations.js";
import { createSeabedOverlay } from "./seabed-overlay.js";
import { COLORS } from "./constants.js";
import {
  createDefenseTowerMesh,
  syncVibrationZoneDomeForDefense,
} from "./defense-tower-visuals.js";
import type { EntitySpriteAtlas } from "./entity-sprite-atlas.js";
import { syncInkVeilAuraForDefense } from "./ink-veil-aura.js";
import { createEnemyVisual } from "./enemy-visuals.js";
import {
  ensureBubbleProjectilePool,
  spawnBubblePopRings,
  syncBubbleProjectileMeshes,
  updateBubblePopRings,
  type BubblePopRing,
} from "./bubble-attack-fx.js";
import { getBubbleAttackFxTuning } from "./bubble-attack-fx-tuning.js";
import {
  spawnBubbleColumns,
  updateBubbleColumns,
  type ActiveBubbleColumn,
} from "./bubble-column-fx.js";
import {
  ensureCannonProjectilePool,
  spawnCannonBlastDecals,
  syncCannonProjectileMeshes,
  updateCannonBlastDecals,
  type CannonBlastDecal,
} from "./cannon-attack-fx.js";
import {
  spawnCannonColumnHits,
  updateCannonColumnHits,
  type CannonColumnHitFx,
} from "./cannon-column-hit-fx.js";
import { createArcSpineLightningLine } from "./arc-spine-chain-fx.js";
import {
  ARC_SPINE_SPARKLE_BURST_DURATION_SEC,
  spawnArcSpineHitSparkles,
  updateArcSpineHitSparkles,
  type ArcSpineHitSparkleBurst,
} from "./arc-spine-hit-sparkles.js";
import {
  alignTideheartLaserMesh,
  beamWidthForTideheartLevel,
  createTideheartLaserBeam,
} from "./tideheart-laser-beam-fx.js";
import { getVibrationDomeTuning } from "./vibration-dome-tuning.js";
import { registerVisualShowcaseRuntime } from "./visual-showcase-runtime.js";
import { getShowcaseFxLoopSeconds } from "./visual-showcase-tuning.js";

const SCENE_GRID_VISUAL_Y = 0.02;

type BarBillboard = {
  group: THREE.Group;
  fill: THREE.Mesh;
  setFillRatio: (ratio: number) => void;
};

function makeBarBillboard(
  width: number,
  height: number,
  bgColor: number,
  fillColor: number,
): BarBillboard {
  const group = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 0.02, height + 0.02),
    new THREE.MeshBasicMaterial({
      color: bgColor,
      side: THREE.DoubleSide,
      depthTest: true,
      transparent: true,
      opacity: 0.94,
    }),
  );
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      color: fillColor,
      side: THREE.DoubleSide,
      depthTest: true,
      transparent: true,
      opacity: 1,
    }),
  );
  fill.position.z = 0.003;
  group.add(bg);
  group.add(fill);
  const half = width / 2;
  return {
    group,
    fill,
    setFillRatio(ratio: number) {
      const r = Math.max(0, Math.min(1, ratio));
      fill.scale.x = r <= 0 ? 1e-6 : r;
      fill.position.x = half * (r - 1);
    },
  };
}

function disposeObject3DTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (
      obj instanceof THREE.Mesh ||
      obj instanceof THREE.Line ||
      obj instanceof THREE.Points
    ) {
      obj.geometry.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else (mat as THREE.Material).dispose();
    }
  });
}

const ENEMY_TYPES: readonly EnemyTypeKey[] = [
  "stoneclaw",
  "razoreel",
  "abyssal_colossus",
];

const PATH_GALLERY_KINDS: readonly PathCellMaterialKey[] = [
  "empty",
  "straight",
  "corner",
  "end",
  "tee",
  "cross",
];

/** Bubble Shotgun showcase: L1 volley from tower → aim; matches impact column offset in `bubble-projectiles`. */
const BUBBLE_SHOTGUN_TOWER: GridPos = [17, 8];
const BUBBLE_SHOTGUN_AIM: GridPos = [23, 8];
const BUBBLE_SHOTGUN_FLIGHT_END_TICK = 0.55;
const BUBBLE_COLUMN_VEL_TILES = 0.4;

/**
 * Renders the full game scene (board, defenses, enemies, FX samples) without `GameSession.tick()`.
 * Global FX progression is driven by `fxTick` in [0, 1] (slider), not wall-clock time.
 */
export class VisualShowcaseApp {
  private readonly doc: MapDocument;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly mount: HTMLElement;
  /** Single scrub control for all VFX / shader time (0 = start of loop, 1 = end). */
  /** Default highlights Bubble Shotgun mid-flight (volley visible before impact at ~0.55). */
  private fxTick = 0.18;
  private readonly orbitControls: OrbitControls;
  private readonly seabedMat: THREE.ShaderMaterial;
  private readonly abortController = new AbortController();
  private readonly bubbleProjectileGroup = new THREE.Group();
  private readonly bubbleColumnGroup = new THREE.Group();
  private bubbleProjectilePool: THREE.Points[] = [];
  private bubbleColumnActive: ActiveBubbleColumn[] = [];
  private bubbleColumnFreePool: THREE.Points[] = [];
  private bubblePopRings: BubblePopRing[] = [];
  private readonly bubbleShotgunBase: readonly BubbleProjectileState[];
  private readonly bubbleShotgunFlightDist: number;
  private readonly cannonProjectileGroup = new THREE.Group();
  private cannonProjectilePool: THREE.Mesh[] = [];
  private cannonBlastDecals: CannonBlastDecal[] = [];
  private readonly cannonColumnGroup = new THREE.Group();
  private cannonColumnHits: CannonColumnHitFx[] = [];
  private readonly chainLines: {
    obj: THREE.Mesh;
    mat: THREE.ShaderMaterial;
  }[] = [];
  private readonly tideheartBeams: {
    obj: THREE.Mesh;
    mat: THREE.ShaderMaterial;
    start: THREE.Vector3;
    end: THREE.Vector3;
    width: number;
  }[] = [];
  private arcSpineSparkles: ArcSpineHitSparkleBurst[] = [];
  private enemyBars: THREE.Group[] = [];
  private readonly entitySpriteAtlas: EntitySpriteAtlas | null;
  private defenseRoots = new Map<
    string,
    {
      root: THREE.Group;
      tower: THREE.Mesh | THREE.Sprite;
      bar: BarBillboard;
      vibrationDome?: THREE.Group;
      vibrationDomeKey?: string;
      inkVeilAura?: THREE.Group;
      inkVeilAuraKey?: string;
    }
  >();

  constructor(
    doc: MapDocument,
    mount: HTMLElement,
    entitySpriteAtlas?: EntitySpriteAtlas | null,
  ) {
    const issues = validateMapDocument(doc);
    if (issues.length > 0) {
      console.warn("Showcase map validation:", issues);
    }
    this.doc = doc;
    this.mount = mount;
    this.entitySpriteAtlas = entitySpriteAtlas ?? null;

    const aimDx = BUBBLE_SHOTGUN_AIM[0] - BUBBLE_SHOTGUN_TOWER[0];
    const aimDz = BUBBLE_SHOTGUN_AIM[1] - BUBBLE_SHOTGUN_TOWER[1];
    this.bubbleShotgunFlightDist = Math.max(0.2, Math.hypot(aimDx, aimDz));
    this.bubbleShotgunBase = spawnBubbleVolley(
      BUBBLE_SHOTGUN_TOWER,
      BUBBLE_SHOTGUN_AIM,
      1,
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.transmissionResolutionScale = 0.72;
    this.mount.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = createMapGroundFog(doc);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0).texture;
    pmrem.dispose();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(8, 18, 10);
    this.scene.add(sun);

    const { root: boardRoot } = buildMapBoard(doc);
    this.scene.add(boardRoot);
    this.scene.add(buildDecorationsGroup(doc));

    const gridSpan = worldGroundGridSpan(doc);
    const grid = new THREE.GridHelper(
      gridSpan,
      gridSpan,
      COLORS.gridMajor,
      COLORS.gridMinor,
    );
    grid.position.y = SCENE_GRID_VISUAL_Y;
    this.scene.add(grid);

    const seabed = createSeabedOverlay(doc);
    this.seabedMat = seabed.material;
    this.scene.add(seabed.mesh);

    this.scene.add(this.bubbleProjectileGroup);
    this.scene.add(this.bubbleColumnGroup);
    this.scene.add(this.cannonProjectileGroup);
    this.scene.add(this.cannonColumnGroup);

    this.wireFxTickControls();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
    this.camera.position.set(10, 16, 14);
    this.camera.lookAt(8, 0, 6);

    this.orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement,
    );
    this.orbitControls.target.set(8, 0, 6);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.enableRotate = false;
    this.orbitControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    this.orbitControls.touches.ONE = THREE.TOUCH.PAN;
    this.orbitControls.screenSpacePanning = true;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.06;
    this.orbitControls.minDistance = 4;
    this.orbitControls.maxDistance = 72;
    this.orbitControls.update();

    this.placePathCellGallery();
    this.placeDefensesFromMap();
    this.placeEnemies();
    this.setupFxSamples();

    const ac = { signal: this.abortController.signal };
    window.addEventListener("resize", () => this.onResize(), ac);
    window.visualViewport?.addEventListener("resize", () => this.onResize(), ac);

    registerVisualShowcaseRuntime({
      setFxTick: (v) => {
        this.fxTick = Math.max(0, Math.min(1, v));
      },
      getFxTick: () => this.fxTick,
      syncFxTickToDom: () => {
        this.syncFxTickToDom();
      },
      getSeabedMaterial: () => this.seabedMat,
    });

    this.renderer.setAnimationLoop(() => this.frame());
  }

  dispose(): void {
    registerVisualShowcaseRuntime(null);
    this.abortController.abort();
    this.renderer.setAnimationLoop(null);
    this.orbitControls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private getFxTimeSec(): number {
    return this.fxTick * getShowcaseFxLoopSeconds();
  }

  private syncFxTickToDom(): void {
    if (typeof document === "undefined") return;
    const input = document.getElementById(
      "showcaseFxTick",
    ) as HTMLInputElement | null;
    const valueOut = document.getElementById("showcaseFxTickValue");
    if (input) {
      input.value = String(this.fxTick);
      input.setAttribute("aria-valuenow", String(this.fxTick));
    }
    if (valueOut) valueOut.textContent = this.fxTick.toFixed(3);
  }

  private wireFxTickControls(): void {
    if (typeof document === "undefined") return;
    const input = document.getElementById(
      "showcaseFxTick",
    ) as HTMLInputElement | null;
    if (input) {
      const v = Number(input.value);
      if (Number.isFinite(v)) this.fxTick = Math.max(0, Math.min(1, v));
      this.syncFxTickToDom();
      input.addEventListener("input", () => {
        const n = Number(input.value);
        this.fxTick = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
        this.syncFxTickToDom();
      });
    }
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private placePathCellGallery(): void {
    const doc = this.doc;
    let gx = 1;
    const gz = 12;
    for (const kind of PATH_GALLERY_KINDS) {
      const mesh = createPathCellMesh(kind);
      const w = worldFromGrid(gx, gz, doc, 0);
      mesh.position.set(w.x, w.y + mesh.position.y, w.z);
      this.scene.add(mesh);
      gx += 2;
    }
  }

  private placeDefensesFromMap(): void {
    for (const d of this.doc.defenses) {
      const w = worldFromGrid(d.position[0], d.position[1], this.doc, 0.35);
      const root = new THREE.Group();
      const tower = createDefenseTowerMesh(
        d.id,
        d.type,
        this.entitySpriteAtlas,
      );
      root.add(tower);
      const bar = makeBarBillboard(
        0.44,
        0.062,
        COLORS.cooldownBarBg,
        COLORS.cooldownBarFill,
      );
      const barY =
        typeof tower.userData.cooldownBarLocalY === "number"
          ? tower.userData.cooldownBarLocalY
          : 0.44;
      bar.group.position.set(0, barY, 0);
      root.add(bar.group);
      bar.setFillRatio(0.35);
      root.position.set(w.x, w.y, w.z);
      this.scene.add(root);
      const vis = { root, tower, bar };
      this.defenseRoots.set(d.id, vis);
      syncVibrationZoneDomeForDefense(
        vis,
        d,
        this.doc,
        disposeObject3DTree,
        this.getFxTimeSec(),
      );
      syncInkVeilAuraForDefense(
        vis,
        d,
        this.doc,
        disposeObject3DTree,
        this.getFxTimeSec(),
      );
    }
  }

  private placeEnemies(): void {
    const positions: [number, number][] = [
      [4, 6],
      [8, 6],
      [12, 6],
    ];
    for (let i = 0; i < ENEMY_TYPES.length; i++) {
      const t = ENEMY_TYPES[i]!;
      const [gx, gz] = positions[i]!;
      const { root, hpBarY } = createEnemyVisual(
        t,
        this.entitySpriteAtlas,
      );
      const w = worldFromGrid(gx, gz, this.doc, 0);
      root.position.set(w.x, w.y, w.z);
      this.scene.add(root);
      const bar = makeBarBillboard(0.5, 0.07, 0x1a2230, 0x39ff6e);
      bar.group.position.set(0, hpBarY, 0);
      root.add(bar.group);
      bar.setFillRatio(0.75);
      this.enemyBars.push(bar.group);
    }
  }

  private setupFxSamples(): void {
    const doc = this.doc;

    const a = worldFromGrid(18, 14, doc, 0.6);
    const b = worldFromGrid(22, 14, doc, 0.6);
    const c = worldFromGrid(20, 14, doc, 0.6);
    const chain = createArcSpineLightningLine(
      [a, c, b],
      COLORS.chainLightningPrimary,
      COLORS.chainLightningBounce,
    );
    const chainMat = chain.material as THREE.ShaderMaterial;
    chainMat.uniforms.uFade.value = 1;
    this.scene.add(chain);
    this.chainLines.push({ obj: chain, mat: chainMat });

    const thStart = worldFromGrid(18, 10, doc, 0.6);
    const thEnd = worldFromGrid(24, 10, doc, 0.6);
    const beam = createTideheartLaserBeam(
      thStart,
      thEnd,
      2,
      this.camera,
    );
    const beamMat = beam.material as THREE.ShaderMaterial;
    beamMat.uniforms.uFade.value = 1;
    this.scene.add(beam);
    this.tideheartBeams.push({
      obj: beam,
      mat: beamMat,
      start: thStart.clone(),
      end: thEnd.clone(),
      width: beamWidthForTideheartLevel(2),
    });

    ensureBubbleProjectilePool(
      this.bubbleProjectileGroup,
      this.bubbleProjectilePool,
      this.bubbleShotgunBase.length,
    );
    syncBubbleProjectileMeshes(
      this.bubbleProjectilePool,
      this.buildBubbleShotgunProjectiles(),
      doc,
      this.getFxTimeSec(),
    );

    const sdx = BUBBLE_SHOTGUN_AIM[0] - BUBBLE_SHOTGUN_TOWER[0];
    const sdz = BUBBLE_SHOTGUN_AIM[1] - BUBBLE_SHOTGUN_TOWER[1];
    const slen = Math.hypot(sdx, sdz) || 1;
    const sux = sdx / slen;
    const suz = sdz / slen;
    const bubbleColumnEvent: BubbleColumnFxEvent = {
      preset: "bubble_shotgun_impact",
      seed: 0x5f356495,
      from: [BUBBLE_SHOTGUN_AIM[0], BUBBLE_SHOTGUN_AIM[1]],
      to: [
        BUBBLE_SHOTGUN_AIM[0] + sux * BUBBLE_COLUMN_VEL_TILES,
        BUBBLE_SHOTGUN_AIM[1] + suz * BUBBLE_COLUMN_VEL_TILES,
      ],
      axis: "segment",
      splash: false,
    };
    spawnBubbleColumns(
      [bubbleColumnEvent],
      doc,
      this.bubbleColumnGroup,
      this.bubbleColumnActive,
      this.bubbleColumnFreePool,
    );
    spawnBubblePopRings(
      [
        {
          gx: BUBBLE_SHOTGUN_AIM[0],
          gz: BUBBLE_SHOTGUN_AIM[1],
          splash: false,
        },
      ],
      doc,
      this.scene,
      this.bubblePopRings,
    );

    const cannonSamples: CannonProjectileState[] = [
      {
        gx: 24,
        gz: 8,
        vgx: 0,
        vgz: 1,
        defenseId: "showcase_current_cannon",
        targetEnemyId: "showcase_dummy",
        level: 2,
        traveled: 1.4,
        timeAlive: 0.9,
        flightLengthProgress: 0.68,
      },
    ];
    ensureCannonProjectilePool(
      this.cannonProjectileGroup,
      this.cannonProjectilePool,
      cannonSamples.length,
    );
    syncCannonProjectileMeshes(
      this.cannonProjectilePool,
      cannonSamples,
      doc,
      this.getFxTimeSec(),
    );

    spawnCannonBlastDecals(
      [{ gx: 16, gz: 10, radiusTiles: 2.2 }],
      doc,
      this.scene,
      this.cannonBlastDecals,
    );
    spawnCannonColumnHits(
      [{ gx: 14, gz: 10, fromGx: 14, fromGz: 4 }],
      doc,
      this.cannonColumnGroup,
      this.cannonColumnHits,
      this.getFxTimeSec(),
    );

    spawnArcSpineHitSparkles(
      20,
      12,
      doc,
      this.scene,
      this.arcSpineSparkles,
      1,
    );
  }

  private buildBubbleShotgunProjectiles(): BubbleProjectileState[] {
    const tick = this.fxTick;
    if (tick > BUBBLE_SHOTGUN_FLIGHT_END_TICK) {
      return [];
    }
    const flightT = Math.min(1, tick / BUBBLE_SHOTGUN_FLIGHT_END_TICK);
    const dist = this.bubbleShotgunFlightDist * flightT;
    const sx = BUBBLE_SHOTGUN_TOWER[0];
    const sz = BUBBLE_SHOTGUN_TOWER[1];
    return this.bubbleShotgunBase.map((p) => ({
      ...p,
      traveled: dist,
      gx: sx + p.vgx * dist,
      gz: sz + p.vgz * dist,
    }));
  }

  private bubbleShotgunImpactU(): number {
    return Math.max(
      0,
      (this.fxTick - BUBBLE_SHOTGUN_FLIGHT_END_TICK) /
        (1 - BUBBLE_SHOTGUN_FLIGHT_END_TICK),
    );
  }

  private frame(): void {
    const t = this.getFxTimeSec();

    this.seabedMat.uniforms.uTime.value = t;

    for (const c of this.chainLines) {
      c.mat.uniforms.uTime.value = t;
      c.mat.uniforms.uFade.value = 1;
    }

    for (const b of this.tideheartBeams) {
      b.mat.uniforms.uTime.value = t;
      b.mat.uniforms.uFade.value = 1;
      alignTideheartLaserMesh(
        b.obj,
        b.start,
        b.end,
        b.width,
        this.camera,
      );
    }

    syncBubbleProjectileMeshes(
      this.bubbleProjectilePool,
      this.buildBubbleShotgunProjectiles(),
      this.doc,
      t,
    );

    const bubbleImpactU = this.bubbleShotgunImpactU();
    const popDur = getBubbleAttackFxTuning().popDuration;
    for (const a of this.bubbleColumnActive) {
      const showColumn = bubbleImpactU > 0.02;
      a.points.visible = showColumn;
      a.age = bubbleImpactU * a.duration * 0.999;
    }
    updateBubbleColumns(
      this.bubbleColumnGroup,
      this.bubbleColumnActive,
      this.bubbleColumnFreePool,
      0,
      t,
    );
    for (const r of this.bubblePopRings) {
      r.age = bubbleImpactU * popDur * 0.999;
      r.mesh.visible = bubbleImpactU > 0.001;
    }
    updateBubblePopRings(this.bubblePopRings, 0, this.scene);

    const cannonSamples: CannonProjectileState[] = [
      {
        gx: 24,
        gz: 8,
        vgx: 0,
        vgz: 1,
        defenseId: "showcase_current_cannon",
        targetEnemyId: "showcase_dummy",
        level: 2,
        traveled: 1.4 + Math.sin(t * 1.8) * 0.04,
        timeAlive: 0.9,
        flightLengthProgress: 0.55 + this.fxTick * 0.25,
      },
    ];
    syncCannonProjectileMeshes(
      this.cannonProjectilePool,
      cannonSamples,
      this.doc,
      t,
    );

    for (const d of this.cannonBlastDecals) {
      d.age = this.fxTick * d.duration * 0.999;
    }
    updateCannonBlastDecals(this.cannonBlastDecals, 0, this.scene, t);

    for (const x of this.cannonColumnHits) {
      x.age = this.fxTick * x.duration * 0.999;
    }
    updateCannonColumnHits(
      this.cannonColumnHits,
      0,
      this.cannonColumnGroup,
      t,
    );

    for (const b of this.arcSpineSparkles) {
      b.t = Math.max(
        1e-6,
        (1 - this.fxTick) * ARC_SPINE_SPARKLE_BURST_DURATION_SEC,
      );
    }
    updateArcSpineHitSparkles(this.arcSpineSparkles, 0, this.scene);

    for (const g of this.enemyBars) {
      g.quaternion.copy(this.camera.quaternion);
    }
    for (const d of this.doc.defenses) {
      const vis = this.defenseRoots.get(d.id);
      if (!vis) continue;
      vis.bar.group.quaternion.copy(this.camera.quaternion);
      if (vis.tower.userData.entitySprite === true) {
        const mat = vis.tower.material as THREE.SpriteMaterial;
        mat.color.setRGB(1, 1, 1);
      } else {
        const mat = vis.tower.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.22;
      }
      syncVibrationZoneDomeForDefense(vis, d, this.doc, disposeObject3DTree, t);
      syncInkVeilAuraForDefense(vis, d, this.doc, disposeObject3DTree, t);
    }

    this.orbitControls.update();
    this.renderer.transmissionResolutionScale =
      getVibrationDomeTuning().transmissionResolutionScale;
    this.renderer.render(this.scene, this.camera);
  }
}
