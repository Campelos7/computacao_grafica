/**
 * Power-up activo: shield. Código de anéis/portal removido ou nunca implementado.
 *
 * @fileoverview Power-ups no mapa: apenas **shield** (orbe icosaédrico), separado da
 * **comida** (torus em `Food.js`). Não há portal nem outros pickups neste módulo.
 */
import * as THREE from 'three';
import { gridCellCenterWorldX, gridCellCenterWorldZ } from '../utils/helpers.js';
import { PICKUP_MESH_BASE_Y } from './constants.js';

/**
 * Cria o mesh 3D do shield (IcosahedronGeometry — orbe translúcido).
 *
 * @param {THREE.Group} group
 * @returns {THREE.Mesh}
 */
export function createShieldOrbMesh(group) {
  const geo = new THREE.IcosahedronGeometry(0.32, 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x0088ff,
    emissiveIntensity: 0.9,
    roughness: 0.05,
    metalness: 0.6,
    transparent: true,
    opacity: 0.85,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = PICKUP_MESH_BASE_Y;
  mesh.castShadow = false;
  mesh.name = 'shield-orb';
  group.add(mesh);
  return mesh;
}

/**
 * Remove shield do grupo e liberta recursos.
 *
 * @param {THREE.Group} group
 * @param {THREE.Mesh|null} mesh
 * @returns {void}
 */
export function disposeShieldOrbMesh(group, mesh) {
  if (!mesh) return;
  group.remove(mesh);
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) mesh.material.dispose();
}

/**
 * @param {THREE.Mesh} mesh
 * @param {{ x: number, z: number }} shieldCell
 * @returns {void}
 */
export function syncShieldMeshGridPosition(mesh, shieldCell) {
  mesh.position.x = gridCellCenterWorldX(shieldCell.x);
  mesh.position.z = gridCellCenterWorldZ(shieldCell.z);
}

/**
 * Animação por frame do orbe (rotação + flutuação em Y + escala).
 *
 * @param {THREE.Mesh|null} mesh
 * @param {number} elapsed
 * @returns {void}
 */
export function tickShieldMeshAnimation(mesh, elapsed) {
  if (!mesh) return;
  mesh.rotation.y += 0.025;
  mesh.rotation.x += 0.015;
  mesh.position.y = PICKUP_MESH_BASE_Y + Math.sin(elapsed * 2) * 0.15;
  mesh.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.1);
}

/**
 * O nível permite shield na lista de power-ups?
 *
 * @param {string[]} activePowerupIds
 * @returns {boolean}
 */
export function shieldIsAllowedOnLevel(activePowerupIds) {
  return Array.isArray(activePowerupIds) && activePowerupIds.includes('shield');
}
