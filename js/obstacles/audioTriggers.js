/**
 * Identificadores de som ligados a obstáculos dinâmicos (MovingObstacles.js).
 * Usados pelo SoundManager e pela cadeia de colisão (Obstacles → Snake → main).
 */

/** @typedef {'movingWall'|'disappearingBlock'} DynamicObstacleSoundId */

export const DYNAMIC_OBSTACLE_SOUND = {
  movingWall: 'movingWall',
  disappearingBlock: 'disappearingBlock',
};

/** Parâmetros base por tipo (frequências em Hz antes do pitch global da dificuldade). */
export const OBSTACLE_HIT_SOUND = {
  [DYNAMIC_OBSTACLE_SOUND.movingWall]: { baseFreq: 165, sweepTo: 95 },
  [DYNAMIC_OBSTACLE_SOUND.disappearingBlock]: { baseFreq: 520, sweepTo: 780 },
};

/**
 * @param {string} [type]
 * @returns {type is DynamicObstacleSoundId}
 */
export function isDynamicObstacleSoundType(type) {
  return type === DYNAMIC_OBSTACLE_SOUND.movingWall
    || type === DYNAMIC_OBSTACLE_SOUND.disappearingBlock;
}
