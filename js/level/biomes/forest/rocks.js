/* ==========================================================================
   FLORESTA — Rochas e Troncos
   --------------------------------------------------------------------------
   GUIA DE EDIÇÃO:
   - Rocha: tamanho via DodecahedronGeometry, achatamento via scale.y
   - Tronco: comprimento via 3.º parâmetro CylinderGeometry
   - Toco: altura e raio do CylinderGeometry
   ========================================================================== */
import * as THREE from 'three';

/** Rocha com topo de musgo */
export function createMossyRock(x, z, scale, mats) {
  const g = new THREE.Group(); g.name = 'forest-rock';
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 * scale, 1), mats.rock);
  rock.position.y = 0.12 * scale; rock.scale.y = 0.6;
  rock.castShadow = true; rock.receiveShadow = true; g.add(rock);
  const mTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.15 * scale, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.4), mats.moss);
  mTop.position.y = 0.16 * scale; g.add(mTop);
  g.position.set(x, 0, z); return g;
}

/** Tronco caído no chão com musgo */
export function createFallenLog(x, z, rot, mats) {
  const g = new THREE.Group(); g.name = 'forest-log';
  const logObj = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.8, 7), mats.trunk);
  logObj.rotation.z = Math.PI / 2; logObj.position.y = 0.12;
  logObj.castShadow = true; logObj.receiveShadow = true; g.add(logObj);
  const moss = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.2), mats.moss);
  moss.position.y = 0.24; g.add(moss);
  g.rotation.y = rot; g.position.set(x, 0, z); return g;
}

/** Toco de árvore cortada (NOVO) */
export function createTreeStump(x, z, scale, mats) {
  const g = new THREE.Group(); g.name = 'forest-stump';
  const stump = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * scale, 0.22 * scale, 0.3 * scale, 8), mats.trunk);
  stump.position.y = 0.15 * scale; stump.castShadow = true; stump.receiveShadow = true; g.add(stump);
  const topMat = new THREE.MeshStandardMaterial({ color: 0x9a8060, roughness: 0.85 });
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.17 * scale, 8), topMat);
  top.position.y = 0.3 * scale + 0.005; top.rotation.x = -Math.PI / 2; g.add(top);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x7a6040, roughness: 0.9 });
  for (let i = 1; i <= 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05 * i * scale, 0.004 * scale, 4, 16), ringMat);
    ring.position.y = 0.3 * scale + 0.006; ring.rotation.x = -Math.PI / 2; g.add(ring);
  }
  const mossPatch = new THREE.Mesh(
    new THREE.SphereGeometry(0.06 * scale, 5, 4, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.moss);
  mossPatch.position.set(0.14 * scale, 0.12 * scale, 0.08 * scale); g.add(mossPatch);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
    const root = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015 * scale, 0.03 * scale, 0.3 * scale, 4), mats.trunk);
    root.position.set(Math.cos(a) * 0.2 * scale, 0.05 * scale, Math.sin(a) * 0.2 * scale);
    root.rotation.z = Math.cos(a) * 0.7; root.rotation.x = Math.sin(a) * 0.7; g.add(root);
  }
  g.position.set(x, 0, z); return g;
}
