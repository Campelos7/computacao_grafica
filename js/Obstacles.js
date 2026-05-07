/* ==========================================================================
   Obstacles.js — Obstáculos Dinâmicos Temáticos por Bioma
   Requisito: MovingWall oscila com Math.sin(tempo). DisappearingBlock
   alterna visibilidade a cada N segundos com fade de opacidade.
   Deteção de colisão, texturas, sombras.
   Obstáculos adaptam-se visualmente ao bioma (floresta/deserto/neve).
   ========================================================================== */
import * as THREE from 'three';
import { createCanvasTexture, gridToWorldX, gridToWorldZ } from './utils/helpers.js';

/* ── Texturas por bioma ── */

function createObstacleTexture(biome) {
  const biomeConfig = {
    forest: {
      bg: '#1a2a15', brickColor: 'rgba(34, 170, 68, 0.15)',
      strokeColor: 'rgba(34, 204, 68, 0.3)',
    },
    desert: {
      bg: '#2a1a0a', brickColor: 'rgba(204, 102, 17, 0.15)',
      strokeColor: 'rgba(255, 136, 51, 0.3)',
    },
    snow: {
      bg: '#1a2535', brickColor: 'rgba(68, 136, 204, 0.15)',
      strokeColor: 'rgba(136, 204, 255, 0.3)',
    },
  };
  const cfg = biomeConfig[biome] || biomeConfig.forest;

  return createCanvasTexture(64, (ctx, size) => {
    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, size, size);

    const brick = 8;
    for (let y = 0; y < size; y += brick) {
      const off = (Math.floor(y / brick) % 2) * (brick / 2);
      for (let x = -brick + off; x < size; x += brick * 2) {
        ctx.fillStyle = cfg.brickColor;
        ctx.fillRect(x, y, brick * 2 - 1, brick - 1);
        ctx.strokeStyle = cfg.strokeColor;
        ctx.strokeRect(x, y, brick * 2 - 1, brick - 1);
      }
    }
  }, { repeat: [2, 2], pixelArt: true });
}

/* ── Cores por bioma para obstáculos ── */
const BIOME_OBSTACLE_COLORS = {
  forest: {
    wallColor: 0x226633, wallEmissive: 0x115522, wallEmissiveIntensity: 0.4,
    wallEdge: 0x22cc44,
    blockColor: 0x44aa44, blockEmissive: 0x115522, blockEmissiveIntensity: 0.5,
  },
  desert: {
    wallColor: 0x8b6b3e, wallEmissive: 0x553311, wallEmissiveIntensity: 0.35,
    wallEdge: 0xcc6611,
    blockColor: 0xcc8833, blockEmissive: 0x664411, blockEmissiveIntensity: 0.45,
  },
  snow: {
    wallColor: 0x6688aa, wallEmissive: 0x224466, wallEmissiveIntensity: 0.45,
    wallEdge: 0x4488cc,
    blockColor: 0x88bbdd, blockEmissive: 0x336699, blockEmissiveIntensity: 0.5,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
export class Obstacles {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'obstacles';
    this.scene.add(this.group);

    this.obstacles = [];
    this.currentBiome = 'forest';
    this.obstacleTexture = null;
    /** Multiplicador global (dificuldade) sobre velocidades de animação. */
    this.difficultyMult = 1;
  }

  /**
   * Afecta moving walls (sin) e ritmo dos blocos que desaparecem.
   * @param {number} mult — típico 0.6–1.5
   */
  setDifficultyMultiplier(mult) {
    this.difficultyMult = Math.max(0.25, mult);
  }

  /**
   * Gera obstáculos a partir do config de nível.
   * @param {Array} configs — array de objectos do levelConfig
   * @param {string} biome — bioma actual (forest/desert/snow)
   */
  generate(configs, biome = 'forest') {
    this.clear();
    this.currentBiome = biome;
    this.obstacleTexture = createObstacleTexture(biome);

    for (const cfg of configs) {
      switch (cfg.type) {
        case 'movingWall':
          this._addMovingWall(cfg);
          break;
        case 'disappearingBlock':
          this._addDisappearingBlock(cfg);
          break;
        case 'staticBlock':
          this._addStaticBlock(cfg);
          break;
      }
    }
  }

  /* ── MovingWall ── */
  _addMovingWall(cfg) {
    const colors = BIOME_OBSTACLE_COLORS[this.currentBiome] || BIOME_OBSTACLE_COLORS.forest;

    const geo = new THREE.BoxGeometry(1.8, 1.2, 0.6);
    const mat = new THREE.MeshStandardMaterial({
      map: this.obstacleTexture,
      color: colors.wallColor,
      emissive: colors.wallEmissive,
      emissiveIntensity: colors.wallEmissiveIntensity,
      roughness: 0.6,
      metalness: 0.2,
      bumpMap: this.obstacleTexture,
      bumpScale: 0.04,
    });

    const mesh = new THREE.Mesh(geo, mat);
    const wx = gridToWorldX(cfg.position[0]);
    const wz = gridToWorldZ(cfg.position[1]);
    mesh.position.set(wx, 0.6, wz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'moving-wall';

    // Linha brilhante superior
    const edgeGeo = new THREE.BoxGeometry(1.82, 0.05, 0.62);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: colors.wallEdge,
      transparent: true,
      opacity: 0.7,
    });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.y = 0.6;
    mesh.add(edge);

    this.group.add(mesh);
    this.obstacles.push({
      mesh,
      type: 'movingWall',
      axis: cfg.axis || 'x',
      range: cfg.range || 4,
      speed: cfg.speed || 1.5,
      basePos: new THREE.Vector3(wx, 0.6, wz),
      gridX: cfg.position[0],
      gridZ: cfg.position[1],
    });
  }

  /* ── DisappearingBlock ── */
  _addDisappearingBlock(cfg) {
    const colors = BIOME_OBSTACLE_COLORS[this.currentBiome] || BIOME_OBSTACLE_COLORS.forest;

    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const mat = new THREE.MeshStandardMaterial({
      map: this.obstacleTexture,
      color: colors.blockColor,
      emissive: colors.blockEmissive,
      emissiveIntensity: colors.blockEmissiveIntensity,
      roughness: 0.5,
      metalness: 0.15,
      transparent: true,
      opacity: 1,
    });

    const mesh = new THREE.Mesh(geo, mat);
    const wx = gridToWorldX(cfg.position[0]);
    const wz = gridToWorldZ(cfg.position[1]);
    mesh.position.set(wx, 0.45, wz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'disappearing-block';

    this.group.add(mesh);
    this.obstacles.push({
      mesh,
      type: 'disappearingBlock',
      interval: cfg.interval || 5,
      basePos: new THREE.Vector3(wx, 0.45, wz),
      gridX: cfg.position[0],
      gridZ: cfg.position[1],
      _visible: true,
    });
  }

  /**
   * Bloco ou parede fixa (modo NORMAL: substitui móveis / a piscar).
   * @param {{ position: number[], shape?: 'wall'|'cube', axis?: string, range?: number }} cfg
   */
  _addStaticBlock(cfg) {
    const colors = BIOME_OBSTACLE_COLORS[this.currentBiome] || BIOME_OBSTACLE_COLORS.forest;
    const shape = cfg.shape === 'wall' ? 'wall' : 'cube';
    const wx = gridToWorldX(cfg.position[0]);
    const wz = gridToWorldZ(cfg.position[1]);

    if (shape === 'wall') {
      const geo = new THREE.BoxGeometry(1.8, 1.2, 0.6);
      const mat = new THREE.MeshStandardMaterial({
        map: this.obstacleTexture,
        color: colors.wallColor,
        emissive: colors.wallEmissive,
        emissiveIntensity: colors.wallEmissiveIntensity * 0.85,
        roughness: 0.65,
        metalness: 0.2,
        bumpMap: this.obstacleTexture,
        bumpScale: 0.04,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(wx, 0.6, wz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = 'static-wall';

      const edgeGeo = new THREE.BoxGeometry(1.82, 0.05, 0.62);
      const edgeMat = new THREE.MeshBasicMaterial({
        color: colors.wallEdge,
        transparent: true,
        opacity: 0.55,
      });
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.y = 0.6;
      mesh.add(edge);

      this.group.add(mesh);
      this.obstacles.push({
        mesh,
        type: 'staticBlock',
        shape: 'wall',
        axis: cfg.axis || 'x',
        range: cfg.range ?? 4,
        gridX: cfg.position[0],
        gridZ: cfg.position[1],
      });
      return;
    }

    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const mat = new THREE.MeshStandardMaterial({
      map: this.obstacleTexture,
      color: colors.blockColor,
      emissive: colors.blockEmissive,
      emissiveIntensity: colors.blockEmissiveIntensity * 0.9,
      roughness: 0.5,
      metalness: 0.15,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(wx, 0.45, wz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'static-block';
    this.group.add(mesh);
    this.obstacles.push({
      mesh,
      type: 'staticBlock',
      shape: 'cube',
      gridX: cfg.position[0],
      gridZ: cfg.position[1],
    });
  }

  /**
   * Actualiza todos os obstáculos.
   */
  update(elapsed, delta) {
    const dm = this.difficultyMult;
    const tObs = elapsed * dm;
    for (const obs of this.obstacles) {
      if (obs.type === 'staticBlock') continue;

      if (obs.type === 'movingWall') {
        const offset = Math.sin(tObs * obs.speed) * obs.range;
        if (obs.axis === 'x') {
          obs.mesh.position.x = obs.basePos.x + offset;
        } else {
          obs.mesh.position.z = obs.basePos.z + offset;
        }
        if (obs.mesh.children[0] && obs.mesh.children[0].material) {
          obs.mesh.children[0].material.opacity = 0.5 + Math.abs(Math.sin(tObs * 3)) * 0.5;
        }
      }

      if (obs.type === 'disappearingBlock') {
        const cycle = tObs % (obs.interval * 2);
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
   * Verifica colisão com um ponto.
   */
  checkCollision(position) {
    const hx = gridToWorldX(position.x);
    const hz = gridToWorldZ(position.z);
    for (const obs of this.obstacles) {
      if (obs.type === 'movingWall') {
        const wx = obs.mesh.position.x;
        const wz = obs.mesh.position.z;
        if (Math.abs(hx - wx) < 1.0 && Math.abs(hz - wz) < 0.4) {
          return true;
        }
      }
      if (obs.type === 'staticBlock') {
        if (obs.shape === 'wall') {
          const wx = obs.mesh.position.x;
          const wz = obs.mesh.position.z;
          if (Math.abs(hx - wx) < 1.0 && Math.abs(hz - wz) < 0.4) return true;
        } else {
          const bx = obs.mesh.position.x;
          const bz = obs.mesh.position.z;
          if (Math.abs(hx - bx) < 0.5 && Math.abs(hz - bz) < 0.5) return true;
        }
      }
      if (obs.type === 'disappearingBlock' && obs._visible) {
        const bx = obs.mesh.position.x;
        const bz = obs.mesh.position.z;
        if (Math.abs(hx - bx) < 0.5 && Math.abs(hz - bz) < 0.5) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Devolve posições de todos os obstáculos visíveis.
   */
  getOccupiedPositions() {
    const positions = [];
    for (const obs of this.obstacles) {
      positions.push({ x: obs.gridX, z: obs.gridZ });
      if (obs.type === 'movingWall') {
        for (let i = -obs.range; i <= obs.range; i++) {
          if (obs.axis === 'x') {
            positions.push({ x: obs.gridX + i, z: obs.gridZ });
          } else {
            positions.push({ x: obs.gridX, z: obs.gridZ + i });
          }
        }
      }
      if (obs.type === 'staticBlock' && obs.shape === 'wall') {
        for (let i = -obs.range; i <= obs.range; i++) {
          if (obs.axis === 'x') {
            positions.push({ x: obs.gridX + i, z: obs.gridZ });
          } else {
            positions.push({ x: obs.gridX, z: obs.gridZ + i });
          }
        }
      }
    }
    return positions;
  }

  /**
   * Limpa todos os obstáculos (para mudança de nível).
   */
  clear() {
    for (const obs of this.obstacles) {
      this.group.remove(obs.mesh);
      if (obs.mesh.geometry) obs.mesh.geometry.dispose();
      if (obs.mesh.material) obs.mesh.material.dispose();
      while (obs.mesh.children.length > 0) {
        const child = obs.mesh.children[0];
        obs.mesh.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    }
    this.obstacles = [];
  }
}
