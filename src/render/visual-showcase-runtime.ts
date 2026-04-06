import type { ShaderMaterial } from "three";

export type VisualShowcaseRuntimeApi = {
  setFxTick: (v: number) => void;
  getFxTick: () => number;
  syncFxTickToDom: () => void;
  getSeabedMaterial: () => ShaderMaterial;
};

let runtime: VisualShowcaseRuntimeApi | null = null;

export function registerVisualShowcaseRuntime(
  api: VisualShowcaseRuntimeApi | null,
): void {
  runtime = api;
}

export function getVisualShowcaseRuntime(): VisualShowcaseRuntimeApi | null {
  return runtime;
}
