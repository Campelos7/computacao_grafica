/* ==========================================================================
   NEVE — Materiais Partilhados
   --------------------------------------------------------------------------
   Materiais base do bioma neve. Importado por todos os objetos da neve.
   ========================================================================== */
import * as THREE from 'three';

export function createSnowMaterials(loadImportedTexture) {
  const iceTex = loadImportedTexture('ice', 'textures/ice.png', 1, 1);

  return {
    trunk: new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.9 }),
    pine: new THREE.MeshStandardMaterial({
      color: 0x1a4428, emissive: 0x0a2214, emissiveIntensity: 0.08, roughness: 0.85,
    }),
    snow: new THREE.MeshStandardMaterial({
      color: 0xeef4ff, emissive: 0x8899aa, emissiveIntensity: 0.15,
      roughness: 0.6, metalness: 0.1,
    }),
    ice: new THREE.MeshStandardMaterial({
      map: iceTex, color: 0xaaddff, emissive: 0x4488cc, emissiveIntensity: 0.4,
      roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.7,
    }),
    rock: new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.9 }),
    frozenWater: new THREE.MeshStandardMaterial({
      color: 0x99ccee, emissive: 0x4488aa, emissiveIntensity: 0.3,
      roughness: 0.02, metalness: 0.4, transparent: true, opacity: 0.75,
    }),
  };
}
