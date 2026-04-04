import * as THREE from "three";
import type { MapDocument } from "../game/map-types.js";
import { COLORS } from "./constants.js";

export type SlotPick = { mesh: THREE.Mesh; gx: number; gz: number };

function gridXZ(gw: number, gd: number): THREE.Vector3 {
  return new THREE.Vector3((gw - 1) / 2, 0, (gd - 1) / 2);
}

/**
 * Builds floor, path, slots, spawn, castle. Slot meshes are raycast targets.
 */
export function buildMapBoard(
  doc: MapDocument,
): { root: THREE.Group; slots: SlotPick[] } {
  const root = new THREE.Group();
  const [gw, gd] = doc.gridSize;
  const origin = gridXZ(gw, gd);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(gw + 2, gd + 2),
    new THREE.MeshStandardMaterial({
      color: COLORS.floor,
      roughness: 0.9,
      metalness: 0.05,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(origin.x, 0, origin.z);
  root.add(floor);

  const mainPath = doc.paths.find((p) => p.id === "path_main") ?? doc.paths[0];
  if (mainPath) {
    for (let i = 1; i < mainPath.waypoints.length; i++) {
      const a = mainPath.waypoints[i - 1]!;
      const b = mainPath.waypoints[i]!;
      const ax = a[0] - origin.x;
      const az = a[1] - origin.z;
      const bx = b[0] - origin.x;
      const bz = b[1] - origin.z;
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz) || 0.1;
      const midX = (ax + bx) / 2;
      const midZ = (az + bz) / 2;
      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.08, 0.45),
        new THREE.MeshStandardMaterial({
          color: COLORS.path,
          roughness: 0.85,
        }),
      );
      seg.position.set(midX, 0.06, midZ);
      seg.rotation.y = -Math.atan2(dz, dx);
      root.add(seg);

      const rim = new THREE.Mesh(
        new THREE.BoxGeometry(len + 0.05, 0.04, 0.55),
        new THREE.MeshStandardMaterial({
          color: COLORS.pathEdge,
          emissive: COLORS.pathEdge,
          emissiveIntensity: 0.15,
        }),
      );
      rim.position.set(midX, 0.04, midZ);
      rim.rotation.y = seg.rotation.y;
      root.add(rim);
    }
  }

  const slots: SlotPick[] = [];
  for (const s of doc.buildSlots) {
    const sx = s.position[0] - origin.x;
    const sz = s.position[1] - origin.z;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.12, 0.85),
      new THREE.MeshStandardMaterial({
        color: COLORS.slot,
        emissive: COLORS.slot,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.45,
      }),
    );
    mesh.position.set(sx, 0.08, sz);
    mesh.userData.kind = "slot";
    mesh.userData.gx = s.position[0];
    mesh.userData.gz = s.position[1];
    root.add(mesh);
    slots.push({ mesh, gx: s.position[0], gz: s.position[1] });
  }

  const spawn = doc.spawnPoints[0];
  if (spawn) {
    const sx = spawn.position[0] - origin.x;
    const sz = spawn.position[1] - origin.z;
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.45, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: COLORS.spawn, roughness: 1 }),
    );
    hole.position.set(sx, 0.1, sz);
    root.add(hole);
  }

  const c = doc.castle.position;
  const cx = c[0] - origin.x;
  const cz = c[1] - origin.z;
  const keep = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.9, 1.1),
    new THREE.MeshStandardMaterial({ color: COLORS.castle, roughness: 0.6 }),
  );
  keep.position.set(cx, 0.45, cz);
  root.add(keep);
  const crystal = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, 0.6, 8),
    new THREE.MeshStandardMaterial({
      color: COLORS.crystal,
      emissive: COLORS.crystal,
      emissiveIntensity: 0.6,
    }),
  );
  crystal.position.set(cx, 1, cz);
  root.add(crystal);

  root.position.set(0, 0, 0);
  return { root, slots };
}

export function worldFromGrid(
  gx: number,
  gz: number,
  doc: MapDocument,
  y: number,
): THREE.Vector3 {
  const [gw, gd] = doc.gridSize;
  const origin = gridXZ(gw, gd);
  return new THREE.Vector3(gx - origin.x, y, gz - origin.z);
}
