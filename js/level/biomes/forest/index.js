/* ==========================================================================
   FLORESTA — Index (Ponto de Entrada do Bioma)
   --------------------------------------------------------------------------
   ESTRUTURA:
   forest/
     index.js        ← ESTE FICHEIRO
     materials.js    ← Materiais partilhados
     trees.js        ← Árvores
     mushrooms.js    ← Cogumelos bioluminescentes
     vegetation.js   ← Fetos, arbustos, flores
     rocks.js        ← Rochas, troncos caídos, tocos
     creek.js        ← Riacho com água animada
     animals.js      ← Coelhos e borboletas
     exterior.js     ← Decoração exterior (tochas, postes, trepadeiras)
   
   COORDENADAS:
   half ≈ 10, paredes terminam em ~10.5
   m  = half + 1.5 = 11.5 (margem exterior perto)
   m2 = half + 3.5 = 13.5 (margem exterior média)
   m3 = half + 6   = 16   (margem exterior longe)
   ========================================================================== */
import * as THREE from 'three';
import { createForestMaterials } from './materials.js';
import { createTree } from './trees.js';
import { createMushroom } from './mushrooms.js';
import { createFern, createBush, createFlowerPatch } from './vegetation.js';
import { createMossyRock, createFallenLog, createTreeStump } from './rocks.js';
import { createCreek } from './creek.js';
import { createRabbit, createButterflies } from './animals.js';
import { createForestExterior } from './exterior.js';

export function buildForestBiome(complexGroup, half, helpers) {
  const { loadImportedTexture, createAtmosphericEffect, createParticleSystem } = helpers;
  const mats = createForestMaterials(loadImportedTexture);

  // Zonas exteriores — quanto maior, mais longe das paredes
  const m  = half + 1.5;   // perto das paredes
  const m2 = half + 3.5;   // zona média
  const m3 = half + 6;     // zona afastada

  /* ================================================================
     DECORAÇÃO EXTERIOR DA ARENA
     ================================================================ */
  createForestExterior(complexGroup, half, mats);

  /* ================================================================
     ÁRVORES — Muitas, espalhadas pelo exterior em 3 anéis
     [x, z, escala, variant]
     ================================================================ */
  const treeSpawns = [
    // Anel perto (m)
    [-m,       -m,       1.0,  true],
    [-m,       m - 2,    0.9,  false],
    [m,        -m + 1,   1.1,  true],
    [m,        m,        0.85, false],
    [-m,       0,        0.95, true],
    [m,        0,        1.05, false],
    // Anel médio (m2) — mais árvores
    [-m2,      -m2,      1.2,  false],
    [m2,       -m2,      1.0,  true],
    [-m2,      m2,       1.1,  true],
    [m2,       m2,       0.95, false],
    [-m2,      -3,       0.9,  true],
    [m2,       4,        1.0,  false],
    [0,        -m2,      0.85, true],
    [0,        m2,       0.95, false],
    [-m2 + 2,  m2,       0.8,  true],
    [m2 - 2,   -m2,      0.75, false],
    // Anel longe (m3) — árvores grandes
    [-m3,      -m3,      1.3,  true],
    [m3,       -m3,      1.2,  false],
    [-m3,      m3,       1.1,  true],
    [m3,       m3,       1.25, false],
    [-m3,      0,        1.15, true],
    [m3,       0,        1.0,  false],
    [0,        -m3,      1.1,  true],
    [0,        m3,       0.95, false],
  ];
  for (const [x, z, s, v] of treeSpawns) {
    complexGroup.add(createTree(x, z, s, v, mats));
  }

  /* ================================================================
     COGUMELOS — Mais espalhados pelo exterior
     [x, z, escala]
     ================================================================ */
  const mushroomSpawns = [
    [-m + 1,  -m + 1,  1.2],
    [m - 1,   m - 1,   1.0],
    [-m2,     -3,      0.9],
    [m2 - 1,  5,       1.1],
    [-m + 1,  4,       0.9],
    [-m2 + 2, -m2 + 1, 1.3],
    [m2 - 2,  m2 - 1,  0.8],
    [3,       -m2,     1.0],
  ];
  for (const [x, z, s] of mushroomSpawns) {
    complexGroup.add(createMushroom(x, z, s));
  }

  /* ================================================================
     TRONCOS CAÍDOS
     ================================================================ */
  complexGroup.add(createFallenLog(-m2 + 1, -4,  0.3,  mats));
  complexGroup.add(createFallenLog(m2 - 2,  5,   -0.5, mats));
  complexGroup.add(createFallenLog(-m,       m2 - 1, 0.8, mats));

  /* ================================================================
     FETOS — Plantas baixas
     ================================================================ */
  const fernSpawns = [
    [-m + 1, -2,     1.0],
    [m - 1,  3,      1.2],
    [-5,     m,      0.8],
    [6,      -m,     1.1],
    [-m2,    -m + 1, 0.9],
    [m2,     m - 1,  1.0],
  ];
  for (const [x, z, s] of fernSpawns) {
    complexGroup.add(createFern(x, z, s, mats));
  }

  /* ================================================================
     ROCHAS COM MUSGO — Mais pedras no exterior
     ================================================================ */
  const rockSpawns = [
    [-m + 1,  2,       1.3],
    [m,       -6,      1.0],
    [-4,      m,       0.8],
    [3,       -m,      1.1],
    [-m2,     -m2 + 2, 1.0],
    [m2,      m2 - 2,  0.9],
    [-m2 + 3, 0,       1.2],
    [m2 - 3,  -4,      0.85],
  ];
  for (const [x, z, s] of rockSpawns) {
    complexGroup.add(createMossyRock(x, z, s, mats));
  }

  /* ================================================================
     ARBUSTOS — Vegetação densa no exterior
     ================================================================ */
  const bushSpawns = [
    [-m,       -m + 2,  1.0],
    [m - 1,    m,       0.9],
    [-m2 + 1,  3,       1.1],
    [m2 - 1,   -3,      0.85],
    [-2,       m,       0.95],
    [4,        -m,      1.0],
    [-m2,      m2 - 2,  1.1],
    [m2,       -m2 + 2, 0.9],
    [-m + 2,   -m2,     0.8],
    [m - 2,    m2,      1.0],
  ];
  for (const [x, z, s] of bushSpawns) {
    complexGroup.add(createBush(x, z, s, mats));
  }

  /* ================================================================
     FLORES — Grupos coloridos
     ================================================================ */
  const flowerSpawns = [
    [-m + 1,  -2,     1.2],
    [m - 1,   1,      1.0],
    [-1,      -m,     0.9],
    [3,       m,      1.1],
    [-m2 + 1, -5,     0.8],
    [m2 - 1,  -m + 1, 1.0],
    [-5,      m2 - 2, 0.9],
    [6,       -m2 + 1,0.85],
    [-m2,     3,      1.0],
    [m2,      -4,     0.9],
  ];
  for (const [x, z, s] of flowerSpawns) {
    complexGroup.add(createFlowerPatch(x, z, s));
  }

  /* ================================================================
     TOCOS DE ÁRVORE
     ================================================================ */
  const stumpSpawns = [
    [-m2 + 2, -5,     1.0],
    [m2 - 2,  6,      0.9],
    [0,       -m2,    0.8],
    [-m,      m2 - 1, 1.1],
  ];
  for (const [x, z, s] of stumpSpawns) {
    complexGroup.add(createTreeStump(x, z, s, mats));
  }

  /* ================================================================
     RIACHO — Água animada no exterior
     ================================================================ */
  complexGroup.add(createCreek(-m2 + 3, 0, 10, 0.8, 0.3));

  /* ================================================================
     ANIMAL: COELHOS — FORA da arena, espalhados pelo cenário
     Posições escolhidas para NÃO sobrepor árvores/rochas/cogumelos
     (zonas diagonais e meias-laterais livres)
     ================================================================ */
  const rabbitSpawns = [
    [-m3 + 3,  -m + 1,    15],   // sudoeste, entre árvores
    [m2 + 2,   -m3 + 2,   15],   // nordeste, zona isolada
    [-m - 3,   m3 - 3,    15],   // noroeste, zona livre
  ];
  for (const [rx, rz, rs] of rabbitSpawns) {
    // Pedestal de musgo sob o coelho
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.3, 0.4, 8),
      mats.moss
    );
    pedestal.position.set(rx, 0.2, rz);
    pedestal.receiveShadow = true;
    complexGroup.add(pedestal);

    // Coelho em cima do pedestal
    const rabbit = createRabbit(rx, rz, rs);
    rabbit.position.y = 0.4;
    complexGroup.add(rabbit);

    // SpotLight quente a apontar para o coelho
    const spot = new THREE.SpotLight(0xffaa44, 1.5, 15, Math.PI / 6, 0.5);
    spot.position.set(rx, 5, rz);
    spot.target.position.set(rx, 0.4, rz);
    complexGroup.add(spot);
    complexGroup.add(spot.target);
  }

  /* ================================================================
     BORBOLETAS — Efeito atmosférico
     ================================================================ */
  complexGroup.add(createButterflies(0, 0, 10, half * 3));

  /* ================================================================
     ATMOSFERA E PARTÍCULAS
     ================================================================ */
  const fog = createAtmosphericEffect('#225533', '#44aa44', 0.2, 28, 28);
  fog.position.set(0, 0.8, 0);
  complexGroup.add(fog);
  complexGroup.add(createParticleSystem('forest', half));
}
