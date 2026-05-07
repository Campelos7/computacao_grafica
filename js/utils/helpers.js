/* ==========================================================================
   helpers.js — Constantes partilhadas e funções utilitárias
   Requisito: Performance, reutilização, organização modular

   Valores de tuning (velocidade, dificuldade, escudo, etc.): ver
   ../config/gameConfig.js — aqui reexportam-se para não quebrar imports.
   ========================================================================== */
import * as THREE from 'three';
import {
  BOARD_SIZE,
  CELL_SIZE,
  DIFFICULTY_LEVELS,
  SNAKE_STEP_REFERENCE_SECONDS,
  SHIELD_SPAWN_EVERY_N_APPLES,
  SHIELD_DURATION_SECONDS,
  OBSTACLES_FALLBACK_WHEN_LEVEL_EMPTY,
} from '../config/gameConfig.js';

export {
  BOARD_SIZE,
  CELL_SIZE,
  DIFFICULTY_LEVELS,
  SNAKE_STEP_REFERENCE_SECONDS,
  SHIELD_SPAWN_EVERY_N_APPLES,
  SHIELD_DURATION_SECONDS,
  OBSTACLES_FALLBACK_WHEN_LEVEL_EMPTY,
};

export const HALF_BOARD = Math.floor(BOARD_SIZE / 2);

/** Centro da célula em mundo: grelha inteira alinha com o chão [-half, +half]. */
export const CELL_CENTER_OFFSET = CELL_SIZE * 0.5;

export function gridToWorldX(gx) {
  return gx * CELL_SIZE + CELL_CENTER_OFFSET;
}

export function gridToWorldZ(gz) {
  return gz * CELL_SIZE + CELL_CENTER_OFFSET;
}

/**
 * Ritmo do mapa: multiplica a duração do passo (>1 = cobra mais lenta neste mapa).
 * Preferir valores perto de 1.0 para o mesmo modo de dificuldade se sentir igual entre mapas.
 * @param {{ pace?: number, speed?: number }} level
 */
export function getLevelPace(level) {
  if (!level) return 1;
  if (typeof level.pace === 'number' && level.pace > 0) return level.pace;
  // Legado: "speed" era a duração absoluta do passo — converte para pace relativo à referência
  if (typeof level.speed === 'number' && level.speed > 0) {
    return level.speed / SNAKE_STEP_REFERENCE_SECONDS;
  }
  return 1;
}

/**
 * Duração efectiva de um passo da cobra (para o acumulador do jogo).
 */
export function getSnakeStepDuration(level, difficultyIndex) {
  const diff = DIFFICULTY_LEVELS[difficultyIndex] ?? DIFFICULTY_LEVELS[1];
  const pace = getLevelPace(level);
  return SNAKE_STEP_REFERENCE_SECONDS * pace * diff.snakeStepMult;
}

/**
 * @param {number} difficultyIndex — índice em DIFFICULTY_LEVELS
 * @returns {number|null} N maçãs entre escudos, ou null se desactivado
 */
export function getShieldSpawnInterval(difficultyIndex) {
  const id = DIFFICULTY_LEVELS[difficultyIndex]?.id;
  if (!id) return null;
  const n = SHIELD_SPAWN_EVERY_N_APPLES[id];
  return n == null ? null : n;
}

/**
 * Converte obstáculos dinâmicos (paredes móveis, blocos que piscam) em configs
 * só com geometria fixa — usado no modo NORMAL.
 * @param {unknown[]} configs — mesma forma que "obstacles" no JSON
 * @returns {unknown[]}
 */
export function configsToStaticObstacles(configs) {
  const out = [];
  for (const cfg of configs) {
    if (!cfg || typeof cfg !== 'object') continue;
    const c = /** @type {{ type?: string, position?: number[], shape?: string, axis?: string, range?: number }} */ (cfg);
    if (c.type === 'staticBlock') {
      const shape = c.shape === 'wall' ? 'wall' : 'cube';
      if (shape === 'wall') {
        out.push({
          type: 'staticBlock',
          shape: 'wall',
          position: [...(c.position || [0, 0])],
          axis: c.axis || 'x',
          range: typeof c.range === 'number' ? c.range : 4,
        });
      } else {
        out.push({
          type: 'staticBlock',
          shape: 'cube',
          position: [...(c.position || [0, 0])],
        });
      }
      continue;
    }
    if (c.type === 'movingWall') {
      out.push({
        type: 'staticBlock',
        shape: 'wall',
        position: [...(c.position || [0, 0])],
        axis: c.axis || 'x',
        range: typeof c.range === 'number' ? c.range : 4,
      });
      continue;
    }
    if (c.type === 'disappearingBlock') {
      out.push({
        type: 'staticBlock',
        shape: 'cube',
        position: [...(c.position || [0, 0])],
      });
    }
  }
  return out;
}

/**
 * Lista de obstáculos efectiva: combina mapa (JSON) + modo de dificuldade.
 * - FÁCIL: nunca obstáculos (tabuleiro limpo em qualquer mapa).
 * - NORMAL: o mesmo *layout* que no difícil (nível ou fallback), mas só blocos/paredes **parados**.
 * - DIFÍCIL: o do nível; se vazio, usa OBSTACLES_FALLBACK_WHEN_LEVEL_EMPTY (dinâmicos).
 *
 * @param {{ obstacles?: unknown[] }} level — nível actual (ex.: levelMgr.currentLevel)
 * @param {number} difficultyIndex — índice em DIFFICULTY_LEVELS
 * @returns {unknown[]} configs passadas a Obstacles.generate
 */
export function getObstacleConfigsForPlay(level, difficultyIndex) {
  const id = DIFFICULTY_LEVELS[difficultyIndex]?.id;
  if (id === 'easy') return [];

  const base = Array.isArray(level?.obstacles) ? level.obstacles : [];

  if (id === 'hard') {
    if (base.length > 0) return base;
    return [...OBSTACLES_FALLBACK_WHEN_LEVEL_EMPTY];
  }

  // normal
  const source = base.length > 0 ? base : [...OBSTACLES_FALLBACK_WHEN_LEVEL_EMPTY];
  return configsToStaticObstacles(source);
}

// ---- Direcções da cobra ----
export const DIRS = {
  up:    new THREE.Vector3( 0, 0, -1),
  down:  new THREE.Vector3( 0, 0,  1),
  left:  new THREE.Vector3(-1, 0,  0),
  right: new THREE.Vector3( 1, 0,  0),
};

// ---- Paleta neon retro ----
export const PALETTE = {
  magenta:  0xff00ff,
  cyan:     0x00ffff,
  yellow:   0xffff00,
  green:    0x39ff14,
  red:      0xff3131,
  orange:   0xff6600,
  darkBg:   0x0a0a1a,
  darkPanel: 0x0a0a1e,
};

// ---- Utilidades matemáticas ----

/**
 * Inteiro aleatório entre min e max (inclusivo).
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Clamp de um valor entre min e max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Lerp suave com deltaTime (para animações frame-independent).
 */
export function damp(current, target, smoothing, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-smoothing * dt));
}

/**
 * Cria uma textura pixel-art procedural via Canvas.
 * @param {number} size - Dimensão do canvas (quadrado)
 * @param {Function} drawFn - Função de desenho (ctx, size) => void
 * @param {object} [options] - Opções de wrapping/repeat
 * @returns {THREE.CanvasTexture}
 */
export function createCanvasTexture(size, drawFn, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  if (options.repeat) texture.repeat.set(options.repeat[0], options.repeat[1]);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Pixel-art: usar filtro nearest para estilo retro
  if (options.pixelArt) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
  }
  return texture;
}

/**
 * Descarta geometria e material(s) de um Mesh de forma segura.
 * Requisito: Prevenir memory leaks ao mudar de nível.
 */
export function disposeMesh(mesh) {
  if (!mesh) return;
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    } else {
      if (mesh.material.map) mesh.material.map.dispose();
      mesh.material.dispose();
    }
  }
}

/**
 * Remove e descarta recursivamente todos os filhos de um Group/Object3D.
 */
export function disposeGroup(group) {
  if (!group) return;
  while (group.children.length > 0) {
    const child = group.children[0];
    if (child.children && child.children.length > 0) {
      disposeGroup(child);
    }
    disposeMesh(child);
    group.remove(child);
  }
}

/**
 * Gera uma posição aleatória válida no tabuleiro (evita células ocupadas).
 * @param {Set<string>} occupied - Set de strings "x,z" das posições ocupadas
 * @returns {THREE.Vector3}
 */
export function randomFreePosition(occupied) {
  let pos;
  let attempts = 0;
  do {
    pos = new THREE.Vector3(
      randomInt(-HALF_BOARD, HALF_BOARD - 1),
      0,
      randomInt(-HALF_BOARD, HALF_BOARD - 1)
    );
    attempts++;
  } while (occupied.has(`${pos.x},${pos.z}`) && attempts < 500);
  return pos;
}

/**
 * Converte um hex string (#rrggbb) para THREE.Color.
 */
export function hexToColor(hex) {
  return new THREE.Color(hex);
}

/**
 * Pool reutilizável de Vector3 para evitar alocações no game loop.
 */
export const vec3Pool = {
  _pool: [],
  get() {
    return this._pool.length > 0 ? this._pool.pop().set(0, 0, 0) : new THREE.Vector3();
  },
  release(v) {
    this._pool.push(v);
  }
};
