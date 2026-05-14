/* ==========================================================================
   level/difficultyPresets.js
   Presets de dificuldade isolados para facilitar ajustes na defesa.

   Performance / render / pós-processamento: `js/gameConfig.js`.
   ========================================================================== */

/**
 * Áudio por dificuldade (SoundManager): tom e tempo da música chiptune + pitch dos SFX de jogo.
 * Valores omitidos herdam o default em `getDifficultyAudioPreset`.
 *
 * @typedef {object} DifficultyAudioPreset
 * @property {number} [musicPitchMultiplier] — multiplica frequências da melodia e baixo (>1 = mais agudo).
 * @property {number} [musicNoteLength] — duração base de cada nota (s); menor = música mais rápida.
 * @property {number} [sfxPitchMultiplier] — multiplica frequências de eat, powerup, morte, etc.
 */

export const DEFAULT_DIFFICULTY_AUDIO = {
  musicPitchMultiplier: 1,
  musicNoteLength: 0.15,
  sfxPitchMultiplier: 1,
};

export const DIFFICULTY_PRESETS = {
  easy: {
    id: 'easy',
    name: 'Fácil',
    speed: 0.15,
    /** Segundos no início da partida em que colisões com *movingWall* são ignoradas (0 = desligado). */
    movingWallGraceSeconds: 0,
    obstacles: [],
    /** Maçãs (comida) comidas entre cada escudo no mapa. */
    shieldEveryApples: 15,
    powerups: ['shield'],
    audio: {
      musicPitchMultiplier: 0.94,
      musicNoteLength: 0.2,
      sfxPitchMultiplier: 0.96,
    },
  },
  medium: {
    id: 'medium',
    name: 'Médio',
    speed: 0.12,
    /** Dá tempo de sair da linha dos obstáculos móveis antes de contarem como morte. */
    movingWallGraceSeconds: 1.65,
    obstacles: [
      { type: 'movingWall', position: [3, 0], axis: 'x', range: 4, speed: 1.5 },
      { type: 'movingWall', position: [-4, 2], axis: 'z', range: 3, speed: 1.2 },
      { type: 'disappearingBlock', position: [-5, 3], interval: 5 },
      { type: 'disappearingBlock', position: [6, -4], interval: 4 },
    ],
    shieldEveryApples: 30,
    powerups: ['shield'],
    audio: {
      musicPitchMultiplier: 1,
      musicNoteLength: 0.135,
      sfxPitchMultiplier: 1,
    },
  },
  hard: {
    id: 'hard',
    name: 'Difícil',
    speed: 0.095,
    /** Níveis densos em paredes móveis: graça mais longa para evitar morte no primeiro tick. */
    movingWallGraceSeconds: 2.15,
    obstacles: [
      { type: 'movingWall', position: [4, -2], axis: 'z', range: 5, speed: 2.0 },
      { type: 'movingWall', position: [-3, 5], axis: 'x', range: 3, speed: 1.8 },
      { type: 'movingWall', position: [0, -6], axis: 'x', range: 6, speed: 1.0 },
      { type: 'disappearingBlock', position: [6, -6], interval: 4 },
      { type: 'disappearingBlock', position: [-4, -4], interval: 3 },
      { type: 'disappearingBlock', position: [2, 7], interval: 5 },
    ],
    /** Difícil: sem escudos. */
    shieldEveryApples: null,
    powerups: [],
    audio: {
      musicPitchMultiplier: 1.08,
      musicNoteLength: 0.095,
      sfxPitchMultiplier: 1.05,
    },
  },
};

/**
 * @param {string} [difficultyId]
 * @returns {typeof DEFAULT_DIFFICULTY_AUDIO & Record<string, number>}
 */
export function getDifficultyAudioPreset(difficultyId) {
  const preset = DIFFICULTY_PRESETS[difficultyId] || DIFFICULTY_PRESETS.medium;
  return {
    ...DEFAULT_DIFFICULTY_AUDIO,
    ...(preset.audio || {}),
  };
}
