/* ==========================================================================
   Snake.js — Cobra 3D com estética neon retro
   Requisito: Usar primitivas Three.js (BoxGeometry, SphereGeometry) para
   construir a cobra. Aplicar materiais nativos (MeshStandardMaterial)
   + texturas. Movimento suave com interpolação (lerp).
   ========================================================================== */
import * as THREE from 'three';
import {
  BOARD_SIZE,
  HALF_BOARD,
  DIRS,
  createCanvasTexture,
  gridToWorldX,
  gridToWorldZ,
  SHIELD_DURATION_SECONDS,
} from './utils/helpers.js';

/* ── Textura pixel-art neon para a pele da cobra ── */
function createNeonSkinTexture() {
  return createCanvasTexture(128, (ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#1a0033');
    grad.addColorStop(0.5, '#0d0026');
    grad.addColorStop(1, '#1a0033');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const ps = 8;
    for (let y = 0; y < size; y += ps) {
      const offset = (Math.floor(y / ps) % 2) * (ps / 2);
      for (let x = -ps + offset; x < size; x += ps) {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
        ctx.fillRect(x, y, ps - 1, ps - 1);
        ctx.fillStyle = 'rgba(255, 0, 255, 0.05)';
        ctx.fillRect(x + 1, y + 1, ps - 3, ps - 3);
      }
    }
    for (let y = 0; y < size; y += ps * 4) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.12)';
      ctx.fillRect(0, y, size, 1);
    }
  }, { repeat: [3, 3], pixelArt: true });
}

/* ── Detalhes da cabeça default (olhos, língua) ── */
function attachDefaultHeadDetails(headMesh, skin) {
  const eyeColor = skin ? skin.eyeColor : 0x00ffff;
  const tongueColor = skin ? skin.tongueColor : 0xff0066;

  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: eyeColor, emissive: eyeColor, emissiveIntensity: 0.8,
    roughness: 0.2, metalness: 0.1,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1.0,
    roughness: 0.3, metalness: 0,
  });
  const tongueMat = new THREE.MeshStandardMaterial({
    color: tongueColor, emissive: tongueColor, emissiveIntensity: 0.5,
    roughness: 0.5, metalness: 0,
  });

  const eyeGeo = new THREE.SphereGeometry(0.09, 10, 8);
  const pupilGeo = new THREE.SphereGeometry(0.045, 8, 6);

  const eyeL = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  eyeL.position.set(-0.18, 0.12, -0.36);
  eyeR.position.set(0.18, 0.12, -0.36);

  const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
  const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
  pupilL.position.set(0, 0, -0.07);
  pupilR.position.set(0, 0, -0.07);
  eyeL.add(pupilL);
  eyeR.add(pupilR);

  const tongueGeo = new THREE.BoxGeometry(0.05, 0.01, 0.28);
  const forkGeo = new THREE.BoxGeometry(0.02, 0.008, 0.1);
  const tongue = new THREE.Mesh(tongueGeo, tongueMat);
  tongue.position.set(0, -0.04, -0.5);

  const forkL = new THREE.Mesh(forkGeo, tongueMat);
  const forkR = new THREE.Mesh(forkGeo, tongueMat);
  forkL.position.set(-0.018, 0, -0.16);
  forkR.position.set(0.018, 0, -0.16);
  forkL.rotation.y = -0.35;
  forkR.rotation.y = 0.35;
  tongue.add(forkL, forkR);

  headMesh.add(eyeL, eyeR, tongue);
  headMesh.userData.tongue = tongue;
}

/* ══════════════════════════════════════════════════════════════════════════
   CHINESE DRAGON — Cabeça detalhada
   ══════════════════════════════════════════════════════════════════════════ */
function attachDragonHeadDetails(headMesh, skin) {
  const eyeColor = skin.eyeColor || 0xff2222;
  const hornColor = skin.hornColor || 0xffcc00;
  const maneColor = skin.tongueColor || 0xff2222;

  /* ── Materiais ── */
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
  const beardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xcccccc, emissiveIntensity: 0.15,
    roughness: 0.85, metalness: 0.0,
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
  const scaleMat = new THREE.MeshStandardMaterial({
    color: skin.headColor || 0x00ff88,
    emissive: skin.headEmissive || 0x00aa44,
    emissiveIntensity: 0.25,
    roughness: 0.50, metalness: 0.40,
  });

  /* ── Focinho alongado ── */
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.20, 0.48), headMesh.material);
  snout.position.set(0, -0.03, -0.43);

  /* ── Maxilar inferior (boca ligeiramente aberta) ── */
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.09, 0.36), headMesh.material);
  jaw.position.set(0, -0.17, -0.40);
  jaw.rotation.x = 0.12;

  /* ── Narinas ── */
  const nostrilGeo = new THREE.SphereGeometry(0.033, 8, 6);
  const mkNostril = (x) => {
    const m = new THREE.Mesh(nostrilGeo, noseMat);
    m.position.set(x, 0.02, -0.64);
    m.scale.set(1.0, 0.55, 0.75);
    return m;
  };
  const nostrilL = mkNostril(-0.10);
  const nostrilR = mkNostril(0.10);

  /* ── Presas superiores ── */
  const fangGeo = new THREE.ConeGeometry(0.022, 0.115, 6);
  const mkFang = (x) => {
    const m = new THREE.Mesh(fangGeo, fangMat);
    m.position.set(x, -0.125, -0.58);
    m.rotation.x = Math.PI;
    return m;
  };
  const fangUL = mkFang(-0.09);
  const fangUR = mkFang(0.09);

  /* ── Olhos (achatados, ameaçadores) ── */
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

  /* ── Sobrancelhas (inclinadas, ferocidade) ── */
  const browGeo = new THREE.BoxGeometry(0.16, 0.042, 0.10);
  const mkBrow = (x, rz) => {
    const m = new THREE.Mesh(browGeo, browMat);
    m.position.set(x, 0.25, -0.25);
    m.rotation.set(-0.15, 0, rz);
    return m;
  };
  const browL = mkBrow(-0.20, 0.32);
  const browR = mkBrow(0.20, -0.32);

  /* ── Chifres tipo galhada (5 peças por lado) ── */
  const mkHorn = (x, sign) => {
    const pieces = [];

    // Segmento base — sai da testa inclinado para fora
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.055, 0.22, 8), hornMat);
    base.position.set(x, 0.315, -0.04);
    base.rotation.set(-0.28, 0, sign * 0.22);
    pieces.push(base);

    // Segmento médio — curva para o exterior
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.026, 0.20, 7), hornMat);
    mid.position.set(x * 1.46, 0.50, -0.01);
    mid.rotation.set(-0.10, 0, sign * 0.55);
    pieces.push(mid);

    // Ponta principal — sobe verticalmente
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.014, 0.20, 6), hornMat);
    tip.position.set(x * 1.19, 0.67, 0.01);
    tip.rotation.set(0, 0, sign * 0.10);
    pieces.push(tip);

    // Ponta exterior (prong lateral)
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.011, 0.14, 5), hornMat);
    prong.position.set(x * 1.84, 0.56, 0.0);
    prong.rotation.set(-0.25, 0, sign * 1.20);
    pieces.push(prong);

    // Ponta interior (prong traseiro)
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.009, 0.10, 5), hornMat);
    inner.position.set(x * 0.97, 0.52, -0.10);
    inner.rotation.set(0.60, 0, sign * 0.70);
    pieces.push(inner);

    return pieces;
  };
  const hornL = mkHorn(-0.185, 1);
  const hornR = mkHorn(0.185, -1);

  /* ── Bigodes longos do focinho (3 pares) ── */
  const wGeoms = [
    new THREE.CylinderGeometry(0.009, 0.002, 0.55, 6),
    new THREE.CylinderGeometry(0.007, 0.002, 0.48, 6),
    new THREE.CylinderGeometry(0.006, 0.001, 0.40, 6),
  ];
  const whiskerDefs = [
    { pos: [-0.18, -0.14, -0.52], rot: [0.55, 0, 0.80], g: 0 },
    { pos: [0.18, -0.14, -0.52], rot: [0.55, 0, -0.80], g: 0 },
    { pos: [-0.24, -0.12, -0.48], rot: [0.38, 0, 1.10], g: 1 },
    { pos: [0.24, -0.12, -0.48], rot: [0.38, 0, -1.10], g: 1 },
    { pos: [-0.10, -0.20, -0.56], rot: [0.78, 0, 0.28], g: 2 },
    { pos: [0.10, -0.20, -0.56], rot: [0.78, 0, -0.28], g: 2 },
  ];
  const whiskers = whiskerDefs.map(d => {
    const m = new THREE.Mesh(wGeoms[d.g], hornMat);
    m.position.set(...d.pos);
    m.rotation.set(...d.rot);
    return m;
  });

  /* ── Barba (fios brancos que caem do queixo) ── */
  const beardDefs = [
    { r: [0.013, 0.003], l: 0.42, pos: [0.00, -0.30, -0.42], rot: [0.68, 0, 0.00] },
    { r: [0.009, 0.002], l: 0.32, pos: [-0.07, -0.32, -0.40], rot: [0.58, 0, 0.22] },
    { r: [0.009, 0.002], l: 0.32, pos: [0.07, -0.32, -0.40], rot: [0.58, 0, -0.22] },
    { r: [0.006, 0.001], l: 0.24, pos: [-0.13, -0.30, -0.38], rot: [0.48, 0, 0.40] },
    { r: [0.006, 0.001], l: 0.24, pos: [0.13, -0.30, -0.38], rot: [0.48, 0, -0.40] },
  ];
  const beardStrands = beardDefs.map(d => {
    const geo = new THREE.CylinderGeometry(d.r[0], d.r[1], d.l, 6);
    const m = new THREE.Mesh(geo, beardMat);
    m.position.set(...d.pos);
    m.rotation.set(...d.rot);
    return m;
  });

  /* ── Escamas das bochechas (sobrepostas) ── */
  const faceScaleGeo = new THREE.BoxGeometry(0.11, 0.055, 0.075);
  const cheekDefs = [
    { pos: [-0.41, 0.06, -0.16], ry: 0.35 },
    { pos: [0.41, 0.06, -0.16], ry: -0.35 },
    { pos: [-0.40, 0.06, -0.30], ry: 0.28 },
    { pos: [0.40, 0.06, -0.30], ry: -0.28 },
    { pos: [-0.38, 0.08, -0.08], ry: 0.40 },
    { pos: [0.38, 0.08, -0.08], ry: -0.40 },
  ];
  const cheekScales = cheekDefs.map(d => {
    const m = new THREE.Mesh(faceScaleGeo, scaleMat);
    m.position.set(...d.pos);
    m.rotation.y = d.ry;
    return m;
  });

  /* ── Crista / Juba no topo da cabeça ── */
  const maneBase = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.14), maneMat);
  maneBase.position.set(0, 0.33, 0.06);

  const maneSpikeGeo = new THREE.ConeGeometry(0.038, 0.19, 5);
  const maneSpikes = [-0.18, -0.06, 0.06, 0.18].map(x => {
    const spike = new THREE.Mesh(maneSpikeGeo, maneMat);
    spike.position.set(x, 0.44, 0.06);
    return spike;
  });



  /* ── Língua de fogo (bifurcada) ── */
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.30), tongueMat);
  tongue.position.set(0, -0.135, -0.68);

  const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.009, 0.14), tongueMat);
  const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.009, 0.14), tongueMat);
  forkL.position.set(-0.022, 0, -0.17);
  forkR.position.set(0.022, 0, -0.17);
  forkL.rotation.y = -0.38;
  forkR.rotation.y = 0.38;
  tongue.add(forkL, forkR);

  /* ── Montar tudo na cabeça ── */
  headMesh.add(
    snout, jaw,
    nostrilL, nostrilR,
    fangUL, fangUR,
    eyeL, eyeR,
    browL, browR,
    ...hornL, ...hornR,
    ...whiskers,
    ...beardStrands,
    ...cheekScales,
    maneBase, ...maneSpikes,
    tongue,
  );

  headMesh.userData.tongue = tongue;
}

/* ══════════════════════════════════════════════════════════════════════════
   CHINESE DRAGON — Corpo detalhado (3 espinhas + barbatanas + escamas ventrais)
   ══════════════════════════════════════════════════════════════════════════ */
function attachDragonBodyDetails(bodyMesh, skin) {
  const spineColor = skin.spineColor || 0xffcc00;
  const finColor = skin.tongueColor || 0xff2222;

  const spineMat = new THREE.MeshStandardMaterial({
    color: spineColor, emissive: spineColor, emissiveIntensity: 0.55,
    roughness: 0.30, metalness: 0.85,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: finColor, emissive: finColor, emissiveIntensity: 0.45,
    roughness: 0.50, metalness: 0.05,
    transparent: true, opacity: 0.80,
    side: THREE.DoubleSide,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xffeeaa, emissive: 0xccbb77, emissiveIntensity: 0.12,
    roughness: 0.75, metalness: 0.0,
  });
  const scaleMat = new THREE.MeshStandardMaterial({
    color: skin.bodyColor || 0x00cc66,
    emissive: skin.bodyEmissive || 0x008833,
    emissiveIntensity: 0.22,
    roughness: 0.50, metalness: 0.35,
  });

  /* ── 3 Espinhas dorsais por segmento (frente, centro, trás) ── */
  [
    { z: -0.24, r: 0.050, h: 0.20 },
    { z: 0.00, r: 0.065, h: 0.26 },  // espinha central — a mais alta
    { z: 0.24, r: 0.050, h: 0.20 },
  ].forEach(s => {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(s.r, s.h, 4), spineMat);
    spine.position.set(0, 0.27 + s.h / 2, s.z);
    bodyMesh.add(spine);
  });

  /* ── Barbatanas laterais semi-transparentes ── */
  const finGeo = new THREE.BoxGeometry(0.20, 0.035, 0.16);
  [-1, 1].forEach(side => {
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(side * 0.41, 0.08, 0);
    fin.rotation.set(0, side * 0.10, side * 0.33);
    bodyMesh.add(fin);
  });

  /* ── Placa ventral (barriga amarelada) ── */
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.055, 0.58), bellyMat);
  belly.position.set(0, -0.295, 0);
  bodyMesh.add(belly);

  /* ── Escamas laterais sobrepostas (2 fileiras por lado) ── */
  const sideScaleGeo = new THREE.BoxGeometry(0.15, 0.07, 0.13);
  [[-1, -0.20], [-1, 0.20], [1, -0.20], [1, 0.20]].forEach(([side, z]) => {
    const m = new THREE.Mesh(sideScaleGeo, scaleMat);
    m.position.set(side * 0.37, 0.02, z);
    m.rotation.set(0, side * 0.28, side * 0.14);
    bodyMesh.add(m);
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   CHINESE DRAGON — Cauda dedicada (grupo independente, como o escudo)
   ══════════════════════════════════════════════════════════════════════════ */
function createDragonTailGroup(skin) {
  const group = new THREE.Group();
  group.name = 'dragonTail';

  const spineColor = skin.spineColor || 0xffcc00;
  const finColor = skin.tongueColor || 0xff2222;

  const spineMat = new THREE.MeshStandardMaterial({
    color: spineColor, emissive: spineColor, emissiveIntensity: 0.70,
    roughness: 0.30, metalness: 0.90,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: finColor, emissive: finColor, emissiveIntensity: 0.60,
    roughness: 0.40, transparent: true, opacity: 0.85,
    side: THREE.DoubleSide,
  });

  /* Espinha central — aponta para fora da cobra */
  const centralSpine = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.52, 4), spineMat);
  centralSpine.position.set(0, 0.38, 0.40);
  centralSpine.rotation.x = -(Math.PI / 2) + 0.18;
  group.add(centralSpine);

  /* Espinhas laterais menores */
  [-0.14, 0.14].forEach(x => {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.30, 4), spineMat);
    s.position.set(x, 0.36, 0.34);
    s.rotation.x = -(Math.PI / 2) + 0.15;
    s.rotation.z = x < 0 ? -0.22 : 0.22;
    group.add(s);
  });

  /* Barbatanas laterais da cauda */
  const tailFinGeo = new THREE.BoxGeometry(0.32, 0.038, 0.28);
  [-1, 1].forEach(side => {
    const fin = new THREE.Mesh(tailFinGeo, finMat);
    fin.position.set(side * 0.22, 0.18, 0.28);
    fin.rotation.set(0, side * -0.30, side * 0.42);
    group.add(fin);
  });

  /* Leque caudal — 3 lâminas em leque */
  [
    { x: -0.17, y: 0.24, z: 0.52, len: 0.44 },
    { x: 0.00, y: 0.28, z: 0.56, len: 0.50 },  // lâmina central — a maior
    { x: 0.17, y: 0.24, z: 0.52, len: 0.44 },
  ].forEach(f => {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.032, f.len), finMat);
    blade.position.set(f.x, f.y, f.z);
    blade.rotation.x = 0.12;
    group.add(blade);
  });

  return group;
}

/* ── Skins da cobra ── */
export const SNAKE_SKINS = [
  {
    id: 'neon-purple',
    name: 'Neon Purple',
    headColor: 0x8844ff,
    bodyColor: 0x6633cc,
    headEmissive: 0x6600cc,
    bodyEmissive: 0x4400aa,
    eyeColor: 0x00ffff,
    tongueColor: 0xff0066,
  },
  {
    id: 'cyber-green',
    name: 'Chinese Dragon',
    headColor: 0x00ff88,
    bodyColor: 0x00cc66,
    headEmissive: 0x00aa44,
    bodyEmissive: 0x008833,
    eyeColor: 0xff2222,
    tongueColor: 0xff2222,
    hornColor: 0xffcc00,
    spineColor: 0xffcc00,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export class Snake {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'snake';
    this.scene.add(this.group);

    // Geometrias — Requisito: usar primitivas Three.js
    this.headGeometry = new THREE.SphereGeometry(0.46, 20, 16);
    this.bodyGeometry = new THREE.BoxGeometry(0.7, 0.55, 0.78, 1, 1, 1);

    // Textura neon pixel-art
    this.skinTexture = createNeonSkinTexture();

    // Skin actual
    this.currentSkinIndex = 0;

    // Materiais — Requisito: MeshStandardMaterial + texturas
    this.headMaterial = new THREE.MeshStandardMaterial({
      map: this.skinTexture,
      color: 0x8844ff,
      emissive: 0x6600cc,
      emissiveIntensity: 0.4,
      roughness: 0.6,
      metalness: 0.15,
      bumpMap: this.skinTexture,
      bumpScale: 0.06,
    });

    this.bodyMaterial = new THREE.MeshStandardMaterial({
      map: this.skinTexture,
      color: 0x6633cc,
      emissive: 0x4400aa,
      emissiveIntensity: 0.3,
      roughness: 0.65,
      metalness: 0.1,
      bumpMap: this.skinTexture,
      bumpScale: 0.04,
    });

    // Estado do escudo (power-up): activo durante shieldTimeRemaining segundos
    this.shieldActive = false;
    this.shieldTimeRemaining = 0;
    this.shieldMesh = null;


    // Cauda do dragão (gerida separadamente, como o escudo)
    this.dragonTailGroup = null;

    this._headWorld = new THREE.Vector3();

    this.reset();
  }

  /**
   * Aplica uma skin à cobra.
   * @param {number} skinIndex — índice da skin em SNAKE_SKINS
   */
  setSkin(skinIndex) {
    const skin = SNAKE_SKINS[skinIndex];
    if (!skin) return;
    this.currentSkinIndex = skinIndex;

    this.headMaterial.color.set(skin.headColor);
    this.headMaterial.emissive.set(skin.headEmissive);
    this.bodyMaterial.color.set(skin.bodyColor);
    this.bodyMaterial.emissive.set(skin.bodyEmissive);

    // Reconstruir meshes da cobra
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[this.group.children.length - 1]);
    }

    // Recriar cauda
    this._removeDragonTail();
    if (skin.id === 'cyber-green') {
      this.dragonTailGroup = createDragonTailGroup(skin);
      this.scene.add(this.dragonTailGroup);
    }

    this.syncMeshCount();
  }

  reset() {
    this.direction = DIRS.right.clone();
    this.directionQueue = [];
    this.segments = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(-2, 0, 0),
    ];
    this.previousSegments = this.segments.map(s => s.clone());
    this.growPending = 0;
    this.dead = false;
    this.shieldActive = false;
    this.shieldTimeRemaining = 0;
    this._removeShieldVisual();

    // Recriar cauda ao reiniciar
    this._removeDragonTail();
    const skin = SNAKE_SKINS[this.currentSkinIndex];
    if (skin && skin.id === 'cyber-green') {
      this.dragonTailGroup = createDragonTailGroup(skin);
      this.scene.add(this.dragonTailGroup);
    }

    this.syncMeshCount();
    this.render(1);
  }

  /* ── Direcção ── */
  setDirection(nextDir) {
    if (this.dead) return;
    const last = this.directionQueue.length > 0
      ? this.directionQueue[this.directionQueue.length - 1]
      : this.direction;
    if (nextDir.equals(last)) return;
    if (nextDir.dot(last) === -1) return;
    if (this.directionQueue.length < 2) {
      this.directionQueue.push(nextDir.clone());
    }
  }

  getNextReferenceDirection() {
    return this.directionQueue.length > 0
      ? this.directionQueue[this.directionQueue.length - 1]
      : this.direction;
  }

  turnLeft() {
    const ref = this.getNextReferenceDirection();
    this.setDirection(new THREE.Vector3(ref.z, 0, -ref.x));
  }

  turnRight() {
    const ref = this.getNextReferenceDirection();
    this.setDirection(new THREE.Vector3(-ref.z, 0, ref.x));
  }

  /* ── Lógica de passo ── */
  /**
   * @param {THREE.Vector3} foodCell
   * @param {Function}      checkObstacleCollision — (pos) => boolean
   * @returns {{ dead: boolean, ate: boolean }}
   */
  updateStep(foodCell, checkObstacleCollision) {
    if (this.dead) return { dead: true, ate: false };

    this.copyCurrentToPrevious();

    if (this.directionQueue.length > 0) {
      this.direction.copy(this.directionQueue.shift());
    }

    const newHead = this.segments[0].clone().add(this.direction);
    const ate = newHead.equals(foodCell);

    this.segments.unshift(newHead);

    if (ate) { this.growPending += 1; }
    if (this.growPending > 0) { this.growPending -= 1; }
    else { this.segments.pop(); }

    const hitWall = this.isOutOfBounds(newHead);
    const hitSelf = this.hitsSelf();
    const hitObstacle = checkObstacleCollision ? checkObstacleCollision(newHead) : false;
    const collision = hitWall || hitSelf || hitObstacle;

    if (collision) {
      if (this.shieldActive) {
        this.segments.shift();
        this.segments.unshift(this.previousSegments[0].clone());
        this.shieldActive = false;
        this.shieldTimeRemaining = 0;
        this._removeShieldVisual();
      } else {
        this.dead = true;
      }
    }

    this.syncMeshCount();
    return { dead: this.dead, ate };
  }

  copyCurrentToPrevious() {
    while (this.previousSegments.length < this.segments.length) {
      this.previousSegments.push(new THREE.Vector3());
    }
    for (let i = 0; i < this.segments.length; i++) {
      this.previousSegments[i].copy(this.segments[i]);
    }
    this.previousSegments.length = this.segments.length;
  }

  isOutOfBounds(pos) {
    return (pos.x < -HALF_BOARD || pos.x > HALF_BOARD - 1 ||
      pos.z < -HALF_BOARD || pos.z > HALF_BOARD - 1);
  }

  hitsSelf() {
    const head = this.segments[0];
    for (let i = 1; i < this.segments.length; i++) {
      if (head.equals(this.segments[i])) return true;
    }
    return false;
  }

  /* ── Renderização com interpolação ── */
  /**
   * Mesmo blend que os meshes: ease suave entre células (evita sensação de “passo seco”).
   * @param {number} alpha — progresso bruto do passo [0, 1]
   */
  _motionBlendT(alpha) {
    const a = THREE.MathUtils.clamp(alpha, 0, 1);
    return a * a * (3 - 2 * a);
  }

  /* ── Renderização com interpolação ── */
  /**
   * Requisito: Movimento suave com interpolação (lerp).
   * @param {number} alpha — factor de interpolação [0, 1]
   */
  render(alpha) {
    const now = performance.now();
    const t = this._motionBlendT(alpha);

    for (let i = 0; i < this.segments.length; i++) {
      const target = this.segments[i];
      const prev = this.previousSegments[i] || target;
      const mesh = this.group.children[i];
      if (!mesh) continue;

      mesh.position.set(
        THREE.MathUtils.lerp(gridToWorldX(prev.x), gridToWorldX(target.x), t),
        0.38,
        THREE.MathUtils.lerp(gridToWorldZ(prev.z), gridToWorldZ(target.z), t)
      );

      if (i === 0) {
        // ── Cabeça ──
        const yaw = Math.atan2(this.direction.x, this.direction.z) + Math.PI;
        mesh.rotation.set(0, yaw, 0);
        mesh.scale.setScalar(1.05 + Math.sin(now * 0.008) * 0.025);

        // Língua
        const tongue = mesh.userData.tongue;
        if (tongue) {
          const flick = Math.max(0, Math.sin(now * 0.02));
          tongue.scale.z = 0.6 + flick * 1.0;
          tongue.rotation.x = -0.04 + flick * 0.18;
        }



        // Emissão pulsante na cabeça
        this.headMaterial.emissiveIntensity = 0.35 + Math.sin(now * 0.006) * 0.15;

      } else {
        // ── Corpo ──
        const t = 1 - i / Math.max(1, this.segments.length);
        const thick = 0.88 + t * 0.12;
        mesh.scale.set(thick, 1, thick);

        const wave = Math.sin(now * 0.004 + i * 0.8) * 0.02;
        mesh.position.y = 0.38 + wave;
      }
    }

    // ── Posicionar e orientar a cauda do dragão ──
    if (this.dragonTailGroup && this.segments.length >= 2) {
      const n = this.segments.length - 1;
      const lastSeg = this.segments[n];
      const prevSeg = this.previousSegments[n] || lastSeg;
      const secLast = this.segments[n - 1];

      // Posição interpolada do último segmento
      this.dragonTailGroup.position.set(
        THREE.MathUtils.lerp(gridToWorldX(prevSeg.x), gridToWorldX(lastSeg.x), t),
        0,
        THREE.MathUtils.lerp(gridToWorldZ(prevSeg.z), gridToWorldZ(lastSeg.z), t)
      );

      // Orientar a cauda para apontar para fora do corpo da cobra
      const dx = lastSeg.x - secLast.x;
      const dz = lastSeg.z - secLast.z;
      this.dragonTailGroup.rotation.y = Math.atan2(dx, dz);

      // Abanar subtil da cauda
      this.dragonTailGroup.rotation.z = Math.sin(now * 0.005 + n * 0.5) * 0.08;
    }

    // Actualizar posição do escudo
    if (this.shieldMesh && this.group.children[0]) {
      this.shieldMesh.position.copy(this.group.children[0].position);
      this.shieldMesh.rotation.y += 0.02;
      this.shieldMesh.rotation.z += 0.01;
    }
  }

  /* ── Mesh management ── */
  syncMeshCount() {
    const skin = SNAKE_SKINS[this.currentSkinIndex];
    while (this.group.children.length < this.segments.length) {
      const isHead = this.group.children.length === 0;
      const mesh = new THREE.Mesh(
        isHead ? this.headGeometry : this.bodyGeometry,
        isHead ? this.headMaterial : this.bodyMaterial
      );
      if (isHead) {
        if (skin.id === 'cyber-green') attachDragonHeadDetails(mesh, skin);
        else attachDefaultHeadDetails(mesh, skin);
      } else {
        if (skin.id === 'cyber-green') attachDragonBodyDetails(mesh, skin);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    while (this.group.children.length > this.segments.length) {
      this.group.remove(this.group.children[this.group.children.length - 1]);
    }
    // Limitar sombras para performance
    for (let i = 0; i < this.group.children.length; i++) {
      this.group.children[i].castShadow = i < 8;
    }
  }

  /* ── Power-ups ── */

  /**
   * Activa o escudo visual (ShaderMaterial com fresnel).
   */
  activateShield() {
    this.shieldActive = true;
    this.shieldTimeRemaining = SHIELD_DURATION_SECONDS;
    this._removeShieldVisual();

    const shieldMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00ffff) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 2.5);
          float pulse   = 0.5 + 0.5 * sin(uTime * 4.0);
          float alpha   = fresnel * (0.4 + pulse * 0.2);
          gl_FragColor  = vec4(uColor, alpha);
        }
      `,
    });

    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 24, 18),
      shieldMat
    );
    this.shieldMesh.name = 'shield';
    this.scene.add(this.shieldMesh);
  }

  /**
   * Actualiza animação do escudo (shader).
   * @param {number} delta — tempo desde último tick (s)
   */
  updatePowerUps(delta) {
    if (this.shieldActive && this.shieldTimeRemaining > 0) {
      this.shieldTimeRemaining -= delta;
      if (this.shieldTimeRemaining <= 0) {
        this.shieldTimeRemaining = 0;
        this.shieldActive = false;
        this._removeShieldVisual();
      }
    }
    if (this.shieldMesh && this.shieldMesh.material.uniforms) {
      this.shieldMesh.material.uniforms.uTime.value += delta;
    }
  }

  /** @private */
  _removeShieldVisual() {
    if (this.shieldMesh) {
      this.scene.remove(this.shieldMesh);
      if (this.shieldMesh.geometry) this.shieldMesh.geometry.dispose();
      if (this.shieldMesh.material) this.shieldMesh.material.dispose();
      this.shieldMesh = null;
    }
  }

  /** @private — remove e liberta a cauda do dragão */
  _removeDragonTail() {
    if (this.dragonTailGroup) {
      this.scene.remove(this.dragonTailGroup);
      this.dragonTailGroup.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      this.dragonTailGroup = null;
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     TRAIL VISUAL — Rasto luminoso atrás da cobra
     ══════════════════════════════════════════════════════════════════ */

  /**
   * Emite uma partícula de trail na posição da cabeça.
   * Chamado a cada game step.
   */
  emitTrail() {
    if (this.dead || !this.segments[0]) return;

    if (!this._trailParticles) this._trailParticles = [];
    if (!this._trailPool) this._trailPool = [];
    if (!this._trailGeo) {
      this._trailGeo = new THREE.SphereGeometry(0.08, 4, 3);
    }

    const skin = SNAKE_SKINS[this.currentSkinIndex];
    const color = skin ? skin.headEmissive : 0x6600cc;

    // Reutilizar meshes/materiais para evitar GC (pool simples)
    let p = this._trailPool.length > 0 ? this._trailPool.pop() : null;
    if (!p) {
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      p = new THREE.Mesh(this._trailGeo, mat);
    } else {
      p.material.color.set(color);
      p.material.opacity = 0.6;
    }
    p.position.set(
      gridToWorldX(this.segments[0].x),
      0.15,
      gridToWorldZ(this.segments[0].z)
    );
    p.userData.life = 1.0;
    p.userData.decay = 0.7;
    this.scene.add(p);
    this._trailParticles.push(p);

    // Limitar tamanho do pool
    while (this._trailParticles.length > 80) {
      const old = this._trailParticles.shift();
      this.scene.remove(old);
      // Em vez de destruir, reciclar (com limite de pool)
      old.userData.life = 0;
      old.visible = true;
      if (this._trailPool.length < 120) this._trailPool.push(old);
      else old.material.dispose();
    }
  }

  /**
   * Actualiza as partículas do trail (fade out).
   * @param {number} delta — tempo desde último frame (s)
   */
  updateTrail(delta) {
    if (!this._trailParticles) return;

    for (let i = this._trailParticles.length - 1; i >= 0; i--) {
      const p = this._trailParticles[i];
      p.userData.life -= delta * p.userData.decay;
      p.material.opacity = Math.max(0, p.userData.life * 0.5);
      p.scale.setScalar(0.5 + p.userData.life * 0.5);

      if (p.userData.life <= 0) {
        this.scene.remove(p);
        this._trailParticles.splice(i, 1);
        // Reciclar
        p.scale.setScalar(1);
        p.material.opacity = 0;
        if (!this._trailPool) this._trailPool = [];
        if (this._trailPool.length < 120) this._trailPool.push(p);
        else p.material.dispose();
      }
    }
  }

  /**
   * Limpa todas as partículas do trail.
   */
  clearTrail() {
    if (!this._trailParticles) return;
    for (const p of this._trailParticles) {
      this.scene.remove(p);
      if (!this._trailPool) this._trailPool = [];
      if (this._trailPool.length < 120) {
        p.material.opacity = 0;
        this._trailPool.push(p);
      } else {
        p.material.dispose();
      }
    }
    this._trailParticles = [];
  }

  /* ══════════════════════════════════════════════════════════════════
     DEATH EXPLOSION — Explosão dramática ao morrer
     ══════════════════════════════════════════════════════════════════ */

  /**
   * Cria uma explosão de partículas a partir de todos os segmentos da cobra.
   * @returns {Array} array de partículas para tracking externo
   */
  explode() {
    const particles = [];
    const skin = SNAKE_SKINS[this.currentSkinIndex];
    const colors = [
      skin ? skin.headColor : 0x8844ff,
      skin ? skin.bodyColor : 0x6633cc,
      skin ? skin.headEmissive : 0x6600cc,
      0xff3333, // vermelho para impacto
    ];

    const geo = new THREE.SphereGeometry(0.08, 5, 4);

    for (let s = 0; s < this.segments.length; s++) {
      const seg = this.segments[s];
      const count = s === 0 ? 12 : 6; // mais partículas na cabeça

      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: colors[Math.floor(Math.random() * colors.length)],
          transparent: true,
          opacity: 1,
        });
        const p = new THREE.Mesh(geo, mat);
        p.position.set(gridToWorldX(seg.x), 0.38, gridToWorldZ(seg.z));

        p.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 6
        );
        p.userData.life = 1.0;
        p.userData.decay = 0.8 + Math.random() * 0.4;
        p.userData.spin = (Math.random() - 0.5) * 10;

        this.scene.add(p);
        particles.push(p);
      }
    }

    // Esconder a cobra
    this.group.visible = false;
    if (this.dragonTailGroup) this.dragonTailGroup.visible = false;

    return particles;
  }

  get headPosition() {
    return this.segments[0];
  }

  /** Cabeça no fim do passo (célula alvo), sem interpolação — lógica / replay. */
  get headWorldPosition() {
    const s = this.segments[0];
    this._headWorld.set(gridToWorldX(s.x), s.y, gridToWorldZ(s.z));
    return this._headWorld;
  }

  /**
   * Cabeça alinhada ao mesh interpolado (câmara / spotlight durante o jogo).
   * @param {number} alpha — mesmo valor que em render(alpha)
   */
  getHeadWorldInterpolated(alpha) {
    const t = this._motionBlendT(alpha);
    const target = this.segments[0];
    const prev = this.previousSegments[0] || target;
    this._headWorld.set(
      THREE.MathUtils.lerp(gridToWorldX(prev.x), gridToWorldX(target.x), t),
      0,
      THREE.MathUtils.lerp(gridToWorldZ(prev.z), gridToWorldZ(target.z), t)
    );
    return this._headWorld;
  }
}