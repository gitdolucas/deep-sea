import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { MapDocument } from "../game/map-types.js";
import { GameSession } from "../game/game-session.js";
import { arcSpineChainSearchRadius } from "../game/defense-controller.js";
import { attackRangeTiles } from "../game/damage-resolver.js";
import { MVP_ARC_SPINE_BUILD_COST } from "../game/mvp-constants.js";
import type { DefenseTypeKey } from "../game/types.js";
import { buildMapBoard, worldFromGrid } from "./board.js";
import {
  COLORS,
  CHAIN_FX_DURATION,
  DAMAGE_POP_DURATION_SEC,
} from "./constants.js";

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
  private placementType: DefenseTypeKey | null = null;
  private enemyObjects = new Map<string, THREE.Mesh>();
  private defenseObjects = new Map<string, THREE.Mesh>();
  private chainLines: { obj: THREE.Line; t: number }[] = [];
  private nextDefenseId = 1;
  private readonly mount: HTMLElement;
  private readonly orbitControls: OrbitControls;
  private slotPointerStart: { x: number; y: number } | null = null;
  /** For shell stat row flash when balance changes. */
  private prevShells: number | null = null;

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

    const attackR = attackRangeTiles("arc_spine", 1);
    const chainR = arcSpineChainSearchRadius(1);
    const primaryRing = makeRangeRingMesh(
      Math.max(0.04, attackR - 0.1),
      attackR + 0.1,
      COLORS.rangePreviewPrimary,
      0.45,
    );
    const chainRing = makeRangeRingMesh(
      Math.max(0.04, chainR - 0.08),
      chainR + 0.08,
      COLORS.rangePreviewChain,
      0.35,
    );
    this.rangePreviewGroup.add(chainRing);
    this.rangePreviewGroup.add(primaryRing);
    this.rangePreviewGroup.visible = false;
    this.scene.add(this.rangePreviewGroup);

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

    const cx = (gw - 1) / 2;
    const cz = (gd - 1) / 2;
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    this.camera.position.set(cx + 6, 14, cz + 12);
    this.camera.lookAt(cx, 0, cz);

    this.orbitControls = new OrbitControls(
      this.camera,
      this.renderer.domElement,
    );
    this.orbitControls.target.set(cx, 0, cz);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.maxPolarAngle = Math.PI / 2 - 0.06;
    this.orbitControls.minDistance = 4;
    this.orbitControls.maxDistance = 72;
    this.orbitControls.update();
    this.syncOrbitWithPlacement();

    this.renderer.domElement.addEventListener("contextmenu", (ev) =>
      ev.preventDefault(),
    );
    window.addEventListener("resize", () => this.onResize());
    this.renderer.domElement.addEventListener("pointerdown", (ev) =>
      this.onSlotPointerDown(ev),
    );
    this.renderer.domElement.addEventListener("pointermove", (ev) =>
      this.onCanvasPointerMove(ev),
    );
    window.addEventListener("pointerup", (ev) => this.onSlotPointerUp(ev));
    window.addEventListener("pointercancel", () => {
      this.slotPointerStart = null;
    });
    window.addEventListener("keydown", (ev) => this.onKeyDown(ev));
    document.getElementById("sendWave")?.addEventListener("click", () =>
      this.onSendWave(),
    );
    document.getElementById("invArcSpine")?.addEventListener("click", () =>
      this.onInventoryArcSpineClick(),
    );
    document.getElementById("invCancel")?.addEventListener("click", () =>
      this.clearPlacementMode(),
    );
    this.refreshInventoryUi();
  }

  start(): void {
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.frame());
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

  private onInventoryArcSpineClick(): void {
    if (this.session.getOutcome() !== "playing") return;
    const shells = this.session.economy.getShells();
    if (shells < MVP_ARC_SPINE_BUILD_COST) return;
    if (this.placementType === "arc_spine") {
      this.clearPlacementMode();
    } else {
      this.placementType = "arc_spine";
      this.syncOrbitWithPlacement();
      this.refreshInventoryUi();
    }
  }

  private clearPlacementMode(): void {
    this.placementType = null;
    this.rangePreviewGroup.visible = false;
    this.syncOrbitWithPlacement();
    this.refreshInventoryUi();
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

  private onCanvasPointerMove(e: PointerEvent): void {
    if (
      this.placementType !== "arc_spine" ||
      this.session.getOutcome() !== "playing"
    ) {
      this.rangePreviewGroup.visible = false;
      return;
    }
    const el = this.renderer.domElement;
    const r = el.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    ) {
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

    if (this.placementType !== "arc_spine") return;

    const cell = this.pickGridCell(e);
    if (!cell) return;
    if (!this.canPlaceTower(cell.gx, cell.gz)) return;

    const id = `def_${this.nextDefenseId++}`;
    const ok = this.session.tryPurchaseArcSpineL1(id, [
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
    const canAfford = shells >= MVP_ARC_SPINE_BUILD_COST;
    const selected = this.placementType === "arc_spine";
    const btn = document.getElementById(
      "invArcSpine",
    ) as HTMLButtonElement | null;
    if (btn) {
      // Stay enabled while selected so player can deselect even if shells dropped below cost.
      btn.disabled = !playing || (!canAfford && !selected);
      btn.textContent = selected ? "Selected" : "Select";
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
    }
    const card = document.querySelector(
      "[data-defense-card=\"arc_spine\"]",
    );
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

    const statusEl = document.getElementById("arcSpineStatus");
    let statusText: string;
    if (!playing) {
      statusText = "Match ended";
    } else if (selected) {
      statusText = `Click map to place (${MVP_ARC_SPINE_BUILD_COST} shells)`;
    } else if (canAfford) {
      statusText = `Available · ${MVP_ARC_SPINE_BUILD_COST} shells`;
    } else {
      statusText = `Need ${MVP_ARC_SPINE_BUILD_COST - shells} more shells`;
    }
    if (statusEl) statusEl.textContent = statusText;
    if (btn) btn.title = statusText;

    const hint = document.getElementById("placementHint");
    const cancel = document.getElementById("invCancel");
    const placing = this.placementType === "arc_spine";
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
    this.applyCombatVfx();
    this.updateChainFx(dt);
    this.updateHud();
    this.refreshInventoryUi();
    this.updateUiState();
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
      let mesh = this.enemyObjects.get(id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.35, 0.45),
          new THREE.MeshStandardMaterial({ color: COLORS.stoneclaw }),
        );
        this.scene.add(mesh);
        this.enemyObjects.set(id, mesh);
      }
      mesh.position.set(w.x, w.y, w.z);
    }
    for (const [id, mesh] of [...this.enemyObjects]) {
      if (!alive.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.enemyObjects.delete(id);
      }
    }
  }

  private syncDefenses(): void {
    const wanted = new Set<string>();
    for (const d of this.session.map.getDefenses()) {
      wanted.add(d.id);
      const w = worldFromGrid(d.position[0], d.position[1], this.doc, 0.35);
      let mesh = this.defenseObjects.get(d.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.28, 0.55, 10),
          new THREE.MeshStandardMaterial({
            color: COLORS.tower,
            emissive: COLORS.tower,
            emissiveIntensity: 0.2,
          }),
        );
        this.scene.add(mesh);
        this.defenseObjects.set(d.id, mesh);
      }
      mesh.position.set(w.x, w.y, w.z);
    }
    for (const [id, mesh] of [...this.defenseObjects]) {
      if (!wanted.has(id)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.defenseObjects.delete(id);
      }
    }
  }

  private applyCombatVfx(): void {
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
      if (pts.length >= 2) this.addChain(pts);
    }
  }

  private addChain(points: THREE.Vector3[]): void {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: COLORS.chain });
    const line = new THREE.Line(geom, mat);
    this.scene.add(line);
    this.chainLines.push({ obj: line, t: CHAIN_FX_DURATION });
  }

  private updateChainFx(dt: number): void {
    this.chainLines = this.chainLines.filter((c) => {
      c.t -= dt;
      if (c.t <= 0) {
        this.scene.remove(c.obj);
        c.obj.geometry.dispose();
        (c.obj.material as THREE.Material).dispose();
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
