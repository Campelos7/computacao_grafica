/* ==========================================================================
   DESERTO — Cactos
   --------------------------------------------------------------------------
   GUIA DE EDIÇÃO:
   - Espessura do tronco: 1.º/2.º parâmetros (0.1, 0.12)
   - Altura: 3.º parâmetro (1.2 * scale)
   - Braços: espessuras/alturas dos CylinderGeometry dos braços
   ========================================================================== */
import * as THREE from 'three';

export function createCactus(x, z, scale, mats) {
  const g = new THREE.Group(); g.name = 'desert-cactus';

  /* ── Corpo principal ── */
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * scale, 0.12 * scale, 1.2 * scale, 8), mats.cactus);
  body.position.y = 0.6 * scale; body.castShadow = true; g.add(body);

  /* ── Braço esquerdo ── */
  const armL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06 * scale, 0.07 * scale, 0.5 * scale, 6), mats.cactus);
  armL.position.set(-0.18 * scale, 0.7 * scale, 0);
  armL.rotation.z = Math.PI / 3; armL.castShadow = true; g.add(armL);

  const armLUp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.35 * scale, 6), mats.cactus);
  armLUp.position.set(-0.32 * scale, 0.95 * scale, 0);
  armLUp.castShadow = true; g.add(armLUp);

  /* ── Braço direito (só em cactos maiores) ── */
  if (scale > 0.8) {
    const armR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.4 * scale, 6), mats.cactus);
    armR.position.set(0.15 * scale, 0.5 * scale, 0);
    armR.rotation.z = -Math.PI / 3.5; armR.castShadow = true; g.add(armR);
  }

  /* ── Flor no topo ── */
  const flower = new THREE.Mesh(
    new THREE.SphereGeometry(0.05 * scale, 6, 5), mats.cactusFlower);
  flower.position.y = 1.25 * scale; g.add(flower);

  g.position.set(x, 0, z); return g;
}
