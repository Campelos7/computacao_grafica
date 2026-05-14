/**
 * @fileoverview Configuração central de obstáculos dinâmicos e constantes da arena.
 * Partilhado entre `Walls.js`, `MovingObstacles.js` e `Obstacles.js`.
 */

/** Altura e espessura por omissão das paredes perimetrais (metros). */
export const ARENA_WALL_DEFAULTS = {
  wallHeight: 1.5,
  wallThick: 0.5,
};

/** Dimensões da primitiva “parede móvel” (BoxGeometry). */
export const MOVING_WALL_GEOMETRY = {
  width: 1.8,
  height: 1.2,
  depth: 0.6,
};

/** Caixa do rebordo luminoso em cima da parede móvel (ligeiramente maior que o corpo). */
export const MOVING_WALL_EDGE = {
  width: 1.82,
  height: 0.05,
  depth: 0.62,
  y: 0.6,
};

/** Cubo do bloco que aparece/desaparece. */
export const DISAPPEARING_BLOCK_GEOMETRY = {
  size: 0.9,
};

/**
 * Limites de colisão em espaço mundo (comparação com centro de célula da cobra).
 * Valores escolhidos para coincidir com a geometria aproximada dos meshes.
 */
export const OBSTACLE_COLLISION = {
  movingWallHalfX: 1.0,
  movingWallHalfZ: 0.4,
  disappearingBlockHalf: 0.5,
};

/** Cores e emissivos por bioma para obstáculos dinâmicos. */
export const BIOME_OBSTACLE_COLORS = {
  forest: {
    wallColor: 0x226633,
    wallEmissive: 0x115522,
    wallEmissiveIntensity: 0.4,
    wallEdge: 0x22cc44,
    blockColor: 0x44aa44,
    blockEmissive: 0x115522,
    blockEmissiveIntensity: 0.5,
  },
  desert: {
    wallColor: 0x8b6b3e,
    wallEmissive: 0x553311,
    wallEmissiveIntensity: 0.35,
    wallEdge: 0xcc6611,
    blockColor: 0xcc8833,
    blockEmissive: 0x664411,
    blockEmissiveIntensity: 0.45,
  },
  snow: {
    wallColor: 0x6688aa,
    wallEmissive: 0x224466,
    wallEmissiveIntensity: 0.45,
    wallEdge: 0x4488cc,
    blockColor: 0x88bbdd,
    blockEmissive: 0x336699,
    blockEmissiveIntensity: 0.5,
  },
};

/** Cores base da textura procedural de tijolo por bioma (canvas). */
export const OBSTACLE_TEXTURE_BRICK_BY_BIOME = {
  forest: {
    bg: '#1a2a15',
    brickColor: 'rgba(34, 170, 68, 0.15)',
    strokeColor: 'rgba(34, 204, 68, 0.3)',
  },
  desert: {
    bg: '#2a1a0a',
    brickColor: 'rgba(204, 102, 17, 0.15)',
    strokeColor: 'rgba(255, 136, 51, 0.3)',
  },
  snow: {
    bg: '#1a2535',
    brickColor: 'rgba(68, 136, 204, 0.15)',
    strokeColor: 'rgba(136, 204, 255, 0.3)',
  },
};
