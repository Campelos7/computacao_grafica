/* ==========================================================================
   DESERTO — Materiais Partilhados
   --------------------------------------------------------------------------
   Materiais base do bioma deserto. Importado por todos os objetos do deserto.
   ========================================================================== */
import * as THREE from 'three';

export function createDesertMaterials(loadImportedTexture) {
  const sandstoneTex = loadImportedTexture('sandstone', 'textures/sandstone.png', 1, 2);

  return {
    /* ── Rocha clara (sandstone) ── */
    rock: new THREE.MeshStandardMaterial({
      map: sandstoneTex, color: 0xaa8855,
      emissive: 0x2a1a08, emissiveIntensity: 0.08,
      roughness: 0.95, metalness: 0.05,
    }),
    /* ── Rocha escura (camadas/detalhe) ── */
    darkRock: new THREE.MeshStandardMaterial({
      color: 0x6b5530, roughness: 0.95, metalness: 0.05,
    }),
    /* ── Cacto ── */
    cactus: new THREE.MeshStandardMaterial({
      color: 0x2a6622, emissive: 0x0a2208, emissiveIntensity: 0.08, roughness: 0.85,
    }),
    /* ── Flor do cacto ── */
    cactusFlower: new THREE.MeshStandardMaterial({
      color: 0xff66aa, emissive: 0xcc3388, emissiveIntensity: 0.4, roughness: 0.4,
    }),
    /* ── Osso/crânio ── */
    bone: new THREE.MeshStandardMaterial({
      color: 0xddccaa, emissive: 0x332211, emissiveIntensity: 0.05, roughness: 0.8,
    }),
    /* ── Areia (dunas) ── */
    sand: new THREE.MeshStandardMaterial({
      color: 0xbb9955, roughness: 0.95,
    }),
    /* ── Palmeira (tronco) ── */
    palmTrunk: new THREE.MeshStandardMaterial({
      color: 0x6a5030, roughness: 0.9, metalness: 0.0,
    }),
    /* ── Palmeira (folha) ── */
    palmLeaf: new THREE.MeshStandardMaterial({
      color: 0x2a7733, emissive: 0x0a3311, emissiveIntensity: 0.1,
      roughness: 0.8, side: THREE.DoubleSide,
    }),
    /* ── Água do oásis ── */
    oasisWater: new THREE.MeshStandardMaterial({
      color: 0x22aaaa, emissive: 0x116666, emissiveIntensity: 0.2,
      roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.55,
    }),
  };
}
