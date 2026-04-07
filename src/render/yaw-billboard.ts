import * as THREE from "three";

const _worldPos = new THREE.Vector3();
const _parentWorldQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);

/**
 * Orients a vertical {@link THREE.PlaneGeometry} mesh so local +Z faces the camera on XZ,
 * keeping the silhouette grounded in world Y (unlike {@link THREE.Sprite}, which tilts with the camera plane).
 *
 * Composes with `parent` world rotation (e.g. cannon-lift twist): desired world quat = yaw only.
 */
export function syncVerticalBillboardMesh(
  mesh: THREE.Mesh,
  parent: THREE.Object3D,
  camera: THREE.Camera,
): void {
  parent.updateWorldMatrix(true, false);
  mesh.getWorldPosition(_worldPos);
  const dx = camera.position.x - _worldPos.x;
  const dz = camera.position.z - _worldPos.z;
  const yaw = Math.atan2(dx, dz);
  _yawQuat.setFromAxisAngle(_yAxis, yaw);
  parent.getWorldQuaternion(_parentWorldQuat);
  mesh.quaternion.copy(_parentWorldQuat).invert().multiply(_yawQuat);
}
