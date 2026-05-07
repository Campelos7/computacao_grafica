import * as THREE from 'three';

/* ==========================================================================
   snake/skinDragon.js — SKIN: Chinese Dragon
   --------------------------------------------------------------------------
   Dragão chinês com chifres ramificados, crista, presas, barbas e cauda.
   Extraído de skinDetails.js para manter cada skin no seu próprio ficheiro.

   GUIA DE EDIÇÃO RÁPIDA:
   ─────────────────────
   CABEÇA:
     • Chifres ────── mudar hornColor em skinConfigs.js ou nº de segmentos
     • Focinho ────── ajustar dimensões do BoxGeometry (snout)
     • Presas ─────── mudar altura/raio do ConeGeometry (fangGeo)
     • Sobrancelhas ─ ajustar posição/rotação dos browL/browR

   CORPO (por segmento):
     • Espinhas dorsais ── mudar altura/raio nos arrays de configuração
     • Barbatanas ──────── ajustar dimensões do finGeo
     • Ventre ──────────── mudar cor/tamanho do bellyMat

   CAUDA:
     • Espinha central ── mudar comprimento (0.52) do ConeGeometry
   ========================================================================== */

/* ── Skin: Chinese Dragon (cabeça detalhada) ── */
export function attachDragonHeadDetails(headMesh, skin) {
  const eyeColor = skin.eyeColor || 0xff2222;
  const hornColor = skin.hornColor || 0xffcc00;
  const maneColor = skin.tongueColor || 0xff2222;

  const eyeMat = new THREE.MeshStandardMaterial({
    color: eyeColor, emissive: eyeColor, emissiveIntensity: 1.0,
    roughness: 0.2, metalness: 0.1,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x110000, roughness: 0.4, metalness: 0.0,
  });
  const hornMat = new THREE.MeshStandardMaterial({
    color: hornColor, emissive: hornColor, emissiveIntensity: 0.55,
    roughness: 0.30, metalness: 0.90,
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: hornColor, emissive: hornColor, emissiveIntensity: 0.30,
    roughness: 0.40, metalness: 0.60,
  });
  const tongueMat = new THREE.MeshStandardMaterial({
    color: maneColor, emissive: maneColor, emissiveIntensity: 0.90,
    roughness: 0.4, metalness: 0.0,
  });
  const maneMat = new THREE.MeshStandardMaterial({
    color: maneColor, emissive: maneColor, emissiveIntensity: 0.50,
    roughness: 0.50, metalness: 0.10,
  });
  const fangMat = new THREE.MeshStandardMaterial({
    color: 0xfff5e0, emissive: 0xddccaa, emissiveIntensity: 0.08,
    roughness: 0.35, metalness: 0.0,
  });
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0x002200, roughness: 0.9, metalness: 0.0,
  });

  // Focinho do dragão
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.20, 0.48), headMesh.material);
  snout.position.set(0, -0.03, -0.43);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.09, 0.36), headMesh.material);
  jaw.position.set(0, -0.17, -0.40);
  jaw.rotation.x = 0.12;

  const nostrilGeo = new THREE.SphereGeometry(0.033, 8, 6);
  const mkNostril = (x) => {
    const m = new THREE.Mesh(nostrilGeo, noseMat);
    m.position.set(x, 0.02, -0.64);
    m.scale.set(1.0, 0.55, 0.75);
    return m;
  };
  const nostrilL = mkNostril(-0.10);
  const nostrilR = mkNostril(0.10);

  // Presas
  const fangGeo = new THREE.ConeGeometry(0.022, 0.115, 6);
  const mkFang = (x) => {
    const m = new THREE.Mesh(fangGeo, fangMat);
    m.position.set(x, -0.125, -0.58);
    m.rotation.x = Math.PI;
    return m;
  };
  const fangUL = mkFang(-0.09);
  const fangUR = mkFang(0.09);

  const eyeGeo = new THREE.SphereGeometry(0.09, 14, 10);
  const pupilGeo = new THREE.SphereGeometry(0.048, 10, 8);
  const mkEye = (x) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(x, 0.14, -0.27);
    eye.scale.set(1.0, 0.65, 0.85);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(0, 0, -0.065);
    eye.add(pupil);
    return eye;
  };
  const eyeL = mkEye(-0.195);
  const eyeR = mkEye(0.195);

  // Sobrancelhas
  const browGeo = new THREE.BoxGeometry(0.16, 0.042, 0.10);
  const mkBrow = (x, rz) => {
    const m = new THREE.Mesh(browGeo, browMat);
    m.position.set(x, 0.25, -0.25);
    m.rotation.set(-0.15, 0, rz);
    return m;
  };
  const browL = mkBrow(-0.20, 0.32);
  const browR = mkBrow(0.20, -0.32);

  const mkHorn = (x, sign) => {
    const pieces = [];
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.055, 0.22, 8), hornMat);
    base.position.set(x, 0.315, -0.04);
    base.rotation.set(-0.28, 0, sign * 0.22);
    pieces.push(base);
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.026, 0.20, 7), hornMat);
    mid.position.set(x * 1.46, 0.50, -0.01);
    mid.rotation.set(-0.10, 0, sign * 0.55);
    pieces.push(mid);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.014, 0.20, 6), hornMat);
    tip.position.set(x * 1.19, 0.67, 0.01);
    tip.rotation.set(0, 0, sign * 0.10);
    pieces.push(tip);
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.011, 0.14, 5), hornMat);
    prong.position.set(x * 1.84, 0.56, 0.0);
    prong.rotation.set(-0.25, 0, sign * 1.20);
    pieces.push(prong);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.009, 0.10, 5), hornMat);
    inner.position.set(x * 0.97, 0.52, -0.10);
    inner.rotation.set(0.60, 0, sign * 0.70);
    pieces.push(inner);
    return pieces;
  };
  const hornL = mkHorn(-0.185, 1);
  const hornR = mkHorn(0.185, -1);

  // Língua de fogo
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.30), tongueMat);
  tongue.position.set(0, -0.135, -0.68);
  const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.009, 0.14), tongueMat);
  const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.009, 0.14), tongueMat);
  forkL.position.set(-0.022, 0, -0.17);
  forkR.position.set(0.022, 0, -0.17);
  forkL.rotation.y = -0.38;
  forkR.rotation.y = 0.38;
  tongue.add(forkL, forkR);

  headMesh.add(snout, jaw, nostrilL, nostrilR, fangUL, fangUR, eyeL, eyeR, browL, browR, ...hornL, ...hornR, tongue);
  headMesh.userData.tongue = tongue;
}

/* ── Skin: Chinese Dragon (corpo detalhado) ── */
export function attachDragonBodyDetails(bodyMesh, skin) {
  const spineColor = skin.spineColor || 0xffcc00;
  const finColor = skin.tongueColor || 0xff2222;
  const spineMat = new THREE.MeshStandardMaterial({
    color: spineColor, emissive: spineColor, emissiveIntensity: 0.55,
    roughness: 0.30, metalness: 0.85,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: finColor, emissive: finColor, emissiveIntensity: 0.45,
    roughness: 0.50, metalness: 0.05,
    transparent: true, opacity: 0.80, side: THREE.DoubleSide,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xffeeaa, emissive: 0xccbb77, emissiveIntensity: 0.12,
    roughness: 0.75, metalness: 0.0,
  });

  [{ z: -0.24, r: 0.050, h: 0.20 }, { z: 0.00, r: 0.065, h: 0.26 }, { z: 0.24, r: 0.050, h: 0.20 }]
    .forEach((s) => {
      const spine = new THREE.Mesh(new THREE.ConeGeometry(s.r, s.h, 4), spineMat);
      spine.position.set(0, 0.27 + s.h / 2, s.z);
      bodyMesh.add(spine);
    });

  const finGeo = new THREE.BoxGeometry(0.20, 0.035, 0.16);
  [-1, 1].forEach((side) => {
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(side * 0.41, 0.08, 0);
    fin.rotation.set(0, side * 0.10, side * 0.33);
    bodyMesh.add(fin);
  });

  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.055, 0.58), bellyMat);
  belly.position.set(0, -0.295, 0);
  bodyMesh.add(belly);
}

export function createDragonTailGroup(skin) {
  const group = new THREE.Group();
  group.name = 'dragonTail';
  const spineColor = skin.spineColor || 0xffcc00;
  const spineMat = new THREE.MeshStandardMaterial({
    color: spineColor, emissive: spineColor, emissiveIntensity: 0.70,
    roughness: 0.30, metalness: 0.90,
  });

  const centralSpine = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.52, 4), spineMat);
  centralSpine.position.set(0, 0.38, 0.40);
  centralSpine.rotation.x = -(Math.PI / 2) + 0.18;
  group.add(centralSpine);
  return group;
}
