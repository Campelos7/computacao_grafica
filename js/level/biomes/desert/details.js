/* ==========================================================================
   DESERTO — Crânios, Dunas e Pedras Soltas
   --------------------------------------------------------------------------
   Elementos decorativos menores do deserto.
   
   GUIA DE EDIÇÃO:
   - Crânio: tamanho SphereGeometry (0.12)
   - Duna: largura (w), altura (h)
   - Pedras: quantidade no loop, tamanho DodecahedronGeometry
   ========================================================================== */
import * as THREE from 'three';

/** Crânio decorativo (detalhe temático) */
export function createSkull(x, z, mats) {
  const g = new THREE.Group(); g.name = 'desert-skull';
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mats.bone);
  skull.position.y = 0.1; skull.scale.set(1, 0.85, 1.1); g.add(skull);
  for (const ry of [0.4, -0.4]) {
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), mats.bone);
    bone.position.y = 0.02; bone.rotation.z = Math.PI / 2; bone.rotation.y = ry; g.add(bone);
  }
  g.position.set(x, 0, z); return g;
}

/** Duna de areia — w = largura, h = altura */
export function createSandDune(x, z, w, h, mats) {
  const g = new THREE.Group(); g.name = 'desert-dune';
  const dune = new THREE.Mesh(
    new THREE.SphereGeometry(w, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), mats.sand);
  dune.position.y = -0.1; dune.scale.y = h / w;
  dune.receiveShadow = true; g.add(dune);
  g.position.set(x, 0, z); return g;
}

/** Pedras soltas espalhadas pelo chão (instanciadas individualmente) */
export function createScatteredPebbles(complexGroup, half, mats) {
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.12, 0), mats.darkRock);
    s.position.set(
      (Math.random() - 0.5) * (half * 2 + 4),
      0.05 + Math.random() * 0.06,
      (Math.random() - 0.5) * (half * 2 + 4)
    );
    s.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    s.castShadow = true; s.name = 'desert-pebble';
    complexGroup.add(s);
  }
}
