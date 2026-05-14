/**
 * @fileoverview Obstáculos dinâmicos: textura procedural, criação, animação, colisão e células ocupadas na grelha.
 */
import * as THREE from 'three';
import {
  CELL_SIZE,
  createCanvasTexture,
  gridCellCenterWorldX,
  gridCellCenterWorldZ,
  worldToGridCellX,
  worldToGridCellZ,
} from '../utils/helpers.js';
import {
  BIOME_OBSTACLE_COLORS,
  DISAPPEARING_BLOCK_GEOMETRY,
  MOVING_WALL_EDGE,
  MOVING_WALL_GEOMETRY,
  OBSTACLE_COLLISION,
  OBSTACLE_TEXTURE_BRICK_BY_BIOME,
} from './config.js';

/**
 * @typedef {object} DynamicObstacleEntry
 * @property {THREE.Mesh} mesh
 * @property {'movingWall'|'disappearingBlock'} type
 * @property {'x'|'z'} [axis] — só `movingWall`.
 * @property {number} [range] — amplitude de oscilação (mundo).
 * @property {number} [speed] — multiplicador temporal da oscilação.
 * @property {THREE.Vector3} [basePos] — posição de repouso no mundo.
 * @property {number} [interval] — período do ciclo visível/invisível (s), só bloco.
 * @property {boolean} [_visible] — colisão activa só quando visível (bloco).
 * @property {number} [phaseOffset] — desfasagem (s) na onda senoidal das paredes móveis (evita fases todas iguais ao arranque).
 */

/**
 * Cria uma textura canvas repetível com padrão de tijolo, variante por bioma.
 *
 * @param {string} biome — `forest` | `desert` | `snow`
 * @returns {THREE.CanvasTexture}
 */
export function createObstacleBrickTexture(biome) {
  const preset = OBSTACLE_TEXTURE_BRICK_BY_BIOME[biome] || OBSTACLE_TEXTURE_BRICK_BY_BIOME.forest;
  return createCanvasTexture(64, (ctx, size) => {
    ctx.fillStyle = preset.bg;
    ctx.fillRect(0, 0, size, size);
    const brick = 8;
    for (let y = 0; y < size; y += brick) {
      const off = (Math.floor(y / brick) % 2) * (brick / 2);
      for (let x = -brick + off; x < size; x += brick * 2) {
        ctx.fillStyle = preset.brickColor;
        ctx.fillRect(x, y, brick * 2 - 1, brick - 1);
        ctx.strokeStyle = preset.strokeColor;
        ctx.strokeRect(x, y, brick * 2 - 1, brick - 1);
      }
    }
  }, { repeat: [2, 2], pixelArt: true });
}

/**
 * Constrói o registo de uma parede móvel (mesh + estado de animação).
 *
 * @param {object} cfg — entrada do preset de dificuldade.
 * @param {string} cfg.type — deve ser `movingWall`.
 * @param {[number, number]} cfg.position — célula da grelha [gx, gz].
 * @param {'x'|'z'} [cfg.axis]
 * @param {number} [cfg.range]
 * @param {number} [cfg.speed]
 * @param {number} [cfg.phaseOffset] — segundos somados ao `elapsed` na onda; se omitido, valor aleatório.
 * @param {string} biomeKey — chave em `BIOME_OBSTACLE_COLORS` (config.js).
 * @param {THREE.Texture} texture — textura partilhada do bioma.
 * @returns {DynamicObstacleEntry}
 */
export function buildMovingWallEntry(cfg, biomeKey, texture) {
  const colors = BIOME_OBSTACLE_COLORS[biomeKey] || BIOME_OBSTACLE_COLORS.forest;
  const { width, height, depth } = MOVING_WALL_GEOMETRY;
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    color: colors.wallColor,
    emissive: colors.wallEmissive,
    emissiveIntensity: colors.wallEmissiveIntensity,
    roughness: 0.6,
    metalness: 0.2,
    bumpMap: texture,
    bumpScale: 0.04,
  });

  const mesh = new THREE.Mesh(geo, mat);
  const wx = gridCellCenterWorldX(cfg.position[0]);
  const wz = gridCellCenterWorldZ(cfg.position[1]);
  mesh.position.set(wx, 0.6, wz);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.name = 'moving-wall';

  const edgeGeo = new THREE.BoxGeometry(
    MOVING_WALL_EDGE.width,
    MOVING_WALL_EDGE.height,
    MOVING_WALL_EDGE.depth,
  );
  const edgeMat = new THREE.MeshBasicMaterial({
    color: colors.wallEdge,
    transparent: true,
    opacity: 0.7,
  });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.y = MOVING_WALL_EDGE.y;
  mesh.add(edge);

  const phaseOffset = typeof cfg.phaseOffset === 'number' && Number.isFinite(cfg.phaseOffset)
    ? cfg.phaseOffset
    : Math.random() * Math.PI * 2;

  return {
    mesh,
    type: 'movingWall',
    axis: cfg.axis || 'x',
    range: cfg.range ?? 4,
    speed: cfg.speed ?? 1.5,
    basePos: new THREE.Vector3(wx, 0.6, wz),
    phaseOffset,
  };
}

/**
 * Constrói o registo de um bloco que alterna visibilidade no tempo.
 *
 * @param {object} cfg
 * @param {string} cfg.type — `disappearingBlock`
 * @param {[number, number]} cfg.position — célula [gx, gz].
 * @param {number} [cfg.interval] — duração de cada fase (s).
 * @param {string} biomeKey
 * @param {THREE.Texture} texture
 * @returns {DynamicObstacleEntry}
 */
export function buildDisappearingBlockEntry(cfg, biomeKey, texture) {
  const colors = BIOME_OBSTACLE_COLORS[biomeKey] || BIOME_OBSTACLE_COLORS.forest;
  const s = DISAPPEARING_BLOCK_GEOMETRY.size;
  const geo = new THREE.BoxGeometry(s, s, s);
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    color: colors.blockColor,
    emissive: colors.blockEmissive,
    emissiveIntensity: colors.blockEmissiveIntensity,
    roughness: 0.5,
    metalness: 0.15,
    transparent: true,
    opacity: 1,
  });

  const mesh = new THREE.Mesh(geo, mat);
  const bx = gridCellCenterWorldX(cfg.position[0]);
  const bz = gridCellCenterWorldZ(cfg.position[1]);
  mesh.position.set(bx, 0.45, bz);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.name = 'disappearing-block';

  return {
    mesh,
    type: 'disappearingBlock',
    interval: cfg.interval ?? 5,
    basePos: new THREE.Vector3(bx, 0.45, bz),
    _visible: true,
  };
}

/**
 * Actualiza posições e materiais de todos os obstáculos dinâmicos (uma frame).
 *
 * @param {DynamicObstacleEntry[]} list
 * @param {number} elapsed — tempo total desde o arranque (s).
 * @returns {void}
 */
export function updateDynamicObstacleEntries(list, elapsed) {
  for (const obs of list) {
    if (obs.type === 'movingWall') {
      const t = elapsed + (obs.phaseOffset ?? 0);
      const offset = Math.sin(t * obs.speed) * obs.range;
      if (obs.axis === 'x') {
        obs.mesh.position.x = obs.basePos.x + offset;
      } else {
        obs.mesh.position.z = obs.basePos.z + offset;
      }
      const edge = obs.mesh.children[0];
      if (edge?.material) {
        edge.material.opacity = 0.5 + Math.abs(Math.sin(t * 3)) * 0.5;
      }
    }

    if (obs.type === 'disappearingBlock') {
      const cycle = elapsed % (obs.interval * 2);
      const halfInterval = obs.interval;

      if (cycle < halfInterval) {
        const fadeIn = Math.min(cycle / 0.5, 1);
        obs.mesh.material.opacity = fadeIn;
        obs.mesh.visible = true;
        obs._visible = true;
      } else {
        const fadeOut = Math.max(0, 1 - (cycle - halfInterval) / 0.5);
        obs.mesh.material.opacity = fadeOut;
        obs._visible = fadeOut > 0.3;
        obs.mesh.visible = fadeOut > 0.01;
      }

      if (obs.mesh.visible) {
        obs.mesh.rotation.y += 0.005;
      }
    }
  }
}

/**
 * Testa colisão da cobra (ponto no centro da célula em mundo) contra obstáculos dinâmicos.
 *
 * @param {DynamicObstacleEntry[]} list
 * @param {number} px — mundo X do centro da célula da cabeça.
 * @param {number} pz — mundo Z do centro da célula da cabeça.
 * @param {{ ignoreMovingWalls?: boolean }} [options] — se `ignoreMovingWalls`, só blocos desaparecem colidem (graça inicial).
 * @returns {boolean}
 */
/**
 * Primeiro obstáculo dinâmico que intersecta o ponto (centro de célula em mundo).
 * @param {DynamicObstacleEntry[]} list
 * @param {number} px
 * @param {number} pz
 * @param {{ ignoreMovingWalls?: boolean }} [options]
 * @returns {'movingWall'|'disappearingBlock'|null}
 */
export function dynamicObstaclesCollisionCauseAtWorldPoint(list, px, pz, options = {}) {
  const ignoreMovingWalls = options.ignoreMovingWalls === true;
  const { movingWallHalfX, movingWallHalfZ, disappearingBlockHalf } = OBSTACLE_COLLISION;
  for (const obs of list) {
    if (obs.type === 'movingWall') {
      if (ignoreMovingWalls) continue;
      const wx = obs.mesh.position.x;
      const wz = obs.mesh.position.z;
      if (Math.abs(px - wx) < movingWallHalfX && Math.abs(pz - wz) < movingWallHalfZ) {
        return 'movingWall';
      }
    }
    if (obs.type === 'disappearingBlock' && obs._visible) {
      const bx = obs.mesh.position.x;
      const bz = obs.mesh.position.z;
      if (Math.abs(px - bx) < disappearingBlockHalf && Math.abs(pz - bz) < disappearingBlockHalf) {
        return 'disappearingBlock';
      }
    }
  }
  return null;
}

export function dynamicObstaclesHitWorldPoint(list, px, pz, options = {}) {
  return dynamicObstaclesCollisionCauseAtWorldPoint(list, px, pz, options) != null;
}

/**
 * Lista células da grelha ocupadas ou potencialmente ocupadas (para spawn de comida).
 *
 * @param {DynamicObstacleEntry[]} list
 * @returns {Array<{ x: number, z: number }>}
 */
export function dynamicObstaclesOccupiedGridCells(list) {
  const positions = [];
  for (const obs of list) {
    const p = obs.mesh.position;
    positions.push({ x: worldToGridCellX(p.x), z: worldToGridCellZ(p.z) });
    if (obs.type === 'movingWall') {
      for (let i = -obs.range; i <= obs.range; i++) {
        if (obs.axis === 'x') {
          const xw = obs.basePos.x + i * CELL_SIZE;
          positions.push({ x: worldToGridCellX(xw), z: worldToGridCellZ(obs.basePos.z) });
        } else {
          const zw = obs.basePos.z + i * CELL_SIZE;
          positions.push({ x: worldToGridCellX(obs.basePos.x), z: worldToGridCellZ(zw) });
        }
      }
    }
  }
  return positions;
}

/**
 * Liberta geometria/material dos meshes de cada entrada e remove filhos (rebordos).
 *
 * @param {DynamicObstacleEntry[]} list
 * @returns {void}
 */
export function disposeDynamicObstacleEntries(list) {
  for (const obs of list) {
    if (obs.mesh.geometry) obs.mesh.geometry.dispose();
    if (obs.mesh.material) obs.mesh.material.dispose();
    while (obs.mesh.children.length > 0) {
      const child = obs.mesh.children[0];
      obs.mesh.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
  }
}
