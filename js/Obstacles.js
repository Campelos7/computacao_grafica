/* ==========================================================================
   Obstacles.js — Orquestrador de obstáculos dinâmicos na cena
   A lógica de criação/animação/colisão vive em js/obstacles/MovingObstacles.js.
   ========================================================================== */
import * as THREE from 'three';
import { gridCellCenterWorldX, gridCellCenterWorldZ } from './utils/helpers.js';
import {
  buildDisappearingBlockEntry,
  buildMovingWallEntry,
  createObstacleBrickTexture,
  disposeDynamicObstacleEntries,
  dynamicObstaclesCollisionCauseAtWorldPoint,
  dynamicObstaclesHitWorldPoint,
  dynamicObstaclesOccupiedGridCells,
  updateDynamicObstacleEntries,
} from './obstacles/MovingObstacles.js';

/** Amostras ao longo do segmento cabeça anterior → nova (evita “atravessar” obstáculo móvel entre células). */
const HEAD_MOVE_COLLISION_SAMPLES = 6;

export class Obstacles {
  /**
   * @param {THREE.Scene} scene — cena principal Three.js
   */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'obstacles';
    this.scene.add(this.group);

    /** @type {object[]} */
    this.obstacles = [];
    this.currentBiome = 'forest';
    /** @type {THREE.CanvasTexture|null} */
    this.obstacleTexture = null;
  }

  /**
   * Instancia obstáculos a partir do array de configuração do nível.
   *
   * @param {Array<object>} configs — ex.: difficulty.obstacles
   * @param {string} [biome='forest'] — identificador do bioma
   * @returns {void}
   */
  generate(configs, biome = 'forest') {
    this.clear();
    this.currentBiome = biome;
    this.obstacleTexture = createObstacleBrickTexture(biome);

    for (const cfg of configs) {
      switch (cfg.type) {
        case 'movingWall': {
          const entry = buildMovingWallEntry(cfg, biome, this.obstacleTexture);
          this.group.add(entry.mesh);
          this.obstacles.push(entry);
          break;
        }
        case 'disappearingBlock': {
          const entry = buildDisappearingBlockEntry(cfg, biome, this.obstacleTexture);
          this.group.add(entry.mesh);
          this.obstacles.push(entry);
          break;
        }
        default:
          break;
      }
    }
  }

  /**
   * Actualiza animações (oscilação, fade) de todos os obstáculos activos.
   *
   * @param {number} elapsed — tempo total (s)
   * @param {number} _delta — reservado para futuras interpolações dependentes do delta
   * @returns {void}
   */
  update(elapsed, _delta) {
    updateDynamicObstacleEntries(this.obstacles, elapsed);
  }

  /**
   * Colisão da cabeça da cobra (célula lógica) com obstáculos dinâmicos.
   *
   * @param {THREE.Vector3} position — coordenadas de grelha (x,z inteiros)
   * @param {{ ignoreMovingWalls?: boolean }} [options] — durante graça inicial, ignorar só `movingWall`.
   * @returns {boolean}
   */
  checkCollision(position, options = {}) {
    const px = gridCellCenterWorldX(position.x);
    const pz = gridCellCenterWorldZ(position.z);
    return dynamicObstaclesHitWorldPoint(this.obstacles, px, pz, options);
  }

  /**
   * Colisão com obstáculos dinâmicos ao longo do movimento da cabeça no último passo.
   * A lógica discreta só testava o centro da célula de destino; o mesh interpola entre células,
   * pelo que sem este sweep é possível “encostar” visualmente a um bloco móvel sem morrer.
   *
   * @param {THREE.Vector3} prevHead — grelha da cabeça antes do passo (após `copyCurrentToPrevious`).
   * @param {THREE.Vector3} newHead — grelha da cabeça após o passo.
   * @param {{ ignoreMovingWalls?: boolean }} [options]
   * @returns {{ hit: boolean, cause: 'movingWall'|'disappearingBlock'|null }}
   */
  checkCollisionAlongHeadMove(prevHead, newHead, options = {}) {
    if (!prevHead || !newHead) {
      const hit = this.checkCollision(newHead, options);
      if (!hit) return { hit: false, cause: null };
      const px = gridCellCenterWorldX(newHead.x);
      const pz = gridCellCenterWorldZ(newHead.z);
      const cause = dynamicObstaclesCollisionCauseAtWorldPoint(this.obstacles, px, pz, options);
      return { hit: true, cause };
    }
    for (let i = 0; i <= HEAD_MOVE_COLLISION_SAMPLES; i++) {
      const t = i / HEAD_MOVE_COLLISION_SAMPLES;
      const gx = THREE.MathUtils.lerp(prevHead.x, newHead.x, t);
      const gz = THREE.MathUtils.lerp(prevHead.z, newHead.z, t);
      const px = gridCellCenterWorldX(gx);
      const pz = gridCellCenterWorldZ(gz);
      const cause = dynamicObstaclesCollisionCauseAtWorldPoint(this.obstacles, px, pz, options);
      if (cause) return { hit: true, cause };
    }
    return { hit: false, cause: null };
  }

  /**
   * Células ocupadas na grelha para evitar spawn de comida sobre obstáculos.
   *
   * @returns {Array<{ x: number, z: number }>}
   */
  getOccupiedPositions() {
    return dynamicObstaclesOccupiedGridCells(this.obstacles);
  }

  /** Ponto no plano XZ (mundo) dentro da hitbox de algum obstáculo dinâmico? */
  isWorldPointBlocked(wx, wz) {
    return dynamicObstaclesHitWorldPoint(this.obstacles, wx, wz, {});
  }

  /**
   * Remove meshes da cena e liberta recursos GPU.
   *
   * @returns {void}
   */
  clear() {
    for (const obs of this.obstacles) {
      this.group.remove(obs.mesh);
    }
    disposeDynamicObstacleEntries(this.obstacles);
    this.obstacles = [];
  }
}
