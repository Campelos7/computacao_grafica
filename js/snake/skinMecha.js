import * as THREE from 'three';

/* ==========================================================================
   snake/skinMecha.js — SKIN COMPLEXA: Samurai Mecha
   Kabuto com placas sobrepostas, visor T LED, crista meia-lua,
   menpo oni com dentes, katana+wakizashi, circuitos PCB, exaustor duplo.
   ========================================================================== */

const ARMOR_DK = 0x2a2a3a;
const ARMOR_MD = 0x222233;
const ARMOR_LT = 0x3a3a4a;
const LED_RED  = 0xff1744;
const GOLD_AC  = 0xd4a017;
const BLADE_C  = 0xc0c8d4;
const BLADE_DK = 0x8a90a4;

function mt(c,e,ei,r,m){ return new THREE.MeshStandardMaterial({color:c,emissive:e||0,emissiveIntensity:ei||0,roughness:r??0.4,metalness:m??0.5}); }

function mkM(skin) {
  const led = skin.eyeColor||LED_RED, gold = skin.accentColor||GOLD_AC;
  return {
    armor:   mt(skin.headColor||ARMOR_DK, 0x0a0a14, 0.06, 0.30, 0.88),
    armorLt: mt(ARMOR_LT, 0x0c0c1a, 0.05, 0.32, 0.85),
    armorDk: mt(0x1a1a28, 0x050510, 0.03, 0.28, 0.92),
    gold:    mt(gold, gold, 1.2, 0.22, 0.90),
    goldDim: mt(gold, gold, 0.40, 0.28, 0.85),
    led:     mt(led, led, 3.5, 0.08, 0.0),
    ledHot:  mt(led, led, 4.0, 0.05, 0.0),
    ledMark: mt(led, led, 2.0, 0.10, 0.0),
    blade:   mt(BLADE_C, 0x556677, 0.08, 0.12, 0.95),
    bladeDk: mt(BLADE_DK, 0x334455, 0.04, 0.15, 0.92),
    white:   mt(0xcccccc, 0x333333, 0.03, 0.50, 0.10),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   CABEÇA (~50+ meshes)
   ══════════════════════════════════════════════════════════════════════════ */
export function attachMechaHeadDetails(headMesh, skin) {
  const m = mkM(skin);
  const p = [];

  /* ── KABUTO (elmo com 3 placas sobrepostas + bordas douradas) ── */
  const helmetBase = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 12), m.armor);
  helmetBase.scale.set(1.08, 0.50, 1.05); helmetBase.position.set(0, 0.18, 0);
  p.push(helmetBase);

  for (let i = 0; i < 3; i++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.52 - i*0.08, 0.035, 0.44 - i*0.06), m.armorDk);
    plate.position.set(0, 0.28 + i*0.04, -0.02 + i*0.04);
    p.push(plate);
    // Bordas douradas finas
    const edgeF = new THREE.Mesh(new THREE.BoxGeometry(0.52 - i*0.08, 0.008, 0.008), m.goldDim);
    edgeF.position.set(0, 0, -0.22 + i*0.03); plate.add(edgeF);
    const edgeB = edgeF.clone(); edgeB.position.z = 0.22 - i*0.03; plate.add(edgeB);
  }

  /* ── VISOR LED em T (barra H + barra V + 4 sensores) ── */
  const visorH = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.055, 0.018), m.led);
  visorH.position.set(0, 0.10, -0.46); p.push(visorH);
  const visorV = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.10, 0.018), m.led);
  visorV.position.set(0, 0.04, -0.46); p.push(visorV);
  // 4 sensores nos cantos
  const sensorGeo = new THREE.BoxGeometry(0.018, 0.018, 0.012);
  const sPos = [[-0.20,0.14],[-0.20,0.06],[0.20,0.14],[0.20,0.06]];
  sPos.forEach(([x,y]) => {
    const s = new THREE.Mesh(sensorGeo, m.ledHot);
    s.position.set(x, y, -0.47); p.push(s);
  });

  /* ── CRISTA TATEMONO (meia-lua + disco central + 3 puas) ── */
  const crescent = new THREE.Mesh(
    new THREE.TorusGeometry(0.10, 0.018, 8, 16, Math.PI), m.gold
  );
  crescent.position.set(0, 0.44, -0.18);
  crescent.rotation.set(0.3, 0, 0);
  p.push(crescent);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 10), m.gold);
  disc.position.set(0, 0.44, -0.20); disc.rotation.x = Math.PI/2; p.push(disc);
  // 3 puas verticais
  const spikeGeo = new THREE.ConeGeometry(0.008, 0.08, 4);
  [-0.04, 0, 0.04].forEach(x => {
    const sp = new THREE.Mesh(spikeGeo, m.gold);
    sp.position.set(x, 0.52, -0.18); p.push(sp);
  });

  /* ── MENPO (proteção facial oni) ── */
  const menpo = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.12), m.armorDk);
  menpo.position.set(0, -0.06, -0.40); p.push(menpo);
  // Sobrancelhas oni douradas anguladas
  const browGeo = new THREE.BoxGeometry(0.14, 0.018, 0.020);
  const browL = new THREE.Mesh(browGeo, m.goldDim);
  browL.position.set(-0.12, 0.18, -0.44); browL.rotation.z = 0.5; p.push(browL);
  const browR = new THREE.Mesh(browGeo, m.goldDim);
  browR.position.set(0.12, 0.18, -0.44); browR.rotation.z = -0.5; p.push(browR);
  // 4 dentes quadrados oni
  const toothGeo = new THREE.BoxGeometry(0.028, 0.035, 0.018);
  [-0.05, -0.015, 0.015, 0.05].forEach(x => {
    const t = new THREE.Mesh(toothGeo, m.white);
    t.position.set(x, -0.12, -0.44); p.push(t);
  });
  // Marcas de honra (3 linhas LED vermelhas por bochecha)
  const markGeo = new THREE.BoxGeometry(0.005, 0.06, 0.008);
  for (let i = 0; i < 3; i++) {
    const mL = new THREE.Mesh(markGeo, m.ledMark);
    mL.position.set(-0.24 - i*0.025, 0.02, -0.38); p.push(mL);
    const mR = new THREE.Mesh(markGeo, m.ledMark);
    mR.position.set(0.24 + i*0.025, 0.02, -0.38); p.push(mR);
  }

  /* ── KATANA (0.65) + WAKIZASHI (0.35) nas costas ── */
  const mkSword = (len, offX, thick) => {
    const parts = [];
    // Lâmina
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025*thick, 0.010, len), m.blade);
    blade.position.set(offX, 0.22, 0.22); blade.rotation.x = -0.18; parts.push(blade);
    // Fuller (ranhura central)
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.012, len*0.85), m.bladeDk);
    fuller.position.set(0, 0, 0); blade.add(fuller);
    // Tsuba (guarda)
    const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(0.032*thick, 0.032*thick, 0.008, 8), m.gold);
    tsuba.position.set(offX, 0.20, 0.22 + len*0.38); tsuba.rotation.x = Math.PI/2; parts.push(tsuba);
    // Tsuka (punho)
    const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(0.010*thick, 0.012*thick, 0.10, 6), m.armorDk);
    tsuka.position.set(offX, 0.18, 0.22 + len*0.45); tsuka.rotation.x = -0.18; parts.push(tsuka);
    return parts;
  };
  p.push(...mkSword(0.65, 0.06, 1.0));
  p.push(...mkSword(0.35, -0.06, 0.8));

  /* ── ANTENAS dobradas (2 segmentos + LED grande na ponta) ── */
  const mkAntenna = (side) => {
    const parts = [];
    const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.010, 0.14, 5), m.armorDk);
    seg1.position.set(side*0.20, 0.38, 0.14); seg1.rotation.set(-0.15, 0, side*0.20); parts.push(seg1);
    const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.007, 0.14, 5), m.armorDk);
    seg2.position.set(side*0.24, 0.50, 0.18); seg2.rotation.set(0.30, 0, side*0.35); parts.push(seg2);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), m.ledHot);
    tip.position.set(side*0.30, 0.62, 0.20); parts.push(tip);
    return parts;
  };
  const antL = mkAntenna(-1), antR = mkAntenna(1);
  p.push(...antL, ...antR);

  headMesh.add(...p);
  headMesh.userData.visorBar = visorH;
  headMesh.userData.antennaTips = [antL[2], antR[2]];
  headMesh.userData.tongue = null;
}

/* ══════════════════════════════════════════════════════════════════════════
   CORPO (~20+ meshes por segmento)
   ══════════════════════════════════════════════════════════════════════════ */
export function attachMechaBodyDetails(bodyMesh, skin, segIndex = 0) {
  const m = mkM(skin);

  /* ── PLACAS KOZANE (4 lamelas sobrepostas, 2 por lado) ── */
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 2; i++) {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.22 - i*0.04, 0.55 - i*0.08), m.armorDk
      );
      plate.position.set(side*(0.26 + i*0.06), 0.10 + i*0.05, 0);
      plate.rotation.z = side*(0.08 + i*0.06);
      bodyMesh.add(plate);
      // Borda dourada inferior
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.005, 0.55 - i*0.08), m.goldDim
      );
      edge.position.set(0, -0.11 + i*0.02, 0); plate.add(edge);
    }
  }

  /* ── PLACA DORSAL com padrão ── */
  const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.025, 0.55), m.armor);
  dorsal.position.set(0, 0.30, 0); bodyMesh.add(dorsal);

  /* ── CIRCUITO PCB (linha central + ramificações alternadas) ── */
  const pcbMain = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.50, 4), m.led);
  pcbMain.position.set(0, 0.32, 0); pcbMain.rotation.x = Math.PI/2;
  bodyMesh.add(pcbMain);
  const branchGeo = new THREE.BoxGeometry(0.04, 0.005, 0.005);
  const even = segIndex % 2 === 0;
  for (let i = 0; i < 3; i++) {
    const z = -0.18 + i*0.18;
    const side = even ? (i%2===0?1:-1) : (i%2===0?-1:1);
    const br = new THREE.Mesh(branchGeo, m.led);
    br.position.set(side*0.02, 0.32, z); bodyMesh.add(br);
    // Ponto terminal
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 5, 4), m.led);
    dot.position.set(side*0.04, 0.32, z); bodyMesh.add(dot);
  }

  /* ── 3 LEDS por lado (sequência de status, tamanhos decrescentes) ── */
  const ledData = [
    { r:0.022, ei:1.5, y:0.18 },
    { r:0.016, ei:1.0, y:0.10 },
    { r:0.012, ei:0.6, y:0.02 },
  ];
  const leds = [];
  ledData.forEach(ld => {
    [-1,1].forEach(side => {
      const ledMat = mt(LED_RED, LED_RED, ld.ei, 0.08, 0.0);
      const led = new THREE.Mesh(new THREE.SphereGeometry(ld.r, 8, 6), ledMat);
      led.position.set(side*0.34, ld.y, 0);
      bodyMesh.add(led); leds.push(led);
    });
  });

  /* ── JUNTA MECÂNICA (torus + 4 parafusos + 2 pistões) ── */
  const joint = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.012, 6, 16), m.armorDk);
  joint.position.set(0, 0.15, 0.39); bodyMesh.add(joint);
  // 4 parafusos nos pontos cardinais
  const boltGeo = new THREE.SphereGeometry(0.012, 6, 4);
  [[0,0.30],[0,-0.30],[0.30,0],[-0.30,0]].forEach(([x,y]) => {
    const bolt = new THREE.Mesh(boltGeo, m.armorDk);
    bolt.position.set(x, 0.15+y*0.01, 0.39+y*0.001);
    bodyMesh.add(bolt);
  });
  // 2 pistões laterais
  [-1,1].forEach(side => {
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 5), m.armorLt);
    piston.position.set(side*0.20, 0.05, 0.39);
    bodyMesh.add(piston);
  });

  bodyMesh.userData.leds = leds;
}

/* ══════════════════════════════════════════════════════════════════════════
   CAUDA — Exaustor duplo + estabilizadores em camadas (~16 meshes)
   ══════════════════════════════════════════════════════════════════════════ */
export function createMechaTailGroup(skin) {
  const group = new THREE.Group();
  group.name = 'mechaTail';
  const m = mkM(skin);

  /* ── EXAUSTOR DUPLO (2 cilindros paralelos) ── */
  const mkExhaust = (offX) => {
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 10), m.armorDk);
    outer.position.set(offX, 0.35, 0.50); outer.rotation.x = Math.PI/2;
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.08, 8), m.armor);
    inner.position.set(0, 0.03, 0); outer.add(inner);
    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.05, 0.02, 8),
      new THREE.MeshBasicMaterial({ color:LED_RED, transparent:true, opacity:0.6, blending:THREE.AdditiveBlending, depthWrite:false })
    );
    glow.position.set(0, 0.06, 0); outer.add(glow);
    return { outer, glow };
  };
  const exL = mkExhaust(-0.08), exR = mkExhaust(0.08);

  /* ── SENSOR central entre exaustores ── */
  const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.030, 10, 8), m.ledHot);
  sensor.position.set(0, 0.35, 0.55);

  /* ── ESTABILIZADORES em 3 camadas com borda dourada ── */
  const mkFin = (side) => {
    const parts = [];
    const layers = [
      { w:0.16, h:0.10, t:0.012 },
      { w:0.13, h:0.08, t:0.010 },
      { w:0.10, h:0.06, t:0.008 },
    ];
    layers.forEach((l, i) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(l.w, l.h, l.t), m.armor);
      fin.position.set(side*(0.14 + i*0.04), 0.35, 0.46 - i*0.02);
      fin.rotation.set(0, side*0.10, side*(0.30 + i*0.08));
      // Borda traseira dourada
      const edge = new THREE.Mesh(new THREE.BoxGeometry(l.w, 0.005, l.t+0.002), m.goldDim);
      edge.position.set(0, -l.h/2, 0); fin.add(edge);
      parts.push(fin);
    });
    return parts;
  };
  const finL = mkFin(-1), finR = mkFin(1);

  /* ── Haste traseira ── */
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 0.20, 6), m.armorDk);
  shaft.position.set(0, 0.35, 0.40); shaft.rotation.x = Math.PI/2;

  group.add(exL.outer, exR.outer, sensor, ...finL, ...finR, shaft);
  group.userData.exhaustGlow = { material: exL.glow.material }; // ambos partilham animação
  group.userData.sensorLed = sensor;
  return group;
}
