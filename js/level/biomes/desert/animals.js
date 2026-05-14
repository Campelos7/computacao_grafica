/* ==========================================================================
   DESERTO — Animais
   --------------------------------------------------------------------------
   GUIA DE EDIÇÃO:
   - Escorpião: tamanho dos segmentos do corpo/cauda
   ========================================================================== */
import * as THREE from 'three';

/** Escorpião low-poly */
export function createScorpion(x, z, scale) {
  const g = new THREE.Group(); g.name = 'desert-scorpion';
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x4a3020, emissive: 0x1a1008, emissiveIntensity: 0.1, roughness: 0.8,
  });
  const clawMat = new THREE.MeshStandardMaterial({
    color: 0x5a4030, emissive: 0x2a1810, emissiveIntensity: 0.1, roughness: 0.75,
  });

  // Corpo (elipse achatada)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 6, 5), bodyMat);
  body.position.y = 0.04 * scale; body.scale.set(1, 0.5, 1.4); g.add(body);

  // Cauda (segmentos curvos para cima)
  let tailY = 0.06 * scale, tailZ = 0.1 * scale;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 * scale * (1 - i * 0.1), 4, 4), bodyMat);
    tailZ += 0.04 * scale;
    tailY += 0.03 * scale;
    seg.position.set(0, tailY, tailZ); g.add(seg);
  }
  // Ferrão
  const sting = new THREE.Mesh(
    new THREE.ConeGeometry(0.012 * scale, 0.04 * scale, 4),
    new THREE.MeshStandardMaterial({ color: 0x220808, roughness: 0.5 })
  );
  sting.position.set(0, tailY + 0.03 * scale, tailZ);
  sting.rotation.x = 0.3; g.add(sting);

  // Pinças (2 esferas achatadas à frente)
  for (const side of [-1, 1]) {
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.03 * scale, 5, 4), clawMat);
    claw.position.set(side * 0.08 * scale, 0.03 * scale, -0.12 * scale);
    claw.scale.set(1.2, 0.6, 0.8); g.add(claw);
    // Braço
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008 * scale, 0.01 * scale, 0.08 * scale, 4), bodyMat);
    arm.position.set(side * 0.06 * scale, 0.04 * scale, -0.08 * scale);
    arm.rotation.z = side * 0.4; g.add(arm);
  }

  // Patas (3 de cada lado)
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004 * scale, 0.005 * scale, 0.06 * scale, 3), bodyMat);
      leg.position.set(
        side * 0.07 * scale, 0.02 * scale, (-0.03 + i * 0.04) * scale);
      leg.rotation.z = side * 0.8;
      g.add(leg);
    }
  }

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z); return g;
}
