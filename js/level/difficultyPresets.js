/* ==========================================================================
   level/difficultyPresets.js
   Presets de dificuldade isolados para facilitar ajustes na defesa.
   ========================================================================== */

export const DIFFICULTY_PRESETS = {
  easy: {
    id: 'easy',
    name: 'Fácil',
    speed: 0.15,
    obstacles: [],
    powerups: ['shield'],
  },
  medium: {
    id: 'medium',
    name: 'Médio',
    speed: 0.12,
    obstacles: [
      { type: 'movingWall', position: [3, 0], axis: 'x', range: 4, speed: 1.5 },
      { type: 'movingWall', position: [-4, 2], axis: 'z', range: 3, speed: 1.2 },
      { type: 'disappearingBlock', position: [-5, 3], interval: 5 },
      { type: 'disappearingBlock', position: [6, -4], interval: 4 },
    ],
    powerups: ['shield'],
  },
  hard: {
    id: 'hard',
    name: 'Difícil',
    speed: 0.095,
    obstacles: [
      { type: 'movingWall', position: [4, -2], axis: 'z', range: 5, speed: 2.0 },
      { type: 'movingWall', position: [-3, 5], axis: 'x', range: 3, speed: 1.8 },
      { type: 'movingWall', position: [0, -6], axis: 'x', range: 6, speed: 1.0 },
      { type: 'disappearingBlock', position: [6, -6], interval: 4 },
      { type: 'disappearingBlock', position: [-4, -4], interval: 3 },
      { type: 'disappearingBlock', position: [2, 7], interval: 5 },
    ],
    powerups: ['shield'],
  },
};
