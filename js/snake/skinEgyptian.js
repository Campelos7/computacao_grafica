import * as THREE from 'three';
import { createCanvasTexture } from '../utils/helpers.js';

/* ==========================================================================
   snake/skinEgyptian.js — SKIN COMPLEXA: Cobra Egípcia / Faraó
   Nemes dominante azul/dourado, uraeus gigante, olhos de Hórus dramáticos,
   colar peitoral de 5 anéis, hieróglifos enormes e escaravelho alado.
   ========================================================================== */

const GOLD      = 0xFFD700;
const GOLD_DK   = 0x8B6914;
const GOLD_LT   = 0xDAA520;
const BLUE      = 0x0047AB;
const LAPIS     = 0x1E3A6E;
const TERRA     = 0xCC4422;
const BLACK     = 0x000000;
const TURQ      = 0x00FFD5;
const RUBY      = 0xCC1133;

function mt(c,e,ei,r,m){ return new THREE.MeshStandardMaterial({color:c,emissive:e||0,emissiveIntensity:ei||0,roughness:r??0.4,metalness:m??0.5}); }

function mkM(skin) {
  return {
    gold:    mt(GOLD, GOLD, 0.60, 0.20, 0.95),
    goldDk:  mt(GOLD_DK, 0x665500, 0.20, 0.20, 0.90),
    goldLt:  mt(GOLD_LT, GOLD_LT, 0.30, 0.25, 0.85),
    blue:    mt(BLUE, BLUE, 0.40, 0.35, 0.50),
    lapis:   mt(LAPIS, LAPIS, 0.25, 0.40, 0.35),
    terra:   mt(TERRA, TERRA, 0.20, 0.50, 0.15),
    black:   mt(BLACK, 0, 0, 0.85, 0.05),
    turq:    mt(TURQ, TURQ, 1.5, 0.15, 0.10),
    turqHot: mt(TURQ, TURQ, 3.0, 0.10, 0.0),
    ruby:    mt(RUBY, RUBY, 1.0, 0.20, 0.20),
    ankh:    mt(GOLD, GOLD, 0.80, 0.15, 0.95),
    iris:    mt(GOLD, GOLD, 2.5, 0.10, 0.10),
  };
}

export function createEgyptianTexture() {
  return createCanvasTexture(128, (ctx, s) => {
    const g = ctx.createLinearGradient(0,0,0,s);
    g.addColorStop(0,'#B8960B'); g.addColorStop(0.5,'#8B6914'); g.addColorStop(1,'#B8960B');
    ctx.fillStyle = g; ctx.fillRect(0,0,s,s);
    ctx.fillStyle = 'rgba(255,215,0,0.10)';
    for (let i=0;i<100;i++) ctx.fillRect(Math.random()*s,Math.random()*s,2,1);
  }, { repeat:[2,2] });
}

function drawHieroglyph(ctx,cx,cy,s,idx){
  ctx.strokeStyle='#000000'; ctx.fillStyle='#000000'; ctx.lineWidth=s*0.08; ctx.lineCap='round';
  switch(idx%5){
    case 0: ctx.beginPath();ctx.ellipse(cx,cy,s*.38,s*.20,0,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,s*.10,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(cx,cy+s*.20);ctx.quadraticCurveTo(cx-s*.06,cy+s*.45,cx-s*.08,cy+s*.50);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx+s*.38,cy);ctx.lineTo(cx+s*.48,cy+s*.06);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx-s*.38,cy);ctx.lineTo(cx-s*.46,cy-s*.08);ctx.stroke();break;
    case 1: ctx.beginPath();ctx.moveTo(cx-s*.32,cy);ctx.lineTo(cx+s*.18,cy-s*.22);ctx.lineTo(cx+s*.38,cy-s*.12);
      ctx.lineTo(cx+s*.22,cy);ctx.lineTo(cx+s*.18,cy+s*.32);ctx.lineTo(cx+s*.06,cy+s*.32);ctx.lineTo(cx,cy+s*.12);
      ctx.lineTo(cx-s*.16,cy+s*.32);ctx.lineTo(cx-s*.22,cy+s*.32);ctx.lineTo(cx-s*.12,cy);ctx.closePath();ctx.stroke();
      ctx.beginPath();ctx.arc(cx+s*.24,cy-s*.14,s*.035,0,Math.PI*2);ctx.fill();break;
    case 2: ctx.beginPath();ctx.moveTo(cx,cy-s*.38);
      ctx.bezierCurveTo(cx+s*.40,cy-s*.22,cx-s*.40,cy+s*.12,cx,cy+s*.38);ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy-s*.38,s*.07,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(cx-s*.10,cy-s*.30);ctx.lineTo(cx+s*.10,cy-s*.30);ctx.stroke();break;
    case 3: ctx.beginPath();ctx.ellipse(cx,cy-s*.24,s*.15,s*.18,0,0,Math.PI*2);ctx.stroke();
      ctx.lineWidth=s*0.09;
      ctx.beginPath();ctx.moveTo(cx,cy-s*.06);ctx.lineTo(cx,cy+s*.40);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx-s*.22,cy+s*.10);ctx.lineTo(cx+s*.22,cy+s*.10);ctx.stroke();break;
    case 4: ctx.beginPath();ctx.arc(cx,cy,s*.16,0,Math.PI*2);ctx.fill();
      ctx.lineWidth=s*0.06;
      for(let a=0;a<12;a++){const an=(a/12)*Math.PI*2;
        ctx.beginPath();ctx.moveTo(cx+Math.cos(an)*s*.22,cy+Math.sin(an)*s*.22);
        ctx.lineTo(cx+Math.cos(an)*s*.38,cy+Math.sin(an)*s*.38);ctx.stroke();}break;
  }
}
function mkGlyphTex(i){return createCanvasTexture(256,(ctx,s)=>{ctx.clearRect(0,0,s,s);drawHieroglyph(ctx,s/2,s/2,s*0.85,i);},{repeat:[1,1]});}

/* ══════════════════════════════════════════════════════════════════════════
   CABEÇA (~42+ meshes)
   ══════════════════════════════════════════════════════════════════════════ */
export function attachEgyptianHeadDetails(headMesh, skin) {
  const m = mkM(skin);
  const p = [];

  /* ── NEMES DOMINANTE (10 listras espessas, desce muito pelos lados) ── */
  const stripeCount = 10;
  const sw = 0.08;
  const totalW = stripeCount * sw;
  for (let i = 0; i < stripeCount; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.045, 0.58), i%2===0 ? m.gold : m.blue);
    stripe.position.set(-totalW/2 + sw/2 + i*sw, 0.32, 0.02);
    p.push(stripe);
  }
  // Ridge central elevado
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.60), m.ankh);
  ridge.position.set(0, 0.38, 0.02); p.push(ridge);

  /* ── ABAS LATERAIS longas (descem muito) ── */
  const mkFlap = (side) => {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.24), m.gold);
    flap.position.set(side*0.36, -0.06, -0.03); flap.rotation.z = side*0.10;
    for (let j = 0; j < 4; j++) {
      const fs = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.030, 0.25), m.blue);
      fs.position.set(0, -0.14 + j*0.09, 0); flap.add(fs);
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 4), m.ankh);
    tip.position.set(0, -0.24, 0); tip.rotation.x = Math.PI; flap.add(tip);
    return flap;
  };
  p.push(mkFlap(-1), mkFlap(1));

  /* ── DRAPE TRASEIRO largo ── */
  const drape = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.30, 0.045), m.gold);
  drape.position.set(0, -0.06, 0.32); drape.rotation.x = 0.18;
  for (let i = 0; i < 3; i++) {
    const ds = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.025, 0.050), m.blue);
    ds.position.set(0, 0.08 - i*0.10, 0); drape.add(ds);
  }
  p.push(drape);

  /* ── URAEUS GIGANTE (3x maior, capuz largo e dramático) ── */
  const uBody = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.050, 0.22, 8), m.ankh);
  uBody.position.set(0, 0.48, -0.22);
  // Capuz expandido dramático
  const uHood = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), m.ankh);
  uHood.scale.set(3.5, 1.5, 0.6);
  uHood.position.set(0, 0.10, 0.01); uBody.add(uHood);
  // Cabeça da cobra
  const uHead = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), m.ankh);
  uHead.position.set(0, 0.12, -0.04); uHead.scale.set(1.0, 0.7, 1.3); uBody.add(uHead);
  // Olhos turquesa INTENSOS
  const ueGeo = new THREE.SphereGeometry(0.012, 8, 6);
  const ueL = new THREE.Mesh(ueGeo, m.turqHot);
  ueL.position.set(-0.020, 0.01, -0.035); uHead.add(ueL);
  const ueR = new THREE.Mesh(ueGeo, m.turqHot);
  ueR.position.set(0.020, 0.01, -0.035); uHead.add(ueR);
  // Língua bifurcada
  const uTongue = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.005, 0.06), m.ruby);
  uTongue.position.set(0, 0.005, -0.065); uHead.add(uTongue);
  p.push(uBody);

  /* ── ESCARAVELHO TESTA gigante turquesa brilhante ── */
  const scarab = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), m.turq);
  scarab.scale.set(1.3, 0.5, 1.0); scarab.position.set(0, 0.22, -0.42);
  // Mandíbulas pretas
  const mandGeo = new THREE.ConeGeometry(0.012, 0.04, 4);
  const mandL = new THREE.Mesh(mandGeo, m.black);
  mandL.position.set(-0.04, 0, -0.04); mandL.rotation.x = -0.5; mandL.rotation.z = 0.3; scarab.add(mandL);
  const mandR = new THREE.Mesh(mandGeo, m.black);
  mandR.position.set(0.04, 0, -0.04); mandR.rotation.x = -0.5; mandR.rotation.z = -0.3; scarab.add(mandR);
  p.push(scarab);

  /* ── OLHOS 3D DRAMÁTICOS (grandes órbitas + delineador longo) ── */
  const mkEye = (x) => {
    const orbit = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), m.black);
    orbit.position.set(x, 0.06, -0.38);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), m.iris);
    iris.position.set(0, 0, -0.05); orbit.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), m.black);
    pupil.position.set(0, 0, -0.04); iris.add(pupil);
    // Delineador egípcio LONGO
    const liner = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.018, 0.010), m.black);
    liner.position.set(x>0?0.10:-0.10, 0, -0.02); liner.rotation.z = x>0?-0.12:0.12; orbit.add(liner);
    // Delineador inferior (lágrima de Hórus)
    const tear = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.12, 0.008), m.black);
    tear.position.set(x>0?0.02:-0.02, -0.08, -0.05); tear.rotation.z = x>0?0.15:-0.15; orbit.add(tear);
    return { orbit, iris };
  };
  const eyeL = mkEye(-0.18); const eyeR = mkEye(0.18);
  p.push(eyeL.orbit, eyeR.orbit);

  /* ── COLAR PEITORAL 5 ANÉIS + 8 GEMAS GRANDES ── */
  const colMats = [m.gold, m.lapis, m.turq, m.terra, m.gold];
  const colR = [0.36, 0.40, 0.44, 0.48, 0.52];
  colR.forEach((r, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.030, 8, 28), colMats[i]);
    ring.position.set(0, -0.16, -0.08); ring.rotation.x = Math.PI/2 + 0.28; p.push(ring);
  });
  for (let j = 0; j < 8; j++) {
    const angle = (j/8)*Math.PI - Math.PI/2;
    const gemMat = j%4===0?m.ruby : j%4===1?m.turq : j%4===2?m.ankh : m.lapis;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), gemMat);
    gem.position.set(Math.cos(angle)*0.50, -0.20, -0.08+Math.sin(angle)*0.50); p.push(gem);
  }

  /* ── PLACAS LATERAIS ── */
  const chGeo = new THREE.BoxGeometry(0.045, 0.16, 0.18);
  const chL = new THREE.Mesh(chGeo, m.gold); chL.position.set(-0.42, 0.0, -0.16); chL.rotation.y=0.12;
  const chR = new THREE.Mesh(chGeo, m.gold); chR.position.set(0.42, 0.0, -0.16); chR.rotation.y=-0.12;
  p.push(chL, chR);

  /* ── ANKH como "língua" ── */
  const ankhStem = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.014, 0.22), m.ankh);
  ankhStem.position.set(0, -0.06, -0.56);
  ankhStem.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.014, 0.025), m.ankh).translateZ(-0.07));
  ankhStem.add(new THREE.Mesh(new THREE.TorusGeometry(0.040, 0.010, 10, 14), m.ankh).translateZ(-0.14));
  p.push(ankhStem);

  headMesh.add(...p);
  headMesh.userData.tongue = ankhStem;
  headMesh.userData.uraeusEyes = [ueL, ueR];
  headMesh.userData.fireIris = [eyeL.iris, eyeR.iris];
}

/* ══════════════════════════════════════════════════════════════════════════
   CORPO — Sarcófago dourado (~18+ meshes por segmento)
   ══════════════════════════════════════════════════════════════════════════ */
export function attachEgyptianBodyDetails(bodyMesh, skin, segIndex = 0) {
  const m = mkM(skin);

  /* ── MOLDURA CARTOUCHE espessa e brilhante ── */
  const fV = new THREE.BoxGeometry(0.025, 0.020, 0.50);
  const fH = new THREE.BoxGeometry(0.44, 0.020, 0.025);
  bodyMesh.add(
    new THREE.Mesh(fV, m.ankh).translateY(0.30).translateX(-0.20),
    new THREE.Mesh(fV, m.ankh).translateY(0.30).translateX(0.20),
    new THREE.Mesh(fH, m.ankh).translateY(0.30).translateZ(-0.25),
    new THREE.Mesh(fH, m.ankh).translateY(0.30).translateZ(0.25),
  );
  // Cantos arredondados grandes
  const cGeo = new THREE.SphereGeometry(0.025, 8, 6);
  [[-0.20,-0.25],[0.20,-0.25],[-0.20,0.25],[0.20,0.25]].forEach(([x,z])=>{
    bodyMesh.add(new THREE.Mesh(cGeo, m.ankh).translateY(0.30).translateX(x).translateZ(z));
  });

  /* ── HIERÓGLIFO GIGANTE (0.60×0.60, preto sobre dourado) ── */
  const gTex = mkGlyphTex(segIndex);
  const glyph = new THREE.Mesh(
    new THREE.PlaneGeometry(0.60, 0.60),
    new THREE.MeshStandardMaterial({ map:gTex, transparent:true, alphaTest:0.03, roughness:0.4, metalness:0.2, side:THREE.DoubleSide })
  );
  glyph.position.set(0, 0.305, 0); glyph.rotation.x = -Math.PI/2;
  bodyMesh.add(glyph);

  /* ── BANDAS DE SARCÓFAGO largas (azul + terracota + azul, ambos os lados) ── */
  const bandGeo = new THREE.BoxGeometry(0.72, 0.040, 0.018);
  const bands = [
    { mat: m.blue, y: 0.02, z: -0.39 },
    { mat: m.terra, y: -0.02, z: -0.39 },
    { mat: m.blue, y: -0.06, z: -0.39 },
    { mat: m.blue, y: 0.02, z: 0.39 },
    { mat: m.terra, y: -0.02, z: 0.39 },
    { mat: m.blue, y: -0.06, z: 0.39 },
  ];
  bands.forEach(b => {
    bodyMesh.add(new THREE.Mesh(bandGeo, b.mat).translateY(b.y).translateZ(b.z));
  });

  /* ── BORDAS PRETAS ── */
  bodyMesh.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.015,0.012,0.80), m.black).translateY(0.29).translateX(-0.355),
    new THREE.Mesh(new THREE.BoxGeometry(0.015,0.012,0.80), m.black).translateY(0.29).translateX(0.355),
  );

  /* ── JÓIAS LATERAIS GRANDES (alternando turquesa/rubi) ── */
  const even = segIndex % 2 === 0;
  const gemL = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), even ? m.turq : m.ruby);
  gemL.position.set(-0.32, 0.30, 0);
  const gemR = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), even ? m.ruby : m.turq);
  gemR.position.set(0.32, 0.30, 0);
  bodyMesh.add(gemL, gemR);

  /* ── ANKH grande ou ESCARAVELHO alternado a cada 2 segmentos ── */
  if (segIndex % 2 === 0) {
    // ANKH grande saliente
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.025, 0.12), m.ankh);
    stem.position.set(0, 0.31, 0.28);
    stem.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.018), m.ankh).translateZ(-0.04));
    stem.add(new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 10), m.ankh).translateZ(-0.08));
    bodyMesh.add(stem);
  } else {
    // Escaravelho turquesa
    const sb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), m.turq);
    sb.scale.set(1.4, 0.5, 1.0); sb.position.set(0, 0.31, 0.28); bodyMesh.add(sb);
  }

  /* ── VENTRE dourado claro ── */
  bodyMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.030, 0.62), m.goldLt).translateY(-0.29));
}

/* ══════════════════════════════════════════════════════════════════════════
   CAUDA — Escaravelho alado (~14 meshes)
   ══════════════════════════════════════════════════════════════════════════ */
export function createEgyptianTailGroup(skin) {
  const group = new THREE.Group();
  group.name = 'egyptianTail';
  const m = mkM(skin);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), m.turq);
  body.scale.set(1.3, 0.55, 1.5); body.position.set(0, 0.35, 0.45);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), m.turq);
  head.position.set(0, 0.38, 0.33);
  const mandGeo = new THREE.ConeGeometry(0.010, 0.05, 4);
  const mL = new THREE.Mesh(mandGeo, m.black); mL.position.set(-0.025,0.38,0.28); mL.rotation.x=-Math.PI/2; mL.rotation.z=0.3;
  const mR = new THREE.Mesh(mandGeo, m.black); mR.position.set(0.025,0.38,0.28); mR.rotation.x=-Math.PI/2; mR.rotation.z=-0.3;

  const disc = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10),
    new THREE.MeshStandardMaterial({color:GOLD,emissive:GOLD,emissiveIntensity:2.0,roughness:0.08,metalness:0.5}));
  disc.position.set(0, 0.46, 0.45);

  const mkWing = (side) => {
    const segs = [];
    const lens = [0.14, 0.16, 0.12, 0.08];
    const angs = [0.20, 0.35, 0.50, 0.65];
    const mts  = [m.blue, m.gold, m.lapis, m.gold];
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(lens[i], 0.014, 0.09-i*0.015), mts[i]);
      w.position.set(side*(0.12+i*0.12), 0.35-i*0.02, 0.45); w.rotation.z = side*angs[i]; segs.push(w);
    }
    return segs;
  };

  const ankhT = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.10), m.ankh);
  ankhT.position.set(0, 0.32, 0.60);
  ankhT.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.015), m.ankh).translateZ(-0.04));
  ankhT.add(new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 8, 10), m.ankh).translateZ(-0.07));

  group.add(body, head, mL, mR, disc, ...mkWing(-1), ...mkWing(1), ankhT);
  group.userData.solarDisc = disc;
  return group;
}
