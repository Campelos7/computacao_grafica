/* ==========================================================================
   Obstacles.js — Obstáculos Dinâmicos
   Requisito: MovingWall oscila com Math.sin(tempo). DisappearingBlock
   alterna visibilidade a cada N segundos com fade de opacidade.
   Deteção de colisão, texturas pixel-art, sombras.
   ========================================================================== */
import * as THREE from 'three';
import { createCanvasTexture } from './utils/helpers.js';

/* ── Textura pixel-art para obstáculos ── */
function createObstacleTexture() {
  return createCanvasTexture(64, (ctx, size) => {
    // Fundo escuro
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, 0, size, size);

    // Padrão de tijolo pixel-art
    const brick = 8;
    for (let y = 0; y < size; y += brick) {
      const off = (Math.floor(y / brick) % 2) * (brick / 2);
      for (let x = -brick + off; x < size; x += brick * 2) {
        ctx.fillStyle = 'rgba(255, 0, 255, 0.15)';
        ctx.fillRect(x, y, brick * 2 - 1, brick - 1);
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
        ctx.strokeRect(x, y, brick * 2 - 1, brick - 1);
      }
    }
  }, { repeat: [2, 2], pixelArt: true });
}

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

    this.obstacles = []; // { mesh, type, config, basePos }
    this.obstacleTexture = createObstacleTexture();
  }

  /**
   * Gera obstáculos a partir do config de nível.
   * Requisito: Integrar deteção de colisão, texturas pixel-art, sombras.
   * @param {Array} configs — array de objectos do levelConfig
   */
  generate(configs) {
    this.clear();

    for (const cfg of configs) {
      switch (cfg.type) {
        case 'movingWall':
          this._addMovingWall(cfg);
          break;
        case 'disappearingBlock':
          this._addDisappearingBlock(cfg);
          break;
      }
    }
  }

  /* ── MovingWall ── */
  _addMovingWall(cfg) {
    // Requisito: Oscila ao longo do eixo X/Z usando Math.sin(tempo)
    const geo = new THREE.BoxGeometry(1.8, 1.2, 0.6);
    const mat = new THREE.MeshStandardMaterial({
      map: this.obstacleTexture,
      color: 0xff00ff,
      emissive: 0x660066,
      emissiveIntensity: 0.5,
      roughness: 0.6,
      metalness: 0.2,
      bumpMap: this.obstacleTexture,
      bumpScale: 0.04,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cfg.position[0], 0.6, cfg.position[1]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'moving-wall';

    // Linha brilhante superior
    const edgeGeo = new THREE.BoxGeometry(1.82, 0.05, 0.62);
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
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
      basePos: new THREE.Vector3(cfg.position[0], 0.6, cfg.position[1]),
    });
  }

  /* ── DisappearingBlock ── */
  _addDisappearingBlock(cfg) {
    // Requisito: Alterna visibilidade a cada N segundos com fade de opacidade
    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const mat = new THREE.MeshStandardMaterial({
      map: this.obstacleTexture,
      color: 0x00ffff,
      emissive: 0x004466,
      emissiveIntensity: 0.6,
      roughness: 0.5,
      metalness: 0.15,
      transparent: true,
      opacity: 1,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cfg.position[0], 0.45, cfg.position[1]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'disappearing-block';

    this.group.add(mesh);
    this.obstacles.push({
      mesh,
      type: 'disappearingBlock',
      interval: cfg.interval || 5,
      basePos: new THREE.Vector3(cfg.position[0], 0.45, cfg.position[1]),
      _visible: true,
    });
  }

  /**
   * Actualiza todos os obstáculos.
   * @param {number} elapsed — tempo total decorrido (s)
   * @param {number} delta — tempo desde último frame (s)
   */
  update(elapsed, delta) {
    for (const obs of this.obstacles) {
      if (obs.type === 'movingWall') {
        // Requisito: Math.sin(tempo) para oscilar
        const offset = Math.sin(elapsed * obs.speed) * obs.range;
        if (obs.axis === 'x') {
          obs.mesh.position.x = obs.basePos.x + offset;
        } else {
          obs.mesh.position.z = obs.basePos.z + offset;
        }
        // Glow do bordo superior
        if (obs.mesh.children[0] && obs.mesh.children[0].material) {
          obs.mesh.children[0].material.opacity = 0.5 + Math.abs(Math.sin(elapsed * 3)) * 0.5;
        }
      }

      if (obs.type === 'disappearingBlock') {
        // Ciclo: visível -> fade out -> invisível -> fade in -> visível ...
        const cycle = elapsed % (obs.interval * 2);
        const halfInterval = obs.interval;

        if (cycle < halfInterval) {
          // Visível com possível fade in
          const fadeIn = Math.min(cycle / 0.5, 1);
          obs.mesh.material.opacity = fadeIn;
          obs.mesh.visible = true;
          obs._visible = true;
        } else {
          // Fade out e invisível
          const fadeOut = Math.max(0, 1 - (cycle - halfInterval) / 0.5);
          obs.mesh.material.opacity = fadeOut;
          obs._visible = fadeOut > 0.3;
          obs.mesh.visible = fadeOut > 0.01;
        }

        // Rotação lenta quando visível
        if (obs.mesh.visible) {
          obs.mesh.rotation.y += 0.005;
        }
      }
    }
  }

  /**
   * Verifica colisão com um ponto (posição da cabeça da cobra).
   * @param {THREE.Vector3} position
   * @returns {boolean}
   */
  checkCollision(position) {
    for (const obs of this.obstacles) {
      if (obs.type === 'movingWall') {
        // Verificar se a posição está dentro da bounding box da parede
        const wx = obs.mesh.position.x;
        const wz = obs.mesh.position.z;
        if (Math.abs(position.x - wx) < 1.0 && Math.abs(position.z - wz) < 0.4) {
          return true;
        }
      }
      if (obs.type === 'disappearingBlock' && obs._visible) {
        const bx = obs.mesh.position.x;
        const bz = obs.mesh.position.z;
        if (Math.abs(position.x - bx) < 0.5 && Math.abs(position.z - bz) < 0.5) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Devolve posições de todos os obstáculos visíveis (para evitar spawnar comida lá).
   * @returns {Array<{x:number, z:number}>}
   */
  getOccupiedPositions() {
    const positions = [];
    for (const obs of this.obstacles) {
      const p = obs.mesh.position;
      positions.push({ x: Math.round(p.x), z: Math.round(p.z) });
      // Para moving walls, incluir um range extra
      if (obs.type === 'movingWall') {
        for (let i = -obs.range; i <= obs.range; i++) {
          if (obs.axis === 'x') {
            positions.push({ x: Math.round(obs.basePos.x + i), z: Math.round(obs.basePos.z) });
          } else {
            positions.push({ x: Math.round(obs.basePos.x), z: Math.round(obs.basePos.z + i) });
          }
        }
      }
    }
    return positions;
  }

  /**
   * Limpa todos os obstáculos (para mudança de nível).
   * Requisito: Prevenir memory leaks ao descartar geometrias/materiais.
   */
  clear() {
    for (const obs of this.obstacles) {
      this.group.remove(obs.mesh);
      if (obs.mesh.geometry) obs.mesh.geometry.dispose();
      if (obs.mesh.material) obs.mesh.material.dispose();
      // Filhos (glow edges)
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
