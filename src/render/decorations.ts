import * as THREE from "three";
import type {
  DecorationDefinition,
  DecorationTypeKey,
  MapDocument,
} from "../game/map-types.js";
import { mapGridOrigin } from "./board.js";
import { COLORS } from "./constants.js";

/** Top of grid cell tiles — matches `CELL_BOX` height in board.ts. */
const FLOOR_TOP_Y = 0.055;

function stdMat(
  color: number,
  opts?: {
    emissive?: number;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
    transparent?: boolean;
    opacity?: number;
  },
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts?.roughness ?? 0.82,
    metalness: opts?.metalness ?? 0.04,
    emissive: opts?.emissive ?? 0x000000,
    emissiveIntensity: opts?.emissiveIntensity ?? 0,
    transparent: opts?.transparent ?? false,
    opacity: opts?.opacity ?? 1,
  });
}

/** Local-space placeholder (origin at ground contact). */
function placeholderFor(type: DecorationTypeKey): THREE.Object3D {
  const root = new THREE.Group();

  switch (type) {
    case "coral_branch": {
      const armMat = stdMat(COLORS.pathEdge, { roughness: 0.75 });
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.07, 0.35, 6),
        armMat,
      );
      trunk.position.y = 0.175;
      root.add(trunk);
      const b1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 0.28, 5),
        armMat,
      );
      b1.position.set(0.1, 0.32, 0.05);
      b1.rotation.z = -0.65;
      b1.rotation.y = 0.4;
      root.add(b1);
      const b2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.035, 0.22, 5),
        armMat,
      );
      b2.position.set(-0.08, 0.38, 0.04);
      b2.rotation.z = 0.55;
      b2.rotation.y = -0.35;
      root.add(b2);
      break;
    }
    case "coral_fan": {
      const fan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.15, 0.06, 12),
        stdMat(COLORS.pathCellCorner, {
          emissive: COLORS.pathCellCorner,
          emissiveIntensity: 0.08,
        }),
      );
      fan.rotation.x = Math.PI / 2;
      fan.position.y = 0.06;
      root.add(fan);
      break;
    }
    case "kelp_cluster": {
      const mat = stdMat(0x1a5c42, { roughness: 0.9 });
      for (let i = 0; i < 5; i++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.75 + i * 0.04, 0.04),
          mat,
        );
        const a = (i / 5) * Math.PI * 2 + 0.3;
        blade.position.set(Math.cos(a) * 0.06, 0.35 + i * 0.02, Math.sin(a) * 0.06);
        blade.rotation.z = 0.12 * Math.sin(a * 2);
        blade.rotation.x = 0.08 * Math.cos(a);
        root.add(blade);
      }
      break;
    }
    case "rock_small": {
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.14, 0),
        stdMat(0x5a534c, { roughness: 0.95 }),
      );
      rock.position.y = 0.1;
      rock.rotation.set(0.2, 0.4, 0.1);
      root.add(rock);
      break;
    }
    case "rock_large": {
      const mat = stdMat(0x4a453e, { roughness: 0.93 });
      const r1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), mat);
      r1.position.set(0, 0.18, 0);
      r1.rotation.set(0.15, 0.5, 0.08);
      root.add(r1);
      const r2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), mat);
      r2.position.set(0.18, 0.1, 0.08);
      r2.rotation.set(-0.1, -0.3, 0.2);
      root.add(r2);
      const r3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), mat);
      r3.position.set(-0.12, 0.08, 0.1);
      root.add(r3);
      break;
    }
    case "shell_pile": {
      const mat = stdMat(COLORS.stoneclawShell, { roughness: 0.78 });
      const positions: [number, number, number, number][] = [
        [0, 0.04, 0, 0.2],
        [0.08, 0.06, 0.05, 0.14],
        [-0.06, 0.05, 0.06, 0.12],
        [0.03, 0.03, -0.07, 0.1],
      ];
      for (const [x, y, z, r] of positions) {
        const shell = new THREE.Mesh(
          new THREE.SphereGeometry(r, 8, 6),
          mat,
        );
        shell.scale.set(1.1, 0.55, 0.85);
        shell.position.set(x, y, z);
        shell.rotation.set(0.4, x * 3, 0.2);
        root.add(shell);
      }
      break;
    }
    case "vent_bubble": {
      const vent = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 0.12, 10),
        stdMat(0x2a3848, { roughness: 0.88 }),
      );
      vent.position.y = 0.06;
      root.add(vent);
      const glow = stdMat(COLORS.crystal, {
        emissive: COLORS.crystal,
        emissiveIntensity: 0.55,
        transparent: true,
        opacity: 0.65,
      });
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.035 + i * 0.01, 8, 8), glow);
        b.position.set(
          (i % 2) * 0.06 - 0.03,
          0.22 + i * 0.07,
          Math.floor(i / 2) * 0.05 - 0.025,
        );
        root.add(b);
      }
      break;
    }
    case "trench_edge": {
      const rimMat = stdMat(0x0d1522, { roughness: 0.92 });
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.55, 0.95),
        rimMat,
      );
      wall.position.set(0.05, 0.275, 0);
      root.add(wall);
      const lip = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.08, 1.05),
        stdMat(0x151d2e, { roughness: 0.88 }),
      );
      lip.position.set(-0.08, 0.52, 0);
      lip.rotation.z = 0.12;
      root.add(lip);
      break;
    }
    case "anemone": {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.1, 10),
        stdMat(0x3a2060, { roughness: 0.8 }),
      );
      base.position.y = 0.05;
      root.add(base);
      const tentMat = stdMat(0x7b2fff, {
        emissive: 0x5a1fcc,
        emissiveIntensity: 0.35,
        roughness: 0.65,
      });
      const n = 8;
      for (let i = 0; i < n; i++) {
        const t = new THREE.Mesh(
          new THREE.ConeGeometry(0.025, 0.32, 5),
          tentMat,
        );
        const a = (i / n) * Math.PI * 2;
        t.position.set(Math.cos(a) * 0.06, 0.2, Math.sin(a) * 0.06);
        t.rotation.z = Math.cos(a) * 0.45;
        t.rotation.x = Math.sin(a) * 0.45;
        t.rotation.y = -a;
        root.add(t);
      }
      break;
    }
    case "skull": {
      const bone = stdMat(0xc8c0b8, { roughness: 0.72 });
      const cranium = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 10, 8),
        bone,
      );
      cranium.scale.set(1, 0.85, 1.05);
      cranium.position.y = 0.2;
      root.add(cranium);
      const snout = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.08, 0.14),
        bone,
      );
      snout.position.set(0, 0.12, 0.12);
      root.add(snout);
      const jaw = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.05, 0.1),
        bone,
      );
      jaw.position.set(0, 0.06, 0.06);
      root.add(jaw);
      break;
    }
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }

  return root;
}

function placeDecoration(obj: THREE.Object3D, def: DecorationDefinition, origin: THREE.Vector3): void {
  const [gx, hy, gz] = def.position;
  obj.position.set(gx - origin.x, hy + FLOOR_TOP_Y, gz - origin.z);
  obj.rotation.y = THREE.MathUtils.degToRad(def.rotation);
  const s = def.scale;
  obj.scale.setScalar(s);
}

/**
 * Non-pickable ambiance props from `doc.decorations` (docs/map-schema.md).
 */
export function buildDecorationsGroup(doc: MapDocument): THREE.Group {
  const group = new THREE.Group();
  group.name = "decorations";
  const origin = mapGridOrigin(doc);
  for (const def of doc.decorations) {
    const mesh = placeholderFor(def.type);
    placeDecoration(mesh, def, origin);
    group.add(mesh);
  }
  return group;
}
