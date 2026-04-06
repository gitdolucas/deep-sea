import * as THREE from "three";
import type { MapCellSurface } from "../game/map-cell-surface.js";
import type { PathCellVisualKind } from "../game/path-cells.js";
import type { GridPos } from "../game/types.js";
import { COLORS } from "./constants.js";

const CAP_SIZE = 128;

function hexCss(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function configureCanvasTexture(tex: THREE.CanvasTexture): void {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
}

/**
 * Horizontal cell top caps use a plane with rotation.x = −π/2. Default `CanvasTexture.flipY` uploads
 * with a vertical flip so +gz / −gz arms were mirrored vs grid neighbors on the mesh.
 */
function configureTopCapCanvasTexture(tex: THREE.CanvasTexture): void {
  configureCanvasTexture(tex);
  tex.flipY = false;
  tex.needsUpdate = true;
}

function baseColorForSurface(surface: MapCellSurface): number {
  switch (surface.surfaceKind) {
    case "sand":
      return COLORS.cellEmpty;
    case "path": {
      const sh = surface.pathShape ?? "straight";
      switch (sh) {
        case "straight":
          return COLORS.pathCellStraight;
        case "corner":
          return COLORS.pathCellCorner;
        case "end":
          return COLORS.pathCellEnd;
        case "junction":
          return COLORS.pathCellJunction;
        default:
          return COLORS.pathCellStraight;
      }
    }
    case "decoration":
      return 0x3a2858;
    case "castle":
      return COLORS.castle;
    case "spawn":
      return COLORS.spawn;
    default:
      return COLORS.cellEmpty;
  }
}

/**
 * Canvas: +x matches grid +gx; −y (smaller canvas y) matches grid +gz so cap art lines up with the board PlaneGeometry (XZ).
 */
function offsetToEdge(
  cx: number,
  cy: number,
  w: number,
  margin: number,
  dx: number,
  dz: number,
): [number, number] {
  const r = w / 2 - margin;
  return [cx + dx * r, cy - dz * r];
}

/** One segment per cardinal arm toward a path neighbor — encodes straight, corner, T, cross, and dead-end. */
function drawPathArms(
  c: CanvasRenderingContext2D,
  offsets: readonly GridPos[],
): void {
  if (offsets.length === 0) return;
  const w = CAP_SIZE;
  const cx = w / 2;
  const cy = w / 2;
  const margin = 8;
  c.strokeStyle = "rgba(255, 255, 255, 0.42)";
  c.lineWidth = 5;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  for (const [dx, dz] of offsets) {
    const [px, py] = offsetToEdge(cx, cy, w, margin, dx, dz);
    c.moveTo(cx, cy);
    c.lineTo(px, py);
  }
  c.stroke();
  if (offsets.length === 1) {
    c.beginPath();
    c.arc(cx, cy, w * 0.12, 0, Math.PI * 2);
    c.stroke();
  }
}

export function createCellTopCapTexture(surface: MapCellSurface): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = CAP_SIZE;
  canvas.height = CAP_SIZE;
  const c = canvas.getContext("2d")!;
  const base = baseColorForSurface(surface);
  c.fillStyle = hexCss(base);
  c.fillRect(0, 0, CAP_SIZE, CAP_SIZE);
  if (surface.surfaceKind === "path" && surface.pathNeighborOffsets?.length) {
    drawPathArms(c, surface.pathNeighborOffsets);
  } else if (surface.surfaceKind === "decoration") {
    c.fillStyle = "rgba(255, 255, 255, 0.12)";
    for (let i = 0; i < 6; i++) {
      c.fillRect(12 + i * 18, 20 + (i % 3) * 28, 8, 8);
    }
  } else if (surface.surfaceKind === "castle") {
    c.strokeStyle = "rgba(0, 212, 255, 0.35)";
    c.lineWidth = 4;
    c.strokeRect(16, 16, CAP_SIZE - 32, CAP_SIZE - 32);
  } else if (surface.surfaceKind === "spawn") {
    c.strokeStyle = "rgba(102, 238, 255, 0.5)";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(CAP_SIZE / 2, CAP_SIZE / 2, CAP_SIZE * 0.28, 0, Math.PI * 2);
    c.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  configureTopCapCanvasTexture(tex);
  return tex;
}

const LABEL_H = 48;
const LABEL_W = 220;

export function createLabelSpriteTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = LABEL_W;
  canvas.height = LABEL_H;
  const c = canvas.getContext("2d")!;
  c.clearRect(0, 0, LABEL_W, LABEL_H);
  c.fillStyle = "rgba(5, 13, 26, 0.72)";
  c.fillRect(0, 0, LABEL_W, LABEL_H);
  c.strokeStyle = "rgba(0, 212, 255, 0.45)";
  c.lineWidth = 2;
  c.strokeRect(1, 1, LABEL_W - 2, LABEL_H - 2);
  c.fillStyle = hexCss(COLORS.slot);
  c.font = "bold 22px system-ui, sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, LABEL_W / 2, LABEL_H / 2 + 1);
  const tex = new THREE.CanvasTexture(canvas);
  configureCanvasTexture(tex);
  return tex;
}
