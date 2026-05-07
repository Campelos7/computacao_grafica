/* ==========================================================================
   Food.js — Comida e Power-ups 3D
   Requisito: Comida com animação de pulso/rotação.
   Power-up: Escudo (esfera).
   Cada power-up com material animado, partículas ao colectar, notificação UI.
   ========================================================================== */
import * as THREE from 'three';
import { randomFreePosition, gridToWorldX, gridToWorldZ } from './utils/helpers.js';

/* ── Tipos de item ── */
const ITEM_TYPES = {
  FOOD:   'food',
  SHIELD: 'shield',
};

/* ═══════════════════════════════════════════════════════════════════════════ */
export class Food {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'food-group';
    this.scene.add(this.group);

    this.cell = new THREE.Vector3(0, 0, 0);
    this.currentType = ITEM_TYPES.FOOD;
    this.mesh = null;

    // Partículas
    this.particles = [];

    this._createFoodMesh();
  }

  /* ── Criação dos diferentes tipos ── */

  _createFoodMesh() {
    this._clearMesh();

    // Requisito: TorusGeometry para a comida, animação pulso/rotação
    const geo = new THREE.TorusGeometry(0.3, 0.14, 16, 28);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.5,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = 0.55;
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.castShadow = true;
    this.mesh.name = 'food';
    this.currentType = ITEM_TYPES.FOOD;
    this.group.add(this.mesh);
  }



  _createShieldOrb() {
    this._clearMesh();

    // Requisito: Esfera para power-up de escudo
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
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = 0.55;
    this.mesh.castShadow = true;
    this.mesh.name = 'shield-orb';
    this.currentType = ITEM_TYPES.SHIELD;
    this.group.add(this.mesh);
  }

  _clearMesh() {
    if (this.mesh) {
      this.group.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) {
        if (this.mesh.material.dispose) this.mesh.material.dispose();
      }
      if (this.mesh.children) {
        this.mesh.children.forEach(c => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) c.material.dispose();
        });
      }
      this.mesh = null;
    }
  }

  /* ── Spawn ── */

  /**
   * Gera comida ou escudo numa posição livre.
   * @param {Array<THREE.Vector3>} occupiedSegments — segmentos da cobra
   * @param {Array<{x:number,z:number}>} [obstaclePositions] — posições de obstáculos
   * @param {{ forceShield?: boolean }} [options] — se true, spawna escudo (o jogo decide pela dificuldade)
   */
  respawn(occupiedSegments, obstaclePositions = [], options = {}) {
    const { forceShield = false } = options;
    const occupied = new Set(occupiedSegments.map(s => `${s.x},${s.z}`));
    obstaclePositions.forEach(p => occupied.add(`${p.x},${p.z}`));

    const pos = randomFreePosition(occupied);
    this.cell.copy(pos);

    if (forceShield) {
      this._createShieldOrb();
    } else {
      this._createFoodMesh();
    }

    if (this.mesh?.position) {
      this.mesh.position.x = gridToWorldX(this.cell.x);
      this.mesh.position.z = gridToWorldZ(this.cell.z);
    }
  }

  /* ── Animação ── */

  /**
   * Requisito: Animação de pulso/rotação da comida.
   * @param {number} elapsed — tempo total decorrido
   */
  update(elapsed) {
    if (!this.mesh) return;

    switch (this.currentType) {
      case ITEM_TYPES.FOOD:
        // Rotação + pulso
        this.mesh.rotation.y += 0.04;
        this.mesh.rotation.x = Math.PI / 2 + Math.sin(elapsed * 2.8) * 0.18;
        this.mesh.scale.setScalar(1 + Math.sin(elapsed * 5.5) * 0.15);
        break;


      case ITEM_TYPES.SHIELD:
        // Orbe: rotação lenta + flutuação
        this.mesh.rotation.y += 0.025;
        this.mesh.rotation.x += 0.015;
        this.mesh.position.y = 0.55 + Math.sin(elapsed * 2) * 0.15;
        this.mesh.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.1);
        break;

    }
  }

  /* ── Partículas de colecta ── */

  /**
   * Emite partículas quando um item é colectado.
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
      p.position.set(gridToWorldX(position.x), 0.55, gridToWorldZ(position.z));

      // Velocidade aleatória
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
   * Actualiza partículas (gravidade, fade, remoção).
   * @param {number} delta — tempo desde último frame (s)
   */
  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.life -= delta * p.userData.decay;
      // Evitar alocação por frame (clone)
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

  /**
   * Devolve a cor de partículas para o tipo actual.
   */
  getCollectColor() {
    switch (this.currentType) {
      case ITEM_TYPES.SHIELD: return 0x00ffff;
      default:                return 0xff00ff;
    }
  }

  /**
   * Devolve o tipo de item actual.
   */
  get type() {
    return this.currentType;
  }
}

export { ITEM_TYPES };
