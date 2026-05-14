/**
 * @fileoverview Construção das paredes perimetrais estáticas da arena (limite visual/físico do tabuleiro).
 */
import * as THREE from 'three';
import { ARENA_WALL_DEFAULTS } from './config.js';

/**
 * Calcula as 4 definições de caixa (dimensões + centro) das paredes que rodeiam o chão.
 *
 * @param {number} boardWidth — largura do tabuleiro no mundo (ex.: BOARD_SIZE * CELL_SIZE).
 * @param {number} [wallHeight=ARENA_WALL_DEFAULTS.wallHeight] — altura vertical das paredes.
 * @param {number} [wallThick=ARENA_WALL_DEFAULTS.wallThick] — espessura de cada parede.
 * @returns {Array<{ size: [number, number, number], pos: [number, number, number] }>}
 */
export function getArenaWallBoxDefinitions(boardWidth, wallHeight, wallThick) {
  const h = wallHeight ?? ARENA_WALL_DEFAULTS.wallHeight;
  const t = wallThick ?? ARENA_WALL_DEFAULTS.wallThick;
  const half = boardWidth * 0.5;
  return [
    { size: [boardWidth + t * 2, h, t], pos: [0, h * 0.5, half + t * 0.5] },
    { size: [boardWidth + t * 2, h, t], pos: [0, h * 0.5, -half - t * 0.5] },
    { size: [t, h, boardWidth], pos: [half + t * 0.5, h * 0.5, 0] },
    { size: [t, h, boardWidth], pos: [-half - t * 0.5, h * 0.5, 0] },
  ];
}

/**
 * Instancia as quatro paredes perimetrais com material PBR e um rebordo emissivo no topo, e adiciona-as ao grupo do tabuleiro.
 *
 * @param {THREE.Group} boardGroup — grupo onde o chão já foi colocado.
 * @param {object} options
 * @param {number} options.boardWidth — largura total do tabuleiro no mundo.
 * @param {import('three').MeshStandardMaterial} options.wallMaterial — material PBR partilhado pelas faces das paredes.
 * @param {(hex: string) => import('three').Color} options.hexToColor — conversor de cor do tema.
 * @param {string} [options.wallEmissiveHex='#22cc44'] — cor do rebordo emissivo (fallback do tema).
 * @param {number} [options.wallHeight=ARENA_WALL_DEFAULTS.wallHeight]
 * @param {number} [options.wallThick=ARENA_WALL_DEFAULTS.wallThick]
 * @returns {void}
 */
export function addArenaPerimeterWalls(boardGroup, options) {
  const {
    boardWidth,
    wallMaterial,
    hexToColor,
    wallEmissiveHex = '#22cc44',
    wallHeight = ARENA_WALL_DEFAULTS.wallHeight,
    wallThick = ARENA_WALL_DEFAULTS.wallThick,
  } = options;

  const wallDefs = getArenaWallBoxDefinitions(boardWidth, wallHeight, wallThick);
  const edgeColor = hexToColor(wallEmissiveHex);

  for (const def of wallDefs) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...def.size), wallMaterial);
    wall.position.set(...def.pos);
    wall.castShadow = false;
    wall.receiveShadow = true;
    wall.name = 'wall';

    const edgeMat = new THREE.MeshBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: 0.25,
    });
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(def.size[0] + 0.02, 0.04, def.size[2] + 0.02),
      edgeMat,
    );
    edge.position.y = wallHeight * 0.5;
    edge.castShadow = false;
    wall.add(edge);
    boardGroup.add(wall);
  }
}
