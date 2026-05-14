/* ==========================================================================
   FLORESTA — Animais (NOVO)
   --------------------------------------------------------------------------
   Animais simples low-poly que dão vida ao cenário.
   
   GUIA DE EDIÇÃO:
   - Coelho: tamanho das esferas do corpo e orelhas
   - Borboleta: tamanho das asas (PlaneGeometry), velocidade no shader
   ========================================================================== */
import * as THREE from 'three';

/**
 * Cria um coelho low-poly sentado.
 * @param {number} x — posição X
 * @param {number} z — posição Z
 * @param {number} scale — escala
 */
export function createRabbit(x, z, scale) {
  const g = new THREE.Group();
  g.name = 'forest-rabbit';

  const furMat = new THREE.MeshStandardMaterial({
    color: 0x8a7a6a, emissive: 0x2a2018, emissiveIntensity: 0.05, roughness: 0.9,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.85 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0xff8888, emissive: 0xaa4444, emissiveIntensity: 0.2, roughness: 0.4,
  });

  // Corpo
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 8, 6), furMat);
  body.position.y = 0.12 * scale; body.scale.set(1, 0.85, 1.2); g.add(body);

  // Cabeça
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 8, 6), furMat);
  head.position.set(0, 0.22 * scale, -0.1 * scale); g.add(head);

  // Orelhas
  for (const ox of [-0.03, 0.03]) {
    const ear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015 * scale, 0.02 * scale, 0.1 * scale, 4), furMat);
    ear.position.set(ox * scale, 0.32 * scale, -0.1 * scale);
    ear.rotation.z = ox > 0 ? -0.15 : 0.15;
    g.add(ear);
    // Interior rosa
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008 * scale, 0.012 * scale, 0.08 * scale, 4), noseMat);
    inner.position.set(ox * scale, 0.32 * scale, -0.098 * scale);
    inner.rotation.z = ox > 0 ? -0.15 : 0.15;
    g.add(inner);
  }

  // Olhos
  for (const ox of [-0.03, 0.03]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012 * scale, 4, 4), eyeMat);
    eye.position.set(ox * scale, 0.24 * scale, -0.16 * scale);
    g.add(eye);
  }

  // Nariz
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.008 * scale, 4, 4), noseMat);
  nose.position.set(0, 0.21 * scale, -0.17 * scale); g.add(nose);

  // Cauda
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 5, 4), whiteMat);
  tail.position.set(0, 0.14 * scale, 0.12 * scale); tail.name = 'rabbit-tail'; g.add(tail);

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z);
  return g;
}
