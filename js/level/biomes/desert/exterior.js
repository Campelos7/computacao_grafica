/* ==========================================================================
   DESERTO — Decoração Exterior da Arena (NOVO)
   --------------------------------------------------------------------------
   Detalhes à volta das paredes: braseiros de fogo, pilares de arenito,
   montículos de areia contra as paredes, chão arenoso exterior.
   
   GUIA DE EDIÇÃO:
   - Braseiros: posições, intensidade da luz, cor do fogo
   - Pilares: altura/espessura do CylinderGeometry
   - Montículos: tamanho SphereGeometry, posições
   ========================================================================== */
import * as THREE from 'three';

/**
 * Cria todas as decorações exteriores da arena para o deserto.
 * @param {THREE.Group} group — grupo pai
 * @param {number} half — metade do tabuleiro
 * @param {object} mats — materiais do deserto
 */
export function createDesertExterior(group, half, mats) {

  /* ================================================================
     PILARES DE ARENITO NOS CANTOS — Colunas decorativas
     ================================================================ */
  const pillarPositions = [
    [-half - 0.5, -half - 0.5],
    [half + 0.5,  -half - 0.5],
    [-half - 0.5,  half + 0.5],
    [half + 0.5,   half + 0.5],
  ];
  for (const [px, pz] of pillarPositions) {
    const pillar = new THREE.Group();
    pillar.name = 'desert-corner-pillar';

    // Coluna principal
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 2.2, 6), mats.rock);
    col.position.y = 1.1;
    col.castShadow = true;
    pillar.add(col);

    // Base larga
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.25, 0.15, 6), mats.darkRock);
    base.position.y = 0.075;
    pillar.add(base);

    // Topo (disco achatado)
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.14, 0.1, 6), mats.rock);
    cap.position.y = 2.25;
    pillar.add(cap);

    pillar.position.set(px, 0, pz);
    group.add(pillar);
  }

  /* ================================================================
     BRASEIROS — Tigelas de fogo nos meios das paredes
     Cada braseiro: tigela + chama emissiva + PointLight
     ================================================================ */
  const brasPositions = [
    // Parede norte e sul
    [0,            -half - 0.8],
    [0,             half + 0.8],
    // Parede oeste e este
    [-half - 0.8,  0],
    [half + 0.8,   0],
  ];
  const bowlMat = new THREE.MeshStandardMaterial({
    color: 0x3a2a1a, roughness: 0.9, metalness: 0.2,
  });
  const fireMat = new THREE.MeshStandardMaterial({
    color: 0xff6622, emissive: 0xff4400, emissiveIntensity: 1.8,
    roughness: 0.1, transparent: true, opacity: 0.85,
  });
  for (const [bx, bz] of brasPositions) {
    const braseiro = new THREE.Group();
    braseiro.name = 'desert-braseiro';

    // Pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.8, 6), bowlMat);
    pedestal.position.y = 0.4;
    braseiro.add(pedestal);

    // Tigela (torus achatado)
    const bowl = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.04, 6, 12), bowlMat);
    bowl.position.y = 0.82;
    bowl.rotation.x = -Math.PI / 2;
    braseiro.add(bowl);

    // Chama
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.2, 6), fireMat);
    flame.position.y = 0.95;
    flame.name = 'braseiro-flame';
    braseiro.add(flame);

    // Luz
    const light = new THREE.PointLight(0xff6622, 0.8, 8);
    light.position.y = 1.0;
    light.name = 'braseiro-light';
    braseiro.add(light);

    braseiro.position.set(bx, 0, bz);
    group.add(braseiro);
  }

  /* ================================================================
     MONTÍCULOS DE AREIA — Areia acumulada contra as paredes
     ================================================================ */
  const moundSpawns = [
    [-half * 0.7, -half - 0.4, 0.6, 0.15],
    [half * 0.3,  -half - 0.4, 0.8, 0.18],
    [-half - 0.4, -half * 0.4, 0.5, 0.12],
    [half + 0.4,  half * 0.3,  0.7, 0.16],
    [-half * 0.5,  half + 0.4, 0.55, 0.14],
    [half * 0.6,   half + 0.4, 0.65, 0.15],
  ];
  for (const [mx, mz, mw, mh] of moundSpawns) {
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(mw, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.35),
      mats.sand
    );
    mound.position.set(mx, -0.05, mz);
    mound.scale.y = mh / mw;
    mound.receiveShadow = true;
    group.add(mound);
  }

  /* ================================================================
     CHÃO EXTERIOR — Terreno de areia à volta da arena
     ================================================================ */
  const outerGroundMat = new THREE.MeshStandardMaterial({
    color: 0x8a7040, emissive: 0x2a1a08, emissiveIntensity: 0.03,
    roughness: 0.98, metalness: 0.0,
  });
  const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 4, half * 4), outerGroundMat);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.02;
  outerGround.receiveShadow = true;
  outerGround.name = 'desert-outer-ground';
  group.add(outerGround);
}
