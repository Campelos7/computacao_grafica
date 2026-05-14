/**
 * @fileoverview Lógica isolada de escolha de células livres na grelha para comida e power-ups.
 */
import { randomFreePosition } from '../utils/helpers.js';

/**
 * REGRAS DE POSIÇÃO (grelha lógica, mesmas que o resto do jogo):
 * - Células válidas: inteiro x,z em [−HALF_BOARD, HALF_BOARD−1] (definido em `randomFreePosition`).
 * - **Cobra**: qualquer segmento ocupa a sua célula; não pode nascer comida/shield lá.
 * - **Obstáculos**: o nível passa células ocupadas (inclui varredura de paredes móveis); não spawn lá.
 *
 * @param {Array<THREE.Vector3>} segments — segmentos da cobra (coordenadas de grelha em x,z).
 * @param {Array<{ x: number, z: number }>} obstaclePositions — células bloqueadas.
 * @returns {Set<string>} conjunto de chaves `"x,z"` para passar a `randomFreePosition`.
 */
export function buildOccupiedKeySet(segments, obstaclePositions) {
  const occupied = new Set(segments.map((s) => `${s.x},${s.z}`));
  obstaclePositions.forEach((p) => occupied.add(`${p.x},${p.z}`));
  return occupied;
}

/**
 * Escolhe célula para **comida** (sempre presente no mapa).
 * REGRA EXTRA: se o shield estiver activo, a célula do shield também é bloqueada
 * (comida e shield nunca partilham a mesma célula).
 *
 * @param {Array<THREE.Vector3>} occupiedSegments
 * @param {Array<{ x: number, z: number }>} obstaclePositions
 * @param {boolean} shieldPresent
 * @param {{ x: number, z: number }} shieldCell — célula do shield (ignorada se `shieldPresent` for falso)
 * @returns {THREE.Vector3} nova posição na grelha
 */
export function pickFoodSpawnCell(occupiedSegments, obstaclePositions, shieldPresent, shieldCell) {
  const occupied = buildOccupiedKeySet(occupiedSegments, obstaclePositions);
  if (shieldPresent) {
    occupied.add(`${shieldCell.x},${shieldCell.z}`);
  }
  return randomFreePosition(occupied);
}

/**
 * Escolhe célula para **shield** (opcional no mapa).
 * REGRA EXTRA: bloqueia a célula actual da **comida** para não sobrepor o donut.
 *
 * @param {Array<THREE.Vector3>} occupiedSegments
 * @param {Array<{ x: number, z: number }>} obstaclePositions
 * @param {{ x: number, z: number }} foodCell — célula da comida
 * @returns {THREE.Vector3}
 */
export function pickShieldSpawnCell(occupiedSegments, obstaclePositions, foodCell) {
  const occupied = buildOccupiedKeySet(occupiedSegments, obstaclePositions);
  occupied.add(`${foodCell.x},${foodCell.z}`);
  return randomFreePosition(occupied);
}
