/**
 * @fileoverview Classe `Food` — orquestra comida (Food.js), power-ups (PowerUps.js) e spawn (SpawnManager.js).
 */
import * as THREE from 'three';
import { ITEM_TYPES } from './constants.js';
import {
  createFoodTorusMesh,
  disposeFoodTorusMesh,
  syncFoodMeshGridPosition,
  tickFoodMeshAnimation,
} from './Food.js';
import {
  createShieldOrbMesh,
  disposeShieldOrbMesh,
  shieldIsAllowedOnLevel,
  syncShieldMeshGridPosition,
  tickShieldMeshAnimation,
} from './PowerUps.js';
import { pickFoodSpawnCell, pickShieldSpawnCell } from './SpawnManager.js';

export class Food {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.name = 'food-group';
    this.scene.add(this.group);

    this.foodCell = new THREE.Vector3(0, 0, 0);
    /** @type {THREE.Mesh|null} */
    this.foodMesh = null;

    this.shieldCell = new THREE.Vector3(0, 0, 0);
    /** @type {THREE.Mesh|null} */
    this.shieldMesh = null;
    this.shieldPresent = false;

    /** @type {string[]} */
    this.activePowerups = [];
    /** @type {number|null} — maçãs entre escudos; `null` = desligado (ex.: difícil). */
    this.shieldEveryApples = null;
    /** Contador desde o último spawn de escudo (só incrementa com comida). */
    this._applesTowardShield = 0;

    this.foodMesh = createFoodTorusMesh(this.group);
  }

  /**
   * Recria o torus da comida (útil se o mesh tiver sido descartado).
   * @returns {void}
   */
  _ensureFoodMesh() {
    if (!this.foodMesh) {
      this.foodMesh = createFoodTorusMesh(this.group);
    }
  }

  /**
   * @param {Array<THREE.Vector3>} occupiedSegments
   * @param {Array<{ x: number, z: number }>} [obstaclePositions=[]]
   * @returns {void}
   */
  respawnFood(occupiedSegments, obstaclePositions = []) {
    const pos = pickFoodSpawnCell(
      occupiedSegments,
      obstaclePositions,
      this.shieldPresent,
      this.shieldCell,
    );
    this.foodCell.copy(pos);
    this._ensureFoodMesh();
    syncFoodMeshGridPosition(this.foodMesh, this.foodCell);
  }

  /**
   * @param {Array<THREE.Vector3>} occupiedSegments
   * @param {Array<{ x: number, z: number }>} [obstaclePositions=[]]
   * @returns {void}
   */
  respawn(occupiedSegments, obstaclePositions = []) {
    this.respawnFood(occupiedSegments, obstaclePositions);
  }

  /**
   * Tenta spawnar escudo após comer uma maçã: intervalo fixo por dificuldade (`shieldEveryApples`).
   *
   * @param {Array<THREE.Vector3>} occupiedSegments
   * @param {Array<{ x: number, z: number }>} [obstaclePositions=[]]
   * @returns {void}
   */
  trySpawnShield(occupiedSegments, obstaclePositions = []) {
    if (this.shieldPresent) return;
    if (!shieldIsAllowedOnLevel(this.activePowerups)) return;
    if (this.shieldEveryApples == null || this.shieldEveryApples <= 0) return;

    this._applesTowardShield += 1;
    if (this._applesTowardShield < this.shieldEveryApples) return;

    this._applesTowardShield = 0;

    const pos = pickShieldSpawnCell(occupiedSegments, obstaclePositions, this.foodCell);
    this.shieldCell.copy(pos);

    if (this.shieldMesh) {
      disposeShieldOrbMesh(this.group, this.shieldMesh);
      this.shieldMesh = null;
    }
    this.shieldMesh = createShieldOrbMesh(this.group);
    syncShieldMeshGridPosition(this.shieldMesh, this.shieldCell);
    this.shieldPresent = true;
  }

  /**
   * @returns {void}
   */
  removeShield() {
    disposeShieldOrbMesh(this.group, this.shieldMesh);
    this.shieldMesh = null;
    this.shieldPresent = false;
  }

  /**
   * @param {string[]} types
   * @param {number|null} [shieldEveryApples] — maçãs entre escudos; `null` ou `<=0` = nunca por intervalo
   * @returns {void}
   */
  setAvailablePowerups(types, shieldEveryApples = null) {
    this.activePowerups = types || [];
    const n = shieldEveryApples == null ? null : Math.floor(Number(shieldEveryApples));
    this.shieldEveryApples = Number.isFinite(n) && n > 0 ? n : null;
    this._applesTowardShield = 0;
  }

  /**
   * @param {THREE.Vector3} pos — célula da cabeça (grelha)
   * @returns {boolean}
   */
  checkFoodCollision(pos) {
    return pos.x === this.foodCell.x && pos.z === this.foodCell.z;
  }

  /**
   * @param {THREE.Vector3} pos
   * @returns {boolean}
   */
  checkShieldCollision(pos) {
    if (!this.shieldPresent) return false;
    return pos.x === this.shieldCell.x && pos.z === this.shieldCell.z;
  }

  /**
   * @param {number} elapsed
   * @returns {void}
   */
  update(elapsed) {
    tickFoodMeshAnimation(this.foodMesh, elapsed);
    if (this.shieldMesh && this.shieldPresent) {
      tickShieldMeshAnimation(this.shieldMesh, elapsed);
    }
  }

  get cell() {
    return this.foodCell;
  }

  get type() {
    return ITEM_TYPES.FOOD;
  }
}

export { ITEM_TYPES } from './constants.js';
