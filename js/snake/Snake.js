import * as THREE from 'three';
import { DIRS, createCanvasTexture, HALF_BOARD } from '../utils/helpers.js';
import { SNAKE_SKINS } from './skinConfigs.js';
import { attachDefaultHeadDetails } from './skinDetails.js';
import {
  attachDragonHeadDetails,
  attachDragonBodyDetails,
  createDragonTailGroup,
} from './skinDragon.js';
import {
  attachEgyptianHeadDetails,
  attachEgyptianBodyDetails,
  createEgyptianTailGroup,
  createEgyptianTexture,
} from './skinEgyptian.js';
import {
  attachVikingHeadDetails,
  attachVikingBodyDetails,
  createVikingTailGroup,
  createVikingTexture,
} from './skinViking.js';
import {
  attachMechaHeadDetails,
  attachMechaBodyDetails,
  createMechaTailGroup,
} from './skinMecha.js';
import {
  attachInfernalHeadDetails,
  attachInfernalBodyDetails,
  createInfernalTailGroup,
} from './skinInfernal.js';

// ============================================================================
// GUIA RÁPIDO DE EDIÇÃO DA COBRA
// ----------------------------------------------------------------------------
// - Tamanho cabeça/corpo: SNAKE_HEAD_RADIUS e SNAKE_BODY_SIZE
// - Altura da cobra no chão: SNAKE_RENDER_Y
// - Espessura do escudo: SHIELD_RADIUS
// - Densidade visual do trail/explosão: TRAIL_PARTICLE_RADIUS e EXPLOSION_RADIUS
// ============================================================================
const SNAKE_HEAD_RADIUS = 0.46;
const SNAKE_BODY_SIZE = { x: 0.7, y: 0.55, z: 0.78 };
const SNAKE_RENDER_Y = 0.38;
const SHIELD_RADIUS = 0.7;
const TRAIL_PARTICLE_RADIUS = 0.08;
const EXPLOSION_RADIUS = 0.08;

function createNeonSkinTexture() {
  return createCanvasTexture(128, (ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#1a0033');
    grad.addColorStop(0.5, '#0d0026');
    grad.addColorStop(1, '#1a0033');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }, { repeat: [3, 3], pixelArt: true });
}

export function createSkinHeadPreview(skin) {
  // Preview da skin no menu:
  // - aumentar SNAKE_HEAD_RADIUS deixa a cabeça maior no preview
  const headGeo = new THREE.SphereGeometry(SNAKE_HEAD_RADIUS, 20, 16);
  const headMat = new THREE.MeshStandardMaterial({
    color: skin.headColor,
    emissive: skin.headEmissive,
    emissiveIntensity: 0.5,
    roughness: 0.5,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(headGeo, headMat);
  if (skin.id === 'egyptian')           attachEgyptianHeadDetails(mesh, skin);
  else if (skin.id === 'cyber-green')   attachDragonHeadDetails(mesh, skin);
  else if (skin.id === 'viking')        attachVikingHeadDetails(mesh, skin);
  else if (skin.id === 'samurai-mecha') attachMechaHeadDetails(mesh, skin);
  else if (skin.id === 'infernal')      attachInfernalHeadDetails(mesh, skin);
  else                                  attachDefaultHeadDetails(mesh, skin);
  return mesh;
}

export class Snake {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'snake';
    this.scene.add(this.group);
    // Geometria base da cobra (mudar aqui afeta TODAS as skins):
    // - cabeça: raio = SNAKE_HEAD_RADIUS
    // - corpo: largura/altura/profundidade = SNAKE_BODY_SIZE
    this.headGeometry = new THREE.SphereGeometry(SNAKE_HEAD_RADIUS, 20, 16);
    this.bodyGeometry = new THREE.BoxGeometry(SNAKE_BODY_SIZE.x, SNAKE_BODY_SIZE.y, SNAKE_BODY_SIZE.z, 1, 1, 1);
    this.skinTexture = createNeonSkinTexture();
    this.currentSkinIndex = 0;
    this.headMaterial = new THREE.MeshStandardMaterial({
      map: this.skinTexture, color: 0x8844ff, emissive: 0x6600cc, emissiveIntensity: 0.4,
      roughness: 0.6, metalness: 0.15, bumpMap: this.skinTexture, bumpScale: 0.06,
    });
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      map: this.skinTexture, color: 0x6633cc, emissive: 0x4400aa, emissiveIntensity: 0.3,
      roughness: 0.65, metalness: 0.1, bumpMap: this.skinTexture, bumpScale: 0.04,
    });
    this.shieldActive = false;
    this.shieldMesh = null;
    this.speedMultiplier = 1;
    this.speedTimer = 0;
    this.tailGroup = null;
    this.reset();
  }

  setSkin(skinIndex) {
    const skin = SNAKE_SKINS[skinIndex];
    if (!skin) return;
    this.currentSkinIndex = skinIndex;
    this.headMaterial.color.set(skin.headColor);
    this.headMaterial.emissive.set(skin.headEmissive);
    this.bodyMaterial.color.set(skin.bodyColor);
    this.bodyMaterial.emissive.set(skin.bodyEmissive);

    /* ── Textura por skin (egípcia=ouro, viking=madeira, outras=neon) ── */
    if (skin.id === 'egyptian') {
      const tex = createEgyptianTexture();
      this.headMaterial.map = tex; this.headMaterial.bumpMap = tex;
      this.bodyMaterial.map = tex; this.bodyMaterial.bumpMap = tex;
    } else if (skin.id === 'viking') {
      const tex = createVikingTexture();
      this.headMaterial.map = tex; this.headMaterial.bumpMap = tex;
      this.bodyMaterial.map = tex; this.bodyMaterial.bumpMap = tex;
    } else {
      this.headMaterial.map = this.skinTexture; this.headMaterial.bumpMap = this.skinTexture;
      this.bodyMaterial.map = this.skinTexture; this.bodyMaterial.bumpMap = this.skinTexture;
    }
    this.headMaterial.needsUpdate = true;
    this.bodyMaterial.needsUpdate = true;

    while (this.group.children.length > 0) this.group.remove(this.group.children[this.group.children.length - 1]);
    this._removeTail();
    if (skin.id === 'egyptian')          this.tailGroup = createEgyptianTailGroup(skin);
    else if (skin.id === 'cyber-green')  this.tailGroup = createDragonTailGroup(skin);
    else if (skin.id === 'viking')       this.tailGroup = createVikingTailGroup(skin);
    else if (skin.id === 'samurai-mecha') this.tailGroup = createMechaTailGroup(skin);
    else if (skin.id === 'infernal')     this.tailGroup = createInfernalTailGroup(skin);
    if (this.tailGroup) this.scene.add(this.tailGroup);
    this.syncMeshCount();
  }

  reset() {
    this.direction = DIRS.right.clone();
    this.directionQueue = [];
    this.segments = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(-2, 0, 0),
    ];
    this.previousSegments = this.segments.map((s) => s.clone());
    this.growPending = 0;
    this.dead = false;
    this.shieldActive = false;
    this.speedMultiplier = 1;
    this.speedTimer = 0;
    this._removeShieldVisual();
    this._removeTail();
    const skin = SNAKE_SKINS[this.currentSkinIndex];
    if (skin && skin.id === 'egyptian')       this.tailGroup = createEgyptianTailGroup(skin);
    else if (skin && skin.id === 'cyber-green')  this.tailGroup = createDragonTailGroup(skin);
    else if (skin && skin.id === 'viking')       this.tailGroup = createVikingTailGroup(skin);
    else if (skin && skin.id === 'samurai-mecha') this.tailGroup = createMechaTailGroup(skin);
    else if (skin && skin.id === 'infernal')     this.tailGroup = createInfernalTailGroup(skin);
    if (this.tailGroup) this.scene.add(this.tailGroup);
    this.syncMeshCount();
    this.render(1);
  }

  setDirection(nextDir) {
    if (this.dead) return;
    const last = this.directionQueue.length > 0 ? this.directionQueue[this.directionQueue.length - 1] : this.direction;
    if (nextDir.equals(last)) return;
    if (nextDir.dot(last) === -1) return;
    if (this.directionQueue.length < 2) this.directionQueue.push(nextDir.clone());
  }
  getNextReferenceDirection() { return this.directionQueue.length > 0 ? this.directionQueue[this.directionQueue.length - 1] : this.direction; }
  turnLeft() { const ref = this.getNextReferenceDirection(); this.setDirection(new THREE.Vector3(ref.z, 0, -ref.x)); }
  turnRight() { const ref = this.getNextReferenceDirection(); this.setDirection(new THREE.Vector3(-ref.z, 0, ref.x)); }

  updateStep(foodCell, checkObstacleCollision) {
    if (this.dead) return { dead: true, ate: false };
    this.copyCurrentToPrevious();
    if (this.directionQueue.length > 0) this.direction.copy(this.directionQueue.shift());
    const newHead = this.segments[0].clone().add(this.direction);
    const ate = newHead.equals(foodCell);
    this.segments.unshift(newHead);
    if (ate) this.growPending += 1;
    if (this.growPending > 0) this.growPending -= 1;
    else this.segments.pop();
    const hitWall = this.isOutOfBounds(newHead);
    const hitSelf = this.hitsSelf();
    const hitObstacle = checkObstacleCollision ? checkObstacleCollision(newHead) : false;
    const collision = hitWall || hitSelf || hitObstacle;
    if (collision) {
      if (this.shieldActive) {
        this.shieldActive = false;
        this._removeShieldVisual();
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
    while (this.previousSegments.length < this.segments.length) this.previousSegments.push(new THREE.Vector3());
    for (let i = 0; i < this.segments.length; i++) this.previousSegments[i].copy(this.segments[i]);
    this.previousSegments.length = this.segments.length;
  }

  isOutOfBounds(pos) {
    return pos.x < -HALF_BOARD || pos.x > HALF_BOARD - 1 || pos.z < -HALF_BOARD || pos.z > HALF_BOARD - 1;
  }
  hitsSelf() {
    const head = this.segments[0];
    for (let i = 1; i < this.segments.length; i++) if (head.equals(this.segments[i])) return true;
    return false;
  }

  render(alpha) {
    const now = performance.now();
    for (let i = 0; i < this.segments.length; i++) {
      const target = this.segments[i];
      const prev = this.previousSegments[i] || target;
      const mesh = this.group.children[i];
      if (!mesh) continue;
      mesh.position.set(
        THREE.MathUtils.lerp(prev.x, target.x, alpha),
        SNAKE_RENDER_Y,
        THREE.MathUtils.lerp(prev.z, target.z, alpha),
      );
      if (i === 0) {
        const yaw = Math.atan2(this.direction.x, this.direction.z) + Math.PI;
        mesh.rotation.set(0, yaw, 0);
        mesh.scale.setScalar(1.05 + Math.sin(now * 0.008) * 0.025);
        const tongue = mesh.userData.tongue;
        if (tongue) {
          const flick = Math.max(0, Math.sin(now * 0.02));
          tongue.scale.z = 0.6 + flick * 1.0;
          tongue.rotation.x = -0.04 + flick * 0.18;
        }
        this.headMaterial.emissiveIntensity = 0.35 + Math.sin(now * 0.006) * 0.15;

        /* ── Animações Mecha: visor LED + antenas pulsam ── */
        if (mesh.userData.visorBar) {
          mesh.userData.visorBar.material.emissiveIntensity = 1.5 + Math.sin(now * 0.008) * 0.5;
        }
        if (mesh.userData.antennaTips) {
          mesh.userData.antennaTips.forEach(tip => {
            tip.material.emissiveIntensity = 0.8 + Math.sin(now * 0.012) * 0.6;
          });
        }
        /* ── Animações Infernal: olhos flamejantes + pupilas + fissuras ── */
        if (mesh.userData.fireIris) {
          mesh.userData.fireIris.forEach(iris => {
            iris.material.emissiveIntensity = 2.0 + Math.sin(now * 0.010) * 0.8;
          });
        }
        if (mesh.userData.pupils) {
          const sc = 0.7 + Math.sin(now * 0.005) * 0.3;
          mesh.userData.pupils.forEach(p => p.scale.y = sc);
        }
        if (mesh.userData.lavaCracks) {
          mesh.userData.lavaCracks.forEach((cr, j) => {
            cr.material.emissiveIntensity = 1.5 + Math.sin(now * 0.004 + j * 2.1) * 0.8;
          });
        }
        /* ── Animações Egípcia: olhos uraeus pulsam ── */
        if (mesh.userData.uraeusEyes) {
          mesh.userData.uraeusEyes.forEach(e => {
            e.material.emissiveIntensity = 1.5 + Math.sin(now * 0.008) * 0.8;
          });
        }
        /* ── Animações Viking: olhos runa pulsam ── */
        if (mesh.userData.runeEyes) {
          mesh.userData.runeEyes.forEach(e => {
            e.material.emissiveIntensity = 0.3 + Math.sin(now * 0.006) * 0.2;
          });
        }
      } else {
        const t = 1 - i / Math.max(1, this.segments.length);
        const thick = 0.88 + t * 0.12;
        mesh.scale.set(thick, 1, thick);
        const wave = Math.sin(now * 0.004 + i * 0.8) * 0.02;
        mesh.position.y = SNAKE_RENDER_Y + wave;

        /* ── Animações corpo: LEDs mecha + fissuras infernal ── */
        if (mesh.userData.leds) {
          mesh.userData.leds.forEach((led, j) => {
            led.material.emissiveIntensity = 0.5 + Math.sin(now * 0.006 + i * 1.2 + j) * 0.5;
          });
        }
        if (mesh.userData.lavaCracks) {
          mesh.userData.lavaCracks.forEach((cr, j) => {
            cr.material.emissiveIntensity = 1.2 + Math.sin(now * 0.004 + i * 0.8 + j * 1.5) * 0.6;
          });
        }
      }
    }
    if (this.tailGroup && this.segments.length >= 2) {
      const n = this.segments.length - 1;
      const lastSeg = this.segments[n];
      const prevSeg = this.previousSegments[n] || lastSeg;
      const secLast = this.segments[n - 1];
      this.tailGroup.position.set(
        THREE.MathUtils.lerp(prevSeg.x, lastSeg.x, alpha),
        0,
        THREE.MathUtils.lerp(prevSeg.z, lastSeg.z, alpha),
      );
      const dx = lastSeg.x - secLast.x;
      const dz = lastSeg.z - secLast.z;
      this.tailGroup.rotation.y = Math.atan2(dx, dz);
      this.tailGroup.rotation.z = Math.sin(now * 0.005 + n * 0.5) * 0.08;

      /* ── Animação cauda Mecha: glow do exaustor pulsa + sensor pisca ── */
      if (this.tailGroup.userData.exhaustGlow) {
        this.tailGroup.userData.exhaustGlow.material.opacity =
          0.5 + Math.sin(now * 0.010) * 0.3;
      }
      if (this.tailGroup.userData.sensorLed) {
        this.tailGroup.userData.sensorLed.material.emissiveIntensity =
          2.0 + Math.sin(now * 0.016) * 2.0;
      }
      /* ── Animação cauda Infernal: chamas oscilam + brasas flutuam ── */
      if (this.tailGroup.userData.flames) {
        this.tailGroup.userData.flames.forEach((fl, j) => {
          fl.scale.y = 0.7 + Math.sin(now * 0.015 + j * 2.0) * 0.4;
          fl.scale.x = 0.9 + Math.sin(now * 0.012 + j * 1.5) * 0.15;
        });
      }
      if (this.tailGroup.userData.embers) {
        this.tailGroup.userData.embers.forEach((eb, j) => {
          eb.position.y += Math.sin(now * 0.020 + j * 1.8) * 0.0005;
          eb.material.opacity = 0.6 + Math.sin(now * 0.018 + j * 2.5) * 0.35;
        });
      }
      /* ── Animação cauda Egípcia: disco solar pulsa ── */
      if (this.tailGroup.userData.solarDisc) {
        this.tailGroup.userData.solarDisc.material.emissiveIntensity =
          1.2 + Math.sin(now * 0.008) * 0.5;
      }
    }
    if (this.shieldMesh && this.group.children[0]) {
      this.shieldMesh.position.copy(this.group.children[0].position);
      this.shieldMesh.rotation.y += 0.02;
      this.shieldMesh.rotation.z += 0.01;
    }
  }


  syncMeshCount() {
    const skin = SNAKE_SKINS[this.currentSkinIndex];
    while (this.group.children.length < this.segments.length) {
      const isHead = this.group.children.length === 0;
      const mesh = new THREE.Mesh(isHead ? this.headGeometry : this.bodyGeometry, isHead ? this.headMaterial : this.bodyMaterial);
      if (isHead) {
        if (skin.id === 'egyptian')           attachEgyptianHeadDetails(mesh, skin);
        else if (skin.id === 'cyber-green')   attachDragonHeadDetails(mesh, skin);
        else if (skin.id === 'viking')        attachVikingHeadDetails(mesh, skin);
        else if (skin.id === 'samurai-mecha') attachMechaHeadDetails(mesh, skin);
        else if (skin.id === 'infernal')      attachInfernalHeadDetails(mesh, skin);
        else                                  attachDefaultHeadDetails(mesh, skin);
      } else {
        if (skin.id === 'egyptian')           attachEgyptianBodyDetails(mesh, skin, this.group.children.length);
        else if (skin.id === 'cyber-green')   attachDragonBodyDetails(mesh, skin);
        else if (skin.id === 'viking')        attachVikingBodyDetails(mesh, skin, this.group.children.length);
        else if (skin.id === 'samurai-mecha') attachMechaBodyDetails(mesh, skin, this.group.children.length);
        else if (skin.id === 'infernal')      attachInfernalBodyDetails(mesh, skin, this.group.children.length);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    while (this.group.children.length > this.segments.length) this.group.remove(this.group.children[this.group.children.length - 1]);
  }

  activateShield() {
    this.shieldActive = true;
    this._removeShieldVisual();
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
          float pulse   = 0.5 + 0.5 * sin(uTime * 4.0);
          float alpha   = fresnel * (0.4 + pulse * 0.2);
          gl_FragColor  = vec4(uColor, alpha);
        }
      `,
    });
    this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(SHIELD_RADIUS, 24, 18), shieldMat);
    this.shieldMesh.name = 'shield';
    this.scene.add(this.shieldMesh);
  }
  activateSpeedBoost(duration = 10, multiplier = 2) { this.speedMultiplier = multiplier; this.speedTimer = duration; }
  updatePowerUps(delta) {
    if (this.speedTimer > 0) {
      this.speedTimer -= delta;
      if (this.speedTimer <= 0) {
        this.speedMultiplier = 1;
        this.speedTimer = 0;
      }
    }
  }
  _removeShieldVisual() {
    if (this.shieldMesh) {
      this.scene.remove(this.shieldMesh);
      if (this.shieldMesh.geometry) this.shieldMesh.geometry.dispose();
      if (this.shieldMesh.material) this.shieldMesh.material.dispose();
      this.shieldMesh = null;
    }
  }
  _removeTail() {
    if (this.tailGroup) {
      this.scene.remove(this.tailGroup);
      this.tailGroup = null;
    }
  }
  emitTrail() {
    if (this.dead || !this.segments[0]) return;
    if (!this._trailParticles) this._trailParticles = [];
    if (!this._trailPool) this._trailPool = [];
    if (!this._trailGeo) this._trailGeo = new THREE.SphereGeometry(TRAIL_PARTICLE_RADIUS, 4, 3);
    const skin = SNAKE_SKINS[this.currentSkinIndex];
    const color = skin ? skin.headEmissive : 0x6600cc;
    let p = this._trailPool.length > 0 ? this._trailPool.pop() : null;
    if (!p) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      p = new THREE.Mesh(this._trailGeo, mat);
    } else {
      p.material.color.set(color);
      p.material.opacity = 0.6;
    }
    // Altura do rasto (0.15): subir/descer conforme desejado.
    p.position.set(this.segments[0].x, 0.15, this.segments[0].z);
    p.userData.life = 1.0;
    p.userData.decay = 0.7;
    this.scene.add(p);
    this._trailParticles.push(p);
  }
  updateTrail(delta) {
    if (!this._trailParticles) return;
    for (let i = this._trailParticles.length - 1; i >= 0; i--) {
      const p = this._trailParticles[i];
      p.userData.life -= delta * p.userData.decay;
      p.material.opacity = Math.max(0, p.userData.life * 0.5);
      p.scale.setScalar(0.5 + p.userData.life * 0.5);
      if (p.userData.life <= 0) {
        this.scene.remove(p);
        this._trailParticles.splice(i, 1);
        p.scale.setScalar(1);
        p.material.opacity = 0;
        if (!this._trailPool) this._trailPool = [];
        if (this._trailPool.length < 120) this._trailPool.push(p);
        else p.material.dispose();
      }
    }
  }
  clearTrail() {
    if (!this._trailParticles) return;
    for (const p of this._trailParticles) {
      this.scene.remove(p);
      if (!this._trailPool) this._trailPool = [];
      if (this._trailPool.length < 120) {
        p.material.opacity = 0;
        this._trailPool.push(p);
      } else {
        p.material.dispose();
      }
    }
    this._trailParticles = [];
  }
  explode() {
    const particles = [];
    const skin = SNAKE_SKINS[this.currentSkinIndex];
    const colors = [
      skin ? skin.headColor : 0x8844ff,
      skin ? skin.bodyColor : 0x6633cc,
      skin ? skin.headEmissive : 0x6600cc,
      0xff3333,
    ];
    const geo = new THREE.SphereGeometry(EXPLOSION_RADIUS, 5, 4);
    for (let s = 0; s < this.segments.length; s++) {
      const seg = this.segments[s];
      const count = s === 0 ? 12 : 6;
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: colors[Math.floor(Math.random() * colors.length)],
          transparent: true,
          opacity: 1,
        });
        const p = new THREE.Mesh(geo, mat);
        p.position.set(seg.x, SNAKE_RENDER_Y, seg.z);
        p.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 6,
        );
        p.userData.life = 1.0;
        p.userData.decay = 0.8 + Math.random() * 0.4;
        p.userData.spin = (Math.random() - 0.5) * 10;
        this.scene.add(p);
        particles.push(p);
      }
    }
    this.group.visible = false;
    if (this.tailGroup) this.tailGroup.visible = false;
    return particles;
  }
  get headPosition() { return this.segments[0]; }
}
