import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { MapDocument } from "../game/map-types.js";
import { GameSession } from "../game/game-session.js";
import { arcSpineChainSearchRadius } from "../game/defense-controller.js";
import {
  attackRangeTiles,
  auraRadiusTiles,
  fireIntervalFor,
} from "../game/damage-resolver.js";
import { buildPlacedDefenseTooltipSpec } from "../game/placed-defense-tooltip.js";
import { mountTowerHoverTip } from "./tower-hover-dom.js";
import {
  ARMORY_DEFENSE_ORDER,
  buildCostL1,
} from "../game/defense-build-costs.js";
import type {
  DefenseLevel,
  DefenseSnapshot,
  DefenseTypeKey,
} from "../game/types.js";
import { buildMapBoard, worldFromGrid } from "./board.js";
import {
  COLORS,
  CHAIN_FX_DURATION,
  DAMAGE_POP_DURATION_SEC,
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
  disposeCannonAttackFxShared,
  ensureCannonProjectilePool,
  spawnCannonBlastDecals,
  syncCannonProjectileMeshes,
  updateCannonBlastDecals,
  type CannonBlastDecal,
} from "./cannon-attack-fx.js";
import { createArcSpineLightningLine } from "./arc-spine-chain-fx.js";
import { createEnemyVisual } from "./enemy-visuals.js";
import { GAMEPLAY_TIPS } from "./gameplay-tips.js";

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
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else (mat as THREE.Material).dispose();
    }
  });
}

/** Placeholder tower tint per defense (until sprites). */
const DEFENSE_TOWER_COLOR: Record<DefenseTypeKey, number> = {
  arc_spine: COLORS.tower,
  tideheart_laser: 0x00b8e6,
  bubble_shotgun: 0x66ccff,
  vibration_zone: 0x39ff6e,
  current_cannon: 0xffaa44,
  ink_veil: 0x7b2fff,
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

export class GameApp {
  readonly session: GameSession;
  private readonly doc: MapDocument;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private clock = new THREE.Clock();
  private cellPickEntries: { mesh: THREE.Mesh; gx: number; gz: number }[] =
    [];
  private readonly rangePreviewGroup = new THREE.Group();
  /** Attack radius while hovering an existing tower (tile space, matches {@link attackRangeTiles}). */
  private readonly towerHoverRangeGroup = new THREE.Group();
  private towerHoverRangeCacheKey: string | null = null;
  private placementType: DefenseTypeKey | null = null;
  private enemyObjects = new Map<
    string,
    { root: THREE.Group; bar: BarBillboard }
  >();
  private defenseObjects = new Map<
    string,
    { root: THREE.Group; tower: THREE.Mesh; bar: BarBillboard }
  >();
  private chainLines: { obj: THREE.LineSegments; t: number; mat: THREE.ShaderMaterial }[] =
    [];
  private readonly bubbleProjectileGroup = new THREE.Group();
  private bubbleProjectilePool: THREE.Mesh[] = [];
  private bubblePopRings: BubblePopRing[] = [];
  private readonly cannonProjectileGroup = new THREE.Group();
  private cannonProjectilePool: THREE.Mesh[] = [];
  private cannonBlastDecals: CannonBlastDecal[] = [];
  private nextDefenseId = 1;
  private readonly mount: HTMLElement;
  private readonly orbitControls: OrbitControls;
  private readonly abortController = new AbortController();
  private slotPointerStart: { x: number; y: number } | null = null;
  /** For shell stat row flash when balance changes. */
  private prevShells: number | null = null;
  private lastTowerTipDefenseId: string | null = null;
  private gameplayTipsTimer: ReturnType<typeof setInterval> | null = null;
  private gameplayTipIndex = 0;

  constructor(doc: MapDocument, mount?: HTMLElement) {
    this.doc = doc;
    this.session = new GameSession(doc);
    this.mount = mount ?? document.body;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.mount.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(8, 18, 10);
    this.scene.add(sun);

    const { root, cells } = buildMapBoard(doc);
    this.scene.add(root);
    this.cellPickEntries = cells;

    this.rangePreviewGroup.visible = false;
    this.scene.add(this.rangePreviewGroup);

    this.towerHoverRangeGroup.visible = false;
    this.scene.add(this.towerHoverRangeGroup);

    const [gw, gd] = doc.gridSize;
    const gridExtent = Math.max(gw, gd) + 2;
    const grid = new THREE.GridHelper(
      gridExtent,
      gridExtent,
      COLORS.gridMajor,
      COLORS.gridMinor,
    );
    grid.position.y = 0.02;
    this.scene.add(grid);

    this.scene.add(this.bubbleProjectileGroup);
    this.scene.add(this.cannonProjectileGroup);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
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
      () => this.hideTowerHoverTip(),
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
    document.getElementById("section-armory")?.addEventListener(
      "click",
      (ev) => {
        const t = (ev.target as HTMLElement | null)?.closest?.(
          "[data-defense]",
        ) as HTMLElement | null;
        const key = t?.dataset?.defense as DefenseTypeKey | undefined;
        if (
          key &&
          ARMORY_DEFENSE_ORDER.includes(key) &&
          t?.classList.contains("pick")
        ) {
          ev.preventDefault();
          this.onArmoryDefenseClick(key);
        }
      },
      ac,
    );
    document.getElementById("invCancel")?.addEventListener(
      "click",
      () => this.clearPlacementMode(),
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
    this.refreshInventoryUi();
  }

  start(): void {
    this.clock.start();
    this.startGameplayTips();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /**
   * Stop the render loop, release WebGL and Three.js resources, and remove listeners.
   */
  dispose(): void {
    this.stopGameplayTips();
    this.abortController.abort();
    this.renderer.setAnimationLoop(null);
    this.orbitControls.dispose();
    for (const c of this.chainLines) {
      this.scene.remove(c.obj);
      c.obj.geometry.dispose();
      c.mat.dispose();
    }
    this.chainLines = [];
    for (const r of this.bubblePopRings) {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
    }
    this.bubblePopRings.length = 0;
    this.scene.remove(this.bubbleProjectileGroup);
    for (const m of this.bubbleProjectilePool) {
      m.geometry.dispose();
    }
    this.bubbleProjectilePool.length = 0;
    disposeBubbleAttackFxShared();
    this.scene.remove(this.cannonProjectileGroup);
    for (const m of this.cannonProjectilePool) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.cannonProjectilePool.length = 0;
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
      this.clearPlacementMode();
    }
  }

  private onArmoryDefenseClick(type: DefenseTypeKey): void {
    if (this.session.getOutcome() !== "playing") return;
    const cost = buildCostL1(type);
    const shells = this.session.economy.getShells();
    if (this.placementType === type) {
      this.clearPlacementMode();
      return;
    }
    if (shells < cost) return;
    this.placementType = type;
    this.rebuildPlacementRangeRings();
    this.syncOrbitWithPlacement();
    this.refreshInventoryUi();
  }

  private clearPlacementMode(): void {
    this.placementType = null;
    this.rangePreviewGroup.visible = false;
    this.rebuildPlacementRangeRings();
    this.syncOrbitWithPlacement();
    this.refreshInventoryUi();
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
  ): void {
    const attackR =
      type === "vibration_zone" || type === "ink_veil"
        ? auraRadiusTiles(type, level)
        : attackRangeTiles(type, level);
    const primaryRing = makeRangeRingMesh(
      Math.max(0.04, attackR - 0.1),
      attackR + 0.1,
      COLORS.rangePreviewPrimary,
      0.45,
    );
    group.add(primaryRing);
    if (type === "arc_spine") {
      const chainR = arcSpineChainSearchRadius(level);
      const chainRing = makeRangeRingMesh(
        Math.max(0.04, chainR - 0.08),
        chainR + 0.08,
        COLORS.rangePreviewChain,
        0.35,
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

  /** Left-click places towers; pause orbit rotate so clicks register immediately. */
  private syncOrbitWithPlacement(): void {
    const placing = this.placementType !== null;
    this.orbitControls.enableRotate = !placing;
  }

  private canPlaceTower(gx: number, gz: number): boolean {
    const pos = [gx, gz] as const;
    if (!this.session.map.isBuildSlotPosition(pos)) return false;
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

  private pickHoveredDefenseId(e: PointerEvent): string | null {
    this.setPointerNDC(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [...this.defenseObjects.values()].map((v) => v.tower);
    if (meshes.length === 0) return null;
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const id = (hits[0]!.object as THREE.Mesh).userData.defenseId as
      | string
      | undefined;
    return typeof id === "string" ? id : null;
  }

  private hideTowerHoverTip(): void {
    this.syncTowerHoverAttackRange(null);
    this.lastTowerTipDefenseId = null;
    const tip = document.getElementById("towerHoverTip");
    if (!tip) return;
    tip.classList.remove("tower-hover-tip--pulse");
    tip.hidden = true;
    tip.setAttribute("aria-hidden", "true");
    tip.removeAttribute("data-defense");
    tip.removeAttribute("aria-labelledby");
  }

  private updateTowerHoverTip(e: PointerEvent): void {
    const tip = document.getElementById("towerHoverTip");
    if (!tip) return;
    const id = this.pickHoveredDefenseId(e);
    if (!id) {
      this.hideTowerHoverTip();
      return;
    }
    const snap = this.session.map.getDefenses().find((d) => d.id === id);
    if (!snap) {
      this.hideTowerHoverTip();
      return;
    }
    if (id !== this.lastTowerTipDefenseId) {
      this.lastTowerTipDefenseId = id;
      const spec = buildPlacedDefenseTooltipSpec(snap);
      mountTowerHoverTip(tip, spec);
      tip.classList.remove("tower-hover-tip--pulse");
      void tip.offsetWidth;
      tip.classList.add("tower-hover-tip--pulse");
    }
    tip.hidden = false;
    tip.setAttribute("aria-hidden", "false");

    this.syncTowerHoverAttackRange(snap);

    const pad = 16;
    const rect = tip.getBoundingClientRect();
    let left = e.clientX + pad;
    let top = e.clientY + pad;
    if (left + rect.width > window.innerWidth - 8) {
      left = e.clientX - rect.width - pad;
    }
    if (top + rect.height > window.innerHeight - 8) {
      top = e.clientY - rect.height - pad;
    }
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${Math.max(8, top)}px`;
  }

  private onCanvasPointerMove(e: PointerEvent): void {
    const el = this.renderer.domElement;
    const r = el.getBoundingClientRect();
    const insideCanvas =
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom;

    if (insideCanvas && this.session.getOutcome() === "playing") {
      this.updateTowerHoverTip(e);
    } else {
      this.hideTowerHoverTip();
    }

    if (
      this.placementType === null ||
      this.session.getOutcome() !== "playing"
    ) {
      this.rangePreviewGroup.visible = false;
      return;
    }
    if (!insideCanvas) {
      this.rangePreviewGroup.visible = false;
      return;
    }
    const cell = this.pickGridCell(e);
    if (!cell) {
      this.rangePreviewGroup.visible = false;
      return;
    }
    if (!this.canPlaceTower(cell.gx, cell.gz)) {
      this.rangePreviewGroup.visible = false;
      return;
    }
    const w = worldFromGrid(cell.gx, cell.gz, this.doc, 0.14);
    this.rangePreviewGroup.position.set(w.x, w.y, w.z);
    this.rangePreviewGroup.visible = true;
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

    const placing = this.placementType;
    if (placing === null) return;

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

      if (btn) {
        btn.disabled = !playing || (!canAfford && !selected);
        btn.textContent = selected ? "Selected" : "Select";
        btn.setAttribute("aria-pressed", selected ? "true" : "false");
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
      if (statusEl) statusEl.textContent = statusText;
      if (btn) btn.title = statusText;
    }

    const hint = document.getElementById("placementHint");
    const cancel = document.getElementById("invCancel");
    const placing = selectedType !== null;
    hint?.classList.toggle("visible", placing);
    cancel?.classList.toggle("visible", placing);
  }

  private frame(): void {
    const dt = this.clock.getDelta();
    if (this.session.getOutcome() === "playing") {
      this.session.tick(dt);
    }
    this.syncDefenses();
    this.syncEnemies();
    this.syncBubbleAttackFx(dt);
    this.applyCombatVfx();
    this.syncCannonAttackFx(dt);
    this.updateChainFx(dt);
    this.updateHud();
    this.syncWaveProgress();
    this.refreshInventoryUi();
    this.updateUiState();
    if (this.session.getOutcome() !== "playing") {
      this.hideTowerHoverTip();
    }
    this.orbitControls.update();
    this.renderer.render(this.scene, this.camera);
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
        const { root, hpBarY } = createEnemyVisual(e.enemyType);
        const bar = makeBarBillboard(
          0.52,
          0.072,
          COLORS.enemyHpBarBg,
          COLORS.enemyHpBarFill,
        );
        bar.group.position.set(0, hpBarY, 0);
        root.add(bar.group);
        this.scene.add(root);
        vis = { root, bar };
        this.enemyObjects.set(id, vis);
      }
      vis.root.position.set(w.x, w.y, w.z);
      const hpRatio = e.maxHp > 0 ? e.hp / e.maxHp : 0;
      vis.bar.setFillRatio(hpRatio);
      vis.bar.group.quaternion.copy(this.camera.quaternion);
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
        const tint = DEFENSE_TOWER_COLOR[d.type];
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.28, 0.55, 10),
          new THREE.MeshStandardMaterial({
            color: tint,
            emissive: tint,
            emissiveIntensity: 0.2,
          }),
        );
        tower.userData.kind = "defense_tower";
        tower.userData.defenseId = d.id;
        root.add(tower);
        const bar = makeBarBillboard(
          0.44,
          0.062,
          COLORS.cooldownBarBg,
          COLORS.cooldownBarFill,
        );
        bar.group.position.set(0, 0.44, 0);
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
      const mat = vis.tower.material as THREE.MeshStandardMaterial;
      const ready = interval > 0 ? 1 - remaining / interval : 1;
      mat.emissiveIntensity = 0.08 + 0.28 * Math.max(0, Math.min(1, ready));
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
  }

  private applyCombatVfx(): void {
    const cannonBlasts: { gx: number; gz: number; radiusTiles: number }[] = [];
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
      for (const h of evt.hits) {
        pts.push(
          worldFromGrid(h.position[0], h.position[1], this.doc, 0.6),
        );
        this.spawnDamagePopup(h.damage, h.position[0], h.position[1]);
      }
      if (evt.chainLightningVfx === true && pts.length >= 2) {
        this.addChain(pts);
      }
      if (evt.cannonBlast) cannonBlasts.push(evt.cannonBlast);
    }
    if (cannonBlasts.length > 0) {
      spawnCannonBlastDecals(
        cannonBlasts,
        this.doc,
        this.scene,
        this.cannonBlastDecals,
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
    }
  }

  private updateUiState(): void {
    const out = this.session.getOutcome();
    const overlay = document.getElementById("overlay");
    const title = document.getElementById("overlayTitle");
    const sub = document.getElementById("overlaySub");
    const send = document.getElementById("sendWave") as HTMLButtonElement | null;
    const sendSub = document.getElementById("sendWaveSub");
    const phase = this.session.waveDirector.getPhase();
    if (send) {
      const prep = phase === "prep";
      send.disabled = !prep || out !== "playing";
      const waveActive =
        out === "playing" && phase !== "prep" && phase !== "completed";
      send.classList.toggle("wave-active", waveActive);
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
    if (out === "playing") {
      overlay?.classList.remove("visible");
      return;
    }
    this.clearPlacementMode();
    overlay?.classList.add("visible");
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
