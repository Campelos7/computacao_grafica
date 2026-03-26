import * as THREE from "three";
import { BOARD_SIZE } from "./scene.js";

export const DIRS = {
  up: new THREE.Vector3(0, 0, -1),
  down: new THREE.Vector3(0, 0, 1),
  left: new THREE.Vector3(-1, 0, 0),
  right: new THREE.Vector3(1, 0, 0),
};

const HALF = Math.floor(BOARD_SIZE / 2);

function createSnakeTexture() {
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const base = ctx.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0, "#6f8559");
  base.addColorStop(0.5, "#4e6541");
  base.addColorStop(1, "#364c33");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 24) {
    const offset = (Math.floor(y / 24) % 2) * 12;
    for (let x = -12 + offset; x < size; x += 24) {
      ctx.beginPath();
      ctx.arc(x + 12, y + 12, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(196, 214, 152, 0.22)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 12, y + 12, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20, 35, 20, 0.24)";
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function attachHeadDetails(headMesh) {
  const eyeWhiteMaterial = new THREE.MeshStandardMaterial({
    color: 0xf3f0d6,
    roughness: 0.25,
    metalness: 0.02,
  });
  const pupilMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.45,
    metalness: 0.05,
  });
  const tongueMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d1d2f,
    roughness: 0.55,
    metalness: 0,
  });

  const eyeGeo = new THREE.SphereGeometry(0.08, 10, 8);
  const pupilGeo = new THREE.SphereGeometry(0.04, 8, 6);
  const tongueGeo = new THREE.BoxGeometry(0.05, 0.012, 0.26);
  const forkGeo = new THREE.BoxGeometry(0.018, 0.008, 0.09);

  const eyeLeft = new THREE.Mesh(eyeGeo, eyeWhiteMaterial);
  const eyeRight = new THREE.Mesh(eyeGeo, eyeWhiteMaterial);
  eyeLeft.position.set(-0.17, 0.12, -0.34);
  eyeRight.position.set(0.17, 0.12, -0.34);

  const pupilLeft = new THREE.Mesh(pupilGeo, pupilMaterial);
  const pupilRight = new THREE.Mesh(pupilGeo, pupilMaterial);
  pupilLeft.position.set(0, 0.005, -0.065);
  pupilRight.position.set(0, 0.005, -0.065);
  eyeLeft.add(pupilLeft);
  eyeRight.add(pupilRight);

  const tongue = new THREE.Mesh(tongueGeo, tongueMaterial);
  tongue.position.set(0, -0.03, -0.47);

  const forkLeft = new THREE.Mesh(forkGeo, tongueMaterial);
  const forkRight = new THREE.Mesh(forkGeo, tongueMaterial);
  forkLeft.position.set(-0.015, 0, -0.15);
  forkRight.position.set(0.015, 0, -0.15);
  forkLeft.rotation.y = -0.34;
  forkRight.rotation.y = 0.34;
  tongue.add(forkLeft);
  tongue.add(forkRight);

  headMesh.add(eyeLeft, eyeRight, tongue);
  headMesh.userData.tongue = tongue;
}

export class Snake {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.headGeometry = new THREE.SphereGeometry(0.46, 24, 20);
    this.bodyGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.78, 16);
    this.skinTexture = createSnakeTexture();
    this.headMaterial = new THREE.MeshStandardMaterial({
      map: this.skinTexture,
      color: 0xe8f0d0,
      emissive: 0x16210f,
      emissiveIntensity: 0.22,
      roughness: 0.72,
      metalness: 0.02,
      bumpMap: this.skinTexture,
      bumpScale: 0.08,
    });
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      map: this.skinTexture,
      color: 0xdce8c5,
      emissive: 0x10180b,
      emissiveIntensity: 0.18,
      roughness: 0.76,
      metalness: 0.02,
      bumpMap: this.skinTexture,
      bumpScale: 0.06,
    });

    this.reset();
  }

  reset() {
    this.direction = DIRS.right.clone();
    this.directionQueue = [];
    this.segments = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(-2, 0, 0),
    ];
    this.previousSegments = this.segments.map((seg) => seg.clone());
    this.growPending = 0;
    this.dead = false;
    this.syncMeshCount();
    this.render(1);
  }

  setDirection(nextDirection) {
    if (this.dead) return;
    const lastQueued =
      this.directionQueue.length > 0
        ? this.directionQueue[this.directionQueue.length - 1]
        : this.direction;

    if (nextDirection.equals(lastQueued)) return;
    if (nextDirection.dot(lastQueued) === -1) return;

    // Guarda ate duas direcoes para nao perder curvas rapidas.
    if (this.directionQueue.length < 2) {
      this.directionQueue.push(nextDirection.clone());
    }
  }

  getNextReferenceDirection() {
    if (this.directionQueue.length > 0) {
      return this.directionQueue[this.directionQueue.length - 1];
    }
    return this.direction;
  }

  turnLeft() {
    const ref = this.getNextReferenceDirection();
    const next = new THREE.Vector3(ref.z, 0, -ref.x);
    this.setDirection(next);
  }

  turnRight() {
    const ref = this.getNextReferenceDirection();
    const next = new THREE.Vector3(-ref.z, 0, ref.x);
    this.setDirection(next);
  }

  updateStep(foodCell) {
    if (this.dead) {
      return { dead: true, ate: false };
    }

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

    this.dead = this.isOutOfBounds(newHead) || this.hitsSelf();
    this.syncMeshCount();
    return { dead: this.dead, ate };
  }

  copyCurrentToPrevious() {
    while (this.previousSegments.length < this.segments.length) {
      this.previousSegments.push(new THREE.Vector3());
    }
    for (let i = 0; i < this.segments.length; i += 1) {
      this.previousSegments[i].copy(this.segments[i]);
    }
    this.previousSegments.length = this.segments.length;
  }

  isOutOfBounds(position) {
    return (
      position.x < -HALF ||
      position.x > HALF - 1 ||
      position.z < -HALF ||
      position.z > HALF - 1
    );
  }

  hitsSelf() {
    const head = this.segments[0];
    for (let i = 1; i < this.segments.length; i += 1) {
      if (head.equals(this.segments[i])) {
        return true;
      }
    }
    return false;
  }

  syncMeshCount() {
    while (this.group.children.length < this.segments.length) {
      const isHead = this.group.children.length === 0;
      const mesh = new THREE.Mesh(
        isHead ? this.headGeometry : this.bodyGeometry,
        isHead ? this.headMaterial : this.bodyMaterial
      );
      if (isHead) {
        attachHeadDetails(mesh);
      }
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }

    while (this.group.children.length > this.segments.length) {
      const mesh = this.group.children[this.group.children.length - 1];
      this.group.remove(mesh);
    }

    for (let i = 0; i < this.group.children.length; i += 1) {
      // Limita sombras a poucos segmentos para manter FPS estavel.
      this.group.children[i].castShadow = i < 6;
    }
  }

  render(alpha) {
    for (let i = 0; i < this.segments.length; i += 1) {
      const target = this.segments[i];
      const prev = this.previousSegments[i] ?? this.segments[i];
      const mesh = this.group.children[i];

      mesh.position.set(
        THREE.MathUtils.lerp(prev.x, target.x, alpha),
        0.45,
        THREE.MathUtils.lerp(prev.z, target.z, alpha)
      );

      if (i === 0) {
        const yaw = Math.atan2(this.direction.x, this.direction.z) + Math.PI;
        mesh.rotation.set(0, yaw, 0);
        mesh.scale.setScalar(1.05 + Math.sin(performance.now() * 0.008) * 0.02);
        const tongue = mesh.userData.tongue;
        if (tongue) {
          const flick = Math.max(0, Math.sin(performance.now() * 0.02));
          tongue.scale.z = 0.65 + flick * 0.9;
          tongue.rotation.x = -0.04 + flick * 0.16;
        }
      } else {
        const t = 1 - i / Math.max(1, this.segments.length);
        const thickness = 0.92 + t * 0.09;
        mesh.scale.set(thickness, 1, thickness);
      }
    }
  }

  get headPosition() {
    return this.segments[0];
  }
}
