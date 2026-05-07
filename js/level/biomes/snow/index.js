/* ==========================================================================
   NEVE — Index (Ponto de Entrada do Bioma)
   --------------------------------------------------------------------------
   ESTRUTURA:
   snow/
     index.js         ← ESTE FICHEIRO
     materials.js     ← Materiais partilhados
     pines.js         ← Pinheiros com neve
     crystals.js      ← Cristais de gelo
     details.js       ← Bancos de neve, rochas congeladas, boneco de neve
     structures.js    ← Lago gelado e igloo
     animals.js       ← Pinguins e fogueira
     exterior.js      ← Decoração exterior (pilares gelo, icículos)
   
   COORDENADAS:
   half ≈ 10, paredes terminam em ~10.5
   m  = half + 1.5 = 11.5 (margem perto)
   m2 = half + 3.5 = 13.5 (margem média)
   m3 = half + 6   = 16   (margem longe)
   ========================================================================== */
import * as THREE from 'three';
import { createSnowMaterials } from './materials.js';
import { createPine } from './pines.js';
import { createIceCrystal } from './crystals.js';
import { createSnowBank, createFrozenRock, createSnowman } from './details.js';
import { createFrozenLake, createIgloo } from './structures.js';
import { createPenguin, createCampfire } from './animals.js';
import { createSnowExterior } from './exterior.js';

export function buildSnowBiome(complexGroup, half, helpers) {
  const { loadImportedTexture, createAtmosphericEffect, createParticleSystem, createAuroraBorealis } = helpers;
  const mats = createSnowMaterials(loadImportedTexture);

  const m  = half + 1.5;
  const m2 = half + 3.5;
  const m3 = half + 6;

  /* ================================================================
     DECORAÇÃO EXTERIOR DA ARENA
     ================================================================ */
  createSnowExterior(complexGroup, half, mats);

  /* ================================================================
     PINHEIROS — 3 anéis de distância, muitos
     [x, z, escala]
     ================================================================ */
  const pineSpawns = [
    // Anel perto (m)
    [-m,     -m,     1.0],
    [-m,     m,      0.85],
    [m,      -m,     0.95],
    [m,      m,      1.1],
    [-m,     0,      0.8],
    [m,      0,      0.9],
    [-m,     -4,     0.7],
    [m,      5,      0.75],
    [0,      -m,     0.65],
    [0,      m,      0.7],
    // Anel médio (m2)
    [-m2,    -m2,    1.2],
    [m2,     -m2,    1.0],
    [-m2,    m2,     1.1],
    [m2,     m2,     0.95],
    [-m2,    -3,     0.85],
    [m2,     4,      0.9],
    [0,      -m2,    0.8],
    [0,      m2,     0.75],
    [-m2+2,  -m2,    0.7],
    [m2-2,   m2,     0.65],
    // Anel longe (m3)
    [-m3,    -m3,    1.3],
    [m3,     -m3,    1.2],
    [-m3,    m3,     1.15],
    [m3,     m3,     1.25],
    [-m3,    0,      1.1],
    [m3,     0,      1.0],
    [0,      -m3,    0.95],
    [0,      m3,     0.9],
  ];
  for (const [px, pz, s] of pineSpawns) {
    complexGroup.add(createPine(px, pz, s, mats));
  }

  /* ================================================================
     CRISTAIS DE GELO — Mais, em 2 anéis
     [x, z, escala]
     ================================================================ */
  const crystalSpawns = [
    [-m + 1, -3,     1.2],
    [m - 1,  5,      1.0],
    [-5,     m,      0.8],
    [6,      -m,     1.1],
    [-m + 1, 7,      0.9],
    [m - 1,  -6,     1.3],
    [-8,     2,      0.7],
    [3,      m,      0.85],
    // Médio
    [-m2,    -m2+2,  1.4],
    [m2,     m2-2,   1.1],
    [-m2+3,  m2,     0.9],
    [m2-3,   -m2,    1.2],
  ];
  for (const [cx, cz, s] of crystalSpawns) {
    complexGroup.add(createIceCrystal(cx, cz, s, mats));
  }

  /* ================================================================
     BANCOS DE NEVE — Montes pelo exterior
     ================================================================ */
  complexGroup.add(createSnowBank(-m,      -4,       1.5, 0.3,  mats));
  complexGroup.add(createSnowBank(m,       3,        1.8, 0.35, mats));
  complexGroup.add(createSnowBank(0,       m,        2.2, 0.25, mats));
  complexGroup.add(createSnowBank(-4,      -m,       1.3, 0.3,  mats));
  complexGroup.add(createSnowBank(5,       -3,       1.0, 0.2,  mats));
  complexGroup.add(createSnowBank(-m2,     -m2,      2.5, 0.4,  mats));
  complexGroup.add(createSnowBank(m2,      m2,       2.0, 0.35, mats));
  complexGroup.add(createSnowBank(-m2+2,   m2-1,     1.8, 0.3,  mats));
  complexGroup.add(createSnowBank(m3-1,    0,        3.0, 0.5,  mats));

  /* ================================================================
     ROCHAS CONGELADAS — Mais pedras no exterior
     [x, z, escala]
     ================================================================ */
  const rockSpawns = [
    [-m + 1, 2,        1.2],
    [m,      -5,       0.9],
    [-3,     m,        1.0],
    [5,      -m,       0.8],
    [-m2,    -m2+3,    1.3],
    [m2,     m2-3,     1.1],
    [-m2+4,  0,        0.9],
    [m2-4,   -5,       1.0],
  ];
  for (const [rx, rz, s] of rockSpawns) {
    complexGroup.add(createFrozenRock(rx, rz, s, mats));
  }

  /* ================================================================
     BONECO DE NEVE — Detalhe temático (afastado)
     ================================================================ */
  complexGroup.add(createSnowman(m2 - 1, m2, mats));
  complexGroup.add(createSnowman(-m2, -m2 + 2, mats));

  /* ================================================================
     LAGO GELADO — Exterior
     ================================================================ */
  complexGroup.add(createFrozenLake(-m2 + 2, -m2 + 2, 1.8, mats));

  /* ================================================================
     IGLOO — Exterior (afastado)
     ================================================================ */
  complexGroup.add(createIgloo(m2, -m2 + 1, 1.2, mats));

  /* ================================================================
     ANIMAL: PINGUINS — FORA da arena, espalhados pelo cenário
     Posições escolhidas para NÃO sobrepor pinheiros/cristais/rochas
     (zonas abertas isoladas)
     ================================================================ */
  const penguinSpawns = [
    [-m3 + 2,  m + 2,     15],   // noroeste, zona aberta
    [m + 3,    m3 - 3,    15],   // nordeste, longe dos pinheiros
    [m2 + 1,   -m - 3,    15],   // sudeste, zona isolada
  ];
  for (const [px, pz, s] of penguinSpawns) {
    // Pedestal de gelo sob o pinguim
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.3, 0.4, 8),
      mats.ice
    );
    pedestal.position.set(px, 0.2, pz);
    pedestal.receiveShadow = true;
    complexGroup.add(pedestal);

    // Pinguim em cima do pedestal
    const penguin = createPenguin(px, pz, s);
    penguin.position.y = 0.4;
    complexGroup.add(penguin);

    // SpotLight azul a apontar para o pinguim
    const spot = new THREE.SpotLight(0x88ccff, 2, 15, Math.PI / 6, 0.5);
    spot.position.set(px, 5, pz);
    spot.target.position.set(px, 0.4, pz);
    complexGroup.add(spot);
    complexGroup.add(spot.target);
  }

  /* ================================================================
     FOGUEIRA — Perto dos pinguins (exterior)
     ================================================================ */
  complexGroup.add(createCampfire(m2 + 1.5, m2 - 0.5, 1.5, mats));

  /* ================================================================
     ATMOSFERA E PARTÍCULAS
     ================================================================ */
  complexGroup.add(createAuroraBorealis());
  const fog = createAtmosphericEffect('#667788', '#aabbcc', 0.2, 28, 28);
  fog.position.set(0, 0.5, 0);
  complexGroup.add(fog);
  complexGroup.add(createParticleSystem('snow', half));
}
