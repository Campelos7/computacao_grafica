/* ==========================================================================
   Food.js — Sistema Dual de Comida e Power-ups 3D
   ═══════════════════════════════════════════════════════════════════════════

   OBJECTO COMPLEXO: Comida (TorusGeometry) + Shield (IcosahedronGeometry)

   Sistema dual-slot:
   ─ COMIDA: Sempre presente no mapa. Quando comida, reaparece imediatamente.
   ─ SHIELD: Spawna raramente (~15% de chance ao comer comida).
             Pode coexistir com a comida no mapa.

   Requisitos cobertos:
   - R1: Objectos 3D complexos (TorusGeometry, IcosahedronGeometry)
   - Animação de pulso/rotação
   - Partículas ao colectar
   - Materiais PBR (MeshStandardMaterial com emissive)
   ========================================================================== */
import * as THREE from 'three';
import { HALF_BOARD, randomInt, randomFreePosition, PALETTE } from './utils/helpers.js';
import { FOOD_COLORS, ITEM_TYPES } from './food/constants.js';

/* ══════════════════════════════════════════════════════════════════════════
   TIPOS DE ITEM — Identificadores para comida e power-ups
   ══════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════
   CLASSE FOOD — Gestor de Comida e Power-ups
   ══════════════════════════════════════════════════════════════════════════ */
export class Food {
  /**
   * @param {THREE.Scene} scene — cena principal do Three.js
   */
  constructor(scene) {
    this.scene = scene;

    /* ── Grupo principal que contém todos os itens ── */
    this.group = new THREE.Group();
    this.group.name = 'food-group';
    this.scene.add(this.group);

    /* ── Slot 1: COMIDA — sempre presente no mapa ── */
    this.foodCell = new THREE.Vector3(0, 0, 0);  // posição na grelha
    this.foodMesh = null;                         // mesh 3D da comida

    /* ── Slot 2: SHIELD — opcional, spawna raramente ── */
    this.shieldCell = new THREE.Vector3(0, 0, 0); // posição na grelha
    this.shieldMesh = null;                        // mesh 3D do shield
    this.shieldPresent = false;                    // se o shield está no mapa

    /* ── Power-ups disponíveis no nível actual ── */
    this.activePowerups = [];

    /* ── Partículas de colecta ── */
    this.particles = [];

    /* ── Criar comida inicial ── */
    this._createFoodMesh();
  }

  /* ══════════════════════════════════════════════════════════════════════════
     CRIAÇÃO DOS MESHES — Objectos 3D complexos
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Cria o mesh da comida (TorusGeometry — donut neon).
   * Primitiva: TorusGeometry com MeshStandardMaterial emissivo.
   */
  _createFoodMesh() {
    this._clearFoodMesh();

    /* GUIA DE EDIÇÃO (COMIDA):
       - Tamanho geral do donut: 1.º parâmetro (raio = 0.3)
       - Espessura do donut: 2.º parâmetro (tubo = 0.14)
       - Definição visual: 3.º e 4.º parâmetros (16, 28)
       - Altura no mapa: this.foodMesh.position.y = 0.55 */
    const geo = new THREE.TorusGeometry(0.3, 0.14, 16, 28);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.5,
    });
    this.foodMesh = new THREE.Mesh(geo, mat);
    this.foodMesh.position.y = 0.55;
    this.foodMesh.rotation.x = Math.PI / 2;
    this.foodMesh.castShadow = true;
    this.foodMesh.name = 'food';
    this.group.add(this.foodMesh);
  }

  /**
   * Cria o mesh do shield (IcosahedronGeometry — orbe semi-transparente).
   * Primitiva: IcosahedronGeometry com material translúcido.
   */
  _createShieldMesh() {
    this._clearShieldMesh();

    /* GUIA DE EDIÇÃO (SHIELD):
       - Tamanho do orb: 1.º parâmetro (0.32)
       - Nível de detalhe: 2.º parâmetro (2)
       - Transparência: opacity
       - Altura no mapa: this.shieldMesh.position.y = 0.55 */
    const geo = new THREE.IcosahedronGeometry(0.32, 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x0088ff,
      emissiveIntensity: 0.9,
      roughness: 0.05,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85,
    });
    this.shieldMesh = new THREE.Mesh(geo, mat);
    this.shieldMesh.position.y = 0.55;
    this.shieldMesh.castShadow = true;
    this.shieldMesh.name = 'shield-orb';
    this.group.add(this.shieldMesh);
  }

  /**
   * Remove e descarta o mesh da comida.
   */
  _clearFoodMesh() {
    if (this.foodMesh) {
      this.group.remove(this.foodMesh);
      if (this.foodMesh.geometry) this.foodMesh.geometry.dispose();
      if (this.foodMesh.material) this.foodMesh.material.dispose();
      this.foodMesh = null;
    }
  }

  /**
   * Remove e descarta o mesh do shield.
   */
  _clearShieldMesh() {
    if (this.shieldMesh) {
      this.group.remove(this.shieldMesh);
      if (this.shieldMesh.geometry) this.shieldMesh.geometry.dispose();
      if (this.shieldMesh.material) this.shieldMesh.material.dispose();
      this.shieldMesh = null;
    }
    this.shieldPresent = false;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     SPAWN — Posicionamento de itens no mapa
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Reposiciona a COMIDA numa posição livre do tabuleiro.
   * A comida está SEMPRE presente — é chamado ao início e quando comida.
   * @param {Array<THREE.Vector3>} occupiedSegments — segmentos da cobra
   * @param {Array<{x:number,z:number}>} [obstaclePositions] — posições de obstáculos
   */
  respawnFood(occupiedSegments, obstaclePositions = []) {
    const occupied = new Set(occupiedSegments.map(s => `${s.x},${s.z}`));
    obstaclePositions.forEach(p => occupied.add(`${p.x},${p.z}`));
    /* Evitar spawn na mesma posição do shield */
    if (this.shieldPresent) {
      occupied.add(`${this.shieldCell.x},${this.shieldCell.z}`);
    }

    const pos = randomFreePosition(occupied);
    this.foodCell.copy(pos);

    /* Garantir que o mesh da comida existe */
    if (!this.foodMesh) this._createFoodMesh();

    this.foodMesh.position.x = this.foodCell.x;
    this.foodMesh.position.z = this.foodCell.z;
  }

  /**
   * Compatibilidade — redireciona para respawnFood.
   * (mantém API antiga para não quebrar chamadas existentes)
   */
  respawn(occupiedSegments, obstaclePositions = []) {
    this.respawnFood(occupiedSegments, obstaclePositions);
  }

  /**
   * Tenta spawnar um SHIELD no mapa (chamado quando comida é comida).
   * Chance de ~15%. Se já houver um shield no mapa, não faz nada.
   * @param {Array<THREE.Vector3>} occupiedSegments — segmentos da cobra
   * @param {Array<{x:number,z:number}>} [obstaclePositions] — posições de obstáculos
   */
  trySpawnShield(occupiedSegments, obstaclePositions = []) {
    /* Se já há shield no mapa ou shield não está nos power-ups, sair */
    if (this.shieldPresent) return;
    if (!this.activePowerups.includes('shield')) return;

    /* Chance de spawn do shield:
       - 0.15 = 15%
       - para 25% usa 0.25, para 10% usa 0.10 */
    if (Math.random() > 0.15) return;

    const occupied = new Set(occupiedSegments.map(s => `${s.x},${s.z}`));
    obstaclePositions.forEach(p => occupied.add(`${p.x},${p.z}`));
    /* Evitar spawn na posição da comida */
    occupied.add(`${this.foodCell.x},${this.foodCell.z}`);

    const pos = randomFreePosition(occupied);
    this.shieldCell.copy(pos);

    this._createShieldMesh();
    this.shieldMesh.position.x = this.shieldCell.x;
    this.shieldMesh.position.z = this.shieldCell.z;
    this.shieldPresent = true;
  }

  /**
   * Remove o shield do mapa (chamado quando a cobra apanha o shield).
   */
  removeShield() {
    this._clearShieldMesh();
  }

  /**
   * Define os power-ups disponíveis para o nível actual.
   * @param {string[]} types — ex: ['shield']
   */
  setAvailablePowerups(types) {
    this.activePowerups = types || [];
  }

  /* ══════════════════════════════════════════════════════════════════════════
     DETECÇÃO DE COLISÃO — Verifica se a cobra comeu algo
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Verifica se uma posição coincide com a comida.
   * @param {THREE.Vector3} pos — posição a verificar
   * @returns {boolean}
   */
  checkFoodCollision(pos) {
    return pos.x === this.foodCell.x && pos.z === this.foodCell.z;
  }

  /**
   * Verifica se uma posição coincide com o shield.
   * @param {THREE.Vector3} pos — posição a verificar
   * @returns {boolean}
   */
  checkShieldCollision(pos) {
    if (!this.shieldPresent) return false;
    return pos.x === this.shieldCell.x && pos.z === this.shieldCell.z;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ANIMAÇÃO — Actualização por frame
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Anima comida e shield (rotação, pulso, flutuação).
   * Chamado a cada frame no game loop.
   * @param {number} elapsed — tempo total decorrido (s)
   */
  update(elapsed) {
    /* ── Animação da comida: rotação + pulso ── */
    if (this.foodMesh) {
      this.foodMesh.rotation.y += 0.04;
      this.foodMesh.rotation.x = Math.PI / 2 + Math.sin(elapsed * 2.8) * 0.18;
      this.foodMesh.scale.setScalar(1 + Math.sin(elapsed * 5.5) * 0.15);
    }

    /* ── Animação do shield: rotação lenta + flutuação ── */
    if (this.shieldMesh && this.shieldPresent) {
      this.shieldMesh.rotation.y += 0.025;
      this.shieldMesh.rotation.x += 0.015;
      this.shieldMesh.position.y = 0.55 + Math.sin(elapsed * 2) * 0.15;
      this.shieldMesh.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.1);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     PARTÍCULAS DE COLECTA — Efeito visual ao apanhar item
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Emite partículas quando um item é colectado.
   * Cada partícula é uma SphereGeometry com MeshBasicMaterial.
   * @param {THREE.Vector3} position — posição da colecta
   * @param {number} color — cor das partículas (hex)
   */
  emitCollectParticles(position, color) {
    const particleCount = 12;
    const geo = new THREE.SphereGeometry(0.06, 6, 4);

    for (let i = 0; i < particleCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: color || 0xff00ff,
        transparent: true,
        opacity: 1,
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      p.position.y = 0.55;

      /* Velocidade aleatória para cada partícula */
      p.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      );
      p.userData.life = 1.0;
      p.userData.decay = 1.5 + Math.random() * 0.5;

      this.scene.add(p);
      this.particles.push(p);
    }
  }

  /**
   * Actualiza partículas (gravidade, fade out, remoção).
   * @param {number} delta — tempo desde último frame (s)
   */
  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.life -= delta * p.userData.decay;
      p.position.addScaledVector(p.userData.velocity, delta);
      p.userData.velocity.y -= 9.8 * delta; // gravidade
      p.material.opacity = Math.max(0, p.userData.life);
      p.scale.setScalar(p.userData.life);

      if (p.userData.life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     UTILIDADES
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Devolve a célula da comida (para compatibilidade com o código antigo).
   * @returns {THREE.Vector3}
   */
  get cell() {
    return this.foodCell;
  }

  /**
   * Devolve o tipo de item actual (sempre FOOD agora, shield é separado).
   * @returns {string}
   */
  get type() {
    return ITEM_TYPES.FOOD;
  }

  /**
   * Devolve cor de partículas para comida.
   * @returns {number}
   */
  getCollectColor() {
    return FOOD_COLORS.COLLECT;
  }

  /**
   * Devolve cor de partículas para shield.
   * @returns {number}
   */
  getShieldCollectColor() {
    return FOOD_COLORS.SHIELD_COLLECT;
  }
}

export { ITEM_TYPES };
