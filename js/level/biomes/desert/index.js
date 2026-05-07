/* ==========================================================================
   DESERTO — Index (Ponto de Entrada do Bioma)
   --------------------------------------------------------------------------
   ESTRUTURA:
   desert/
     index.js            ← ESTE FICHEIRO
     materials.js         ← Materiais partilhados
     rockFormations.js    ← Formações rochosas (mesa, spire, arch)
     cacti.js             ← Cactos
     details.js           ← Crânios, dunas, pedras soltas
     oasis.js             ← Oásis com palmeiras
     animals.js           ← Escorpião e tumbleweeds
     exterior.js          ← Decoração exterior (pilares, braseiros)
   
   COORDENADAS:
   half ≈ 10, paredes terminam em ~10.5
   m  = half + 1.5 = 11.5 (margem perto)
   m2 = half + 3.5 = 13.5 (margem média)
   m3 = half + 6   = 16   (margem longe)
   ========================================================================== */
import * as THREE from 'three';
import { createDesertMaterials } from './materials.js';
import { createRockFormation } from './rockFormations.js';
import { createCactus } from './cacti.js';
import { createSkull, createSandDune, createScatteredPebbles } from './details.js';
import { createOasis } from './oasis.js';
import { createScorpion, createTumbleweeds } from './animals.js';
import { createDesertExterior } from './exterior.js';

export function buildDesertBiome(complexGroup, half, helpers) {
  const { loadImportedTexture, createAtmosphericEffect, createParticleSystem } = helpers;
  const mats = createDesertMaterials(loadImportedTexture);

  const m  = half + 1.5;
  const m2 = half + 3.5;
  const m3 = half + 6;

  /* ================================================================
     DECORAÇÃO EXTERIOR DA ARENA
     ================================================================ */
  createDesertExterior(complexGroup, half, mats);

  /* ================================================================
     FORMAÇÕES ROCHOSAS — 3 anéis de distância
     createRockFormation(x, z, escala, tipo, materiais)
     ================================================================ */
  // Anel perto (m)
  complexGroup.add(createRockFormation(-m,       -m,     0.9,  'arch',  mats));
  complexGroup.add(createRockFormation(m,        m,      0.85, 'mesa',  mats));
  complexGroup.add(createRockFormation(m,        -m,     1.0,  'spire', mats));
  complexGroup.add(createRockFormation(-m,       m,      0.75, 'spire', mats));
  complexGroup.add(createRockFormation(-m,       0,      0.7,  'mesa',  mats));
  complexGroup.add(createRockFormation(m,        0,      0.65, 'spire', mats));
  // Anel médio (m2)
  complexGroup.add(createRockFormation(-m2,      -m2,    1.1,  'mesa',  mats));
  complexGroup.add(createRockFormation(m2,       -m2,    0.95, 'arch',  mats));
  complexGroup.add(createRockFormation(-m2,      m2,     0.9,  'spire', mats));
  complexGroup.add(createRockFormation(m2,       m2,     1.0,  'mesa',  mats));
  complexGroup.add(createRockFormation(-m2,      3,      0.8,  'spire', mats));
  complexGroup.add(createRockFormation(m2,       -4,     0.85, 'arch',  mats));
  // Anel longe (m3)
  complexGroup.add(createRockFormation(-m3,      -m3,    1.3,  'mesa',  mats));
  complexGroup.add(createRockFormation(m3,       m3,     1.2,  'arch',  mats));
  complexGroup.add(createRockFormation(-m3,      0,      1.1,  'spire', mats));
  complexGroup.add(createRockFormation(m3,       0,      1.0,  'mesa',  mats));

  /* ================================================================
     CACTOS — Muitos, em 2 anéis
     [x, z, escala]
     ================================================================ */
  const cactusSpawns = [
    // Perto
    [-m + 1, -5,      1.0],
    [m - 1,  4,       0.85],
    [-6,     m,       1.2],
    [5,      -m,      0.9],
    [-m + 1, 6,       0.7],
    [m - 1,  -7,      1.1],
    [-3,     -m,      0.8],
    [7,      m,       0.95],
    [0,      m,       0.6],
    // Médio
    [-m2,     -5,     1.1],
    [m2,      3,      0.9],
    [-m2 + 2, m2,     1.0],
    [m2 - 2,  -m2,    0.85],
    [-m2,     m2 - 2, 0.75],
    [m2,      -m2 + 3,1.15],
    [0,       -m2,    0.8],
    [0,       m2,     0.7],
    // Longe
    [-m3 + 1, -m3 + 1, 1.2],
    [m3 - 1,  m3 - 1,  1.0],
    [-m3,     3,        0.9],
    [m3,      -4,       1.1],
  ];
  for (const [cx, cz, s] of cactusSpawns) {
    complexGroup.add(createCactus(cx, cz, s, mats));
  }

  /* ================================================================
     CRÂNIOS — Detalhes temáticos espalhados
     ================================================================ */
  complexGroup.add(createSkull(-m + 1,  3,      mats));
  complexGroup.add(createSkull(m,       -5,     mats));
  complexGroup.add(createSkull(2,       -m,     mats));
  complexGroup.add(createSkull(-m2,     -m2 + 2,mats));
  complexGroup.add(createSkull(m2 - 1,  m2,     mats));

  /* ================================================================
     DUNAS DE AREIA — Montes ondulados, mais e maiores
     createSandDune(x, z, largura, altura, materiais)
     ================================================================ */
  complexGroup.add(createSandDune(-m,      -3,       1.5, 0.35, mats));
  complexGroup.add(createSandDune(m,       5,        1.8, 0.4,  mats));
  complexGroup.add(createSandDune(0,       m,        2.0, 0.3,  mats));
  complexGroup.add(createSandDune(-5,      -m,       1.4, 0.35, mats));
  complexGroup.add(createSandDune(-m2,     -m2,      2.2, 0.45, mats));
  complexGroup.add(createSandDune(m2,      m2 - 2,   2.5, 0.5,  mats));
  complexGroup.add(createSandDune(-m2 + 3, m2,       1.8, 0.35, mats));
  complexGroup.add(createSandDune(m3 - 2,  0,        2.8, 0.55, mats));
  complexGroup.add(createSandDune(-m3 + 2, -3,       2.4, 0.4,  mats));

  /* ================================================================
     PEDRAS SOLTAS — Pedras aleatórias pelo chão
     ================================================================ */
  createScatteredPebbles(complexGroup, half, mats);

  /* ================================================================
     OÁSIS — Lago com palmeiras (afastado)
     ================================================================ */
  complexGroup.add(createOasis(m2, m2 - 1, 1.2, mats));

  /* ================================================================
     ANIMAL: ESCORPIÕES — FORA da arena, espalhados pelo cenário
     Posições escolhidas para NÃO sobrepor formações/cactos/dunas
     (zonas isoladas entre outros objectos)
     ================================================================ */
  const scorpionSpawns = [
    [m3 - 2,   m + 1,     15],   // este, zona aberta
    [-m2 - 2,  -m3 + 3,   15],   // sudoeste, entre dunas
    [m + 3,    -m2 - 1,   15],   // sudeste, zona isolada
  ];
  for (const [sx, sz, ss] of scorpionSpawns) {
    // Pedestal de rocha sob o escorpião
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.5, 0.5, 8),
      mats.rock
    );
    pedestal.position.set(sx, 0.25, sz);
    pedestal.receiveShadow = true;
    complexGroup.add(pedestal);

    // Escorpião em cima do pedestal
    const scorpion = createScorpion(sx, sz, ss);
    scorpion.position.y = 0.5;
    complexGroup.add(scorpion);

    // SpotLight a apontar para o escorpião
    const spot = new THREE.SpotLight(0xff8844, 2, 15, Math.PI / 6, 0.5);
    spot.position.set(sx, 5, sz);
    spot.target.position.set(sx, 0.5, sz);
    complexGroup.add(spot);
    complexGroup.add(spot.target);
  }

  /* ================================================================
     TUMBLEWEEDS — Bolas rolantes (efeito atmosférico)
     ================================================================ */
  complexGroup.add(createTumbleweeds(0, 0, 6, half));

  /* ================================================================
     ATMOSFERA E PARTÍCULAS
     ================================================================ */
  const fog = createAtmosphericEffect('#aa7744', '#cc9955', 0.15, 28, 28);
  fog.position.set(0, 1.0, 0);
  complexGroup.add(fog);
  complexGroup.add(createParticleSystem('desert', half));
}
