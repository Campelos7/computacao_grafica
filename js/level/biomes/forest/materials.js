/* ==========================================================================
   FLORESTA — Materiais Partilhados
   --------------------------------------------------------------------------
   Todos os materiais base do bioma floresta ficam aqui.
   Qualquer objeto da floresta importa daqui em vez de criar materiais soltos.
   Para mudar o "look" geral do bioma, altera cores/texturas neste ficheiro.
   ========================================================================== */
import * as THREE from 'three';

/**
 * Cria e devolve todos os materiais da floresta.
 * @param {Function} loadImportedTexture — helper do LevelManager
 */
export function createForestMaterials(loadImportedTexture) {
  /* ── Texturas importadas ── */
  const barkTex      = loadImportedTexture('bark', 'textures/bark.png', 1, 2);
  const mossGroundTex = loadImportedTexture('moss_ground', 'textures/moss_ground.png', 2, 2);

  return {
    /* ── Tronco / Casca ── */
    trunk: new THREE.MeshStandardMaterial({
      map: barkTex, color: 0x6a5240,
      emissive: 0x1a1008, emissiveIntensity: 0.1,
      roughness: 0.92, metalness: 0.0,
    }),

    /* ── Folha clara ── */
    leaf: new THREE.MeshStandardMaterial({
      color: 0x228844, emissive: 0x114422, emissiveIntensity: 0.15,
      roughness: 0.8, metalness: 0.0,
    }),

    /* ── Folha escura (variante) ── */
    darkLeaf: new THREE.MeshStandardMaterial({
      color: 0x1a6633, emissive: 0x0d3319, emissiveIntensity: 0.1,
      roughness: 0.85, metalness: 0.0,
    }),

    /* ── Musgo ── */
    moss: new THREE.MeshStandardMaterial({
      map: mossGroundTex, color: 0x446622,
      emissive: 0x223311, emissiveIntensity: 0.12,
      roughness: 0.9, metalness: 0.0,
    }),

    /* ── Frutos vermelhos ── */
    fruit: new THREE.MeshStandardMaterial({
      color: 0xff4422, emissive: 0xaa2211, emissiveIntensity: 0.3,
      roughness: 0.3, metalness: 0.1,
    }),

    /* ── Feto / planta baixa ── */
    fern: new THREE.MeshStandardMaterial({
      color: 0x33aa44, emissive: 0x115522, emissiveIntensity: 0.1,
      roughness: 0.85, side: THREE.DoubleSide,
    }),

    /* ── Rocha genérica ── */
    rock: new THREE.MeshStandardMaterial({
      color: 0x555544, roughness: 0.95, metalness: 0.05,
    }),

    /* ── Água do riacho ── */
    water: new THREE.MeshStandardMaterial({
      color: 0x2288aa, emissive: 0x115566, emissiveIntensity: 0.2,
      roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6,
    }),

    /* ── Flor (vários tons — usa .clone() e altera color) ── */
    flower: new THREE.MeshStandardMaterial({
      color: 0xff88cc, emissive: 0xaa4488, emissiveIntensity: 0.25,
      roughness: 0.4, metalness: 0.0,
    }),

    /* ── Arbusto ── */
    bush: new THREE.MeshStandardMaterial({
      color: 0x1d5c2e, emissive: 0x0e2e17, emissiveIntensity: 0.1,
      roughness: 0.9, metalness: 0.0,
    }),
  };
}
