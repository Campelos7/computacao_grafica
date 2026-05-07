/* ==========================================================================
   NEVE — Pinheiros
   --------------------------------------------------------------------------
   GUIA DE EDIÇÃO:
   - Espessura do tronco: 1.º/2.º parâmetros CylinderGeometry
   - Camadas da copa: array de objetos {y, r, h}
   - Neve no topo: caps de ConeGeometry
   ========================================================================== */
import * as THREE from 'three';

export function createPine(x, z, scale, mats) {
  const g = new THREE.Group(); g.name = 'snow-pine';

  /* ── Tronco ── */
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08 * scale, 0.14 * scale, 2.0 * scale, 6), mats.trunk);
  trunk.position.y = 1.0 * scale; trunk.castShadow = true; g.add(trunk);

  /* ── Camadas da copa (cone + neve no topo) ── */
  const layers = [
    { y: 1.8, r: 0.9, h: 1.0 },
    { y: 2.4, r: 0.7, h: 0.8 },
    { y: 2.9, r: 0.5, h: 0.65 },
    { y: 3.3, r: 0.3, h: 0.5 },
  ];
  for (const l of layers) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(l.r * scale, l.h * scale, 8), mats.pine);
    cone.position.y = l.y * scale; cone.castShadow = true;
    cone.name = 'pine-layer'; g.add(cone);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(l.r * 0.65 * scale, l.h * 0.25 * scale, 8), mats.snow);
    cap.position.y = (l.y + l.h * 0.35) * scale; g.add(cap);
  }

  /* ── Ponta de gelo ── */
  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.08 * scale, 0), mats.ice);
  tip.position.y = 3.7 * scale; tip.name = 'pine-tip'; g.add(tip);

  /* ── Neve na base ── */
  const baseSnow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8 * scale, 1.0 * scale, 0.12 * scale, 10), mats.snow);
  baseSnow.position.y = 0.06 * scale; baseSnow.receiveShadow = true; g.add(baseSnow);

  g.position.set(x, 0, z); return g;
}
