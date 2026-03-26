import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createScene, toggleLight, BOARD_SIZE } from "./scene.js";
import { Snake, DIRS } from "./snake.js";
import { Food } from "./food.js";
import { createUI } from "./ui.js";

const app = document.getElementById("app");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.domElement.tabIndex = 1;
app.appendChild(renderer.domElement);
renderer.domElement.focus();

const { scene, lights } = createScene();
const ui = createUI();

const perspectiveCamera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
perspectiveCamera.position.set(0, 7, 10);

const aspect = window.innerWidth / window.innerHeight;
const orthoFrustum = BOARD_SIZE * 0.65;
const orthoCamera = new THREE.OrthographicCamera(
  -orthoFrustum * aspect,
  orthoFrustum * aspect,
  orthoFrustum,
  -orthoFrustum,
  0.1,
  100
);
orthoCamera.position.set(0, 30, 0.01);
orthoCamera.lookAt(0, 0, 0);

let activeCamera = perspectiveCamera;
const controls = new OrbitControls(activeCamera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 0, 0);

const snake = new Snake(scene);
const food = new Food(scene);

let score = 0;
ui.setScore(score);
ui.setGameOver(false);
food.respawn(snake.segments);

const stepDuration = 0.15;
let accumulator = 0;
let gameOver = false;

const clock = new THREE.Clock();
const followBehind = new THREE.Vector3();
const followTarget = new THREE.Vector3();
const followPos = new THREE.Vector3();
const orthoTarget = new THREE.Vector3();

function restartGame() {
  score = 0;
  gameOver = false;
  ui.setScore(score);
  ui.setGameOver(false);
  snake.reset();
  food.respawn(snake.segments);
  accumulator = 0;
}

function updateFollowCamera() {
  const head = snake.headPosition;
  followBehind.copy(snake.direction).multiplyScalar(-5.2);
  followTarget.set(head.x, 0.5, head.z);
  followPos.set(followTarget.x + followBehind.x, 4.5, followTarget.z + followBehind.z);
  perspectiveCamera.position.lerp(followPos, 0.14);
  controls.target.lerp(followTarget, 0.2);
}

function switchCamera() {
  if (activeCamera === perspectiveCamera) {
    activeCamera = orthoCamera;
    controls.object = activeCamera;
    controls.enableRotate = false;
  } else {
    activeCamera = perspectiveCamera;
    controls.object = activeCamera;
    controls.enableRotate = true;
  }
  controls.update();
}

function handleMovementKey(event) {
  const code = event.code;
  const key = (event.key || "").toLowerCase();

  if (code === "ArrowLeft" || key === "a") {
    snake.turnLeft();
    return true;
  }
  if (code === "ArrowRight" || key === "d") {
    snake.turnRight();
    return true;
  }
  if (code === "ArrowUp" || key === "w") {
    snake.setDirection(DIRS.up);
    return true;
  }
  if (code === "ArrowDown" || key === "s") {
    snake.setDirection(DIRS.down);
    return true;
  }
  return false;
}

window.addEventListener("pointerdown", () => {
  renderer.domElement.focus();
});

window.addEventListener("keydown", (event) => {
  const moved = handleMovementKey(event);
  if (moved) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (event.code === "KeyC") switchCamera();
  if (event.code === "Digit1") toggleLight(lights.ambient);
  if (event.code === "Digit2") toggleLight(lights.directional);
  if (event.code === "Digit3") toggleLight(lights.food);
  if (event.code === "KeyR") restartGame();
});

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const nextAspect = width / height;

  perspectiveCamera.aspect = nextAspect;
  perspectiveCamera.updateProjectionMatrix();

  orthoCamera.left = -orthoFrustum * nextAspect;
  orthoCamera.right = orthoFrustum * nextAspect;
  orthoCamera.top = orthoFrustum;
  orthoCamera.bottom = -orthoFrustum;
  orthoCamera.updateProjectionMatrix();

  renderer.setSize(width, height);
});

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (!gameOver) {
    accumulator += delta;
    while (accumulator >= stepDuration) {
      accumulator -= stepDuration;
      const result = snake.updateStep(food.cell);
      if (result.ate) {
        score += 1;
        ui.setScore(score);
        food.respawn(snake.segments);
      }
      if (result.dead) {
        gameOver = true;
        ui.setGameOver(true);
      }
    }
  }

  const alpha = stepDuration > 0 ? accumulator / stepDuration : 1;
  snake.render(alpha);
  food.update(elapsed, lights.food);

  if (activeCamera === perspectiveCamera) {
    updateFollowCamera();
  } else {
    const head = snake.headPosition;
    orthoTarget.set(head.x, 0, head.z);
    controls.target.lerp(orthoTarget, 0.2);
  }

  controls.update();
  renderer.render(scene, activeCamera);
}

animate();
