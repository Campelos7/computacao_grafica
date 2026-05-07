import * as THREE from 'three';

/* ==========================================================================
   snake/skinInfernal.js — SKIN COMPLEXA: Serpente Infernal
   Chifres enormes com pontas incandescentes, olhos de fogo ardentes,
   mandíbula escancarada com interior flamejante, fissuras de lava
   ramificadas, crista dorsal, escamas visíveis e tridente gigante.
   ========================================================================== */

const OBSIDIAN  = 0x1a0a0a;
const LAVA      = 0xFF6600;
const LAVA_HOT  = 0xFF4500;
const FIRE_EYE  = 0xFF6600;
const HORN_DK   = 0x440000;
const HORN_TIP  = 0xFF4500;
const FANG_COL  = 0xddc8a0;
const MOUTH_INT = 0xCC2200;
const EMBER     = 0xFFDD00;

function mt(c,e,ei,r,m){ return new THREE.MeshStandardMaterial({color:c,emissive:e||0,emissiveIntensity:ei||0,roughness:r??0.5,metalness:m??0.2}); }

function mkM(skin) {
  return {
    skin:     mt(skin.headColor||OBSIDIAN, 0x220000, 0.08, 0.55, 0.15),
    skinLt:   mt(0x2a1212, 0x110000, 0.05, 0.60, 0.10),
    horn:     mt(skin.hornColor||HORN_DK, 0x220000, 0.15, 0.60, 0.10),
    hornTip:  mt(HORN_TIP, HORN_TIP, 1.5, 0.30, 0.15),
    socket:   mt(0x030303, 0, 0, 0.95, 0.0),
    fireEye:  mt(FIRE_EYE, FIRE_EYE, 4.0, 0.08, 0.0),
    fireRing: mt(LAVA, LAVA, 2.5, 0.10, 0.0),
    pupil:    mt(0x050000, 0, 0, 0.90, 0.0),
    lava:     mt(LAVA, LAVA, 3.5, 0.15, 0.0),
    lavaBranch: mt(LAVA_HOT, LAVA_HOT, 2.5, 0.20, 0.0),
    fang:     mt(skin.fangColor||FANG_COL, 0x332200, 0.05, 0.40, 0.0),
    tongue:   mt(LAVA, LAVA, 2.5, 0.30, 0.0),
    mouth:    mt(MOUTH_INT, MOUTH_INT, 1.5, 0.40, 0.0),
    belly:    mt(0x331100, LAVA, 0.8, 0.60, 0.0),
    spineTip: mt(LAVA_HOT, LAVA_HOT, 2.0, 0.25, 0.10),
    flame:    new THREE.MeshBasicMaterial({color:LAVA, transparent:true, opacity:0.80, blending:THREE.AdditiveBlending, depthWrite:false}),
    ember:    new THREE.MeshBasicMaterial({color:EMBER, transparent:true, opacity:0.90, blending:THREE.AdditiveBlending, depthWrite:false}),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   CABEÇA (~48+ meshes)
   ══════════════════════════════════════════════════════════════════════════ */
export function attachInfernalHeadDetails(headMesh, skin) {
  const m = mkM(skin);
  const p = [];

  /* ── CHIFRES PRINCIPAIS (4 segmentos curvos cada, pontas incandescentes) ── */
  const mkHorn = (side) => {
    const s = side, parts = [];
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.060, 0.090, 0.22, 10), m.horn);
    b.position.set(s*0.20, 0.34, -0.02); b.rotation.set(-0.28, 0, s*0.32); parts.push(b);
    const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.058, 0.22, 9), m.horn);
    m2.position.set(s*0.34, 0.52, 0.04); m2.rotation.set(0.05, 0, s*0.50); parts.push(m2);
    const m3 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.040, 0.20, 8), m.horn);
    m3.position.set(s*0.46, 0.68, 0.08); m3.rotation.set(0.20, 0, s*0.35); parts.push(m3);
    // Ponta incandescente
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.026, 0.18, 7), m.hornTip);
    tip.position.set(s*0.52, 0.84, 0.10); tip.rotation.set(0.30, 0, s*0.15); parts.push(tip);
    return parts;
  };
  p.push(...mkHorn(-1), ...mkHorn(1));

  /* ── CHIFRES SECUNDÁRIOS (2x maiores, coroa demoníaca) ── */
  const mkSecHorn = (side) => {
    const s = side, parts = [];
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.060, 0.18, 8), m.horn);
    b.position.set(s*0.28, 0.30, -0.18); b.rotation.set(-0.45, 0, s*0.42); parts.push(b);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.035, 0.14, 7), m.hornTip);
    tip.position.set(s*0.38, 0.44, -0.16); tip.rotation.set(-0.20, 0, s*0.55); parts.push(tip);
    return parts;
  };
  p.push(...mkSecHorn(-1), ...mkSecHorn(1));

  /* ── OLHOS ARDENTES (grandes, com anel de fogo) ── */
  const mkEye = (x) => {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), m.socket);
    socket.position.set(x, 0.08, -0.34);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), m.fireEye.clone());
    iris.position.set(0, 0, -0.08); socket.add(iris);
    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.10, 0.015), m.pupil);
    pupil.position.set(0, 0, -0.06); iris.add(pupil);
    // Anel de fogo à volta da íris
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 8, 16), m.fireRing);
    ring.position.set(0, 0, -0.06); ring.rotation.y = Math.PI/2; socket.add(ring);
    return { socket, iris };
  };
  const eyeL = mkEye(-0.20); const eyeR = mkEye(0.20);
  p.push(eyeL.socket, eyeR.socket);

  /* ── MANDÍBULA ESCANCARADA (aberta, 6 presas, interior flamejante) ── */
  const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.09, 0.30), m.skin);
  upperJaw.position.set(0, -0.02, -0.44); p.push(upperJaw);
  const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.26), m.skin);
  lowerJaw.position.set(0, -0.22, -0.38); lowerJaw.rotation.x = 0.45; p.push(lowerJaw);

  // Interior flamejante da boca
  const mouthInt = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.04, 0.20), m.mouth);
  mouthInt.position.set(0, -0.10, -0.42); p.push(mouthInt);

  // 6 PRESAS (2 frontais longas + 2 laterais + 2 inferiores)
  const fangGeo = new THREE.ConeGeometry(0.020, 0.12, 6);
  const fangGeoThick = new THREE.ConeGeometry(0.025, 0.10, 6);
  const fangGeoSmall = new THREE.ConeGeometry(0.016, 0.08, 5);
  const mkFang = (geo, x, y, z, rx) => {
    const f = new THREE.Mesh(geo, m.fang);
    f.position.set(x, y, z); f.rotation.x = rx || Math.PI; return f;
  };
  p.push(
    mkFang(fangGeo, -0.10, -0.10, -0.56, Math.PI),
    mkFang(fangGeo, 0.10, -0.10, -0.56, Math.PI),
    mkFang(fangGeoThick, -0.18, -0.08, -0.48, Math.PI + 0.2),
    mkFang(fangGeoThick, 0.18, -0.08, -0.48, Math.PI - 0.2),
    mkFang(fangGeoSmall, -0.08, -0.26, -0.48, 0),
    mkFang(fangGeoSmall, 0.08, -0.26, -0.48, 0),
  );

  /* ── FISSURAS DE LAVA RAMIFICADAS (6 fissuras + 12 ramificações) ── */
  const crackGeo = new THREE.BoxGeometry(0.016, 0.016, 0.28);
  const branchGeo = new THREE.BoxGeometry(0.006, 0.006, 0.12);
  const crackData = [
    { x:-0.14, y:0.22, z:-0.06, ry:0.3 },
    { x:0.16, y:0.20, z:-0.03, ry:-0.25 },
    { x:0.0, y:0.28, z:0.06, ry:0.0 },
    { x:-0.22, y:0.06, z:-0.25, ry:0.5 },  // bochecha esq
    { x:0.24, y:0.04, z:-0.22, ry:-0.45 },  // bochecha dir
    { x:0.0, y:0.20, z:-0.30, ry:0.15 },    // testa
  ];
  const cracks = [];
  crackData.forEach(c => {
    const cr = new THREE.Mesh(crackGeo, m.lava.clone());
    cr.position.set(c.x, c.y, c.z); cr.rotation.y = c.ry;
    // 2 ramificações por fissura
    const br1 = new THREE.Mesh(branchGeo, m.lavaBranch.clone());
    br1.position.set(-0.03, 0, -0.12); br1.rotation.y = 0.5; cr.add(br1);
    const br2 = new THREE.Mesh(branchGeo, m.lavaBranch.clone());
    br2.position.set(0.03, 0, 0.12); br2.rotation.y = -0.4; cr.add(br2);
    cracks.push(cr); p.push(cr);
  });

  /* ── CRISTA DORSAL (5 espinhas decrescentes, pontas laranja) ── */
  const spineData = [
    { z:-0.15, r:0.055, h:0.28 },  // primeira quase tão alta quanto chifres
    { z:0.00, r:0.048, h:0.22 },
    { z:0.12, r:0.042, h:0.17 },
    { z:0.22, r:0.035, h:0.13 },
    { z:0.32, r:0.028, h:0.10 },
  ];
  spineData.forEach(s => {
    // Base da espinha
    const base = new THREE.Mesh(new THREE.ConeGeometry(s.r, s.h*0.65, 5), m.horn);
    base.position.set(0, 0.30 + s.h*0.32, s.z); p.push(base);
    // Ponta emissiva laranja
    const tip = new THREE.Mesh(new THREE.ConeGeometry(s.r*0.4, s.h*0.40, 4), m.spineTip);
    tip.position.set(0, 0.30 + s.h*0.72, s.z); p.push(tip);
  });

  /* ── LÍNGUA TRIFURCADA LONGA (0.50) ── */
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.50), m.tongue);
  tongue.position.set(0, -0.14, -0.68);
  const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.010, 0.16), m.tongue);
  forkL.position.set(-0.028, 0, -0.22); forkL.rotation.y = -0.65; tongue.add(forkL);
  const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.010, 0.16), m.tongue);
  forkR.position.set(0.028, 0, -0.22); forkR.rotation.y = 0.65; tongue.add(forkR);
  // Fork central (mais fino, trifurcada)
  const forkC = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.14), m.tongue);
  forkC.position.set(0, 0, -0.26); tongue.add(forkC);
  p.push(tongue);

  headMesh.add(...p);
  headMesh.userData.tongue = tongue;
  headMesh.userData.fireIris = [eyeL.iris, eyeR.iris];
  headMesh.userData.pupils = [eyeL.iris.children[0], eyeR.iris.children[0]];
  headMesh.userData.lavaCracks = cracks;
}

/* ══════════════════════════════════════════════════════════════════════════
   CORPO (~18+ meshes por segmento)
   ══════════════════════════════════════════════════════════════════════════ */
export function attachInfernalBodyDetails(bodyMesh, skin, segIndex = 0) {
  const m = mkM(skin);

  /* ── FISSURAS DE LAVA (laterais retas + diagonais cruzadas + dorsal) ── */
  const crackSide = new THREE.BoxGeometry(0.016, 0.28, 0.55);
  const crackDiag = new THREE.BoxGeometry(0.012, 0.22, 0.40);
  const crackTop  = new THREE.BoxGeometry(0.012, 0.012, 0.65);
  const cL = new THREE.Mesh(crackSide, m.lava.clone()); cL.position.set(-0.30, 0.05, 0);
  const cR = new THREE.Mesh(crackSide, m.lava.clone()); cR.position.set(0.30, 0.05, 0);
  // Diagonais cruzadas
  const dL = new THREE.Mesh(crackDiag, m.lava.clone()); dL.position.set(-0.22, 0.08, 0); dL.rotation.z = 0.3;
  const dR = new THREE.Mesh(crackDiag, m.lava.clone()); dR.position.set(0.22, 0.08, 0); dR.rotation.z = -0.3;
  const cT = new THREE.Mesh(crackTop, m.lava.clone()); cT.position.set(0, 0.30, 0);
  const allCracks = [cL, cR, dL, dR, cT];
  bodyMesh.add(cL, cR, dL, dR, cT);

  /* ── ESPINHAS DORSAIS com pontas emissivas ── */
  const even = segIndex % 2 === 0;
  const spines = even
    ? [{z:-0.25,r:0.050,h:0.18},{z:-0.08,r:0.055,h:0.22},{z:0.10,r:0.055,h:0.20},{z:0.28,r:0.045,h:0.16}]
    : [{z:-0.18,r:0.055,h:0.20},{z:0.05,r:0.050,h:0.18},{z:0.25,r:0.042,h:0.14}];
  spines.forEach(s => {
    const base = new THREE.Mesh(new THREE.ConeGeometry(s.r, s.h*0.65, 5), m.horn);
    base.position.set(0, 0.30 + s.h*0.32, s.z); bodyMesh.add(base);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(s.r*0.35, s.h*0.40, 4), m.spineTip);
    tip.position.set(0, 0.30 + s.h*0.72, s.z); bodyMesh.add(tip);
  });

  /* ── ESCAMAS VISÍVEIS (3 filas em padrão offset) ── */
  const scaleGeo = new THREE.BoxGeometry(0.08, 0.008, 0.06);
  for (let row = 0; row < 3; row++) {
    const z0 = -0.28 + row * 0.22;
    const offset = row % 2 === 0 ? 0 : 0.05;
    for (let col = 0; col < 5; col++) {
      const x = -0.20 + col * 0.10 + offset;
      const sc = new THREE.Mesh(scaleGeo, m.skinLt);
      sc.position.set(x, 0.28, z0);
      sc.rotation.x = -0.15;
      bodyMesh.add(sc);
    }
  }

  /* ── VENTRE brilhante largo ── */
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.65), m.belly);
  belly.position.set(0, -0.29, 0); bodyMesh.add(belly);

  bodyMesh.userData.lavaCracks = allCracks;
}

/* ══════════════════════════════════════════════════════════════════════════
   CAUDA — Tridente gigante com chamas (~18+ meshes)
   ══════════════════════════════════════════════════════════════════════════ */
export function createInfernalTailGroup(skin) {
  const group = new THREE.Group();
  group.name = 'infernalTail';
  const m = mkM(skin);

  /* ── Haste grossa com estrias ── */
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.040, 0.55, 8), m.horn);
  shaft.position.set(0, 0.35, 0.42); shaft.rotation.x = -(Math.PI/2)+0.15;
  // 3 estrias âmbar
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 10),
      mt(LAVA, LAVA, 0.8, 0.30, 0.15));
    ring.position.set(0, -0.15 + i*0.15, 0); shaft.add(ring);
  }

  /* ── Base do tridente ── */
  const base = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), m.horn);
  base.scale.set(1.3, 0.6, 1.3); base.position.set(0, 0.38, 0.70);

  /* ── Pontas gigantes (central 0.30, laterais 0.22, pontas emissivas) ── */
  const mkPoint = (x, h, rz) => {
    const parts = [];
    // Corpo da ponta
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.020, h*0.65, 6), m.horn);
    body.position.set(x, 0.38+h*0.25, 0.76); body.rotation.set(0.3, 0, rz); parts.push(body);
    // Ponta incandescente
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.010, h*0.40, 5), m.spineTip);
    tip.position.set(x, 0.38+h*0.55, 0.78); tip.rotation.set(0.3, 0, rz); parts.push(tip);
    return parts;
  };
  const points = [...mkPoint(0, 0.30, 0), ...mkPoint(-0.08, 0.22, 0.25), ...mkPoint(0.08, 0.22, -0.25)];

  /* ── CHAMAS GRANDES (5 cones) ── */
  const flameData = [
    { r:0.055, h:0.25, x:0, z:0.64 },
    { r:0.040, h:0.20, x:-0.05, z:0.60 },
    { r:0.040, h:0.20, x:0.05, z:0.60 },
    { r:0.030, h:0.16, x:-0.03, z:0.56 },
    { r:0.030, h:0.16, x:0.03, z:0.56 },
  ];
  const flames = flameData.map(f => {
    const fl = new THREE.Mesh(new THREE.ConeGeometry(f.r, f.h, 6), m.flame.clone());
    fl.position.set(f.x, 0.38, f.z); fl.rotation.x = Math.PI; return fl;
  });

  /* ── PARTÍCULAS ESTÁTICAS (8 brasas dispersas) ── */
  const emberGeo = new THREE.SphereGeometry(0.008, 6, 4);
  const embers = [];
  for (let i = 0; i < 8; i++) {
    const eb = new THREE.Mesh(emberGeo, m.ember.clone());
    eb.position.set(
      (Math.random()-0.5)*0.14,
      0.35 + Math.random()*0.12,
      0.56 + Math.random()*0.12
    );
    embers.push(eb);
  }

  group.add(shaft, base, ...points, ...flames, ...embers);
  group.userData.flames = flames;
  group.userData.embers = embers;
  return group;
}
