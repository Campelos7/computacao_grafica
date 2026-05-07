/* ==========================================================================
   NEVE — Decoração Exterior da Arena (NOVO)
   --------------------------------------------------------------------------
   Detalhes à volta das paredes: pilares de gelo nos cantos, fileiras de
   icículos no topo das paredes, montes de neve contra paredes, luzes geladas.
   
   GUIA DE EDIÇÃO:
   - Pilares gelo: altura CylinderGeometry, transparência iceMat
   - Icículos: quantidade no loop, comprimento ConeGeometry
   - Montes neve: largura/altura SphereGeometry
   - Luzes: cor e intensidade dos PointLights
   ========================================================================== */
import * as THREE from 'three';

/**
 * Cria todas as decorações exteriores da arena para a neve.
 * @param {THREE.Group} group — grupo pai
 * @param {number} half — metade do tabuleiro
 * @param {object} mats — materiais da neve
 */
export function createSnowExterior(group, half, mats) {

  /* ================================================================
     PILARES DE GELO NOS CANTOS — Colunas translúcidas
     ================================================================ */
  const pillarPositions = [
    [-half - 0.5, -half - 0.5],
    [half + 0.5,  -half - 0.5],
    [-half - 0.5,  half + 0.5],
    [half + 0.5,   half + 0.5],
  ];
  for (const [px, pz] of pillarPositions) {
    const pillar = new THREE.Group();
    pillar.name = 'snow-corner-pillar';

    // Coluna de gelo
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.16, 2.5, 6), mats.ice);
    col.position.y = 1.25;
    col.castShadow = true;
    pillar.add(col);

    // Ponta de gelo (cone)
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 6), mats.ice);
    tip.position.y = 2.65;
    pillar.add(tip);

    // Base de neve
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.3, 0.12, 8), mats.snow);
    base.position.y = 0.06;
    pillar.add(base);

    // Luz azul gelada
    const light = new THREE.PointLight(0x88ccff, 0.4, 5);
    light.position.y = 1.5;
    light.name = 'ice-pillar-light';
    pillar.add(light);

    pillar.position.set(px, 0, pz);
    group.add(pillar);
  }

  /* ================================================================
     ICÍCULOS NO TOPO DAS PAREDES — Cones invertidos pendurados
     ================================================================ */
  const wallHeight = 1.5;
  // Ao longo das 4 paredes, espaçados
  const icicleWalls = [
    { axis: 'x', z: -half - 0.15, facing: 1 },   // parede norte (exterior)
    { axis: 'x', z: half + 0.15,  facing: -1 },   // parede sul
    { axis: 'z', x: -half - 0.15, facing: 1 },    // parede oeste
    { axis: 'z', x: half + 0.15,  facing: -1 },   // parede este
  ];
  for (const wall of icicleWalls) {
    const count = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const pos = -half + (i / count) * half * 2 + Math.random() * 0.5;
      const len = 0.08 + Math.random() * 0.15;
      const icicle = new THREE.Mesh(
        new THREE.ConeGeometry(0.012, len, 4), mats.ice);
      icicle.rotation.x = Math.PI; // invertido

      if (wall.axis === 'x') {
        icicle.position.set(pos, wallHeight - len * 0.5, wall.z);
      } else {
        icicle.position.set(wall.x, wallHeight - len * 0.5, pos);
      }
      group.add(icicle);
    }
  }

  /* ================================================================
     MONTES DE NEVE CONTRA AS PAREDES — Neve acumulada na base
     ================================================================ */
  const driftSpawns = [
    [-half * 0.6, -half - 0.35, 1.0, 0.2],
    [half * 0.4,  -half - 0.35, 0.8, 0.18],
    [-half - 0.35, -half * 0.3, 0.7, 0.15],
    [half + 0.35,  half * 0.2,  0.9, 0.2],
    [-half * 0.3,  half + 0.35, 1.1, 0.22],
    [half * 0.5,   half + 0.35, 0.75, 0.16],
    [-half - 0.35, half * 0.5,  0.6, 0.14],
    [half + 0.35, -half * 0.6,  0.85, 0.18],
  ];
  for (const [dx, dz, dw, dh] of driftSpawns) {
    const drift = new THREE.Mesh(
      new THREE.SphereGeometry(dw, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.3),
      mats.snow
    );
    drift.position.set(dx, -0.03, dz);
    drift.scale.y = dh / dw;
    drift.receiveShadow = true;
    group.add(drift);
  }

  /* ================================================================
     CHÃO EXTERIOR — Terreno nevado à volta da arena
     ================================================================ */
  const outerGroundMat = new THREE.MeshStandardMaterial({
    color: 0xb0c0d4, emissive: 0x556677, emissiveIntensity: 0.05,
    roughness: 0.7, metalness: 0.05,
  });
  const outerGround = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 4, half * 4), outerGroundMat);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.02;
  outerGround.receiveShadow = true;
  outerGround.name = 'snow-outer-ground';
  group.add(outerGround);
}
