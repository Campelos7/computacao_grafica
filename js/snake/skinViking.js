import * as THREE from 'three';
import { createCanvasTexture } from '../utils/helpers.js';

/* ==========================================================================
   snake/skinViking.js — SKIN COMPLEXA: Cobra Viking
   Capacete metálico dominante, chifres enormes, olhos âmbar brilhantes,
   barba espessa ruiva, marcas de guerra, runas gigantes, escudos e machados.
   ========================================================================== */

const WOOD_DARK = 0x3D1F0A;
const WOOD_MED  = 0x6B4020;
const AMBER     = 0xC68B2F;
const AMBER_HOT = 0xFF8C00;
const BONE      = 0xF5F0E0;
const IRON      = 0x888888;
const IRON_DK   = 0x444444;
const FUR_DK    = 0x3A2A1A;
const FUR_LT    = 0x9B7340;
const BEARD_COL = 0xA0522D;
const BLOOD     = 0xCC1111;

function mt(c,e,ei,r,m){ return new THREE.MeshStandardMaterial({color:c,emissive:e||0,emissiveIntensity:ei||0,roughness:r??0.5,metalness:m??0.3}); }

function mkM(skin) {
  return {
    wood:   mt(skin.headColor||WOOD_DARK, 0x0a0500, 0.04, 0.80, 0.05),
    woodBd: mt(skin.bodyColor||WOOD_DARK, 0x0a0500, 0.03, 0.80, 0.05),
    iron:   mt(IRON, 0x222222, 0.08, 0.15, 0.95),
    ironDk: mt(IRON_DK, 0x111111, 0.05, 0.25, 0.90),
    amber:  mt(AMBER, AMBER, 0.60, 0.30, 0.40),
    amberHot: mt(AMBER_HOT, AMBER_HOT, 2.0, 0.10, 0.0),
    bone:   mt(BONE, 0xCCCCBB, 0.08, 0.50, 0.10),
    beard:  mt(BEARD_COL, 0x331100, 0.06, 0.85, 0.0),
    beardDk:mt(0x7A3A1A, 0x220800, 0.04, 0.88, 0.0),
    fur:    mt(FUR_DK, 0x050200, 0.02, 0.95, 0.0),
    furLt:  mt(FUR_LT, 0x1a0d05, 0.04, 0.90, 0.0),
    blood:  mt(BLOOD, BLOOD, 1.2, 0.40, 0.05),
    shadow: mt(0x0a0500, 0, 0, 0.95, 0.0),
    hilite: mt(0x8B6030, 0x221005, 0.06, 0.70, 0.05),
    leather:mt(0x4A3020, 0x0a0500, 0.03, 0.85, 0.05),
    runeGlow: mt(AMBER, AMBER, 1.5, 0.20, 0.10),
  };
}

export function createVikingTexture() {
  return createCanvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#3D1F0A'; ctx.fillRect(0,0,s,s);
    ctx.strokeStyle = 'rgba(20,10,2,0.3)'; ctx.lineWidth = 1;
    for (let y=0; y<s; y+=3+Math.random()*4) {
      ctx.beginPath(); ctx.moveTo(0,y);
      for (let x=0; x<s; x+=5) ctx.lineTo(x, y+(Math.random()-0.5)*2);
      ctx.stroke();
    }
  }, { repeat:[2,2] });
}

function drawRune(ctx,cx,cy,s,idx){
  ctx.strokeStyle='#C68B2F'; ctx.lineWidth=s*0.12; ctx.lineCap='square';
  const h=s*0.42,w=s*0.22;
  switch(idx%6){
    case 0: ctx.beginPath();ctx.moveTo(cx,cy-h);ctx.lineTo(cx,cy+h);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy-h);ctx.lineTo(cx+w,cy-h*0.5);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy-h*0.3);ctx.lineTo(cx+w,cy-h*0.5+h*0.3);ctx.stroke();break;
    case 1: ctx.beginPath();ctx.moveTo(cx-w,cy-h);ctx.lineTo(cx-w,cy+h);ctx.lineTo(cx+w,cy+h*0.3);ctx.lineTo(cx+w,cy-h);ctx.stroke();break;
    case 2: ctx.beginPath();ctx.moveTo(cx-w*0.3,cy-h);ctx.lineTo(cx-w*0.3,cy+h);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx-w*0.3,cy-h*0.5);ctx.lineTo(cx+w,cy);ctx.lineTo(cx-w*0.3,cy+h*0.3);ctx.stroke();break;
    case 3: ctx.beginPath();ctx.moveTo(cx,cy-h);ctx.lineTo(cx,cy+h);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy-h*0.6);ctx.lineTo(cx-w,cy-h*0.2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy-h*0.1);ctx.lineTo(cx-w,cy+h*0.3);ctx.stroke();break;
    case 4: ctx.beginPath();ctx.moveTo(cx-w*0.3,cy-h);ctx.lineTo(cx-w*0.3,cy+h);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx-w*0.3,cy-h);ctx.lineTo(cx+w,cy-h*0.3);ctx.lineTo(cx-w*0.3,cy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx-w*0.3,cy);ctx.lineTo(cx+w,cy+h);ctx.stroke();break;
    case 5: ctx.beginPath();ctx.moveTo(cx+w,cy-h);ctx.lineTo(cx-w,cy);ctx.lineTo(cx+w,cy+h);ctx.stroke();break;
  }
}
function mkRuneTex(i){return createCanvasTexture(256,(ctx,s)=>{ctx.clearRect(0,0,s,s);drawRune(ctx,s/2,s/2,s*0.9,i);},{repeat:[1,1]});}

/* ══════════════════════════════════════════════════════════════════════════
   CABEÇA (~40+ meshes)
   ══════════════════════════════════════════════════════════════════════════ */
export function attachVikingHeadDetails(headMesh, skin) {
  const m = mkM(skin);
  const p = [];

  /* ── CAPACETE DOMINANTE ── */
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 18, 14, 0, Math.PI*2, 0, Math.PI*0.58), m.iron
  );
  helmet.position.set(0, 0.10, 0.02); helmet.scale.set(1.10, 0.62, 1.08);
  p.push(helmet);

  // Crista central larga
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.58), m.amber);
  crest.position.set(0, 0.34, 0.02); p.push(crest);
  // Banda cruzada
  const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.05), m.amber);
  crossB.position.set(0, 0.30, -0.06); p.push(crossB);

  // 12 REBITES grandes ao longo da borda
  const rvGeo = new THREE.SphereGeometry(0.020, 7, 5);
  for (let i = 0; i < 12; i++) {
    const a = (i/12)*Math.PI*2;
    const rv = new THREE.Mesh(rvGeo, m.ironDk);
    rv.position.set(Math.cos(a)*0.44, 0.14, Math.sin(a)*0.44); p.push(rv);
  }

  // PROTETOR NASAL grosso
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.035), m.iron);
  nose.position.set(0, 0.04, -0.46); p.push(nose);

  // Protectores de bochecha
  const chGeo = new THREE.BoxGeometry(0.05, 0.20, 0.18);
  const chL = new THREE.Mesh(chGeo, m.iron); chL.position.set(-0.42, -0.02, -0.14); chL.rotation.y=0.12;
  const chR = new THREE.Mesh(chGeo, m.iron); chR.position.set(0.42, -0.02, -0.14); chR.rotation.y=-0.12;
  p.push(chL, chR);

  /* ── CHIFRES ENORMES (3 segmentos cada, 3x mais grossos, 2x mais longos) ── */
  const mkHorn = (side) => {
    const s = side, parts = [];
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, 0.28, 10), m.bone);
    b.position.set(s*0.36, 0.28, 0.08); b.rotation.set(-0.25, 0, s*0.50); parts.push(b);
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.045, 0.32, 9), m.bone);
    mid.position.set(s*0.56, 0.50, 0.02); mid.rotation.set(0.15, 0, s*0.38); parts.push(mid);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.030, 0.28, 8), m.bone);
    tip.position.set(s*0.68, 0.74, -0.06); tip.rotation.set(0.35, 0, s*0.18); parts.push(tip);
    // Anéis decorativos
    const rGeo = new THREE.TorusGeometry(0.052, 0.008, 8, 12);
    const r1 = new THREE.Mesh(rGeo, m.amber); r1.position.set(s*0.42, 0.35, 0.06); r1.rotation.set(0.3,0,s*0.48); parts.push(r1);
    const r2 = new THREE.Mesh(rGeo, m.ironDk); r2.position.set(s*0.60, 0.58, 0.0); r2.rotation.set(0.2,0,s*0.32); parts.push(r2);
    return parts;
  };
  p.push(...mkHorn(-1), ...mkHorn(1));

  /* ── OLHOS ÂMBAR BRILHANTES (grandes, salientes, emissivos) ── */
  const eyeGeo = new THREE.SphereGeometry(0.06, 10, 8);
  const eyeL = new THREE.Mesh(eyeGeo, m.amberHot);
  eyeL.position.set(-0.16, 0.06, -0.42);
  const eyeR = new THREE.Mesh(eyeGeo, m.amberHot);
  eyeR.position.set(0.16, 0.06, -0.42);
  // Pupilas escuras verticais
  const pupGeo = new THREE.BoxGeometry(0.012, 0.06, 0.012);
  const pupL = new THREE.Mesh(pupGeo, mt(0x110500,0,0,0.9,0));
  pupL.position.set(0,0,-0.04); eyeL.add(pupL);
  const pupR = new THREE.Mesh(pupGeo, mt(0x110500,0,0,0.9,0));
  pupR.position.set(0,0,-0.04); eyeR.add(pupR);
  p.push(eyeL, eyeR);

  /* ── MARCAS DE GUERRA — 3 riscos LARGOS e emissivos por lado ── */
  const warGeo = new THREE.BoxGeometry(0.012, 0.010, 0.14);
  for (let i = 0; i < 3; i++) {
    const y = -0.02 + i * 0.06;
    const wL = new THREE.Mesh(warGeo, m.blood);
    wL.position.set(-0.34, y, -0.32); wL.rotation.y = 0.25; p.push(wL);
    const wR = new THREE.Mesh(warGeo, m.blood);
    wR.position.set(0.34, y, -0.32); wR.rotation.y = -0.25; p.push(wR);
  }

  /* ── BARBA ESPESSA (10 cilindros grossos, ruivo-avermelhado) ── */
  const beardPositions = [
    {x:-0.14,l:0.20,rx:0.22}, {x:-0.10,l:0.26,rx:0.28}, {x:-0.06,l:0.30,rx:0.30},
    {x:-0.02,l:0.32,rx:0.32}, {x:0.02,l:0.32,rx:0.32}, {x:0.06,l:0.30,rx:0.30},
    {x:0.10,l:0.26,rx:0.28}, {x:0.14,l:0.20,rx:0.22},
    {x:-0.18,l:0.14,rx:0.18}, {x:0.18,l:0.14,rx:0.18},
  ];
  const beardStrands = [];
  beardPositions.forEach((bp, i) => {
    const mat = i%2===0 ? m.beard : m.beardDk;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.009, bp.l, 6), mat);
    s.position.set(bp.x, -0.24, -0.24); s.rotation.x = bp.rx; s.rotation.z = bp.x*0.3;
    // Contas âmbar
    if (i%3===0) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.012,6,4), m.amber);
      bead.position.set(0,-bp.l*0.35,0); s.add(bead);
    }
    // Anéis
    if (i%2===1 && i<8) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016,0.004,6,8), m.ironDk);
      ring.position.set(0,-0.04,0); s.add(ring);
    }
    beardStrands.push(s);
  });
  p.push(...beardStrands);

  /* ── GOLA DE PELE (12 tufos grossos) ── */
  for (let i = 0; i < 12; i++) {
    const a = (i/12)*Math.PI*2;
    const tuft = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.06, 0.04), i%2===0 ? m.fur : m.furLt
    );
    tuft.position.set(Math.cos(a)*0.38, -0.18, Math.sin(a)*0.38);
    tuft.rotation.y = a; p.push(tuft);
  }

  headMesh.add(...p);
  headMesh.userData.tongue = null;
  headMesh.userData.runeEyes = [eyeL, eyeR];
}

/* ══════════════════════════════════════════════════════════════════════════
   CORPO (~18+ meshes por segmento)
   ══════════════════════════════════════════════════════════════════════════ */
export function attachVikingBodyDetails(bodyMesh, skin, segIndex = 0) {
  const m = mkM(skin);

  /* ── FRAME METÁLICO (bordas de ferro brilhante em volta do segmento) ── */
  const fH = new THREE.BoxGeometry(0.72, 0.025, 0.025);
  const fV = new THREE.BoxGeometry(0.025, 0.025, 0.80);
  bodyMesh.add(
    new THREE.Mesh(fH, m.iron).translateY(0.29).translateZ(-0.39),
    new THREE.Mesh(fH, m.iron).translateY(0.29).translateZ(0.39),
    new THREE.Mesh(fV, m.iron).translateY(0.29).translateX(-0.35),
    new THREE.Mesh(fV, m.iron).translateY(0.29).translateX(0.35),
  );

  /* ── RUNA CENTRAL GIGANTE (0.55×0.55, âmbar brilhante) ── */
  const runeTex = mkRuneTex(segIndex);
  const rune = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.55),
    new THREE.MeshStandardMaterial({
      map: runeTex, transparent: true, alphaTest: 0.05,
      color: AMBER, emissive: AMBER, emissiveIntensity: 1.0,
      roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide,
    })
  );
  rune.position.set(0, 0.30, 0); rune.rotation.x = -Math.PI/2;
  bodyMesh.add(rune);

  /* ── FRISO DE TRIÂNGULOS GRANDES (4 bordas) ── */
  const triGeo = new THREE.ConeGeometry(0.045, 0.06, 3);
  // Lados
  for (let i = 0; i < 5; i++) {
    const z = -0.34 + (i/4)*0.68;
    const tL = new THREE.Mesh(triGeo, m.amber); tL.position.set(-0.36, 0.14, z); tL.rotation.z = Math.PI/2;
    const tR = new THREE.Mesh(triGeo, m.amber); tR.position.set(0.36, 0.14, z); tR.rotation.z = -Math.PI/2;
    bodyMesh.add(tL, tR);
  }
  // Frente/trás
  for (let i = 0; i < 4; i++) {
    const x = -0.24 + (i/3)*0.48;
    const tF = new THREE.Mesh(triGeo, m.amber); tF.position.set(x, 0.14, -0.39); tF.rotation.x = Math.PI/2;
    const tB = new THREE.Mesh(triGeo, m.amber); tB.position.set(x, 0.14, 0.39); tB.rotation.x = -Math.PI/2;
    bodyMesh.add(tF, tB);
  }

  /* ── REBITES DE FERRO grandes (8, cantos + meio das bordas) ── */
  const rvGeo = new THREE.SphereGeometry(0.016, 6, 4);
  const rvPos = [
    [-0.34,-0.38],[0.34,-0.38],[-0.34,0.38],[0.34,0.38],
    [0,-0.38],[0,0.38],[-0.34,0],[0.34,0]
  ];
  rvPos.forEach(([x,z]) => {
    const rv = new THREE.Mesh(rvGeo, m.ironDk); rv.position.set(x, 0.30, z); bodyMesh.add(rv);
  });

  /* ── ESCUDO ou MACHADO alternado (4x maiores) ── */
  const even = segIndex % 2 === 0;
  if (even) {
    // ESCUDO grande com listras
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.018, 12), m.wood);
    shield.position.set(-0.08, 0.12, 0.10); shield.rotation.z = Math.PI/2;
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), m.iron);
    boss.position.set(0, 0.012, 0); shield.add(boss);
    // Listras pintadas (vermelho + branco alternado)
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.020, 0.025),
        i%2===0 ? m.blood : mt(BONE, 0, 0, 0.6, 0.1)
      );
      stripe.position.set(0, 0.012, -0.06 + i*0.06); shield.add(stripe);
    }
    // Borda de ferro
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 6, 16), m.ironDk);
    rim.position.set(0, 0.012, 0); shield.add(rim);
    bodyMesh.add(shield);
  } else {
    // MACHADO grande com lâmina côncava
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.012, 0.22, 6), m.wood);
    handle.position.set(-0.08, 0.12, 0.10); handle.rotation.z = Math.PI/2;
    // Lâmina larga
    const blade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.12, 0.16, 8, 1, false, 0, Math.PI), m.iron
    );
    blade.position.set(0, 0, 0.10); blade.rotation.set(0, 0, Math.PI/2); blade.scale.set(0.4, 1, 1);
    handle.add(blade);
    // Colar ferro
    const col = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.005, 6, 8), m.ironDk);
    col.position.set(0, 0, 0.04); handle.add(col);
    bodyMesh.add(handle);
  }

  /* ── PELE DE LOBO (tufos de fur em metade dos segmentos) ── */
  if (segIndex % 3 === 0) {
    for (let i = 0; i < 6; i++) {
      const z = -0.30 + (i/5)*0.60;
      const tuft = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.04, 0.06), i%2===0 ? m.fur : m.furLt
      );
      tuft.position.set(0.28, 0.20, z);
      tuft.rotation.set(0, 0, -0.3 + Math.random()*0.2);
      bodyMesh.add(tuft);
    }
  }

  /* ── Junta de madeira (sombra + luz) ── */
  bodyMesh.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.010, 0.015), m.shadow).translateY(0.005).translateZ(0.39),
    new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.010, 0.015), m.hilite).translateY(0.025).translateZ(0.39),
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CAUDA — Machado de guerra duplo + escudo (~14 meshes)
   ══════════════════════════════════════════════════════════════════════════ */
export function createVikingTailGroup(skin) {
  const group = new THREE.Group();
  group.name = 'vikingTail';
  const m = mkM(skin);

  // Cabo com couro
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.48, 7), m.wood);
  handle.position.set(0, 0.35, 0.42); handle.rotation.x = -(Math.PI/2)+0.15;
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 8), m.leather);
    w.position.set(0, -0.15+i*0.10, 0); handle.add(w);
  }

  // Lâminas duplas grandes
  const blGeo = new THREE.CylinderGeometry(0.01, 0.14, 0.18, 8, 1, false, 0, Math.PI);
  const bl1 = new THREE.Mesh(blGeo, m.iron);
  bl1.position.set(0.07, 0.38, 0.68); bl1.rotation.set(0,0,Math.PI/2); bl1.scale.set(0.45,1,1);
  const bl2 = new THREE.Mesh(blGeo, m.iron);
  bl2.position.set(-0.07, 0.38, 0.68); bl2.rotation.set(0,Math.PI,Math.PI/2); bl2.scale.set(0.45,1,1);

  // Colar junção
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 8, 12), m.ironDk);
  collar.position.set(0, 0.36, 0.62); collar.rotation.x = Math.PI/2;

  // Runa no cabo
  const rTex = mkRuneTex(0);
  const rPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.05, 0.10),
    new THREE.MeshStandardMaterial({map:rTex, transparent:true, alphaTest:0.05, side:THREE.DoubleSide})
  );
  rPlane.position.set(0, 0.35, 0.50); rPlane.rotation.x = Math.PI/2;

  // Pendente dente de lobo
  const fang = new THREE.Mesh(new THREE.ConeGeometry(0.010, 0.05, 4), m.bone);
  fang.position.set(0, 0.28, 0.44); fang.rotation.x = Math.PI;
  const fRing = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 8), m.amber);
  fRing.position.set(0, 0.025, 0); fang.add(fRing);

  // Escudo pendurado grande
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.015, 12), m.wood);
  shield.position.set(0.12, 0.32, 0.54); shield.rotation.z = Math.PI/2+0.3;
  shield.add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 7, 5), m.iron).translateY(0.010));
  const cH = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.018, 0.010), m.iron);
  cH.position.set(0, 0.010, 0); shield.add(cH);
  const cV = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.018, 0.15), m.iron);
  cV.position.set(0, 0.010, 0); shield.add(cV);
  shield.add(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.006, 6, 14), m.ironDk).translateY(0.010));

  group.add(handle, bl1, bl2, collar, rPlane, fang, shield);
  return group;
}
