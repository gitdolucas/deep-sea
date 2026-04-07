import * as THREE from "three";
import Stats from "stats.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { MapDocument } from "../game/map-types.js";
import { GameSession, type DefenseMoveStep } from "../game/game-session.js";
import {
  DefenseController,
  arcSpineChainSearchRadius,
} from "../game/defense-controller.js";
import {
  attackRangeTiles,
  auraRadiusTiles,
  fireIntervalFor,
} from "../game/damage-resolver.js";
import {
  ARMORY_DEFENSE_ORDER,
  buildCostL1,
} from "../game/defense-build-costs.js";
import {
  ARMORY_CARD_PERK,
  ARMORY_DISPLAY_NAME,
} from "../game/defense-armory-meta.js";
import { salvageShellsForDefense } from "../game/defense-economy.js";
import { buildPlacedDefenseTooltipSpec } from "../game/placed-defense-tooltip.js";
import { hotbarIndexFromKey } from "../game/hotbar-key.js";
import type {
  DefenseLevel,
  DefenseSnapshot,
  DefenseTypeKey,
} from "../game/types.js";
import {
  buildMapBoard,
  createMapGroundFog,
  worldFromGrid,
  worldGroundGridSpan,
} from "./board.js";
import { syncVerticalBillboardMesh } from "./yaw-billboard.js";
import { buildDecorationsGroup } from "./decorations.js";
import { createSeabedOverlay } from "./seabed-overlay.js";
import {
  COLORS,
  CHAIN_FX_DURATION,
  DAMAGE_POP_DURATION_SEC,
  TIDEHEART_BEAM_FX_DURATION,
} from "./constants.js";
import {
  disposeBubbleAttackFxShared,
  ensureBubbleProjectilePool,
  spawnBubblePopRings,
  syncBubbleProjectileMeshes,
  updateBubblePopRings,
  type BubblePopRing,
} from "./bubble-attack-fx.js";
import {
  disposeBubbleColumnFx,
  spawnBubbleColumns,
  updateBubbleColumns,
  type ActiveBubbleColumn,
} from "./bubble-column-fx.js";
import {
  disposeCannonAttackFxShared,
  disposeCannonProjectilePool,
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
import { createEnemyVisual } from "./enemy-visuals.js";
import type { EntitySpriteAtlas } from "./entity-sprite-atlas.js";
import {
  createDefenseTowerMesh,
  syncVibrationZoneDomeForDefense,
} from "./defense-tower-visuals.js";
import { syncInkVeilAuraForDefense } from "./ink-veil-aura.js";
import { getVibrationDomeTuning } from "./vibration-dome-tuning.js";
import { GAMEPLAY_TIPS } from "./gameplay-tips.js";
import { mountDefenseCardIcon } from "./entity-sprite-dom.js";

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

/** Simulation time scale while defense focus UI is active (design: slow tactics). */
const DEFENSE_FOCUS_TICK_SCALE = 0.25;

/** User-selectable simulation speeds (real-time factor after focus scale). */
const SIM_TIME_SCALES = [0, 0.15, 0.25, 0.5, 1, 2, 5, 10] as const;
type SimTimeScale = (typeof SIM_TIME_SCALES)[number];

const SIM_TIME_SCALE_SET = new Set<number>(SIM_TIME_SCALES);

function isSimTimeScale(n: number): n is SimTimeScale {
  return SIM_TIME_SCALE_SET.has(n);
}

/** Vertical FOV multiplier while a defense is focused (narrower = zoom in). */
const DEFENSE_FOCUS_FOV_SCALE = 0.5;

/**
 * Exponential smoothing for orbit target + FOV when entering/leaving defense focus.
 * Larger = snappier (still smooth in/out).
 */
const DEFENSE_FOCUS_CAMERA_SMOOTH_RATE = 6.5;

/** World Y for look-at point on a tower (matches {@link GameApp.syncDefenses} root height). */
const DEFENSE_FOCUS_LOOK_AT_Y = 0.35;

/** Wired from main: post-mission navigation (overlay buttons). */
export type MissionEndNavigation = {
  retry: () => void;
  nextMap: () => void;
  menu: () => void;
  /** True when another level exists after the current map in the campaign list. */
  hasNextMap: boolean;
};

function makeRangeRingMesh(
  innerR: number,
  outerR: number,
  color: number,
  opacity: number,
): THREE.Mesh {
  const geom = new THREE.RingGeometry(innerR, outerR, 64);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** Slightly above floor meshes; origin matches {@link buildMapBoard} (map centered at world origin). */
const SCENE_GRID_VISUAL_Y = 0.02;

export class GameApp {
  readonly session: GameSession;
  private readonly doc: MapDocument;
  /** Default perspective FOV (degrees); halved while defense focus is active. */
  private readonly cameraFovBase = 50;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private clock = new THREE.Clock();
  /** Simulation time scale (0 = pause gameplay tick; visuals still run). */
  private simTimeScale: SimTimeScale = 1;
  private cellPickEntries: { mesh: THREE.Mesh; gx: number; gz: number }[] =
    [];
  private readonly rangePreviewGroup = new THREE.Group();
  /** Semi-transparent tile tint while placing (blue = legal + affordable, red = blocked or broke). */
  private readonly placementFootprintGroup = new THREE.Group();
  private readonly placementFootprintMesh: THREE.Mesh;
  /** Last hover validity for placement rings + footprint; avoids re-tinting every pointermove frame. */
  private placementHoverAllowed: boolean | null = null;
  /** Attack radius while hovering an existing tower (tile space, matches {@link attackRangeTiles}). */
  private readonly towerHoverRangeGroup = new THREE.Group();
  private towerHoverRangeCacheKey: string | null = null;
  private readonly selectionRangeGroup = new THREE.Group();
  private selectionRangeCacheKey: string | null = null;
  private selectedDefenseId: string | null = null;
  private placementType: DefenseTypeKey | null = null;
  private enemyObjects = new Map<
    string,
    { root: THREE.Group; bar: BarBillboard; spriteBillboard?: THREE.Mesh }
  >();
  private defenseObjects = new Map<
    string,
    {
      root: THREE.Group;
      tower: THREE.Mesh;
      bar: BarBillboard;
      vibrationDome?: THREE.Group;
      vibrationDomeKey?: string;
      inkVeilAura?: THREE.Group;
      inkVeilAuraKey?: string;
    }
  >();
  private chainLines: { obj: THREE.Mesh; t: number; mat: THREE.ShaderMaterial }[] =
    [];
  private arcSpineHitSparkles: ArcSpineHitSparkleBurst[] = [];
  private tideheartBeams: {
    obj: THREE.Mesh;
    t: number;
    mat: THREE.ShaderMaterial;
    start: THREE.Vector3;
    end: THREE.Vector3;
    width: number;
  }[] = [];
  private readonly bubbleProjectileGroup = new THREE.Group();
  private bubbleProjectilePool: THREE.Points[] = [];
  private bubblePopRings: BubblePopRing[] = [];
  private readonly bubbleColumnGroup = new THREE.Group();
  private bubbleColumnActive: ActiveBubbleColumn[] = [];
  private bubbleColumnFreePool: THREE.Points[] = [];
  private readonly cannonProjectileGroup = new THREE.Group();
  private cannonProjectilePool: THREE.Mesh[] = [];
  private cannonBlastDecals: CannonBlastDecal[] = [];
  private readonly cannonColumnGroup = new THREE.Group();
  private cannonColumnHits: CannonColumnHitFx[] = [];
  private readonly sceneGridHelper: THREE.GridHelper;
  private readonly seabedMat: THREE.ShaderMaterial;
  private nextDefenseId = 1;
  private readonly mount: HTMLElement;
  private readonly orbitControls: OrbitControls;
  private readonly abortController = new AbortController();
  private slotPointerStart: { x: number; y: number } | null = null;
  /** For shell stat row flash when balance changes. */
  private prevShells: number | null = null;
  private gameplayTipsTimer: ReturnType<typeof setInterval> | null = null;
  private gameplayTipIndex = 0;
  /** Orbit pivot when not focused on a defense (map center). */
  private readonly orbitRestTarget = new THREE.Vector3(0, 0, 0);
  private readonly tmpDefenseOrbitLookAt = new THREE.Vector3();
  /** 0 = map rest framing, 1 = defense focus (drives eased FOV + orbit pivot). */
  private defenseFocusViewBlend = 0;
  private readonly missionEndNav: MissionEndNavigation | null;
  private readonly stats: Stats;
  private readonly armoryOpenStorageKey = "deepSeaArmoryOpen";
  private armoryExpanded = true;
  private armoryGridBuilt = false;
  private armoryNarrowMql: MediaQueryList | null = null;
  /** Cached drawer UI key so we do not rebuild DOM every frame. */
  private defenseDrawerUiCache: string | null = null;
  private readonly entitySpriteAtlas: EntitySpriteAtlas | null;

  constructor(
    doc: MapDocument,
    mount?: HTMLElement,
    missionEndNav?: MissionEndNavigation | null,
    entitySpriteAtlas?: EntitySpriteAtlas | null,
  ) {
    this.doc = doc;
    this.session = new GameSession(doc);
    this.mount = mount ?? document.body;
    this.missionEndNav = missionEndNav ?? null;
    this.entitySpriteAtlas = entitySpriteAtlas ?? null;
    this.armoryNarrowMql = window.matchMedia("(max-width: 720px)");
    this.armoryExpanded = this.readArmoryExpandedInitial();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    /** Internal framebuffer for MeshPhysicalMaterial transmission (three manages RT size). */
    this.renderer.transmissionResolutionScale = 0.72;
    this.mount.appendChild(this.renderer.domElement);

    this.stats = new Stats();
    this.stats.dom.style.position = "fixed";
    this.stats.dom.style.left = "0";
    this.stats.dom.style.top = "0";
    this.stats.dom.style.zIndex = "10000";
    document.body.appendChild(this.stats.dom);

    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = createMapGroundFog(doc);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0).texture;
    pmrem.dispose();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(8, 18, 10);
    this.scene.add(sun);

    const { root, cells } = buildMapBoard(doc);
    this.scene.add(root);
    this.scene.add(buildDecorationsGroup(doc));
    this.cellPickEntries = cells;

    this.rangePreviewGroup.visible = false;
    this.scene.add(this.rangePreviewGroup);

    const fpGeom = new THREE.PlaneGeometry(0.92, 0.92);
    const fpMat = new THREE.MeshBasicMaterial({
      color: COLORS.placementPreviewAllowed,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.placementFootprintMesh = new THREE.Mesh(fpGeom, fpMat);
    this.placementFootprintMesh.rotation.x = -Math.PI / 2;
    this.placementFootprintGroup.add(this.placementFootprintMesh);
    this.placementFootprintGroup.visible = false;
    this.scene.add(this.placementFootprintGroup);

    this.towerHoverRangeGroup.visible = false;
    this.scene.add(this.towerHoverRangeGroup);

    this.selectionRangeGroup.visible = false;
    this.scene.add(this.selectionRangeGroup);

    const gridSpan = worldGroundGridSpan(doc);
    this.sceneGridHelper = new THREE.GridHelper(
      gridSpan,
      gridSpan,
      COLORS.gridMajor,
      COLORS.gridMinor,
    );
    this.sceneGridHelper.position.y = SCENE_GRID_VISUAL_Y;
    this.scene.add(this.sceneGridHelper);

    const seabed = createSeabedOverlay(doc);
    this.seabedMat = seabed.material;
    this.scene.add(seabed.mesh);

    this.scene.add(this.bubbleProjectileGroup);
    this.scene.add(this.bubbleColumnGroup);
    this.scene.add(this.cannonProjectileGroup);
    this.scene.add(this.cannonColumnGroup);

    const w0 = window.innerWidth;
    const h0 = window.innerHeight;
    const aspect0 = w0 / h0;
    this.camera = new THREE.PerspectiveCamera(
      this.cameraFovBase,
      aspect0,
      0.1,
      200,
    );
    this.camera.position.set(6, 14, 12);
    this.camera.lookAt(0, 0, 0);

    this.orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement,
    );
    this.orbitControls.target.set(0, 0, 0);
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
    this.syncOrbitWithPlacement();

    const ac = { signal: this.abortController.signal };
    this.renderer.domElement.addEventListener(
      "contextmenu",
      (ev) => ev.preventDefault(),
      ac,
    );
    window.addEventListener("resize", () => this.onResize(), ac);
    window.addEventListener(
      "orientationchange",
      () => window.setTimeout(() => this.onResize(), 150),
      ac,
    );
    window.visualViewport?.addEventListener(
      "resize",
      () => this.onResize(),
      ac,
    );
    this.renderer.domElement.addEventListener(
      "pointerdown",
      (ev) => this.onSlotPointerDown(ev),
      ac,
    );
    this.renderer.domElement.addEventListener(
      "pointermove",
      (ev) => this.onCanvasPointerMove(ev),
      ac,
    );
    this.renderer.domElement.addEventListener(
      "pointerleave",
      () => {
        this.hideTowerHoverTip();
        if (this.placementType !== null) {
          this.rangePreviewGroup.visible = false;
          this.placementFootprintGroup.visible = false;
          this.placementHoverAllowed = null;
        }
      },
      ac,
    );
    window.addEventListener("pointerup", (ev) => this.onSlotPointerUp(ev), ac);
    window.addEventListener(
      "pointercancel",
      () => {
        this.slotPointerStart = null;
      },
      ac,
    );
    window.addEventListener("keydown", (ev) => this.onKeyDown(ev), ac);
    document.getElementById("sendWave")?.addEventListener(
      "click",
      () => this.onSendWave(),
      ac,
    );
    document.getElementById("hudSpeed")?.addEventListener(
      "change",
      (ev) => {
        const sel = ev.target as HTMLSelectElement;
        const v = Number(sel.value);
        if (isSimTimeScale(v)) this.setSimTimeScale(v);
        else this.syncHudSpeedControl();
      },
      ac,
    );
    document.getElementById("gameplayTipsPrev")?.addEventListener(
      "click",
      (ev) => {
        ev.preventDefault();
        this.stepGameplayTip(-1);
      },
      ac,
    );
    document.getElementById("gameplayTipsNext")?.addEventListener(
      "click",
      (ev) => {
        ev.preventDefault();
        this.stepGameplayTip(1);
      },
      ac,
    );
    if (missionEndNav) {
      document.getElementById("overlayBtnNext")?.addEventListener(
        "click",
        () => missionEndNav.nextMap(),
        ac,
      );
      document.getElementById("overlayBtnRetry")?.addEventListener(
        "click",
        () => missionEndNav.retry(),
        ac,
      );
      document.getElementById("overlayBtnMenu")?.addEventListener(
        "click",
        () => missionEndNav.menu(),
        ac,
      );
    }

    this.ensureDefenseInventoryGrid();
    this.applyArmoryExpandedUi();
    document.getElementById("btnDefensesToggle")?.addEventListener(
      "click",
      () => this.toggleArmoryExpanded(),
      ac,
    );
    document.getElementById("invCancel")?.addEventListener(
      "click",
      () => this.clearPlacementMode(),
      ac,
    );
    document.getElementById("defenseDetailBackdrop")?.addEventListener(
      "click",
      () => this.clearSelection(),
      ac,
    );
    document.getElementById("defenseDetailDismiss")?.addEventListener(
      "click",
      () => this.clearSelection(),
      ac,
    );
    document.getElementById("defenseDetailTargeting")?.addEventListener(
      "click",
      () => this.onDefenseDetailTargeting(),
      ac,
    );
    document.getElementById("defenseDetailUpgrade")?.addEventListener(
      "click",
      () => this.onDefenseDetailUpgrade(),
      ac,
    );
    document.getElementById("defenseDetailSalvage")?.addEventListener(
      "click",
      () => this.onDefenseDetailSalvage(),
      ac,
    );
    for (const btn of document.querySelectorAll("[data-dpad]")) {
      btn.addEventListener(
        "click",
        (ev) => {
          const step = (ev.currentTarget as HTMLElement).dataset
            .dpad as DefenseMoveStep;
          this.onDefenseDetailDpad(step);
        },
        ac,
      );
    }

    this.syncHudSpeedControl();
    this.refreshInventoryUi();
  }

  start(): void {
    this.clock.start();
    this.stopGameplayTips();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /**
   * Stop the render loop, release WebGL and Three.js resources, and remove listeners.
   */
  dispose(): void {
    this.stopGameplayTips();
    this.abortController.abort();
    this.renderer.setAnimationLoop(null);
    this.stats.dom.remove();
    this.orbitControls.dispose();
    this.scene.remove(this.sceneGridHelper);
    disposeObject3DTree(this.sceneGridHelper);
    for (const c of this.chainLines) {
      this.scene.remove(c.obj);
      c.obj.geometry.dispose();
      c.mat.dispose();
    }
    this.chainLines = [];
    for (const s of this.arcSpineHitSparkles) {
      this.scene.remove(s.obj);
      s.geo.dispose();
      s.mat.dispose();
    }
    this.arcSpineHitSparkles = [];
    for (const b of this.tideheartBeams) {
      this.scene.remove(b.obj);
      b.obj.geometry.dispose();
      b.mat.dispose();
    }
    this.tideheartBeams = [];
    for (const r of this.bubblePopRings) {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
    }
    this.bubblePopRings.length = 0;
    this.scene.remove(this.bubbleProjectileGroup);
    for (const m of this.bubbleProjectilePool) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.bubbleProjectilePool.length = 0;
    disposeBubbleAttackFxShared();
    disposeBubbleColumnFx(
      this.bubbleColumnGroup,
      this.bubbleColumnActive,
      this.bubbleColumnFreePool,
    );
    this.scene.remove(this.bubbleColumnGroup);
    this.scene.remove(this.cannonProjectileGroup);
    disposeCannonProjectilePool(this.cannonProjectilePool);
    this.cannonProjectilePool.length = 0;
    for (let i = this.cannonColumnHits.length - 1; i >= 0; i--) {
      const c = this.cannonColumnHits[i]!;
      this.cannonColumnGroup.remove(c.mesh);
      c.mesh.geometry.dispose();
      c.mat.dispose();
    }
    this.cannonColumnHits.length = 0;
    this.scene.remove(this.cannonColumnGroup);
    for (let i = this.cannonBlastDecals.length - 1; i >= 0; i--) {
      const d = this.cannonBlastDecals[i]!;
      this.scene.remove(d.mesh);
      d.mesh.geometry.dispose();
      d.mat.dispose();
    }
    this.cannonBlastDecals.length = 0;
    disposeCannonAttackFxShared();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else (mat as THREE.Material | undefined)?.dispose?.();
      } else if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    this.enemyObjects.clear();
    this.defenseObjects.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.mount) {
      this.mount.removeChild(this.renderer.domElement);
    }
  }

  private startGameplayTips(): void {
    this.stopGameplayTips();
    const wrap = document.getElementById("gameplayTips");
    if (!wrap) return;
    wrap.removeAttribute("hidden");
    this.gameplayTipIndex = Math.floor(Math.random() * GAMEPLAY_TIPS.length);
    this.renderGameplayTip();
    this.restartGameplayTipsAutoAdvance();
  }

  private stopGameplayTips(): void {
    if (this.gameplayTipsTimer !== null) {
      clearInterval(this.gameplayTipsTimer);
      this.gameplayTipsTimer = null;
    }
    document.getElementById("gameplayTips")?.setAttribute("hidden", "");
  }

  private renderGameplayTip(): void {
    const text = document.getElementById("gameplayTipsText");
    const meta = document.getElementById("gameplayTipsMeta");
    const n = GAMEPLAY_TIPS.length;
    const idx =
      ((this.gameplayTipIndex % n) + n) % n;
    if (text) text.textContent = GAMEPLAY_TIPS[idx];
    if (meta)
      meta.textContent = `${idx + 1} / ${n}`;
  }

  private restartGameplayTipsAutoAdvance(): void {
    if (this.gameplayTipsTimer !== null) {
      clearInterval(this.gameplayTipsTimer);
    }
    const TIP_SEC = 13;
    this.gameplayTipsTimer = window.setInterval(() => {
      this.gameplayTipIndex++;
      this.renderGameplayTip();
    }, TIP_SEC * 1000);
  }

  private stepGameplayTip(delta: number): void {
    const wrap = document.getElementById("gameplayTips");
    if (!wrap || wrap.hasAttribute("hidden")) return;
    const n = GAMEPLAY_TIPS.length;
    this.gameplayTipIndex = (this.gameplayTipIndex + delta + n) % n;
    this.renderGameplayTip();
    this.restartGameplayTipsAutoAdvance();
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private onKeyDown(ev: KeyboardEvent): void {
    if (ev.key === "Escape") {
      if (this.placementType !== null) {
        this.clearPlacementMode();
      } else {
        this.clearSelection();
      }
      return;
    }
    if (ev.repeat) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (this.session.getOutcome() !== "playing") return;

    const idx = hotbarIndexFromKey(ev.key);
    if (idx === null || idx >= ARMORY_DEFENSE_ORDER.length) return;
    this.onArmoryDefenseClick(ARMORY_DEFENSE_ORDER[idx]!);
  }

  private onArmoryDefenseClick(type: DefenseTypeKey): void {
    if (this.session.getOutcome() !== "playing") return;
    if (this.placementType === type) {
      this.clearPlacementMode();
      return;
    }
    this.clearSelection();
    this.placementType = type;
    this.placementHoverAllowed = null;
    this.rebuildPlacementRangeRings();
    this.syncOrbitWithPlacement();
    this.refreshInventoryUi();
  }

  private clearPlacementMode(): void {
    this.placementType = null;
    this.placementHoverAllowed = null;
    this.rangePreviewGroup.visible = false;
    this.placementFootprintGroup.visible = false;
    this.rebuildPlacementRangeRings();
    this.syncOrbitWithPlacement();
    this.refreshInventoryUi();
  }

  /**
   * Mutates ring materials already built for {@link rangePreviewGroup} (primary then optional chain).
   */
  private applyPlacementRangeRingTint(allowed: boolean): void {
    const primary = allowed
      ? COLORS.rangePreviewPrimary
      : COLORS.placementPreviewBlocked;
    const chain = allowed ? COLORS.rangePreviewChain : 0xff8066;
    const primaryOp = allowed ? 0.45 : 0.36;
    const chainOp = allowed ? 0.35 : 0.28;
    let i = 0;
    for (const c of this.rangePreviewGroup.children) {
      if (!(c instanceof THREE.Mesh)) continue;
      const mat = c.material as THREE.MeshBasicMaterial;
      if (this.placementType === "arc_spine" && i === 1) {
        mat.color.setHex(chain);
        mat.opacity = chainOp;
      } else {
        mat.color.setHex(primary);
        mat.opacity = primaryOp;
      }
      i++;
    }
  }

  private readArmoryExpandedInitial(): boolean {
    try {
      const v = localStorage.getItem(this.armoryOpenStorageKey);
      if (v === "1") return true;
      if (v === "0") return false;
    } catch {
      /* ignore */
    }
    return !this.armoryNarrowMql?.matches;
  }

  private persistArmoryExpanded(): void {
    try {
      localStorage.setItem(
        this.armoryOpenStorageKey,
        this.armoryExpanded ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }

  private toggleArmoryExpanded(): void {
    this.armoryExpanded = !this.armoryExpanded;
    this.persistArmoryExpanded();
    this.applyArmoryExpandedUi();
  }

  private applyArmoryExpandedUi(): void {
    const rail = document.getElementById("hudRightRail");
    const btn = document.getElementById(
      "btnDefensesToggle",
    ) as HTMLButtonElement | null;
    rail?.classList.toggle("hud-right-rail--armory-collapsed", !this.armoryExpanded);
    if (btn) {
      btn.setAttribute("aria-expanded", this.armoryExpanded ? "true" : "false");
    }
  }

  private ensureDefenseInventoryGrid(): void {
    if (this.armoryGridBuilt) return;
    const grid = document.getElementById("defenseInventoryGrid");
    if (!grid) return;
    grid.replaceChildren();
    ARMORY_DEFENSE_ORDER.forEach((type, index) => {
      const hotkey = String(index + 1);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "listitem");
      btn.className =
        "pick defense-inventory__btn defense-card--inventory defense-card--affordable";
      btn.dataset.defenseCard = type;
      btn.dataset.defense = type;
      const key = document.createElement("span");
      key.className = "defense-inventory__key";
      key.textContent = hotkey;
      key.setAttribute("aria-hidden", "true");
      const thumb = document.createElement("span");
      thumb.className = "defense-inventory__thumb";
      mountDefenseCardIcon(thumb, type, 64, 64);
      const invSvg = thumb.querySelector(".defense-focus-card__icon-svg");
      if (invSvg) {
        invSvg.classList.remove("defense-focus-card__icon-svg");
        invSvg.classList.add("defense-inventory__icon-svg");
      }
      const textWrap = document.createElement("div");
      textWrap.className = "defense-inventory__text";
      const titleEl = document.createElement("span");
      titleEl.className = "defense-inventory__title";
      titleEl.textContent = ARMORY_DISPLAY_NAME[type];
      const perkEl = document.createElement("span");
      perkEl.className = "defense-inventory__perk";
      perkEl.textContent = ARMORY_CARD_PERK[type];
      const costWrap = document.createElement("span");
      costWrap.className = "defense-inventory__cost";
      const costNum = document.createElement("strong");
      costNum.dataset.defenseCost = "";
      const costUnit = document.createElement("span");
      costUnit.className = "defense-inventory__cost-unit";
      costUnit.textContent = "shells";
      costWrap.append(costNum, costUnit);
      textWrap.append(titleEl, perkEl, costWrap);
      btn.append(key, thumb, textWrap);
      btn.addEventListener("click", () => this.onArmoryDefenseClick(type));
      grid.append(btn);
    });
    this.armoryGridBuilt = true;
  }

  private syncDefenseDetailDrawerDom(snap: DefenseSnapshot | null): void {
    const backdrop = document.getElementById("defenseDetailBackdrop");
    const drawer = document.getElementById("defenseDetailDrawer");
    const title = document.getElementById("defenseDetailTitle");
    const sub = document.getElementById("defenseDetailSubtitle");
    const statsHost = document.getElementById("defenseDetailStats");
    const mechHost = document.getElementById("defenseDetailMechanics");
    const iconHost = document.getElementById("defenseDetailIcon");
    const btnTarget = document.getElementById(
      "defenseDetailTargeting",
    ) as HTMLButtonElement | null;
    const btnUp = document.getElementById(
      "defenseDetailUpgrade",
    ) as HTMLButtonElement | null;
    const btnSal = document.getElementById(
      "defenseDetailSalvage",
    ) as HTMLButtonElement | null;

    const playing = this.session.getOutcome() === "playing";
    const open = playing && snap !== null;
    if (backdrop) {
      backdrop.hidden = !open;
      backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    }
    if (drawer) {
      drawer.hidden = !open;
      drawer.classList.toggle("defense-detail-drawer--open", open);
      drawer.setAttribute("aria-hidden", open ? "false" : "true");
    }

    if (!snap || !statsHost || !mechHost || !title || !sub || !iconHost) return;

    const spec = buildPlacedDefenseTooltipSpec(snap);
    title.textContent = spec.title;
    sub.textContent = `Level ${spec.level} · [${snap.position[0]}, ${snap.position[1]}] · ${snap.id}`;
    mountDefenseCardIcon(iconHost, snap.type, 56, 56);

    statsHost.replaceChildren();
    for (const row of spec.core) {
      const wrap = document.createElement("div");
      wrap.className = "defense-detail-drawer__stat-row";
      const k = document.createElement("span");
      k.className = "defense-detail-drawer__stat-k";
      k.textContent = row.label;
      const v = document.createElement("span");
      v.className = "defense-detail-drawer__stat-v";
      v.textContent = row.value;
      wrap.append(k, v);
      statsHost.append(wrap);
    }

    mechHost.replaceChildren();
    for (const line of spec.mechanics) {
      const li = document.createElement("li");
      li.textContent = line;
      mechHost.append(li);
    }

    const tgt = spec.core.find((r) => r.label === "Targeting");
    if (btnTarget) {
      btnTarget.textContent = `Targeting: ${tgt?.value ?? snap.targetMode}`;
      btnTarget.disabled = !playing;
    }

    const dc = new DefenseController(snap);
    const base = buildCostL1(snap.type);
    const upCost = dc.upgradeShellCost(base);
    if (btnUp) {
      if (snap.level >= 3 || upCost === null) {
        btnUp.textContent = "Max level";
        btnUp.disabled = true;
      } else {
        const shells = this.session.economy.getShells();
        btnUp.textContent = `Upgrade (${upCost} shells)`;
        btnUp.disabled = !playing || shells < upCost;
      }
    }

    if (btnSal) {
      const sal = salvageShellsForDefense(snap);
      btnSal.textContent = `Salvage (+${sal} shells)`;
      btnSal.disabled = !playing;
    }
  }

  private syncDefenseDrawerUi(): void {
    const legacySel = document.getElementById(
      "section-selected-defense",
    ) as HTMLElement | null;
    if (legacySel) legacySel.hidden = true;

    const playing = this.session.getOutcome() === "playing";
    const id = playing ? this.selectedDefenseId : null;
    const snap =
      id === null
        ? null
        : (this.session.map.getDefenses().find((d) => d.id === id) ?? null);
    const shells = this.session.economy.getShells();
    const key =
      snap === null
        ? `closed:${playing}`
        : `${snap.id}:${snap.level}:${snap.targetMode}:${shells}:${snap.position[0]},${snap.position[1]}`;
    if (key === this.defenseDrawerUiCache) return;
    this.defenseDrawerUiCache = key;
    this.syncDefenseDetailDrawerDom(snap);
  }

  private onDefenseDetailTargeting(): void {
    const id = this.selectedDefenseId;
    if (!id || this.session.getOutcome() !== "playing") return;
    this.session.cycleDefenseTargetMode(id);
    this.defenseDrawerUiCache = null;
    this.syncDefenseDrawerUi();
  }

  private onDefenseDetailUpgrade(): void {
    const id = this.selectedDefenseId;
    if (!id || this.session.getOutcome() !== "playing") return;
    if (this.session.tryUpgradeDefense(id)) {
      this.updateHud();
      this.defenseDrawerUiCache = null;
      this.syncDefenseDrawerUi();
    }
  }

  private onDefenseDetailSalvage(): void {
    const id = this.selectedDefenseId;
    if (!id || this.session.getOutcome() !== "playing") return;
    if (this.session.trySalvageDefense(id)) {
      this.clearSelection();
      this.updateHud();
      this.refreshInventoryUi();
    }
  }

  private onDefenseDetailDpad(step: DefenseMoveStep): void {
    const id = this.selectedDefenseId;
    if (!id || this.session.getOutcome() !== "playing") return;
    if (this.session.tryMoveDefenseStep(id, step)) {
      this.defenseDrawerUiCache = null;
      this.syncDefenseDrawerUi();
    }
  }

  private clearRangePreviewMeshes(group: THREE.Group): void {
    for (const c of [...group.children]) {
      group.remove(c);
      if (c instanceof THREE.Mesh) {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      }
    }
  }

  /**
   * Primary engagement ring + Arc Spine chain ring when applicable.
   * Mutates `group`; caller must clear first if replacing.
   */
  private fillAttackRangePreview(
    group: THREE.Group,
    type: DefenseTypeKey,
    level: DefenseLevel,
    emphasized = false,
  ): void {
    const attackR =
      type === "vibration_zone" || type === "ink_veil"
        ? auraRadiusTiles(type, level)
        : attackRangeTiles(type, level);
    const primaryOp = emphasized ? 0.62 : 0.45;
    const chainOp = emphasized ? 0.52 : 0.35;
    const primaryRing = makeRangeRingMesh(
      Math.max(0.04, attackR - 0.1),
      attackR + 0.1,
      COLORS.rangePreviewPrimary,
      primaryOp,
    );
    group.add(primaryRing);
    if (type === "arc_spine") {
      const chainR = arcSpineChainSearchRadius(level);
      const chainRing = makeRangeRingMesh(
        Math.max(0.04, chainR - 0.08),
        chainR + 0.08,
        COLORS.rangePreviewChain,
        chainOp,
      );
      group.add(chainRing);
    }
  }

  private rebuildPlacementRangeRings(): void {
    this.clearRangePreviewMeshes(this.rangePreviewGroup);
    const t = this.placementType;
    if (!t) return;
    this.fillAttackRangePreview(this.rangePreviewGroup, t, 1);
  }

  private syncTowerHoverAttackRange(snap: DefenseSnapshot | null): void {
    if (!snap) {
      this.towerHoverRangeGroup.visible = false;
      this.towerHoverRangeCacheKey = null;
      return;
    }
    const key = `${snap.id}:${snap.type}:${snap.level}`;
    if (key !== this.towerHoverRangeCacheKey) {
      this.towerHoverRangeCacheKey = key;
      this.clearRangePreviewMeshes(this.towerHoverRangeGroup);
      this.fillAttackRangePreview(this.towerHoverRangeGroup, snap.type, snap.level);
    }
    const w = worldFromGrid(snap.position[0], snap.position[1], this.doc, 0.14);
    this.towerHoverRangeGroup.position.set(w.x, w.y, w.z);
    this.towerHoverRangeGroup.visible = true;
  }

  /** Placement and defense focus: orbit pan only when idle (tile pick + camera explore). */
  private syncOrbitWithPlacement(): void {
    this.updateOrbitPanEnabled();
  }

  private updateOrbitPanEnabled(): void {
    const focused =
      this.session.getOutcome() === "playing" &&
      this.selectedDefenseId !== null;
    this.orbitControls.enablePan = !this.placementType && !focused;
  }

  private selectDefense(id: string): void {
    if (this.placementType !== null) {
      this.placementType = null;
      this.placementHoverAllowed = null;
      this.rangePreviewGroup.visible = false;
      this.placementFootprintGroup.visible = false;
      this.rebuildPlacementRangeRings();
      this.syncOrbitWithPlacement();
    }
    this.selectedDefenseId = id;
    this.defenseDrawerUiCache = null;
    this.refreshInventoryUi();
    window.requestAnimationFrame(() => {
      (
        document.querySelector(
          "[data-drawer-initial-focus]",
        ) as HTMLElement | null
      )?.focus();
    });
  }

  private clearSelection(): void {
    this.selectedDefenseId = null;
    this.selectionRangeCacheKey = null;
    this.selectionRangeGroup.visible = false;
    this.defenseDrawerUiCache = null;
    this.syncDefenseDrawerUi();
  }

  private updateSelectionRangeOverlay(): void {
    const sid = this.selectedDefenseId;
    if (!sid || this.session.getOutcome() !== "playing") {
      this.selectionRangeGroup.visible = false;
      this.selectionRangeCacheKey = null;
      return;
    }
    const snap = this.session.map.getDefenses().find((d) => d.id === sid);
    if (!snap) {
      this.selectedDefenseId = null;
      this.selectionRangeGroup.visible = false;
      this.selectionRangeCacheKey = null;
      this.defenseDrawerUiCache = null;
      this.syncDefenseDrawerUi();
      return;
    }
    const emphasized =
      this.selectedDefenseId !== null && this.session.getOutcome() === "playing";
    const key = `sel:${snap.id}:${snap.type}:${snap.level}:e${emphasized ? 1 : 0}`;
    if (key !== this.selectionRangeCacheKey) {
      this.selectionRangeCacheKey = key;
      this.clearRangePreviewMeshes(this.selectionRangeGroup);
      this.fillAttackRangePreview(
        this.selectionRangeGroup,
        snap.type,
        snap.level,
        emphasized,
      );
    }
    const w = worldFromGrid(snap.position[0], snap.position[1], this.doc, 0.14);
    this.selectionRangeGroup.position.set(w.x, w.y, w.z);
    this.selectionRangeGroup.visible = true;
  }

  private canPlaceTower(gx: number, gz: number): boolean {
    const pos = [gx, gz] as const;
    if (!this.session.map.isLegalTowerTile(pos)) return false;
    if (this.session.map.getDefenseAt(pos) !== undefined) return false;
    return true;
  }

  private setPointerNDC(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickGridCell(e: PointerEvent): { gx: number; gz: number } | null {
    this.setPointerNDC(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.cellPickEntries.map((s) => s.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const m = hits[0]!.object as THREE.Mesh;
    return { gx: m.userData.gx as number, gz: m.userData.gz as number };
  }

  private pickDefenseTowerAt(e: PointerEvent): string | null {
    this.setPointerNDC(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [...this.defenseObjects.values()].map((v) => v.tower);
    if (meshes.length === 0) return null;
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const id = hits[0]!.object.userData.defenseId as string | undefined;
    return typeof id === "string" ? id : null;
  }

  private hideTowerHoverTip(): void {
    this.syncTowerHoverAttackRange(null);
  }

  private onCanvasPointerMove(e: PointerEvent): void {
    const el = this.renderer.domElement;
    const r = el.getBoundingClientRect();
    const insideCanvas =
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom;

    this.hideTowerHoverTip();

    if (
      this.placementType === null ||
      this.session.getOutcome() !== "playing"
    ) {
      this.rangePreviewGroup.visible = false;
      this.placementFootprintGroup.visible = false;
      this.placementHoverAllowed = null;
      return;
    }
    if (!insideCanvas) {
      this.rangePreviewGroup.visible = false;
      this.placementFootprintGroup.visible = false;
      this.placementHoverAllowed = null;
      return;
    }
    const cell = this.pickGridCell(e);
    if (!cell) {
      this.rangePreviewGroup.visible = false;
      this.placementFootprintGroup.visible = false;
      this.placementHoverAllowed = null;
      return;
    }

    const placing = this.placementType;
    const cost = buildCostL1(placing);
    const shells = this.session.economy.getShells();
    const placeOk = this.canPlaceTower(cell.gx, cell.gz);
    const afford = shells >= cost;
    const allowed = placeOk && afford;

    const w = worldFromGrid(cell.gx, cell.gz, this.doc, 0.14);
    this.rangePreviewGroup.position.set(w.x, w.y, w.z);
    this.rangePreviewGroup.visible = true;

    const wf = worldFromGrid(
      cell.gx,
      cell.gz,
      this.doc,
      SCENE_GRID_VISUAL_Y + 0.038,
    );
    this.placementFootprintGroup.position.set(wf.x, wf.y, wf.z);
    this.placementFootprintGroup.visible = true;

    const fpMat = this.placementFootprintMesh.material as THREE.MeshBasicMaterial;
    if (allowed) {
      fpMat.color.setHex(COLORS.placementPreviewAllowed);
      fpMat.opacity = 0.38;
    } else {
      fpMat.color.setHex(COLORS.placementPreviewBlocked);
      fpMat.opacity = 0.44;
    }

    if (this.placementHoverAllowed !== allowed) {
      this.placementHoverAllowed = allowed;
      this.applyPlacementRangeRingTint(allowed);
    }
  }

  private onSlotPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    if (this.session.getOutcome() !== "playing") return;
    const el = this.renderer.domElement;
    const r = el.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    ) {
      return;
    }
    this.slotPointerStart = { x: e.clientX, y: e.clientY };
  }

  private onSlotPointerUp(e: PointerEvent): void {
    if (e.button !== 0) return;
    const start = this.slotPointerStart;
    this.slotPointerStart = null;
    if (!start || this.session.getOutcome() !== "playing") return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (dx * dx + dy * dy > 25) return;

    const el = this.renderer.domElement;
    const r = el.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    ) {
      return;
    }

    const clickedTower = this.pickDefenseTowerAt(e);
    if (clickedTower) {
      this.selectDefense(clickedTower);
      return;
    }

    const placing = this.placementType;
    if (placing === null) {
      this.clearSelection();
      return;
    }

    const cell = this.pickGridCell(e);
    if (!cell) return;
    if (!this.canPlaceTower(cell.gx, cell.gz)) return;

    const id = `def_${this.nextDefenseId++}`;
    const ok = this.session.tryPurchaseDefenseL1(placing, id, [
      cell.gx,
      cell.gz,
    ]);
    if (ok) {
      this.refreshInventoryUi();
      this.updateHud();
    }
  }

  private onSendWave(): void {
    this.session.startWaveEarly();
  }

  private setSimTimeScale(scale: SimTimeScale): void {
    if (this.session.getOutcome() !== "playing") return;
    this.simTimeScale = scale;
    this.syncHudSpeedControl();
  }

  private syncHudSpeedControl(): void {
    const sel = document.getElementById("hudSpeed") as HTMLSelectElement | null;
    if (!sel) return;
    sel.value = String(this.simTimeScale);
  }

  private refreshInventoryUi(): void {
    const playing = this.session.getOutcome() === "playing";
    const shells = this.session.economy.getShells();
    const selectedType = this.placementType;

    for (const type of ARMORY_DEFENSE_ORDER) {
      const cost = buildCostL1(type);
      const canAfford = shells >= cost;
      const selected = selectedType === type;
      const btn = document.querySelector(
        `[data-defense="${type}"].pick`,
      ) as HTMLButtonElement | null;
      const card = document.querySelector(`[data-defense-card="${type}"]`);
      const statusEl = card?.querySelector("[data-defense-status]");
      const costLabel = card?.querySelector("[data-defense-cost]");

      let statusText: string;
      if (!playing) {
        statusText = "Match ended";
      } else if (selected) {
        statusText = `Click map to place (${cost} shells)`;
      } else if (canAfford) {
        statusText = `Available · ${cost} shells`;
      } else {
        statusText = `Need ${cost - shells} more shells`;
      }

      const prettyName = type
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      if (btn) {
        btn.disabled = !playing;
        if (
          !btn.classList.contains("defense-hotbar__btn") &&
          !btn.classList.contains("defense-inventory__btn")
        ) {
          btn.textContent = "";
        }
        btn.setAttribute("title", statusText);
        btn.setAttribute("aria-pressed", selected ? "true" : "false");
        btn.setAttribute("aria-label", `${prettyName}. ${statusText}`);
      }
      if (costLabel) {
        costLabel.textContent = String(cost);
      }
      if (card) {
        card.classList.toggle("selected", selected);
        card.classList.toggle(
          "defense-card--affordable",
          playing && canAfford && !selected,
        );
        card.classList.toggle(
          "defense-card--blocked",
          playing && !canAfford && !selected,
        );
      }

      if (statusEl) statusEl.textContent = statusText;
    }

    this.syncDefenseDrawerUi();

    const dock = document.getElementById("placementDock");
    const hint = document.getElementById("placementHint");
    const invCancel = document.getElementById(
      "invCancel",
    ) as HTMLButtonElement | null;
    const placing = selectedType !== null;
    if (dock) dock.hidden = !placing;
    if (invCancel) invCancel.hidden = !placing;
    if (hint) {
      hint.classList.toggle("visible", placing);
      if (placing && selectedType !== null) {
        const cost = buildCostL1(selectedType);
        const short = Math.max(0, cost - shells);
        hint.textContent =
          shells < cost
            ? `Preview: need ${short} more shells to build here. Cancel or Esc exits.`
            : "Preview: blue tile = can place; red = blocked or unaffordable. Cancel or Esc exits.";
      } else {
        hint.textContent = "";
      }
    }
  }

  private frame(): void {
    this.stats.begin();
    const dt = this.clock.getDelta();
    if (this.session.getOutcome() === "playing") {
      const focus =
        this.selectedDefenseId !== null &&
        this.session.getOutcome() === "playing";
      const baseDt = focus ? dt * DEFENSE_FOCUS_TICK_SCALE : dt;
      const simDt = baseDt * this.simTimeScale;
      if (simDt > 0) {
        this.session.tick(simDt);
      }
    }
    this.syncDefenses();
    this.updateSelectionRangeOverlay();
    this.syncEnemies();
    this.syncBubbleAttackFx(dt);
    this.applyCombatVfx();
    this.syncCannonAttackFx(dt);
    this.updateChainFx(dt);
    updateArcSpineHitSparkles(this.arcSpineHitSparkles, dt, this.scene);
    this.updateTideheartBeamFx(dt);
    this.updateHud();
    this.syncWaveProgress();
    this.refreshInventoryUi();
    this.updateUiState();
    if (this.session.getOutcome() !== "playing") {
      this.hideTowerHoverTip();
    }
    this.syncDefenseFocusCamera(dt);
    this.orbitControls.update();
    this.seabedMat.uniforms.uTime.value = this.clock.elapsedTime;
    this.renderer.transmissionResolutionScale =
      getVibrationDomeTuning().transmissionResolutionScale;
    this.renderer.render(this.scene, this.camera);
    this.stats.end();
  }

  /**
   * Ease orbit pivot (screen center) toward the selected defense and FOV in/out with smoothstep.
   * Pan is disabled while focused so the look-at stays on the tower; D-pad moves the tower, pivot follows.
   */
  private syncDefenseFocusCamera(dt: number): void {
    this.updateOrbitPanEnabled();

    const playing = this.session.getOutcome() === "playing";
    const id = this.selectedDefenseId;
    const snap =
      playing && id
        ? this.session.map.getDefenses().find((d) => d.id === id)
        : undefined;

    const wantBlend = snap ? 1 : 0;
    const step = 1 - Math.exp(
      -DEFENSE_FOCUS_CAMERA_SMOOTH_RATE * Math.min(dt, 0.1),
    );
    this.defenseFocusViewBlend = THREE.MathUtils.lerp(
      this.defenseFocusViewBlend,
      wantBlend,
      step,
    );
    const t = this.defenseFocusViewBlend;
    const easeInOut = t * t * (3 - 2 * t);

    if (snap) {
      const p = worldFromGrid(
        snap.position[0],
        snap.position[1],
        this.doc,
        DEFENSE_FOCUS_LOOK_AT_Y,
      );
      this.tmpDefenseOrbitLookAt.set(p.x, p.y, p.z);
    } else {
      this.tmpDefenseOrbitLookAt.copy(this.orbitRestTarget);
    }

    this.orbitControls.target.lerpVectors(
      this.orbitRestTarget,
      this.tmpDefenseOrbitLookAt,
      easeInOut,
    );

    const nextFov = THREE.MathUtils.lerp(
      this.cameraFovBase,
      this.cameraFovBase * DEFENSE_FOCUS_FOV_SCALE,
      easeInOut,
    );
    if (Math.abs(nextFov - this.camera.fov) > 1e-5) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    } else {
      this.camera.fov = nextFov;
    }
  }

  private syncEnemies(): void {
    const alive = new Set<string>();
    for (const [id, e] of this.session.getEnemies()) {
      if (!e.isAlive()) continue;
      alive.add(id);
      const pos = e.getGridPosition();
      const w = worldFromGrid(pos[0], pos[1], this.doc, 0.28);
      let vis = this.enemyObjects.get(id);
      if (!vis) {
        const { root, hpBarY, spriteBillboard } = createEnemyVisual(
          e.enemyType,
          this.entitySpriteAtlas,
        );
        const bar = makeBarBillboard(
          0.52,
          0.072,
          COLORS.enemyHpBarBg,
          COLORS.enemyHpBarFill,
        );
        bar.group.position.set(0, hpBarY, 0);
        root.add(bar.group);
        this.scene.add(root);
        vis = { root, bar, spriteBillboard };
        this.enemyObjects.set(id, vis);
      }
      vis.root.position.set(
        w.x,
        w.y + e.getCannonLiftYOffset(),
        w.z,
      );
      const twist = e.getCannonLiftTwistEuler();
      vis.root.rotation.set(twist.x, twist.y, twist.z);
      const hpRatio = e.maxHp > 0 ? e.hp / e.maxHp : 0;
      vis.bar.setFillRatio(hpRatio);
      vis.bar.group.quaternion.copy(this.camera.quaternion);
      if (vis.spriteBillboard) {
        syncVerticalBillboardMesh(vis.spriteBillboard, vis.root, this.camera);
      }
    }
    for (const [id, vis] of [...this.enemyObjects]) {
      if (!alive.has(id)) {
        this.scene.remove(vis.root);
        disposeObject3DTree(vis.root);
        this.enemyObjects.delete(id);
      }
    }
  }

  private syncDefenses(): void {
    const wanted = new Set<string>();
    for (const d of this.session.map.getDefenses()) {
      wanted.add(d.id);
      const w = worldFromGrid(d.position[0], d.position[1], this.doc, 0.35);
      let vis = this.defenseObjects.get(d.id);
      if (!vis) {
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
        this.scene.add(root);
        vis = { root, tower, bar };
        this.defenseObjects.set(d.id, vis);
      }
      vis.root.position.set(w.x, w.y, w.z);
      vis.tower.userData.defenseId = d.id;
      const interval = fireIntervalFor(d.type, d.level);
      const remaining = this.session.getDefenseCooldownRemaining(d.id);
      const cdRatio = interval > 0 ? remaining / interval : 0;
      vis.bar.setFillRatio(cdRatio);
      vis.bar.group.quaternion.copy(this.camera.quaternion);
      if (vis.tower.userData.entitySprite === true) {
        syncVerticalBillboardMesh(vis.tower, vis.root, this.camera);
        const mat = vis.tower.material as THREE.MeshBasicMaterial;
        const ready = interval > 0 ? 1 - remaining / interval : 1;
        const glow = 0.8 + 0.2 * Math.max(0, Math.min(1, ready));
        const selected = this.selectedDefenseId === d.id;
        const g = selected ? Math.min(1, glow + 0.14) : glow;
        mat.color.setRGB(g, g, g);
      } else {
        const mat = vis.tower.material as THREE.MeshStandardMaterial;
        const ready = interval > 0 ? 1 - remaining / interval : 1;
        const baseEmit = 0.08 + 0.28 * Math.max(0, Math.min(1, ready));
        const selected = this.selectedDefenseId === d.id;
        mat.emissiveIntensity = selected ? baseEmit + 0.32 : baseEmit;
      }

      syncVibrationZoneDomeForDefense(
        vis,
        d,
        this.doc,
        disposeObject3DTree,
        this.clock.elapsedTime,
      );
      syncInkVeilAuraForDefense(
        vis,
        d,
        this.doc,
        disposeObject3DTree,
        this.clock.elapsedTime,
      );
    }
    for (const [id, vis] of [...this.defenseObjects]) {
      if (!wanted.has(id)) {
        this.scene.remove(vis.root);
        disposeObject3DTree(vis.root);
        this.defenseObjects.delete(id);
      }
    }
  }

  private syncBubbleAttackFx(dt: number): void {
    const projs = this.session.getBubbleProjectiles();
    ensureBubbleProjectilePool(
      this.bubbleProjectileGroup,
      this.bubbleProjectilePool,
      projs.length,
    );
    syncBubbleProjectileMeshes(
      this.bubbleProjectilePool,
      projs,
      this.doc,
      this.clock.elapsedTime,
    );
    spawnBubblePopRings(
      this.session.consumeBubblePopFx(),
      this.doc,
      this.scene,
      this.bubblePopRings,
    );
    updateBubblePopRings(this.bubblePopRings, dt, this.scene);
    spawnBubbleColumns(
      this.session.consumeBubbleColumnFxEvents(),
      this.doc,
      this.bubbleColumnGroup,
      this.bubbleColumnActive,
      this.bubbleColumnFreePool,
    );
    updateBubbleColumns(
      this.bubbleColumnGroup,
      this.bubbleColumnActive,
      this.bubbleColumnFreePool,
      dt,
      this.clock.elapsedTime,
    );
  }

  private syncCannonAttackFx(dt: number): void {
    const projs = this.session.getCannonProjectiles();
    ensureCannonProjectilePool(
      this.cannonProjectileGroup,
      this.cannonProjectilePool,
      projs.length,
    );
    syncCannonProjectileMeshes(
      this.cannonProjectilePool,
      projs,
      this.doc,
      this.clock.elapsedTime,
    );
    updateCannonBlastDecals(
      this.cannonBlastDecals,
      dt,
      this.scene,
      this.clock.elapsedTime,
    );
    updateCannonColumnHits(
      this.cannonColumnHits,
      dt,
      this.cannonColumnGroup,
      this.clock.elapsedTime,
    );
  }

  private applyCombatVfx(): void {
    const cannonBlasts: { gx: number; gz: number; radiusTiles: number }[] = [];
    const cannonColumns: {
      gx: number;
      gz: number;
      fromGx: number;
      fromGz: number;
    }[] = [];
    for (const evt of this.session.consumeCombatEvents()) {
      const snap = this.session.map
        .getDefenses()
        .find((d) => d.id === evt.defenseId);
      if (!snap) continue;
      const start = worldFromGrid(
        snap.position[0],
        snap.position[1],
        this.doc,
        0.6,
      );
      const pts: THREE.Vector3[] = [start];
      evt.hits.forEach((h, hi) => {
        pts.push(
          worldFromGrid(h.position[0], h.position[1], this.doc, 0.6),
        );
        this.spawnDamagePopup(h.damage, h.position[0], h.position[1]);
        if (evt.chainLightningVfx === true) {
          spawnArcSpineHitSparkles(
            h.position[0],
            h.position[1],
            this.doc,
            this.scene,
            this.arcSpineHitSparkles,
            hi,
          );
        }
      });
      if (evt.chainLightningVfx === true && pts.length >= 2) {
        this.addChain(pts);
      }
      if (
        snap.type === "tideheart_laser" &&
        evt.hits.length > 0 &&
        !evt.chainLightningVfx
      ) {
        const width = beamWidthForTideheartLevel(snap.level);
        for (const h of evt.hits) {
          const beamEnd = worldFromGrid(h.position[0], h.position[1], this.doc, 0.6);
          const beam = createTideheartLaserBeam(
            start,
            beamEnd,
            snap.level,
            this.camera,
          );
          const mat = beam.material as THREE.ShaderMaterial;
          mat.uniforms.uFade.value = 1;
          this.scene.add(beam);
          this.tideheartBeams.push({
            obj: beam,
            t: TIDEHEART_BEAM_FX_DURATION,
            mat,
            start: start.clone(),
            end: beamEnd.clone(),
            width,
          });
        }
      }
      if (evt.cannonBlast) cannonBlasts.push(evt.cannonBlast);
      if (evt.cannonColumnHit) cannonColumns.push(evt.cannonColumnHit);
    }
    if (cannonBlasts.length > 0) {
      spawnCannonBlastDecals(
        cannonBlasts,
        this.doc,
        this.scene,
        this.cannonBlastDecals,
      );
    }
    if (cannonColumns.length > 0) {
      spawnCannonColumnHits(
        cannonColumns,
        this.doc,
        this.cannonColumnGroup,
        this.cannonColumnHits,
        this.clock.elapsedTime,
      );
    }
  }

  private addChain(points: THREE.Vector3[]): void {
    const line = createArcSpineLightningLine(
      points,
      COLORS.chainLightningPrimary,
      COLORS.chainLightningBounce,
    );
    const mat = line.material as THREE.ShaderMaterial;
    mat.uniforms.uFade.value = 1;
    this.scene.add(line);
    this.chainLines.push({ obj: line, t: CHAIN_FX_DURATION, mat });
  }

  private updateChainFx(dt: number): void {
    this.chainLines = this.chainLines.filter((c) => {
      c.t -= dt;
      c.mat.uniforms.uTime.value = this.clock.elapsedTime;
      c.mat.uniforms.uFade.value = Math.max(
        0,
        CHAIN_FX_DURATION > 0 ? c.t / CHAIN_FX_DURATION : 0,
      );
      if (c.t <= 0) {
        this.scene.remove(c.obj);
        c.obj.geometry.dispose();
        c.mat.dispose();
        return false;
      }
      return true;
    });
  }

  private updateTideheartBeamFx(dt: number): void {
    const dur = TIDEHEART_BEAM_FX_DURATION;
    this.tideheartBeams = this.tideheartBeams.filter((b) => {
      b.t -= dt;
      b.mat.uniforms.uTime.value = this.clock.elapsedTime;
      b.mat.uniforms.uFade.value = Math.max(0, dur > 0 ? b.t / dur : 0);
      alignTideheartLaserMesh(b.obj, b.start, b.end, b.width, this.camera);
      if (b.t <= 0) {
        this.scene.remove(b.obj);
        b.obj.geometry.dispose();
        b.mat.dispose();
        return false;
      }
      return true;
    });
  }

  private spawnDamagePopup(dmg: number, gx: number, gz: number): void {
    const layer = document.getElementById("damageLayer");
    if (!layer) return;
    const w = worldFromGrid(gx, gz, this.doc, 0.8);
    const v = w.clone().project(this.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    const el = document.createElement("div");
    el.className = "damage-pop" + (dmg <= 1 ? " armor" : "");
    el.textContent = String(dmg);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    layer.appendChild(el);
    window.setTimeout(() => el.remove(), DAMAGE_POP_DURATION_SEC * 1000);
  }

  /**
   * Discrete wave bar: filled segments = current tide (1-based) up to total;
   * last filled segment pulses during active combat.
   */
  private syncWaveProgress(): void {
    const host = document.getElementById("waveProgressHost");
    const track = document.getElementById("waveProgressTrack");
    const fraction = document.getElementById("waveProgressFraction");
    if (!host || !track || !fraction) return;

    const total = this.session.map.getWaves().length;
    if (total === 0) {
      host.hidden = true;
      return;
    }
    host.hidden = false;

    const phase = this.session.waveDirector.getPhase();
    const out = this.session.getOutcome();
    const display = this.session.getTideDisplayNumber();
    let filled: number;
    if (out === "win" || phase === "completed") {
      filled = total;
    } else {
      filled = Math.min(Math.max(0, display), total);
    }

    fraction.textContent = `${filled} / ${total}`;
    track.setAttribute("aria-valuemax", String(total));
    track.setAttribute("aria-valuenow", String(filled));

    while (track.children.length < total) {
      const seg = document.createElement("span");
      seg.className = "wave-seg";
      track.appendChild(seg);
    }
    while (track.children.length > total) {
      track.lastElementChild?.remove();
    }

    const activeWave =
      out === "playing" && phase === "active" && filled > 0;

    for (let i = 0; i < total; i++) {
      const seg = track.children[i] as HTMLElement;
      const isFilled = i < filled;
      seg.classList.toggle("wave-seg--filled", isFilled);
      seg.classList.toggle(
        "wave-seg--active",
        activeWave && isFilled && i === filled - 1,
      );
    }
  }

  private updateHud(): void {
    const statShells = document.getElementById("statShells");
    const statShellsRow = document.getElementById("statShellsRow");
    const tide = document.getElementById("statTide");
    const castle = document.getElementById("statCastle");
    const shells = this.session.economy.getShells();
    if (statShells) {
      if (
        this.prevShells !== null &&
        this.prevShells !== shells &&
        statShellsRow
      ) {
        statShellsRow.classList.remove("stat--tick");
        void statShellsRow.offsetWidth;
        statShellsRow.classList.add("stat--tick");
        window.setTimeout(() => {
          statShellsRow.classList.remove("stat--tick");
        }, 520);
      }
      this.prevShells = shells;
      statShells.textContent = String(shells);
    }
    if (tide) {
      const phase = this.session.waveDirector.getPhase();
      const n = this.session.getTideDisplayNumber();
      tide.textContent =
        phase === "completed"
          ? "—"
          : `${n} · ${phase.toUpperCase()}`;
    }
    if (castle) {
      const c = this.session.castle;
      castle.textContent = `${c.getCurrentHp()} / ${c.maxHp}`;
      this.syncCitadelHpSegments(c.getCurrentHp(), c.maxHp);
    }
    const hotkeyHint = document.getElementById("hudHotkeyHint");
    if (hotkeyHint) {
      const playing = this.session.getOutcome() === "playing";
      hotkeyHint.classList.toggle("hud-hotkey-hint--visible", playing);
    }
  }

  private syncCitadelHpSegments(currentHp: number, maxHp: number): void {
    const track = document.getElementById("citadelHpTrack");
    if (!track || maxHp <= 0) return;

    while (track.children.length < maxHp) {
      const seg = document.createElement("span");
      seg.className = "citadel-seg";
      track.appendChild(seg);
    }
    while (track.children.length > maxHp) {
      track.lastElementChild?.remove();
    }

    const hp = Math.max(0, Math.min(currentHp, maxHp));
    for (let i = 0; i < maxHp; i++) {
      const seg = track.children[i] as HTMLElement;
      seg.classList.toggle("citadel-seg--filled", i < hp);
    }
  }

  private updateUiState(): void {
    const out = this.session.getOutcome();
    const overlay = document.getElementById("overlay");
    const title = document.getElementById("overlayTitle");
    const sub = document.getElementById("overlaySub");
    const send = document.getElementById("sendWave") as HTMLButtonElement | null;
    const hudSpeed = document.getElementById("hudSpeed") as HTMLSelectElement | null;
    const sendSub = document.getElementById("sendWaveSub");
    const phase = this.session.waveDirector.getPhase();
    if (send) {
      const prep = phase === "prep";
      send.disabled = !prep || out !== "playing";
      const waveActive =
        out === "playing" && phase !== "prep" && phase !== "completed";
      send.classList.toggle("wave-active", waveActive);
    }
    if (hudSpeed) {
      hudSpeed.disabled = out !== "playing";
    }
    if (out !== "playing") {
      this.simTimeScale = 1;
      this.syncHudSpeedControl();
    }
    if (sendSub) {
      if (out !== "playing") {
        sendSub.textContent = "Match ended";
      } else if (phase === "completed") {
        sendSub.textContent = "All waves complete.";
      } else if (phase !== "prep") {
        sendSub.textContent = "Wave in progress — available during next prep.";
      } else {
        sendSub.textContent = "";
      }
    }
    const overlayActions = document.getElementById("overlayActions");
    const overlayNext = document.getElementById("overlayBtnNext");

    if (out === "playing") {
      overlay?.classList.remove("visible");
      overlayActions?.setAttribute("hidden", "");
      return;
    }
    this.clearPlacementMode();
    this.clearSelection();
    overlay?.classList.add("visible");
    if (overlayActions) {
      if (this.missionEndNav) {
        overlayActions.removeAttribute("hidden");
        overlayNext?.toggleAttribute(
          "hidden",
          !(out === "win" && this.missionEndNav.hasNextMap),
        );
      } else {
        overlayActions.setAttribute("hidden", "");
      }
    }
    if (title && sub) {
      if (out === "win") {
        title.textContent = "THE DEEP ENDURES";
        sub.textContent = `Castle HP: ${this.session.castle.getCurrentHp()}.`;
      } else {
        title.textContent = "THE DEEP FALLS";
        sub.textContent = "The citadel has been breached.";
      }
    }
  }
}
