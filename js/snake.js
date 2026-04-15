/* ==========================================================================
   Snake.js — Cobra 3D com estética neon retro
   Requisito: Usar primitivas Three.js (BoxGeometry, SphereGeometry) para
   construir a cobra. Aplicar materiais nativos (MeshStandardMaterial)
   + texturas. Movimento suave com interpolação (lerp).
   ========================================================================== */
import * as THREE from 'three';
import { BOARD_SIZE, HALF_BOARD, DIRS, createCanvasTexture } from './utils/helpers.js';

/* ── Textura pixel-art neon para a pele da cobra ── */
function createNeonSkinTexture() {
  return createCanvasTexture(128, (ctx, size) => {
    // Fundo escuro com gradiente neon
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#1a0033');
    grad.addColorStop(0.5, '#0d0026');
    grad.addColorStop(1, '#1a0033');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Padrão de escamas pixel-art
    const ps = 8; // pixel size
    for (let y = 0; y < size; y += ps) {
      const offset = (Math.floor(y / ps) % 2) * (ps / 2);
      for (let x = -ps + offset; x < size; x += ps) {
        // Escama com borda neon
        ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
        ctx.fillRect(x, y, ps - 1, ps - 1);
        ctx.fillStyle = 'rgba(255, 0, 255, 0.05)';
        ctx.fillRect(x + 1, y + 1, ps - 3, ps - 3);
      }
    }

    // Linhas neon horizontais subtis
    for (let y = 0; y < size; y += ps * 4) {
      ctx.fillStyle = 'rgba(0, 255, 255, 0.12)';
      ctx.fillRect(0, y, size, 1);
    }
  }, { repeat: [3, 3], pixelArt: true });
}

/* ── Detalhes da cabeça (olhos, língua) ── */
function attachHeadDetails(headMesh) {
  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8,
    roughness: 0.2, metalness: 0.1,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1.0,
    roughness: 0.3, metalness: 0,
  });
  const tongueMat = new THREE.MeshStandardMaterial({
    color: 0xff0066, emissive: 0xff0033, emissiveIntensity: 0.5,
    roughness: 0.5, metalness: 0,
  });

  // Olhos — SphereGeometry (primitiva obrigatória)
  const eyeGeo   = new THREE.SphereGeometry(0.09, 10, 8);
  const pupilGeo = new THREE.SphereGeometry(0.045, 8, 6);

  const eyeL = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  eyeL.position.set(-0.18, 0.12, -0.36);
  eyeR.position.set(0.18, 0.12, -0.36);

  const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
  const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
  pupilL.position.set(0, 0, -0.07);
  pupilR.position.set(0, 0, -0.07);
  eyeL.add(pupilL);
  eyeR.add(pupilR);

  // Língua — BoxGeometry (primitiva obrigatória)
  const tongueGeo = new THREE.BoxGeometry(0.05, 0.01, 0.28);
  const forkGeo   = new THREE.BoxGeometry(0.02, 0.008, 0.1);

  const tongue = new THREE.Mesh(tongueGeo, tongueMat);
  tongue.position.set(0, -0.04, -0.5);

  const forkL = new THREE.Mesh(forkGeo, tongueMat);
  const forkR = new THREE.Mesh(forkGeo, tongueMat);
  forkL.position.set(-0.018, 0, -0.16);
  forkR.position.set(0.018, 0, -0.16);
  forkL.rotation.y = -0.35;
  forkR.rotation.y = 0.35;
  tongue.add(forkL, forkR);

  headMesh.add(eyeL, eyeR, tongue);
  headMesh.userData.tongue = tongue;
}

/* ── Skins da cobra ── */
export const SNAKE_SKINS = [
  {
    id: 'neon-purple',
    name: 'Neon Purple',
    headColor: 0x8844ff,
    bodyColor: 0x6633cc,
    headEmissive: 0x6600cc,
    bodyEmissive: 0x4400aa,
    eyeColor: 0x00ffff,
    tongueColor: 0xff0066,
  },
  {
    id: 'cyber-green',
    name: 'Cyber Green',
    headColor: 0x00ff88,
    bodyColor: 0x00cc66,
    headEmissive: 0x00aa44,
    bodyEmissive: 0x008833,
    eyeColor: 0xffff00,
    tongueColor: 0xff4400,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export class Snake {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'snake';
    this.scene.add(this.group);

    // Geometrias — Requisito: usar primitivas Three.js
    this.headGeometry = new THREE.SphereGeometry(0.46, 20, 16);
    this.bodyGeometry = new THREE.BoxGeometry(0.7, 0.55, 0.78, 1, 1, 1);

    // Textura neon pixel-art
    this.skinTexture = createNeonSkinTexture();

    // Skin actual
    this.currentSkinIndex = 0;

    // Materiais — Requisito: MeshStandardMaterial + texturas
    this.headMaterial = new THREE.MeshStandardMaterial({
      map: this.skinTexture,
      color: 0x8844ff,
      emissive: 0x6600cc,
      emissiveIntensity: 0.4,
      roughness: 0.6,
      metalness: 0.15,
      bumpMap: this.skinTexture,
      bumpScale: 0.06,
    });

    this.bodyMaterial = new THREE.MeshStandardMaterial({
      map: this.skinTexture,
      color: 0x6633cc,
      emissive: 0x4400aa,
      emissiveIntensity: 0.3,
      roughness: 0.65,
      metalness: 0.1,
      bumpMap: this.skinTexture,
      bumpScale: 0.04,
    });

    // Estado do escudo (power-up)
    this.shieldActive = false;
    this.shieldMesh = null;

    // Velocidade boost (power-up)
    this.speedMultiplier = 1;
    this.speedTimer = 0;

    this.reset();
  }

  /**
   * Aplica uma skin à cobra.
   * @param {number} skinIndex — índice da skin em SNAKE_SKINS
   */
  setSkin(skinIndex) {
    const skin = SNAKE_SKINS[skinIndex];
    if (!skin) return;
    this.currentSkinIndex = skinIndex;

    this.headMaterial.color.set(skin.headColor);
    this.headMaterial.emissive.set(skin.headEmissive);
    this.bodyMaterial.color.set(skin.bodyColor);
    this.bodyMaterial.emissive.set(skin.bodyEmissive);

    // Actualizar olhos
    this.group.traverse(child => {
      if (child.isMesh && child.material && child.material.emissive) {
        // Olhos (spheres pequenas nos filhos da cabeça)
        if (child.geometry && child.geometry.parameters && child.geometry.parameters.radius === 0.09) {
          child.material.color.set(skin.eyeColor);
          child.material.emissive.set(skin.eyeColor);
        }
      }
    });
  }

  reset() {
    this.direction = DIRS.right.clone();
    this.directionQueue = [];
    this.segments = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(-2, 0, 0),
    ];
    this.previousSegments = this.segments.map(s => s.clone());
    this.growPending = 0;
    this.dead = false;
    this.shieldActive = false;
    this.speedMultiplier = 1;
    this.speedTimer = 0;
    this._removeShieldVisual();
    this.syncMeshCount();
    this.render(1);
  }

  /* ── Direcção ── */
  setDirection(nextDir) {
    if (this.dead) return;
    const last = this.directionQueue.length > 0
      ? this.directionQueue[this.directionQueue.length - 1]
      : this.direction;
    if (nextDir.equals(last)) return;
    if (nextDir.dot(last) === -1) return;
    if (this.directionQueue.length < 2) {
      this.directionQueue.push(nextDir.clone());
    }
  }

  getNextReferenceDirection() {
    return this.directionQueue.length > 0
      ? this.directionQueue[this.directionQueue.length - 1]
      : this.direction;
  }

  turnLeft() {
    const ref = this.getNextReferenceDirection();
    this.setDirection(new THREE.Vector3(ref.z, 0, -ref.x));
  }

  turnRight() {
    const ref = this.getNextReferenceDirection();
    this.setDirection(new THREE.Vector3(-ref.z, 0, ref.x));
  }

  /* ── Lógica de passo ── */
  /**
   * Actualiza um passo lógico.
   * @param {THREE.Vector3} foodCell — posição da comida
   * @param {Function} checkObstacleCollision — (pos) => boolean
   * @returns {{ dead: boolean, ate: boolean }}
   */
  updateStep(foodCell, checkObstacleCollision) {
    if (this.dead) return { dead: true, ate: false };

    this.copyCurrentToPrevious();

    if (this.directionQueue.length > 0) {
      this.direction.copy(this.directionQueue.shift());
    }

    const newHead = this.segments[0].clone().add(this.direction);
    const ate = newHead.equals(foodCell);

    this.segments.unshift(newHead);

    if (ate) {
      this.growPending += 1;
    }
    if (this.growPending > 0) {
      this.growPending -= 1;
    } else {
      this.segments.pop();
    }

    // Verificar colisões
    const hitWall = this.isOutOfBounds(newHead);
    const hitSelf = this.hitsSelf();
    const hitObstacle = checkObstacleCollision ? checkObstacleCollision(newHead) : false;

    const collision = hitWall || hitSelf || hitObstacle;

    if (collision) {
      // Requisito: Escudo absorve 1 colisão
      if (this.shieldActive) {
        this.shieldActive = false;
        this._removeShieldVisual();
        // Se bateu na parede, recuar
        if (hitWall) {
          this.segments.shift();
          this.segments.unshift(this.previousSegments[0].clone());
        }
      } else {
        this.dead = true;
      }
    }

    this.syncMeshCount();
    return { dead: this.dead, ate };
  }

  copyCurrentToPrevious() {
    while (this.previousSegments.length < this.segments.length) {
      this.previousSegments.push(new THREE.Vector3());
    }
    for (let i = 0; i < this.segments.length; i++) {
      this.previousSegments[i].copy(this.segments[i]);
    }
    this.previousSegments.length = this.segments.length;
  }

  isOutOfBounds(pos) {
    return (pos.x < -HALF_BOARD || pos.x > HALF_BOARD - 1 ||
            pos.z < -HALF_BOARD || pos.z > HALF_BOARD - 1);
  }

  hitsSelf() {
    const head = this.segments[0];
    for (let i = 1; i < this.segments.length; i++) {
      if (head.equals(this.segments[i])) return true;
    }
    return false;
  }

  /* ── Renderização com interpolação ── */
  /**
   * Requisito: Movimento suave com interpolação (lerp).
   * @param {number} alpha — factor de interpolação [0, 1]
   */
  render(alpha) {
    const now = performance.now();
    for (let i = 0; i < this.segments.length; i++) {
      const target = this.segments[i];
      const prev = this.previousSegments[i] || target;
      const mesh = this.group.children[i];
      if (!mesh) continue;

      mesh.position.set(
        THREE.MathUtils.lerp(prev.x, target.x, alpha),
        0.38,
        THREE.MathUtils.lerp(prev.z, target.z, alpha)
      );

      if (i === 0) {
        // Cabeça: rotação, respiração, língua
        const yaw = Math.atan2(this.direction.x, this.direction.z) + Math.PI;
        mesh.rotation.set(0, yaw, 0);
        mesh.scale.setScalar(1.05 + Math.sin(now * 0.008) * 0.025);

        const tongue = mesh.userData.tongue;
        if (tongue) {
          const flick = Math.max(0, Math.sin(now * 0.02));
          tongue.scale.z = 0.6 + flick * 1.0;
          tongue.rotation.x = -0.04 + flick * 0.18;
        }

        // Emissão pulsante na cabeça
        this.headMaterial.emissiveIntensity = 0.35 + Math.sin(now * 0.006) * 0.15;
      } else {
        // Corpo: escala gradual (mais fino na cauda)
        const t = 1 - i / Math.max(1, this.segments.length);
        const thick = 0.88 + t * 0.12;
        mesh.scale.set(thick, 1, thick);

        // Ondulação subtil do corpo
        const wave = Math.sin(now * 0.004 + i * 0.8) * 0.02;
        mesh.position.y = 0.38 + wave;
      }
    }

    // Actualizar posição do escudo
    if (this.shieldMesh && this.group.children[0]) {
      this.shieldMesh.position.copy(this.group.children[0].position);
      this.shieldMesh.rotation.y += 0.02;
      this.shieldMesh.rotation.z += 0.01;
    }
  }

  /* ── Mesh management ── */
  syncMeshCount() {
    while (this.group.children.length < this.segments.length) {
      const isHead = this.group.children.length === 0;
      const mesh = new THREE.Mesh(
        isHead ? this.headGeometry : this.bodyGeometry,
        isHead ? this.headMaterial : this.bodyMaterial
      );
      if (isHead) attachHeadDetails(mesh);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    while (this.group.children.length > this.segments.length) {
      const mesh = this.group.children[this.group.children.length - 1];
      this.group.remove(mesh);
    }
    // Limitar sombras para performance
    for (let i = 0; i < this.group.children.length; i++) {
      this.group.children[i].castShadow = i < 8;
    }
  }

  /* ── Power-ups ── */

  /**
   * Activa o escudo visual.
   * Requisito: Esfera semi-transparente à volta da cabeça (ShaderMaterial com fresnel).
   */
  activateShield() {
    this.shieldActive = true;
    this._removeShieldVisual();

    // Shader de fresnel para o escudo
    const shieldMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x00ffff) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 2.5);
          float pulse = 0.5 + 0.5 * sin(uTime * 4.0);
          float alpha = fresnel * (0.4 + pulse * 0.2);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });

    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 24, 18),
      shieldMat
    );
    this.shieldMesh.name = 'shield';
    this.scene.add(this.shieldMesh);
  }

  /**
   * Activa boost de velocidade.
   * @param {number} duration — duração em segundos
   * @param {number} multiplier — multiplicador de velocidade
   */
  activateSpeedBoost(duration = 10, multiplier = 2) {
    this.speedMultiplier = multiplier;
    this.speedTimer = duration;
  }

  /**
   * Actualiza timers de power-ups.
   * @param {number} delta — tempo desde último tick (s)
   */
  updatePowerUps(delta) {
    // Speed boost timer
    if (this.speedTimer > 0) {
      this.speedTimer -= delta;
      if (this.speedTimer <= 0) {
        this.speedMultiplier = 1;
        this.speedTimer = 0;
      }
    }
    // Shield shader time
    if (this.shieldMesh && this.shieldMesh.material.uniforms) {
      this.shieldMesh.material.uniforms.uTime.value += delta;
    }
  }

  /** @private */
  _removeShieldVisual() {
    if (this.shieldMesh) {
      this.scene.remove(this.shieldMesh);
      if (this.shieldMesh.geometry) this.shieldMesh.geometry.dispose();
      if (this.shieldMesh.material) this.shieldMesh.material.dispose();
      this.shieldMesh = null;
    }
  }

  get headPosition() {
    return this.segments[0];
  }
}
