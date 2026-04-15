/* ==========================================================================
   helpers.js — Constantes partilhadas e funções utilitárias
   Requisito: Performance, reutilização, organização modular
   ========================================================================== */
import * as THREE from 'three';

// ---- Constantes do tabuleiro ----
export const BOARD_SIZE = 20;
export const CELL_SIZE = 1;
export const HALF_BOARD = Math.floor(BOARD_SIZE / 2);

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
