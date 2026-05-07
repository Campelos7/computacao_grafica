/* ==========================================================================
   NEVE — Cristais de Gelo
   --------------------------------------------------------------------------
   GUIA DE EDIÇÃO:
   - Espessura: 1.º/2.º parâmetros CylinderGeometry (0.08 * scale)
   - Altura: 3.º parâmetro (0.8 * scale)
   - Luz: PointLight intensidade (0.6) e alcance (4)
   ========================================================================== */
import * as THREE from 'three';

export function createIceCrystal(x, z, scale, mats) {
  const g = new THREE.Group(); g.name = 'snow-crystal';

  /* ── Cristal principal ── */
  const crystal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.8 * scale, 6), mats.ice);
  crystal.position.y = 0.4 * scale; crystal.castShadow = true; g.add(crystal);

  /* ── Ponta do cristal ── */
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.08 * scale, 0.2 * scale, 6), mats.ice);
  top.position.y = 0.9 * scale; g.add(top);

  /* ── Sub-cristais laterais ── */
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
    const sc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.4 * scale, 6), mats.ice);
    sc.position.set(Math.cos(a) * 0.12 * scale, 0.25 * scale, Math.sin(a) * 0.12 * scale);
    sc.rotation.z = Math.cos(a) * 0.5; sc.rotation.x = Math.sin(a) * 0.5; g.add(sc);
  }

  /* ── Luz pontual (brilho azul) ── */
  const light = new THREE.PointLight(0x88ccff, 0.6, 4);
  light.position.y = 0.5 * scale; light.name = 'crystal-light'; g.add(light);

  g.position.set(x, 0, z); return g;
}
