/* ==========================================================================
   main.js — Orquestrador principal do jogo Snake Retro 3D
   
   Requisitos cobertos:
   - R1: Objetos 3D complexos   - R2: Toggle câmara (C)
   - R3: 4 luzes (1-4)          - R4: Teclado + Rato + Raycaster
   - R5: Animação + Replay (R)  - Post-processing (M)
   - Níveis JSON   - Power-ups   - Skins   - High Score
   ========================================================================== */
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

import { DIRS, BOARD_SIZE } from './utils/helpers.js';
import { UIManager } from './UIManager.js';
import { LightManager } from './LightManager.js';
import { CameraController } from './CameraController.js';
import { ReplaySystem } from './ReplaySystem.js';
import { PostProcessing } from './PostProcessing.js';
import { LevelManager } from './LevelManager.js';
import { Obstacles } from './Obstacles.js';
import { Snake, SNAKE_SKINS } from './snake.js';
import { Food, ITEM_TYPES } from './food.js';

/* ══════════════════════════════════════════════════════════════════════════
   STATES
   ══════════════════════════════════════════════════════════════════════════ */
const STATES = {
  LOADING: 'loading',
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  REPLAY: 'replay',
};

const MENU_PAGES = {
  MAIN: 'main',
  LEVELS: 'levels',
  SKINS: 'skins',
  SETTINGS: 'settings',
};

/* ══════════════════════════════════════════════════════════════════════════
   INITIALIZATION
   ══════════════════════════════════════════════════════════════════════════ */
const app = document.getElementById('app');

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.domElement.tabIndex = 1;
app.appendChild(renderer.domElement);

// ---- Scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.Fog(0x1a0a2e, 22, 65);

// ---- Managers ----
const ui = new UIManager();
const camCtrl = new CameraController(renderer.domElement);
const lightMgr = new LightManager(scene, ui);
const obstacles = new Obstacles(scene);
const levelMgr = new LevelManager(scene, obstacles, lightMgr, ui);
const snake = new Snake(scene);
const food = new Food(scene);
const replay = new ReplaySystem(ui);
const postProc = new PostProcessing(renderer, scene, camCtrl.camera);

ui.setLoadingProgress(5, 'Initializing...');

// ---- Game State ----
let state = STATES.LOADING;
let menuPage = MENU_PAGES.MAIN;
let score = 0;
let stepDuration = 0.15;
let accumulator = 0;
let gameTimer = 0;
const clock = new THREE.Clock();

// ---- Selections ----
let selectedLevelIndex = 0;
let selectedSkinIndex = 0;

// ---- High Score (localStorage) ----
let highScore = parseInt(localStorage.getItem('snake3d_highscore') || '0', 10);
ui.setHighScore(highScore);

// ---- 3D Menu ----
const menuGroup = new THREE.Group();
menuGroup.name = 'menu3d';
scene.add(menuGroup);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let menuFont = null;
const menuItems = [];
let hoveredMenu = null;

// ---- 2D Main Menu buttons ----
ui.btnMenuPlay?.addEventListener('click', () => {
  if (state === STATES.MENU) startGame();
});
ui.btnMenuLevels?.addEventListener('click', () => {
  if (state === STATES.MENU) openSubMenu(MENU_PAGES.LEVELS);
});
ui.btnMenuSkins?.addEventListener('click', () => {
  if (state === STATES.MENU) openSubMenu(MENU_PAGES.SKINS);
});
ui.btnMenuSettings?.addEventListener('click', () => {
  if (state === STATES.MENU) openSubMenu(MENU_PAGES.SETTINGS);
});

// ---- Ambient Particles ----
const particleGroup = new THREE.Group();
particleGroup.name = 'ambient-particles';
scene.add(particleGroup);
const ambientParticles = [];

// ---- Preview Snake (menu background) ----
const previewGroup = new THREE.Group();
previewGroup.name = 'preview-snake';
scene.add(previewGroup);
let previewSegments = [];
let previewTime = 0;

/* ══════════════════════════════════════════════════════════════════════════
   LOADING
   ══════════════════════════════════════════════════════════════════════════ */
async function init() {
  try {
    ui.setLoadingProgress(15, 'Loading levels...');
    await levelMgr.loadConfig('levels/levelConfig.json');

    ui.setLoadingProgress(30, 'Loading 3D models...');
    await levelMgr.loadModels((p) => {
      ui.setLoadingProgress(30 + p * 25, 'Loading 3D models...');
    });

    ui.setLoadingProgress(60, 'Loading fonts...');
    await loadMenuFont();

    ui.setLoadingProgress(75, 'Building level...');
    await levelMgr.loadLevel(0, true); // skip transition on init
    food.setAvailablePowerups(levelMgr.powerups);
    stepDuration = levelMgr.speed;

    ui.setLoadingProgress(85, 'Creating menu...');
    createMenu3D();
    createAmbientParticles(80);
    createPreviewSnake();

    ui.setLoadingProgress(100, 'Ready!');
    await new Promise(r => setTimeout(r, 400));
    ui.hideLoading();

    enterMenu();
    animate();
  } catch (err) {
    console.error('Erro na inicialização:', err);
    ui.setLoadingProgress(100, 'Error! Check console.');
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   AMBIENT PARTICLES — Flocos brilhantes no fundo
   ══════════════════════════════════════════════════════════════════════════ */
function createAmbientParticles(count) {
  const geo = new THREE.SphereGeometry(0.04, 4, 3);
  const colors = [0xff00ff, 0x00ffff, 0xffff00, 0x39ff14];
  const spread = 25;

  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: colors[i % colors.length],
      transparent: true,
      opacity: 0.3 + Math.random() * 0.4,
    });
    const p = new THREE.Mesh(geo, mat);
    p.position.set(
      (Math.random() - 0.5) * spread * 2,
      Math.random() * 12 + 0.5,
      (Math.random() - 0.5) * spread * 2
    );
    p.userData.baseY = p.position.y;
    p.userData.speed = 0.3 + Math.random() * 0.8;
    p.userData.phase = Math.random() * Math.PI * 2;
    p.userData.drift = (Math.random() - 0.5) * 0.3;
    particleGroup.add(p);
    ambientParticles.push(p);
  }
}

function updateAmbientParticles(elapsed) {
  for (const p of ambientParticles) {
    p.position.y = p.userData.baseY + Math.sin(elapsed * p.userData.speed + p.userData.phase) * 1.5;
    p.position.x += p.userData.drift * 0.01;
    p.material.opacity = 0.2 + Math.sin(elapsed * 2 + p.userData.phase) * 0.15;
    // Wrap around
    if (p.position.x > 25) p.position.x = -25;
    if (p.position.x < -25) p.position.x = 25;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   PREVIEW SNAKE — Cobra a deslizar no fundo do menu
   ══════════════════════════════════════════════════════════════════════════ */
function createPreviewSnake() {
  const segCount = 8;
  const headGeo = new THREE.SphereGeometry(0.35, 12, 10);
  const bodyGeo = new THREE.BoxGeometry(0.5, 0.4, 0.55);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x8844ff, emissive: 0x6600cc, emissiveIntensity: 0.5,
    roughness: 0.5, metalness: 0.2,
  });
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x6633cc, emissive: 0x4400aa, emissiveIntensity: 0.3,
    roughness: 0.6, metalness: 0.1,
  });

  for (let i = 0; i < segCount; i++) {
    const mesh = new THREE.Mesh(i === 0 ? headGeo : bodyGeo, i === 0 ? headMat : bodyMat);
    mesh.castShadow = true;
    previewGroup.add(mesh);
    previewSegments.push(mesh);
  }
  previewGroup.position.y = -0.5;
}

function updatePreviewSnake(elapsed) {
  if (state !== STATES.MENU) {
    previewGroup.visible = false;
    return;
  }
  previewGroup.visible = true;
  previewTime += 0.012;

  // Figura-8 path
  const radius = 6;
  for (let i = 0; i < previewSegments.length; i++) {
    const t = previewTime - i * 0.12;
    const x = Math.sin(t) * radius;
    const z = Math.sin(t * 2) * radius * 0.5;
    previewSegments[i].position.set(x, 0.3, z);

    if (i === 0) {
      const nx = Math.sin(t + 0.05) * radius;
      const nz = Math.sin((t + 0.05) * 2) * radius * 0.5;
      previewSegments[i].rotation.y = Math.atan2(nx - x, nz - z);
    }

    // Ondulação
    previewSegments[i].position.y = 0.3 + Math.sin(elapsed * 2 + i * 0.5) * 0.08;
  }

  // Atualizar skin da preview
  const skin = SNAKE_SKINS[selectedSkinIndex];
  if (skin && previewSegments[0]) {
    previewSegments[0].material.color.set(skin.headColor);
    previewSegments[0].material.emissive.set(skin.headEmissive);
    for (let i = 1; i < previewSegments.length; i++) {
      previewSegments[i].material.color.set(skin.bodyColor);
      previewSegments[i].material.emissive.set(skin.bodyEmissive);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   3D MENU (Raycaster)
   ══════════════════════════════════════════════════════════════════════════ */
function loadMenuFont() {
  return new Promise((resolve) => {
    const loader = new FontLoader();
    const fontUrl = 'https://unpkg.com/three@0.161.0/examples/fonts/helvetiker_bold.typeface.json';
    loader.load(fontUrl, (font) => {
      menuFont = font;
      resolve();
    }, undefined, () => {
      console.warn('Font not available, using fallback menu.');
      resolve();
    });
  });
}

function createMenu3D() {
  const items = [
    { text: 'PLAY', y: 3.5, color: 0x00ffff, action: 'play' },
    { text: 'LEVELS', y: 1.8, color: 0xff00ff, action: 'levels' },
    { text: 'SKINS', y: 0.1, color: 0xffff00, action: 'skins' },
    { text: 'SETTINGS', y: -1.6, color: 0x39ff14, action: 'settings' },
  ];

  if (menuFont) {
    for (const item of items) {
      const geo = new TextGeometry(item.text, {
        font: menuFont, size: 0.7, depth: 0.2,
        curveSegments: 4, bevelEnabled: true,
        bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2,
      });
      geo.computeBoundingBox();
      geo.center();

      const mat = new THREE.MeshStandardMaterial({
        color: item.color, emissive: item.color, emissiveIntensity: 0.4,
        roughness: 0.3, metalness: 0.5,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, item.y, 0);
      mesh.castShadow = true;
      mesh.userData = { action: item.action, baseColor: item.color, baseEmissive: 0.4 };
      menuGroup.add(mesh);
      menuItems.push({ mesh, action: item.action });
    }

    // Título
    const titleGeo = new TextGeometry('SNAKE 3D', {
      font: menuFont, size: 1.2, depth: 0.35,
      curveSegments: 4, bevelEnabled: true,
      bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 2,
    });
    titleGeo.computeBoundingBox();
    titleGeo.center();

    const titleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xff00ff, emissiveIntensity: 0.6,
      roughness: 0.2, metalness: 0.6,
    });
    const titleMesh = new THREE.Mesh(titleGeo, titleMat);
    titleMesh.position.set(0, 6.2, 0);
    titleMesh.name = 'menu-title';
    menuGroup.add(titleMesh);

    // High score text sob o título
    if (highScore > 0) {
      const hsGeo = new TextGeometry(`HI: ${highScore}`, {
        font: menuFont, size: 0.35, depth: 0.05,
        curveSegments: 3, bevelEnabled: false,
      });
      hsGeo.computeBoundingBox();
      hsGeo.center();
      const hsMat = new THREE.MeshStandardMaterial({
        color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 0.5,
        roughness: 0.3, metalness: 0.3,
      });
      const hsMesh = new THREE.Mesh(hsGeo, hsMat);
      hsMesh.position.set(0, 5.0, 0);
      hsMesh.name = 'menu-highscore';
      menuGroup.add(hsMesh);
    }
  } else {
    // Fallback: Box geometry
    for (const item of items) {
      const geo = new THREE.BoxGeometry(4.5, 0.7, 0.25);
      const mat = new THREE.MeshStandardMaterial({
        color: item.color, emissive: item.color, emissiveIntensity: 0.4,
        roughness: 0.3, metalness: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, item.y, 0);
      mesh.userData = { action: item.action, baseColor: item.color, baseEmissive: 0.4 };
      menuGroup.add(mesh);
      menuItems.push({ mesh, action: item.action });
    }
  }
}

function handleMenuClick() {
  if (state !== STATES.MENU || menuPage !== MENU_PAGES.MAIN || !hoveredMenu) return;

  const action = hoveredMenu.userData.action;
  switch (action) {
    case 'play':
      startGame();
      break;
    case 'levels':
      openSubMenu(MENU_PAGES.LEVELS);
      break;
    case 'skins':
      openSubMenu(MENU_PAGES.SKINS);
      break;
    case 'settings':
      openSubMenu(MENU_PAGES.SETTINGS);
      break;
  }
}

function openSubMenu(page) {
  menuPage = page;
  ui.hideAllPanels();
  ui.showPanel('panel-main', false);

  if (page === MENU_PAGES.LEVELS) {
    ui.populateLevelGrid(levelMgr.levels, selectedLevelIndex, (i) => {
      selectedLevelIndex = i;
      levelMgr.loadLevel(i, true).then(() => { // skip transition in menu
        food.setAvailablePowerups(levelMgr.powerups);
        stepDuration = levelMgr.speed;
      });
    });
    ui.showPanel('panel-levels', true);
  }

  if (page === MENU_PAGES.SKINS) {
    ui.populateSkinGrid(SNAKE_SKINS, selectedSkinIndex, (i) => {
      selectedSkinIndex = i;
      snake.setSkin(i);
    });
    ui.showPanel('panel-skins', true);
  }

  if (page === MENU_PAGES.SETTINGS) {
    ui.updateSettingToggle('setting-postfx', postProc.enabled);
    ui.updateSettingToggle('setting-shadows', renderer.shadowMap.enabled);
    ui.showPanel('panel-settings', true);
  }
}

function closeSubMenu() {
  menuPage = MENU_PAGES.MAIN;
  ui.hideAllPanels();
  ui.showPanel('panel-main', true);
}

function updateMenuRaycaster() {
  if (state !== STATES.MENU || menuPage !== MENU_PAGES.MAIN) return;

  raycaster.setFromCamera(mouse, camCtrl.camera);
  const meshes = menuItems.map(m => m.mesh);
  const intersects = raycaster.intersectObjects(meshes);

  if (hoveredMenu) {
    hoveredMenu.scale.setScalar(1);
    hoveredMenu.material.emissiveIntensity = hoveredMenu.userData.baseEmissive;
    hoveredMenu = null;
  }

  if (intersects.length > 0) {
    hoveredMenu = intersects[0].object;
    hoveredMenu.scale.setScalar(1.12);
    hoveredMenu.material.emissiveIntensity = 0.9;
    renderer.domElement.style.cursor = 'pointer';
  } else {
    renderer.domElement.style.cursor = 'default';
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   GAME CONTROL
   ══════════════════════════════════════════════════════════════════════════ */
function enterMenu() {
  state = STATES.MENU;
  menuPage = MENU_PAGES.MAIN;
  ui.showMenu(true);
  ui.hideAllPanels();
  ui.showPanel('panel-main', true);
  menuGroup.visible = false; // menu agora é 2D (HTML)
  previewGroup.visible = true;
  snake.group.visible = false;
  food.group.visible = false;

  // Jump camera to menu view — frontal, ao nível dos textos 3D
  camCtrl.resetPosition(
    // Um pouco mais alto e afastado para evitar enquadramentos “dentro” do cenário
    // (paredes/decorações) no arranque.
    new THREE.Vector3(0, 7.5, 20),
    new THREE.Vector3(0, 3.2, 0)
  );
  camCtrl.controls.enableRotate = false;
  renderer.domElement.style.cursor = 'default';
}

function startGame() {
  state = STATES.PLAYING;
  menuPage = MENU_PAGES.MAIN;
  score = 0;
  accumulator = 0;
  gameTimer = 0;
  ui.setScore(score);
  ui.setTimer(0);
  ui.showMenu(false);
  ui.showGameOver(false);
  ui.hideAllPanels();
  ui.showPanel('panel-main', false);

  menuGroup.visible = false;
  previewGroup.visible = false;
  snake.group.visible = true;
  food.group.visible = true;

  snake.reset();
  snake.setSkin(selectedSkinIndex);
  replay.clear();
  food.respawn(snake.segments, obstacles.getOccupiedPositions());

  stepDuration = levelMgr.speed;
  food.setAvailablePowerups(levelMgr.powerups);

  // Reset camera for gameplay (instant jump, bypasses damping)
  camCtrl.controls.enableRotate = true;
  camCtrl.resetPosition(
    new THREE.Vector3(0, 18, 14),
    new THREE.Vector3(0, 0, 0)
  );

  renderer.domElement.style.cursor = 'default';
  renderer.domElement.focus();
}

function handleGameOver() {
  state = STATES.GAMEOVER;

  // Atualizar high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('snake3d_highscore', highScore.toString());
    ui.setHighScore(highScore);
    ui.showNotification('🏆 NEW HIGH SCORE!', 'powerup');
  }

  ui.showGameOver(true, score, highScore);
}

function returnToMenu() {
  state = STATES.MENU;
  ui.showGameOver(false);
  enterMenu();
}

function togglePause() {
  if (state === STATES.PLAYING) {
    state = STATES.PAUSED;
    ui.showPause(true);
    camCtrl.setOrbitEnabled(true);
  } else if (state === STATES.PAUSED) {
    state = STATES.PLAYING;
    ui.showPause(false);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   INPUT HANDLING
   ══════════════════════════════════════════════════════════════════════════ */
function handleMovementKey(event) {
  if (state !== STATES.PLAYING) return false;
  const code = event.code;
  const key = (event.key || '').toLowerCase();
  if (code === 'ArrowLeft' || key === 'a') { snake.turnLeft(); return true; }
  if (code === 'ArrowRight' || key === 'd') { snake.turnRight(); return true; }
  if (code === 'ArrowUp' || key === 'w') { snake.setDirection(DIRS.up); return true; }
  if (code === 'ArrowDown' || key === 's') { snake.setDirection(DIRS.down); return true; }
  return false;
}

window.addEventListener('keydown', (e) => {
  const moved = handleMovementKey(e);
  if (moved) { e.preventDefault(); e.stopPropagation(); }

  // Câmara (C)
  if (e.code === 'KeyC') {
    camCtrl.switchCamera();
    postProc.setCamera(camCtrl.camera);
    ui.showNotification(camCtrl.isPerspective ? 'PERSPECTIVE CAM' : 'ORTHOGRAPHIC CAM', 'default');
  }

  // Luzes (1-4)
  if (e.code === 'Digit1') { lightMgr.toggle(0); ui.showNotification('AMBIENT LIGHT', 'default'); }
  if (e.code === 'Digit2') { lightMgr.toggle(1); ui.showNotification('DIRECTIONAL LIGHT', 'default'); }
  if (e.code === 'Digit3') { lightMgr.toggle(2); ui.showNotification('POINT LIGHT', 'default'); }
  if (e.code === 'Digit4') { lightMgr.toggle(3); ui.showNotification('HEMISPHERE LIGHT', 'default'); }

  // Espaço
  if (e.code === 'Space') {
    e.preventDefault();
    if (state === STATES.PLAYING || state === STATES.PAUSED) togglePause();
    if (state === STATES.MENU && menuPage === MENU_PAGES.MAIN) startGame();
    if (state === STATES.GAMEOVER) returnToMenu();
  }

  // Escape — voltar ao menu / fechar sub-menu
  if (e.code === 'Escape') {
    if (state === STATES.MENU && menuPage !== MENU_PAGES.MAIN) {
      closeSubMenu();
    } else if (state === STATES.PLAYING) {
      togglePause();
    } else if (state === STATES.PAUSED) {
      togglePause();
    }
  }

  // Replay (R)
  if (e.code === 'KeyR') {
    if (state === STATES.GAMEOVER) {
      const started = replay.toggleReplay();
      if (started) {
        state = STATES.REPLAY;
        snake.group.visible = true;
        ui.showGameOver(false);
        ui.showNotification('REPLAY MODE', 'default');
      }
    } else if (state === STATES.REPLAY) {
      replay.toggleReplay();
      state = STATES.GAMEOVER;
      ui.showGameOver(true, score, highScore);
    } else if (state === STATES.PLAYING) {
      // Noop during play — could restart here if desired
    }
  }

  // Post-Processing (M)
  if (e.code === 'KeyM') {
    const ppOn = postProc.toggle();
    ui.showNotification(`POST-FX: ${ppOn ? 'ON' : 'OFF'}`, 'default');
    ui.updateSettingToggle('setting-postfx', ppOn);
  }

  // Replay controls
  if (state === STATES.REPLAY) {
    if (e.code === 'Space') { e.preventDefault(); replay.togglePlay(); }
    if (e.code === 'KeyB') replay.rewind();
    if (e.code === 'KeyN') replay.cycleSpeed();
  }
});

// ---- Mouse ----
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('pointerdown', (e) => {
  renderer.domElement.focus();
  // Menu agora é 2D (HTML), então não há click 3D via raycaster.
});

// ---- Sub-menu back buttons ----
document.getElementById('btn-back-levels')?.addEventListener('click', closeSubMenu);
document.getElementById('btn-back-skins')?.addEventListener('click', closeSubMenu);
document.getElementById('btn-back-settings')?.addEventListener('click', closeSubMenu);

// ---- Settings toggles ----
document.getElementById('setting-postfx')?.addEventListener('click', () => {
  const ppOn = postProc.toggle();
  ui.updateSettingToggle('setting-postfx', ppOn);
});
document.getElementById('setting-shadows')?.addEventListener('click', () => {
  renderer.shadowMap.enabled = !renderer.shadowMap.enabled;
  ui.updateSettingToggle('setting-shadows', renderer.shadowMap.enabled);
});

// ---- Resize ----
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camCtrl.resize(w, h);
  renderer.setSize(w, h);
  postProc.resize(w, h);
});

/* ══════════════════════════════════════════════════════════════════════════
   GAME LOOP
   ══════════════════════════════════════════════════════════════════════════ */
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  // ---- Ambient particles (sempre visíveis) ----
  updateAmbientParticles(elapsed);

  // ---- Menu state ----
  if (state === STATES.MENU) {
    updatePreviewSnake(elapsed);

    camCtrl.update();
    postProc.update(elapsed, delta);
    postProc.setCamera(camCtrl.camera);
    postProc.render();
    return;
  }

  // ---- Playing state ----
  if (state === STATES.PLAYING) {
    gameTimer += delta;
    ui.setTimer(gameTimer);

    snake.updatePowerUps(delta);
    const effectiveStep = stepDuration / snake.speedMultiplier;

    accumulator += delta;
    while (accumulator >= effectiveStep) {
      accumulator -= effectiveStep;

      const result = snake.updateStep(food.cell, (pos) => obstacles.checkCollision(pos));

      if (result.ate) {
        const itemType = food.type;

        if (itemType === ITEM_TYPES.SHIELD) {
          snake.activateShield();
          ui.showNotification('🛡️ SHIELD ACTIVE!', 'powerup');
        } else if (itemType === ITEM_TYPES.PORTAL) {
          const safePos = new THREE.Vector3(0, 0, 0);
          snake.segments[0].copy(safePos);
          ui.showNotification('🌀 PORTAL TELEPORT!', 'powerup');
        } else {
          score += 1;
          ui.setScore(score);
        }

        food.emitCollectParticles(food.cell.clone(), food.getCollectColor());

        if (itemType !== ITEM_TYPES.FOOD) {
          score += 3;
          ui.setScore(score);
        }

        if (levelMgr.shouldAdvance(score)) {
          levelMgr.advanceLevel().then(newLevel => {
            if (newLevel) {
              stepDuration = newLevel.speed;
              food.setAvailablePowerups(levelMgr.powerups);
              food.respawn(snake.segments, obstacles.getOccupiedPositions());
              ui.showNotification('LEVEL UP!', 'powerup');
            }
          });
        }

        food.respawn(snake.segments, obstacles.getOccupiedPositions());
      }

      if (result.dead) {
        handleGameOver();
      }

      replay.record(snake.segments, snake.direction, score);
    }
  }

  // ---- Replay state ----
  if (state === STATES.REPLAY) {
    const frame = replay.update(delta);
    if (frame) renderReplayFrame(frame);
  }

  // ---- Continuous animations ----
  const alpha = stepDuration > 0 ? accumulator / stepDuration : 1;

  if (state === STATES.PLAYING || state === STATES.PAUSED) {
    snake.render(alpha);
  }

  food.update(elapsed);
  food.updateParticles(delta);
  obstacles.update(elapsed, delta);
  levelMgr.updateDecorations(elapsed);

  lightMgr.setPointLightPosition(food.cell.x, 1.3, food.cell.z);
  lightMgr.pulsePointLight(elapsed);

  if (state === STATES.PLAYING || state === STATES.REPLAY) {
    camCtrl.followSnake(snake.headPosition, snake.direction);
  }
  camCtrl.update();

  postProc.update(elapsed, delta);
  postProc.setCamera(camCtrl.camera);
  postProc.render();
}

/* ══════════════════════════════════════════════════════════════════════════
   REPLAY RENDERING
   ══════════════════════════════════════════════════════════════════════════ */
function renderReplayFrame(frame) {
  const segments = frame.segments;

  while (snake.group.children.length < segments.length) {
    const isHead = snake.group.children.length === 0;
    const mesh = new THREE.Mesh(
      isHead ? snake.headGeometry : snake.bodyGeometry,
      isHead ? snake.headMaterial : snake.bodyMaterial
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    snake.group.add(mesh);
  }
  while (snake.group.children.length > segments.length) {
    const mesh = snake.group.children[snake.group.children.length - 1];
    snake.group.remove(mesh);
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const mesh = snake.group.children[i];
    if (mesh) {
      mesh.position.set(seg.x, 0.38, seg.z);
      if (i === 0) {
        const dir = frame.direction;
        mesh.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;
      }
    }
  }

  if (segments.length > 0) {
    snake.segments[0] = new THREE.Vector3(segments[0].x, segments[0].y, segments[0].z);
    snake.direction.set(frame.direction.x, frame.direction.y, frame.direction.z);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   START
   ══════════════════════════════════════════════════════════════════════════ */
init();
