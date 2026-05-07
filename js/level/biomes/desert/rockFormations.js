/* ==========================================================================
   DESERTO — Formações Rochosas
   --------------------------------------------------------------------------
   Três tipos: mesa (larga em camadas), spire (pilar alto), arch (arco).
   
   GUIA DE EDIÇÃO:
   - Altura: parâmetros de altura dos cilindros
   - Espessura: 1.º/2.º parâmetros dos cilindros
   - Tipo: variável 'type' ('mesa' | 'spire' | 'arch')
   ========================================================================== */
import * as THREE from 'three';

export function createRockFormation(x, z, scale, type, mats) {
  const g = new THREE.Group(); g.name = 'desert-rock';

  if (type === 'mesa') {
    /* ── MESA — Rocha larga em camadas ── */
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6 * scale, 0.9 * scale, 2.5 * scale, 7), mats.rock);
    base.position.y = 1.25 * scale; base.castShadow = true; base.receiveShadow = true; g.add(base);
    for (let y = 0.4; y < 2.2; y += 0.4) {
      const layer = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65 * scale, 0.65 * scale, 0.05 * scale, 7), mats.darkRock);
      layer.position.y = y * scale; g.add(layer);
    }
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7 * scale, 0.6 * scale, 0.2 * scale, 8), mats.rock);
    top.position.y = 2.6 * scale; top.castShadow = true; g.add(top);

  } else if (type === 'spire') {
    /* ── SPIRE — Pilar alto e fino ── */
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 * scale, 0.35 * scale, 3.5 * scale, 6), mats.rock);
    col.position.y = 1.75 * scale; col.rotation.z = (Math.random() - 0.5) * 0.12;
    col.castShadow = true; g.add(col);
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.12 * scale + Math.random() * 0.08 * scale, 0), mats.darkRock);
      const a = (i / 4) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.3 * scale, 0.08 * scale, Math.sin(a) * 0.3 * scale);
      s.castShadow = true; g.add(s);
    }

  } else {
    /* ── ARCH — Arco rochoso com dois pilares ── */
    const pL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3 * scale, 0.45 * scale, 3.2 * scale, 7), mats.rock);
    pL.position.set(-0.9 * scale, 1.6 * scale, 0); pL.rotation.z = 0.08;
    pL.castShadow = true; g.add(pL);
    const pR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25 * scale, 0.4 * scale, 3.0 * scale, 7), mats.rock);
    pR.position.set(0.9 * scale, 1.5 * scale, 0); pR.rotation.z = -0.1;
    pR.castShadow = true; g.add(pR);
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.95 * scale, 0.22 * scale, 8, 16, Math.PI), mats.rock);
    arch.position.set(0, 3.0 * scale, 0); arch.rotation.z = Math.PI;
    arch.castShadow = true; g.add(arch);
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.1 * scale + Math.random() * 0.12 * scale, 0), mats.darkRock);
      s.position.set((Math.random() - 0.5) * 2 * scale, 0.08 * scale, (Math.random() - 0.5) * 1.2 * scale);
      s.rotation.set(Math.random(), Math.random(), Math.random()); s.castShadow = true; g.add(s);
    }
  }

  g.position.set(x, 0, z); return g;
}
