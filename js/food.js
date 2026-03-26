import * as THREE from "three";
import { BOARD_SIZE } from "./scene.js";

const HALF = Math.floor(BOARD_SIZE / 2);

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class Food {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.14, 18, 30),
      new THREE.MeshStandardMaterial({
        color: 0xff8f38,
        emissive: 0x7a2200,
        emissiveIntensity: 1,
        roughness: 0.18,
        metalness: 0.5,
      })
    );
    this.mesh.position.y = 0.58;
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    this.cell = new THREE.Vector3(0, 0, 0);
  }

  respawn(occupiedSegments) {
    const occupied = new Set(occupiedSegments.map((seg) => `${seg.x},${seg.z}`));
    let next;
    do {
      next = new THREE.Vector3(
        randomInt(-HALF, HALF - 1),
        0,
        randomInt(-HALF, HALF - 1)
      );
    } while (occupied.has(`${next.x},${next.z}`));

    this.cell.copy(next);
    this.mesh.position.set(this.cell.x, 0.58, this.cell.z);
  }

  update(elapsedTime, pointLight) {
    this.mesh.rotation.y += 0.035;
    this.mesh.rotation.x = Math.PI / 2 + Math.sin(elapsedTime * 2.7) * 0.16;
    const pulse = 1 + Math.sin(elapsedTime * 5.4) * 0.15;
    this.mesh.scale.setScalar(pulse);

    if (pointLight) {
      pointLight.position.set(this.mesh.position.x, 1.2, this.mesh.position.z);
      pointLight.intensity = 1 + Math.sin(elapsedTime * 5.4) * 0.35;
    }
  }
}
