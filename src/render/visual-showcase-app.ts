import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { MapDocument } from "../game/map-types.js";
import type { BubbleProjectileState } from "../game/bubble-projectiles.js";
import type { CannonProjectileState } from "../game/cannon-projectiles.js";
import type { EnemyTypeKey } from "../game/types.js";
import { validateMapDocument } from "../game/map-validation.js";
import {
  buildMapBoard,
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
import { createEnemyVisual } from "./enemy-visuals.js";
import {
  ensureBubbleProjectilePool,
  syncBubbleProjectileMeshes,
} from "./bubble-attack-fx.js";
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
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
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
  "junction",
];

/**
 * Renders the full game scene (board, defenses, enemies, FX samples) without `GameSession.tick()`.
 */
export class VisualShowcaseApp {
  private readonly doc: MapDocument;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly timer = new THREE.Timer();
  private readonly mount: HTMLElement;
  private readonly orbitControls: OrbitControls;
  private readonly seabedMat: THREE.ShaderMaterial;
  private readonly abortController = new AbortController();
  private readonly bubbleProjectileGroup = new THREE.Group();
  private bubbleProjectilePool: THREE.Points[] = [];
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
  private lastBlastRespawn = 0;
  private lastColumnRespawn = 0;
  private lastSparkleRespawn = 0;
  private enemyBars: THREE.Group[] = [];
  private defenseRoots = new Map<
    string,
    {
      root: THREE.Group;
      tower: THREE.Mesh;
      bar: BarBillboard;
      vibrationDome?: THREE.Mesh;
      vibrationDomeKey?: string;
    }
  >();

  constructor(doc: MapDocument, mount: HTMLElement) {
    const issues = validateMapDocument(doc);
    if (issues.length > 0) {
      console.warn("Showcase map validation:", issues);
    }
    this.doc = doc;
    this.mount = mount;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.transmissionResolutionScale = 0.72;
    this.mount.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(COLORS.background);
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
    this.scene.add(this.cannonProjectileGroup);
    this.scene.add(this.cannonColumnGroup);

    if (typeof document !== "undefined") {
      this.timer.connect(document);
    }

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

    this.timer.update();
    this.placePathCellGallery();
    this.placeDefensesFromMap();
    this.placeEnemies();
    this.setupFxSamples();

    const ac = { signal: this.abortController.signal };
    window.addEventListener("resize", () => this.onResize(), ac);
    window.visualViewport?.addEventListener("resize", () => this.onResize(), ac);

    this.renderer.setAnimationLoop(() => this.frame());
  }

  dispose(): void {
    this.abortController.abort();
    this.renderer.setAnimationLoop(null);
    this.orbitControls.dispose();
    this.timer.disconnect();
    this.timer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
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
      const tower = createDefenseTowerMesh(d.id, d.type);
      root.add(tower);
      const bar = makeBarBillboard(
        0.44,
        0.062,
        COLORS.cooldownBarBg,
        COLORS.cooldownBarFill,
      );
      bar.group.position.set(0, 0.44, 0);
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
        this.timer.getElapsed(),
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
      const { root, hpBarY } = createEnemyVisual(t);
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

    const bubbleSamples: BubbleProjectileState[] = [
      {
        gx: 20,
        gz: 8,
        vgx: 0.15,
        vgz: 0.95,
        directDamage: 4,
        splash: 0,
        traveled: 1.1,
        maxTravel: 8,
      },
      {
        gx: 21.2,
        gz: 8.3,
        vgx: -0.2,
        vgz: 0.88,
        directDamage: 4,
        splash: 0,
        traveled: 0.6,
        maxTravel: 8,
      },
    ];
    ensureBubbleProjectilePool(
      this.bubbleProjectileGroup,
      this.bubbleProjectilePool,
      bubbleSamples.length,
    );
    syncBubbleProjectileMeshes(
      this.bubbleProjectilePool,
      bubbleSamples,
      doc,
      this.timer.getElapsed(),
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
      this.timer.getElapsed(),
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
      this.timer.getElapsed(),
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

  private frame(): void {
    this.timer.update();
    const dt = this.timer.getDelta();
    const t = this.timer.getElapsed();

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

    const bubbleSamples: BubbleProjectileState[] = [
      {
        gx: 20,
        gz: 8,
        vgx: 0.15,
        vgz: 0.95,
        directDamage: 4,
        splash: 0,
        traveled: 1.1 + Math.sin(t * 0.7) * 0.08,
        maxTravel: 8,
      },
      {
        gx: 21.2,
        gz: 8.3,
        vgx: -0.2,
        vgz: 0.88,
        directDamage: 4,
        splash: 0,
        traveled: 0.6 + Math.cos(t * 0.9) * 0.06,
        maxTravel: 8,
      },
    ];
    syncBubbleProjectileMeshes(
      this.bubbleProjectilePool,
      bubbleSamples,
      this.doc,
      t,
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
        traveled: 1.4 + Math.sin(t * 0.5) * 0.04,
        timeAlive: 0.9,
        flightLengthProgress: 0.68,
      },
    ];
    syncCannonProjectileMeshes(
      this.cannonProjectilePool,
      cannonSamples,
      this.doc,
      t,
    );

    updateCannonBlastDecals(
      this.cannonBlastDecals,
      dt,
      this.scene,
      t,
    );
    if (this.cannonBlastDecals.length === 0 && t - this.lastBlastRespawn > 2.5) {
      this.lastBlastRespawn = t;
      spawnCannonBlastDecals(
        [{ gx: 16, gz: 10, radiusTiles: 2.2 }],
        this.doc,
        this.scene,
        this.cannonBlastDecals,
      );
    }

    updateCannonColumnHits(
      this.cannonColumnHits,
      dt,
      this.cannonColumnGroup,
      t,
    );
    if (this.cannonColumnHits.length === 0 && t - this.lastColumnRespawn > 3) {
      this.lastColumnRespawn = t;
      spawnCannonColumnHits(
        [{ gx: 14, gz: 10, fromGx: 14, fromGz: 4 }],
        this.doc,
        this.cannonColumnGroup,
        this.cannonColumnHits,
        t,
      );
    }

    updateArcSpineHitSparkles(this.arcSpineSparkles, dt, this.scene);
    if (
      this.arcSpineSparkles.length === 0 &&
      t - this.lastSparkleRespawn > 0.35
    ) {
      this.lastSparkleRespawn = t;
      spawnArcSpineHitSparkles(
        20,
        12,
        this.doc,
        this.scene,
        this.arcSpineSparkles,
        1,
      );
    }

    for (const g of this.enemyBars) {
      g.quaternion.copy(this.camera.quaternion);
    }
    for (const d of this.doc.defenses) {
      const vis = this.defenseRoots.get(d.id);
      if (!vis) continue;
      vis.bar.group.quaternion.copy(this.camera.quaternion);
      const mat = vis.tower.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.22;
      syncVibrationZoneDomeForDefense(
        vis,
        d,
        this.doc,
        disposeObject3DTree,
        t,
      );
    }

    this.orbitControls.update();
    this.renderer.transmissionResolutionScale =
      getVibrationDomeTuning().transmissionResolutionScale;
    this.renderer.render(this.scene, this.camera);
  }
}
