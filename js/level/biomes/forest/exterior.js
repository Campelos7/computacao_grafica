/* ==========================================================================
   FLORESTA — Decoração Exterior da Arena (NOVO)
   --------------------------------------------------------------------------
   Detalhes à volta das paredes: tochas, trepadeiras, postes de madeira,
   chão exterior com vegetação rasteira.
   
   GUIA DE EDIÇÃO:
   - Tochas: posições no array torchPositions, altura, cor da luz
   - Trepadeiras: quantidade por parede, cor/tamanho
   - Postes: altura e espessura do CylinderGeometry
   - Cobertura de chão: quantidade e spread
   ========================================================================== */
import * as THREE from 'three';

/**
 * Cria todas as decorações exteriores da arena para a floresta.
 * @param {THREE.Group} group — grupo pai
 * @param {number} half — metade do tabuleiro
 * @param {object} mats — materiais da floresta
 */
export function createForestExterior(group, half, mats) {

  /* ================================================================
     POSTES DE MADEIRA NOS CANTOS — Pilares rústicos nos 4 cantos
     ================================================================ */
  const postHeight = 2.0;
  const postPositions = [
    [-half - 0.5, -half - 0.5],
    [half + 0.5,  -half - 0.5],
    [-half - 0.5,  half + 0.5],
    [half + 0.5,   half + 0.5],
  ];
  for (const [px, pz] of postPositions) {
    const post = new THREE.Group();
    post.name = 'forest-corner-post';

    // Poste principal
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, postHeight, 6), mats.trunk);
    pole.position.y = postHeight / 2;
    pole.castShadow = true;
    post.add(pole);

    // Topo do poste (esfera de musgo)
    const topMoss = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 6, 5), mats.moss);
    topMoss.position.y = postHeight + 0.05;
    post.add(topMoss);

    // Raízes na base
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
      const root = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.03, 0.25, 4), mats.trunk);
      root.position.set(Math.cos(a) * 0.1, 0.05, Math.sin(a) * 0.1);
      root.rotation.z = Math.cos(a) * 0.7;
      root.rotation.x = Math.sin(a) * 0.7;
      post.add(root);
    }

    post.position.set(px, 0, pz);
    group.add(post);
  }

  /* ================================================================
     TOCHAS — Luzes em postes ao longo das paredes exteriores
     Cada tocha tem poste + chama (esfera emissiva) + PointLight
     ================================================================ */
  const torchPositions = [
    // Parede norte (z negativo)
    [-half * 0.5, -half - 0.8],
    [half * 0.5,  -half - 0.8],
    // Parede sul (z positivo)
    [-half * 0.5,  half + 0.8],
    [half * 0.5,   half + 0.8],
    // Parede oeste (x negativo)
    [-half - 0.8, -half * 0.5],
    [-half - 0.8,  half * 0.5],
    // Parede este (x positivo)
    [half + 0.8, -half * 0.5],
    [half + 0.8,  half * 0.5],
  ];
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xff8822, emissive: 0xff6600, emissiveIntensity: 1.5,
    roughness: 0.2, transparent: true, opacity: 0.9,
  });
  for (const [tx, tz] of torchPositions) {
    const torch = new THREE.Group();
    torch.name = 'forest-torch';

    // Poste da tocha
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 1.2, 5), mats.trunk);
    stick.position.y = 0.6;
    torch.add(stick);

    // Chama (esfera emissiva)
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 5), flameMat);
    flame.position.y = 1.25;
    flame.name = 'torch-flame';
    torch.add(flame);

    // Luz pontual
    const light = new THREE.PointLight(0xff8833, 0.5, 6);
    light.position.y = 1.3;
    light.name = 'torch-light';
    torch.add(light);

    torch.position.set(tx, 0, tz);
    group.add(torch);
  }

  /* ================================================================
     TREPADEIRAS NAS PAREDES — Faixas de musgo/hera coladas às paredes
     ================================================================ */
  const vineMat = new THREE.MeshStandardMaterial({
    color: 0x1a5522, emissive: 0x0a2a11, emissiveIntensity: 0.1,
    roughness: 0.9, side: THREE.DoubleSide,
  });
  // 6 trepadeiras espalhadas pelas 4 paredes
  const vineSpawns = [
    { x: -3, z: -half - 0.26, ry: 0 },
    { x: 4,  z: -half - 0.26, ry: 0 },
    { x: -5, z: half + 0.26,  ry: Math.PI },
    { x: 2,  z: half + 0.26,  ry: Math.PI },
    { x: -half - 0.26, z: -2, ry: Math.PI / 2 },
    { x: half + 0.26,  z: 3,  ry: -Math.PI / 2 },
  ];
  for (const v of vineSpawns) {
    const vine = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 1.0 + Math.random() * 0.5), vineMat);
    vine.position.set(v.x, 0.5 + Math.random() * 0.3, v.z);
    vine.rotation.y = v.ry;
    group.add(vine);
  }

  /* ================================================================
     CHÃO EXTERIOR — Terreno de terra/relva à volta da arena
     (plano grande por baixo, mais escuro que o tabuleiro)
     ================================================================ */
  const outerGroundMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a0a, emissive: 0x0a1505, emissiveIntensity: 0.05,
    roughness: 0.95, metalness: 0.0,
  });
  const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 4, half * 4), outerGroundMat);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.02;
  outerGround.receiveShadow = true;
  outerGround.name = 'forest-outer-ground';
  group.add(outerGround);
}
