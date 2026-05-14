/**
 * @fileoverview Mesh e animação da **comida** (geometria torus / “donut” neon) — não é power-up;
 * pickups no mapa estão em `PowerUps.js` (só shield).
 */
import * as THREE from 'three';
import { gridCellCenterWorldX, gridCellCenterWorldZ } from '../utils/helpers.js';
import { PICKUP_MESH_BASE_Y } from './constants.js';

/**
 * Cria o mesh 3D da comida (TorusGeometry — “donut” neon).
 *
 * @param {THREE.Group} group — grupo `food-group` onde o mesh é adicionado
 * @returns {THREE.Mesh}
 */
export function createFoodTorusMesh(group) {
  const geo = new THREE.TorusGeometry(0.3, 0.14, 16, 28);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff00ff,
    emissive: 0xff00ff,
    emissiveIntensity: 0.8,
    roughness: 0.15,
    metalness: 0.5,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = PICKUP_MESH_BASE_Y;
  mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = false;
  mesh.name = 'food';
  group.add(mesh);
  return mesh;
}

/**
 * Remove o mesh da comida do grupo e liberta GPU.
 *
 * @param {THREE.Group} group
 * @param {THREE.Mesh|null} mesh
 * @returns {void}
 */
export function disposeFoodTorusMesh(group, mesh) {
  if (!mesh) return;
  group.remove(mesh);
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) mesh.material.dispose();
}

/**
 * Actualiza X/Z do mesh para o centro mundo da célula de grelha.
 *
 * @param {THREE.Mesh} mesh
 * @param {{ x: number, z: number }} foodCell
 * @returns {void}
 */
export function syncFoodMeshGridPosition(mesh, foodCell) {
  mesh.position.x = gridCellCenterWorldX(foodCell.x);
  mesh.position.z = gridCellCenterWorldZ(foodCell.z);
}

/**
 * Animação por frame: rotação e pulso do torus da comida.
 *
 * @param {THREE.Mesh|null} mesh
 * @param {number} elapsed — tempo total (s)
 * @returns {void}
 */
export function tickFoodMeshAnimation(mesh, elapsed) {
  if (!mesh) return;
  mesh.rotation.y += 0.04;
  mesh.rotation.x = Math.PI / 2 + Math.sin(elapsed * 2.8) * 0.18;
  mesh.scale.setScalar(1 + Math.sin(elapsed * 5.5) * 0.15);
}
