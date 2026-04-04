import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import { GameSession } from "../game/game-session.js";
import { MVP_ARC_SPINE_BUILD_COST } from "../game/mvp-constants.js";
import { buildMapBoard, worldFromGrid } from "./board.js";
import {
  COLORS,
  CHAIN_FX_DURATION,
  DAMAGE_POP_DURATION_SEC,
} from "./constants.js";

export class GameApp {
  readonly session: GameSession;
  private readonly doc: MapDocument;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private clock = new THREE.Clock();
  private slotEntries: { mesh: THREE.Mesh; gx: number; gz: number }[] = [];
  private selectedSlot: { gx: number; gz: number } | null = null;
  private enemyObjects = new Map<string, THREE.Mesh>();
  private defenseObjects = new Map<string, THREE.Mesh>();
  private chainLines: { obj: THREE.Line; t: number }[] = [];
  private nextDefenseId = 1;
  private readonly mount: HTMLElement;

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

    const { root, slots } = buildMapBoard(doc);
    this.scene.add(root);
    this.slotEntries = slots;

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

    window.addEventListener("resize", () => this.onResize());
    this.renderer.domElement.addEventListener("pointerdown", (ev) =>
      this.onPointerDown(ev),
    );
    document.getElementById("buildBtn")?.addEventListener("click", () =>
      this.onBuild(),
    );
    document.getElementById("sendWave")?.addEventListener("click", () =>
      this.onSendWave(),
    );
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

  private onPointerDown(e: PointerEvent): void {
    if (this.session.getOutcome() !== "playing") return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.slotEntries.map((s) => s.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return;
    const m = hits[0]!.object as THREE.Mesh;
    this.selectedSlot = { gx: m.userData.gx as number, gz: m.userData.gz as number };
    this.updateSlotHighlight();
    document.getElementById("panel")?.classList.add("visible");
    this.refreshBuildButton();
  }

  private updateSlotHighlight(): void {
    for (const { mesh, gx, gz } of this.slotEntries) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const sel =
        this.selectedSlot?.gx === gx && this.selectedSlot?.gz === gz;
      mat.emissive.setHex(sel ? COLORS.slotSelected : COLORS.slot);
      mat.emissiveIntensity = sel ? 0.55 : 0.25;
    }
  }

  private onBuild(): void {
    if (this.session.getOutcome() !== "playing" || !this.selectedSlot) return;
    const id = `def_${this.nextDefenseId++}`;
    const ok = this.session.tryPurchaseArcSpineL1(id, [
      this.selectedSlot.gx,
      this.selectedSlot.gz,
    ]);
    if (ok) {
      document.getElementById("panel")?.classList.remove("visible");
      this.selectedSlot = null;
      this.updateSlotHighlight();
    }
    this.refreshBuildButton();
    this.updateHud();
  }

  private onSendWave(): void {
    this.session.startWaveEarly();
  }

  private refreshBuildButton(): void {
    const btn = document.getElementById("buildBtn") as HTMLButtonElement | null;
    if (!btn) return;
    btn.disabled =
      this.session.economy.getShells() < MVP_ARC_SPINE_BUILD_COST ||
      this.session.getOutcome() !== "playing";
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
    this.updateUiState();
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
    const shells = document.getElementById("shells");
    const tide = document.getElementById("tide");
    const castle = document.getElementById("castle");
    if (shells) shells.textContent = `🐚 ${this.session.economy.getShells()}`;
    if (tide) {
      const phase = this.session.waveDirector.getPhase();
      const n = this.session.getTideDisplayNumber();
      tide.textContent =
        phase === "completed"
          ? "TIDE —"
          : `TIDE ${n} (${phase.toUpperCase()})`;
    }
    if (castle) {
      const c = this.session.castle;
      castle.textContent = `♥ ${c.getCurrentHp()}/${c.maxHp}`;
    }
  }

  private updateUiState(): void {
    const out = this.session.getOutcome();
    const overlay = document.getElementById("overlay");
    const title = document.getElementById("overlayTitle");
    const sub = document.getElementById("overlaySub");
    const send = document.getElementById("sendWave") as HTMLButtonElement | null;
    if (send) {
      const prep = this.session.waveDirector.getPhase() === "prep";
      send.disabled = !prep || out !== "playing";
    }
    if (out === "playing") {
      overlay?.classList.remove("visible");
      return;
    }
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
