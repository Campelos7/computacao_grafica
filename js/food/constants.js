/* ==========================================================================
   food/constants.js
   Constantes do sistema de comida / power-ups e parâmetros de spawn.
   (Parâmetros globais de render/áudio: `js/gameConfig.js`.)
   ========================================================================== */

export const ITEM_TYPES = {
  FOOD: 'food',
  SHIELD: 'shield',
};

export const FOOD_COLORS = {
  COLLECT: 0xff00ff,
  SHIELD_COLLECT: 0x00ffff,
};

/**
 * Escudo no mapa: intervalo em **maçãs comidas** por dificuldade (`shieldEveryApples` em
 * `js/level/difficultyPresets.js`). Ver `Food.trySpawnShield` / `setAvailablePowerups`.
 */

/** Altura base Y das pickups no mundo (antes de animação de flutuação no shield). */
export const PICKUP_MESH_BASE_Y = 0.55;
