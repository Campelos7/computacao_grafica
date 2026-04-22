/* ==========================================================================
   Food.js — Comida e Power-ups 3D
   Requisito: Comida com animação de pulso/rotação.
   Power-ups: Velocidade (estrela dourada), Escudo (esfera), Portal (anéis).
   Cada power-up com material animado, partículas ao colectar, notificação UI.
   ========================================================================== */
import * as THREE from 'three';
import { HALF_BOARD, randomInt, randomFreePosition, PALETTE } from './utils/helpers.js';

/* ── Tipos de item ── */
const ITEM_TYPES = {
  FOOD:   'food',
  SHIELD: 'shield',
  PORTAL: 'portal',
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

    // Power-up state
    this.activePowerups = []; // tipos disponíveis no nível actual

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

  _createPortal() {
    this._clearMesh();

    // Requisito: Dois anéis animados com shader de distorção
    const ringGeo = new THREE.TorusGeometry(0.35, 0.06, 12, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xaa00ff,
      emissive: 0x8800ff,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.4,
      transparent: true,
      opacity: 0.9,
    });

    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
    ring1.rotation.x = Math.PI / 2;
    ring2.rotation.z = Math.PI / 2;

    this.mesh = new THREE.Group();
    this.mesh.add(ring1, ring2);
    this.mesh.position.y = 0.55;
    this.mesh.name = 'portal';
    this.currentType = ITEM_TYPES.PORTAL;
    this.group.add(this.mesh);
  }

  _clearMesh() {
    if (this.mesh) {
      this.group.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) {
        if (this.mesh.material.dispose) this.mesh.material.dispose();
      }
      // Se é um Group (portal), limpar filhos
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
   * Gera comida/power-up numa posição livre.
   * @param {Array<THREE.Vector3>} occupiedSegments — segmentos da cobra
   * @param {Array<{x:number,z:number}>} [obstaclePositions] — posições de obstáculos
   */
  respawn(occupiedSegments, obstaclePositions = []) {
    const occupied = new Set(occupiedSegments.map(s => `${s.x},${s.z}`));
    obstaclePositions.forEach(p => occupied.add(`${p.x},${p.z}`));

    const pos = randomFreePosition(occupied);
    this.cell.copy(pos);

    // Decidir tipo: 75% food, 25% power-up (se disponíveis)
    const roll = Math.random();
    if (roll < 0.75 || this.activePowerups.length === 0) {
      this._createFoodMesh();
    } else {
      const pType = this.activePowerups[Math.floor(Math.random() * this.activePowerups.length)];
      switch (pType) {
        case 'shield': this._createShieldOrb(); break;
        case 'portal': this._createPortal(); break;
        default:       this._createFoodMesh();
      }
    }

    if (this.mesh) {
      if (this.mesh.position) {
        this.mesh.position.x = this.cell.x;
        this.mesh.position.z = this.cell.z;
      }
    }
  }

  /**
   * Define os power-ups disponíveis para o nível actual.
   * @param {string[]} types — ex: ['speed', 'shield']
   */
  setAvailablePowerups(types) {
    this.activePowerups = types || [];
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

      case ITEM_TYPES.PORTAL:
        // Anéis: rotação em eixos diferentes
        if (this.mesh.children[0]) this.mesh.children[0].rotation.z += 0.05;
        if (this.mesh.children[1]) this.mesh.children[1].rotation.x += 0.04;
        this.mesh.position.y = 0.55 + Math.sin(elapsed * 1.5) * 0.1;
        this.mesh.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.12);
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
      p.position.copy(position);
      p.position.y = 0.55;

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
      p.position.add(p.userData.velocity.clone().multiplyScalar(delta));
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
      case ITEM_TYPES.PORTAL: return 0xaa00ff;
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
