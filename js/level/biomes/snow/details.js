/* ==========================================================================
   NEVE — Detalhes (Bancos de Neve, Rochas Congeladas, Boneco de Neve)
   --------------------------------------------------------------------------
   GUIA DE EDIÇÃO:
   - Banco neve: largura (w), altura (h)
   - Rocha: DodecahedronGeometry tamanho, icículos ConeGeometry
   - Boneco: esferas [raio, posY], nariz ConeGeometry
   ========================================================================== */
import * as THREE from 'three';

/** Banco de neve (monte baixo) */
export function createSnowBank(x, z, w, h, mats) {
  const g = new THREE.Group(); g.name = 'snow-bank';
  const bank = new THREE.Mesh(
    new THREE.SphereGeometry(w, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.35), mats.snow);
  bank.position.y = -0.05; bank.scale.y = h / w;
  bank.receiveShadow = true; g.add(bank);
  g.position.set(x, 0, z); return g;
}

/** Rocha congelada com icículos */
export function createFrozenRock(x, z, scale, mats) {
  const g = new THREE.Group(); g.name = 'snow-rock';
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 * scale, 1), mats.rock);
  rock.position.y = 0.15 * scale; rock.scale.y = 0.7;
  rock.castShadow = true; rock.receiveShadow = true; g.add(rock);
  const snowTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.25 * scale, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.35), mats.snow);
  snowTop.position.y = 0.2 * scale; g.add(snowTop);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.015 * scale, 0.12 * scale, 4), mats.ice);
    icicle.position.set(Math.cos(a) * 0.22 * scale, 0.05 * scale, Math.sin(a) * 0.22 * scale);
    icicle.rotation.x = Math.PI; g.add(icicle);
  }
  g.position.set(x, 0, z); return g;
}

/** Boneco de neve */
export function createSnowman(x, z, mats) {
  const g = new THREE.Group(); g.name = 'snow-snowman';
  const bodyMat = mats.snow.clone();
  for (const [r, y] of [[0.25, 0.25], [0.18, 0.6], [0.12, 0.85]]) {
    const part = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), bodyMat);
    part.position.y = y; part.castShadow = true; g.add(part);
  }
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  for (const ex of [-0.04, 0.04]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), eyeMat);
    eye.position.set(ex, 0.88, -0.1); g.add(eye);
  }
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0xff6622, emissive: 0x882200, emissiveIntensity: 0.2, roughness: 0.5,
  });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 5), noseMat);
  nose.position.set(0, 0.85, -0.13); nose.rotation.x = -Math.PI / 2; g.add(nose);
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.9 });
  for (const [px, rz] of [[-0.28, Math.PI / 3], [0.25, -Math.PI / 3.5]]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), stickMat);
    arm.position.set(px, 0.6, 0); arm.rotation.z = rz; g.add(arm);
  }
  g.position.set(x, 0, z); return g;
}
