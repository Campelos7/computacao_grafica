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

import {
  COMBO_WINDOW,
  COMBO_DECAY,
  COMBO_MULTIPLIERS,
  STORAGE_KEYS,
  RENDER,
  SCENE_DEFAULTS,
  ROUND_COUNTDOWN_SECONDS,
} from './config/gameConfig.js';
import {
  DIRS,
  BOARD_SIZE,
  gridToWorldX,
  gridToWorldZ,
  DIFFICULTY_LEVELS,
  getShieldSpawnInterval,
  SHIELD_DURATION_SECONDS,
  getObstacleConfigsForPlay,
  getSnakeStepDuration,
  SNAKE_STEP_REFERENCE_SECONDS,
} from './utils/helpers.js';
import { UIManager } from './UIManager.js';
import { LightManager } from './LightManager.js';
import { CameraController } from './CameraController.js';
import { ReplaySystem } from './ReplaySystem.js';
import { PostProcessing } from './PostProcessing.js';
import { LevelManager } from './LevelManager.js';
import { Obstacles } from './Obstacles.js';
import { Snake, SNAKE_SKINS } from './snake.js';
import { Food, ITEM_TYPES } from './food.js';
import { SoundManager } from './SoundManager.js';

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
  DIFFICULTY: 'difficulty',
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.pixelRatioMax));
renderer.shadowMap.enabled = true;
// Sombras suaves (PCFSoft) são caras; BasicShadowMap costuma ser suficiente aqui.
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = RENDER.toneMappingExposure;
renderer.domElement.tabIndex = 1;
app.appendChild(renderer.domElement);

// ---- Scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(SCENE_DEFAULTS.background);
scene.fog = new THREE.Fog(
  SCENE_DEFAULTS.fogColor,
  SCENE_DEFAULTS.fogNear,
  SCENE_DEFAULTS.fogFar
);

// ---- Managers ----
const ui = new UIManager();
const camCtrl = new CameraController(renderer.domElement);
const lightMgr = new LightManager(scene, ui);
const obstacles = new Obstacles(scene);
const levelMgr = new LevelManager(scene, obstacles, lightMgr, ui);
const snake = new Snake(scene);
const food = new Food(scene);
const replay = new ReplaySystem(ui);
const sound = new SoundManager();
const postProc = new PostProcessing(renderer, scene, camCtrl.camera);

ui.setLoadingProgress(5, 'Initializing...');

// ---- Game State ----
let state = STATES.LOADING;
let menuPage = MENU_PAGES.MAIN;
let score = 0;
let stepDuration = 0.15;
let accumulator = 0;
let gameTimer = 0;

// ---- Death Effect State ----
let deathParticles = [];
let deathShakeTimer = 0;
let deathSlowMotion = false;
let deathSlowTimer = 0;
let deathDelayTimer = 0;
let pendingGameOver = false;
const deathFlash = document.getElementById('death-flash');
const hudSound = document.getElementById('hud-sound');
const clock = new THREE.Clock();

/** Ignora pausa / SPACE até passar este instante (evita auto-repeat e tecla “presa” ao iniciar). */
let gameInputGraceUntil = 0;

/** Segundos até o primeiro passo lógico após PLAY (câmara + input). */
let roundCountdown = 0;

let lastFpsCapMs = 0;

/** Preferências persistidas (SETTINGS). */
const appSettings = {
  uiScale: 100,
  maxFps: 0,
  highContrastFloor: false,
  keysMode: 'both',
};

function loadAppSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (o.uiScale === 100 || o.uiScale === 125) appSettings.uiScale = o.uiScale;
    if (o.maxFps === 0 || o.maxFps === 30 || o.maxFps === 60) appSettings.maxFps = o.maxFps;
    if (typeof o.highContrastFloor === 'boolean') appSettings.highContrastFloor = o.highContrastFloor;
    if (o.keysMode === 'both' || o.keysMode === 'arrows-only') appSettings.keysMode = o.keysMode;
  } catch (_) { /* ignore */ }
}

function saveAppSettings() {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appSettings));
  } catch (_) { /* ignore */ }
}

function applyAppSettingsToDom() {
  document.body.classList.remove('ui-scale-100', 'ui-scale-125');
  document.body.classList.add(appSettings.uiScale >= 125 ? 'ui-scale-125' : 'ui-scale-100');
  levelMgr.setHighContrastFloor(appSettings.highContrastFloor);
}

function syncSettingsPanel() {
  ui.updateSettingToggle('setting-postfx', postProc.enabled);
  ui.updateSettingToggle('setting-shadows', renderer.shadowMap.enabled);
  const elScale = document.getElementById('setting-ui-scale');
  if (elScale) {
    elScale.textContent = `${appSettings.uiScale}%`;
    elScale.classList.toggle('active', appSettings.uiScale >= 125);
  }
  const elFps = document.getElementById('setting-max-fps');
  if (elFps) {
    elFps.textContent = appSettings.maxFps === 0 ? 'OFF' : `${appSettings.maxFps}`;
    elFps.classList.toggle('active', appSettings.maxFps > 0);
  }
  const elHc = document.getElementById('setting-high-contrast-floor');
  if (elHc) {
    elHc.textContent = appSettings.highContrastFloor ? 'ON' : 'OFF';
    elHc.classList.toggle('active', appSettings.highContrastFloor);
  }
  const elKeys = document.getElementById('setting-keys-mode');
  if (elKeys) {
    elKeys.textContent = appSettings.keysMode === 'arrows-only' ? 'SÓ SETAS' : 'WASD+SETAS';
    elKeys.classList.toggle('active', appSettings.keysMode === 'both');
  }
}

function applyLevelVisualTheme(level) {
  const theme = level?.theme || {};
  // Exposição (tone mapping) por nível
  if (theme.exposure != null) {
    renderer.toneMappingExposure = theme.exposure;
  } else {
    renderer.toneMappingExposure = RENDER.toneMappingExposure;
  }

  // Bloom por nível (PostProcessing)
  if (theme.bloomStrength != null) {
    postProc.setBloomStrength(theme.bloomStrength);
  }
}

// ---- Combo System (parâmetros: js/config/gameConfig.js) ----
let comboCount = 0;
let comboTimer = 0;
let lastEatTime = -999;

// ---- Selections ----
let selectedLevelIndex = 0;
let selectedSkinIndex = 0;

function loadStoredDifficultyIndex() {
  const raw = localStorage.getItem(STORAGE_KEYS.DIFFICULTY);
  if (raw == null) return 1;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n >= DIFFICULTY_LEVELS.length) return 1;
  return n;
}

let selectedDifficultyIndex = loadStoredDifficultyIndex();

/** Maçãs (comida normal) comidas nesta partida — usado para intervalo do escudo. */
let applesEatenThisRun = 0;

function refreshHudLevelLine() {
  const lv = levelMgr.currentLevel;
  if (!lv) return;
  const diff = DIFFICULTY_LEVELS[selectedDifficultyIndex] ?? DIFFICULTY_LEVELS[1];
  ui.setLevel(`${lv.name} · ${diff.label}`);
}

/** Aplica dificuldade: velocidade, animação dos obstáculos, e **quais** obstáculos existem (mapa + modo). */
function applyDifficultySettings() {
  const diff = DIFFICULTY_LEVELS[selectedDifficultyIndex] ?? DIFFICULTY_LEVELS[1];
  const lv = levelMgr.currentLevel;
  stepDuration = lv ? getSnakeStepDuration(lv, selectedDifficultyIndex) : SNAKE_STEP_REFERENCE_SECONDS * diff.snakeStepMult;
  obstacles.setDifficultyMultiplier(diff.obstacleSpeedMult);

  if (lv) {
    const configs = getObstacleConfigsForPlay(lv, selectedDifficultyIndex);
    obstacles.generate(configs, levelMgr.biome);
  }

  refreshHudLevelLine();
}

/**
 * Após comer um item, spawna o próximo (maçã ou escudo conforme dificuldade).
 * Intervalos: ver SHIELD_SPAWN_EVERY_N_APPLES em js/config/gameConfig.js.
 */
function respawnFoodAfterEat(ateItemType) {
  if (ateItemType === ITEM_TYPES.FOOD) {
    applesEatenThisRun++;
  }
  const everyN = getShieldSpawnInterval(selectedDifficultyIndex);
  const forceShield =
    everyN != null
    && ateItemType === ITEM_TYPES.FOOD
    && applesEatenThisRun > 0
    && applesEatenThisRun % everyN === 0;

  food.respawn(snake.segments, obstacles.getOccupiedPositions(), { forceShield });
}

// ---- High Score (localStorage) ----
let highScore = parseInt(localStorage.getItem(STORAGE_KEYS.HIGHSCORE) || '0', 10);
ui.setHighScore(highScore);

// ---- 3D Menu (desligado: UI é 2D) ----
const menuGroup = new THREE.Group();
menuGroup.name = 'menu3d';
scene.add(menuGroup);
let menuFont = null;
const menuItems = [];
// Nota: o menu activo é 2D (HTML). O raycaster/hover 3D foi desactivado para performance.

// ---- 2D Main Menu buttons ----
ui.btnMenuPlay?.addEventListener('click', () => {
  if (state === STATES.MENU) { sound.playMenuSelect(); startGame(); }
});
ui.btnMenuLevels?.addEventListener('click', () => {
  if (state === STATES.MENU) { sound.playMenuSelect(); openSubMenu(MENU_PAGES.LEVELS); }
});
ui.btnMenuDifficulty?.addEventListener('click', () => {
  if (state === STATES.MENU) { sound.playMenuSelect(); openSubMenu(MENU_PAGES.DIFFICULTY); }
});
ui.btnMenuSkins?.addEventListener('click', () => {
  if (state === STATES.MENU) { sound.playMenuSelect(); openSubMenu(MENU_PAGES.SKINS); }
});
ui.btnMenuSettings?.addEventListener('click', () => {
  if (state === STATES.MENU) { sound.playMenuSelect(); openSubMenu(MENU_PAGES.SETTINGS); }
});

ui.btnPauseMenu?.addEventListener('click', () => {
  if (state === STATES.PAUSED) {
    sound.playMenuSelect();
    quitFromPauseToMenu();
  }
});

// ---- Sound toggle click ----
hudSound?.addEventListener('click', () => {
  const muted = sound.toggleMute();
  if (hudSound) {
    hudSound.textContent = muted ? '🔇' : '🔊';
    hudSound.classList.toggle('muted', muted);
  }
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
    const initialLevel = await levelMgr.loadLevel(0, true); // skip transition on init
    loadAppSettings();
    applyAppSettingsToDom();
    applyDifficultySettings();
    applyLevelVisualTheme(initialLevel);

    ui.setLoadingProgress(85, 'Creating menu...');
    createMenu3D();
    // Menu deve ser super fluido: menos partículas no fundo.
    createAmbientParticles(30);
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
  // Menos segmentos no preview para reduzir custo de drawcalls.
  const segCount = 6;
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

// (handleMenuClick removido — menu é HTML)

function openSubMenu(page) {
  menuPage = page;
  ui.hideAllPanels();
  ui.showPanel('panel-main', false);

  if (page === MENU_PAGES.LEVELS) {
    ui.populateLevelGrid(levelMgr.levels, selectedLevelIndex, (i) => {
      selectedLevelIndex = i;
      levelMgr.loadLevel(i, true).then(() => { // skip transition in menu
        applyDifficultySettings();
        applyLevelVisualTheme(levelMgr.currentLevel);
      });
    });
    ui.showPanel('panel-levels', true);
  }

  if (page === MENU_PAGES.DIFFICULTY) {
    ui.populateDifficultyGrid(DIFFICULTY_LEVELS, selectedDifficultyIndex, (i) => {
      selectedDifficultyIndex = i;
      localStorage.setItem(STORAGE_KEYS.DIFFICULTY, String(i));
      applyDifficultySettings();
    });
    ui.showPanel('panel-difficulty', true);
  }

  if (page === MENU_PAGES.SKINS) {
    ui.populateSkinGrid(SNAKE_SKINS, selectedSkinIndex, (i) => {
      selectedSkinIndex = i;
      snake.setSkin(i);
    });
    ui.showPanel('panel-skins', true);
  }

  if (page === MENU_PAGES.SETTINGS) {
    syncSettingsPanel();
    ui.showPanel('panel-settings', true);
  }
}

function closeSubMenu() {
  menuPage = MENU_PAGES.MAIN;
  ui.hideAllPanels();
  ui.showPanel('panel-main', true);
}

// (updateMenuRaycaster removido — menu é HTML)

/* ══════════════════════════════════════════════════════════════════════════
   GAME CONTROL
   ══════════════════════════════════════════════════════════════════════════ */
function enterMenu() {
  state = STATES.MENU;
  menuPage = MENU_PAGES.MAIN;
  ui.showPause(false);
  ui.showMenu(true);
  ui.hideAllPanels();
  ui.showPanel('panel-main', true);
  menuGroup.visible = false; // menu agora é 2D (HTML)
  previewGroup.visible = true;
  snake.group.visible = false;
  food.group.visible = false;
  // Menu deve ser leve: esconder cenário pesado e obstáculos.
  levelMgr.setEnvironmentVisible(false);
  obstacles.setVisible(false);
  // E também desligar sombras no menu (reanima no startGame consoante setting).
  renderer.shadowMap.enabled = false;
  ui.updateSettingToggle('setting-shadows', renderer.shadowMap.enabled);

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
  roundCountdown = ROUND_COUNTDOWN_SECONDS;
  gameInputGraceUntil = performance.now() + 320 + ROUND_COUNTDOWN_SECONDS * 1000;
  ui.showPause(false);
  ui.hideRoundCountdown();
  score = 0;
  accumulator = 0;
  gameTimer = 0;
  comboCount = 0;
  comboTimer = 0;
  lastEatTime = -999;
  deathParticles = [];
  deathShakeTimer = 0;
  deathSlowMotion = false;
  deathSlowTimer = 0;
  deathDelayTimer = 0;
  pendingGameOver = false;
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
  levelMgr.setEnvironmentVisible(true);
  obstacles.setVisible(true);
  // Restaurar sombras para gameplay (utilizador ainda pode togglar nas settings).
  renderer.shadowMap.enabled = true;
  ui.updateSettingToggle('setting-shadows', renderer.shadowMap.enabled);

  snake.reset();
  snake.setSkin(selectedSkinIndex);
  snake.clearTrail();
  replay.clear();
  applesEatenThisRun = 0;

  // Obstáculos primeiro: respawn da comida deve usar a grelha actual (evita maçã dentro de muro / 1.º passo inválido).
  applyDifficultySettings();
  food.respawn(snake.segments, obstacles.getOccupiedPositions(), { forceShield: false });

  // Iniciar música de fundo
  sound.startMusic();

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
  // ── Efeito de morte dramático ──
  sound.playDeath();
  sound.stopMusic();

  // Flash vermelho
  if (deathFlash) {
    deathFlash.classList.add('active');
    setTimeout(() => deathFlash.classList.remove('active'), 150);
  }

  // Explosão de partículas
  deathParticles = snake.explode();
  deathShakeTimer = 0.5; // 0.5s de camera shake
  pendingGameOver = true;
  deathDelayTimer = 1.4; // delay antes de mostrar overlay

  // Atualizar high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(STORAGE_KEYS.HIGHSCORE, highScore.toString());
    ui.setHighScore(highScore);
  }
}

/** Actualiza partículas da explosão de morte */
function updateDeathParticles(delta) {
  for (let i = deathParticles.length - 1; i >= 0; i--) {
    const p = deathParticles[i];
    p.userData.life -= delta * p.userData.decay;
    // Evitar alocação por frame (clone)
    p.position.addScaledVector(p.userData.velocity, delta);
    p.userData.velocity.y -= 12 * delta; // gravidade forte
    p.material.opacity = Math.max(0, p.userData.life);
    p.scale.setScalar(Math.max(0.1, p.userData.life));
    p.rotation.x += p.userData.spin * delta;
    p.rotation.z += p.userData.spin * delta * 0.5;

    if (p.userData.life <= 0) {
      scene.remove(p);
      p.geometry.dispose();
      p.material.dispose();
      deathParticles.splice(i, 1);
    }
  }
}

function returnToMenu() {
  state = STATES.MENU;
  ui.showPause(false);
  ui.showGameOver(false);
  enterMenu();
}

/** Abandona a partida em pausa e volta ao menu principal. */
function quitFromPauseToMenu() {
  if (state !== STATES.PAUSED) return;
  ui.showPause(false);
  sound.stopMusic();
  replay.clear();
  returnToMenu();
}

function togglePause() {
  if (performance.now() < gameInputGraceUntil) return;
  if (state === STATES.PLAYING) {
    state = STATES.PAUSED;
    ui.showPause(true);
    camCtrl.setOrbitEnabled(true);
  } else if (state === STATES.PAUSED) {
    state = STATES.PLAYING;
    ui.showPause(false);
    sound.playResume();
    ui.flashHudResume();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   INPUT HANDLING
   ══════════════════════════════════════════════════════════════════════════ */
function handleMovementKey(event) {
  if (state !== STATES.PLAYING) return false;
  const code = event.code;
  const key = (event.key || '').toLowerCase();
  const arrowsOnly = appSettings.keysMode === 'arrows-only';

  const left = code === 'ArrowLeft' || (!arrowsOnly && (code === 'KeyA' || key === 'a'));
  const right = code === 'ArrowRight' || (!arrowsOnly && (code === 'KeyD' || key === 'd'));
  const up = code === 'ArrowUp' || (!arrowsOnly && (code === 'KeyW' || key === 'w'));
  const down = code === 'ArrowDown' || (!arrowsOnly && (code === 'KeyS' || key === 's'));

  if (left) { snake.turnLeft(); return true; }
  if (right) { snake.turnRight(); return true; }
  if (up) { snake.setDirection(DIRS.up); return true; }
  if (down) { snake.setDirection(DIRS.down); return true; }
  return false;
}

window.addEventListener('keydown', (e) => {
  const moved = handleMovementKey(e);
  if (moved) { e.preventDefault(); e.stopPropagation(); }

  // Câmara (C)
  if (e.code === 'KeyC') {
    camCtrl.switchCamera();
    sound.playMenuSelect();
    postProc.setCamera(camCtrl.camera);
    ui.showNotification(camCtrl.isPerspective ? 'PERSPECTIVE CAM' : 'ORTHOGRAPHIC CAM', 'default');
  }

  // Luzes (1-4)
  if (e.code === 'Digit1') { lightMgr.toggle(0); ui.showNotification('DIRECTIONAL LIGHT', 'default'); }
  if (e.code === 'Digit2') { lightMgr.toggle(1); ui.showNotification('SPOTLIGHT', 'default'); }
  if (e.code === 'Digit3') { lightMgr.toggle(2); ui.showNotification('POINT LIGHT', 'default'); }
  if (e.code === 'Digit4') { lightMgr.toggle(3); ui.showNotification('AMBIENT LIGHT', 'default'); }

  // Som (P)
  if (e.code === 'KeyP') {
    const muted = sound.toggleMute();
    if (hudSound) {
      hudSound.textContent = muted ? '🔇' : '🔊';
      hudSound.classList.toggle('muted', muted);
    }
    ui.showNotification(`SOM: ${muted ? 'OFF' : 'ON'}`, 'default');
  }

  // Espaço — em replay trata-se aqui; nos outros estados ignorar auto-repeat (evita PLAY+pausa com tecla presa)
  if (e.code === 'Space') {
    e.preventDefault();
    if (state === STATES.REPLAY) {
      replay.togglePlay();
      return;
    }
    if (e.repeat) return;
    if (state === STATES.PLAYING || state === STATES.PAUSED) togglePause();
    if (state === STATES.MENU && menuPage === MENU_PAGES.MAIN) { sound.playMenuSelect(); startGame(); }
    if (state === STATES.GAMEOVER) returnToMenu();
  }

  // Escape — voltar ao menu / fechar sub-menu (sem auto-repeat para não “duplicar” pausa)
  if (e.code === 'Escape') {
    if (e.repeat) return;
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

  // Replay controls (Space já tratado acima)
  if (state === STATES.REPLAY) {
    if (e.code === 'KeyB') replay.rewind();
    if (e.code === 'KeyN') replay.cycleSpeed();
  }
});

window.addEventListener('pointerdown', (e) => {
  renderer.domElement.focus();
  // Menu agora é 2D (HTML), então não há click 3D via raycaster.
});

// ---- Sub-menu back buttons ----
document.getElementById('btn-back-levels')?.addEventListener('click', closeSubMenu);
document.getElementById('btn-back-skins')?.addEventListener('click', closeSubMenu);
document.getElementById('btn-back-settings')?.addEventListener('click', closeSubMenu);
document.getElementById('btn-back-difficulty')?.addEventListener('click', closeSubMenu);

// ---- Settings toggles ----
document.getElementById('setting-postfx')?.addEventListener('click', () => {
  const ppOn = postProc.toggle();
  ui.updateSettingToggle('setting-postfx', ppOn);
});
document.getElementById('setting-shadows')?.addEventListener('click', () => {
  renderer.shadowMap.enabled = !renderer.shadowMap.enabled;
  ui.updateSettingToggle('setting-shadows', renderer.shadowMap.enabled);
});

document.getElementById('setting-ui-scale')?.addEventListener('click', () => {
  if (state !== STATES.MENU) return;
  appSettings.uiScale = appSettings.uiScale >= 125 ? 100 : 125;
  applyAppSettingsToDom();
  saveAppSettings();
  syncSettingsPanel();
});

document.getElementById('setting-max-fps')?.addEventListener('click', () => {
  if (state !== STATES.MENU) return;
  const cycle = [0, 30, 60];
  const i = Math.max(0, cycle.indexOf(appSettings.maxFps));
  appSettings.maxFps = cycle[(i + 1) % cycle.length];
  saveAppSettings();
  syncSettingsPanel();
});

document.getElementById('setting-high-contrast-floor')?.addEventListener('click', () => {
  if (state !== STATES.MENU) return;
  appSettings.highContrastFloor = !appSettings.highContrastFloor;
  applyAppSettingsToDom();
  saveAppSettings();
  syncSettingsPanel();
});

document.getElementById('setting-keys-mode')?.addEventListener('click', () => {
  if (state !== STATES.MENU) return;
  appSettings.keysMode = appSettings.keysMode === 'arrows-only' ? 'both' : 'arrows-only';
  saveAppSettings();
  syncSettingsPanel();
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
function animate(now = performance.now()) {
  requestAnimationFrame(animate);
  if (appSettings.maxFps > 0) {
    const ms = 1000 / appSettings.maxFps;
    if (now - lastFpsCapMs < ms) return;
    lastFpsCapMs = now;
  }
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  // ---- Ambient particles (sempre visíveis) ----
  updateAmbientParticles(elapsed);

  // ---- Menu state ----
  if (state === STATES.MENU) {
    updatePreviewSnake(elapsed);

    camCtrl.update(delta);
    postProc.update(elapsed, delta);
    postProc.setCamera(camCtrl.camera);
    postProc.render();
    return;
  }

  // ---- Death effect update ----
  if (pendingGameOver) {
    updateDeathParticles(delta);

    // Camera shake
    if (deathShakeTimer > 0) {
      deathShakeTimer -= delta;
      const intensity = deathShakeTimer * 0.8;
      camCtrl.camera.position.x += Math.sin(elapsed * 50) * intensity;
      camCtrl.camera.position.z += Math.cos(elapsed * 40) * intensity;
    }

    deathDelayTimer -= delta;
    if (deathDelayTimer <= 0 && pendingGameOver) {
      pendingGameOver = false;
      state = STATES.GAMEOVER;
      if (score > highScore) {
        ui.showNotification('🏆 NEW HIGH SCORE!', 'powerup');
      }
      ui.showGameOver(true, score, highScore);
    }

    // Continuar a renderizar durante a morte
    camCtrl.update(delta);
    food.updateParticles(delta);
    obstacles.update(elapsed, delta);
    levelMgr.updateDecorations(elapsed);
    lightMgr.pulsePointLight(elapsed);
    postProc.update(elapsed, delta);
    postProc.setCamera(camCtrl.camera);
    postProc.render();
    return;
  }

  // ---- Playing state ----
  if (state === STATES.PLAYING) {
    if (roundCountdown > 0) {
      roundCountdown -= delta;
      ui.setRoundCountdown(roundCountdown);
      if (roundCountdown <= 0) {
        roundCountdown = 0;
        ui.hideRoundCountdown();
        accumulator = 0;
      }
    }

    const inPlay = roundCountdown <= 0;

    if (inPlay) {
      gameTimer += delta;
      ui.setTimer(gameTimer);
    }

    // Combo: decaimento do multiplicador (barra no HUD; ver gameConfig — modelo documentado)
    if (comboCount > 0 && inPlay) {
      comboTimer -= delta;
      if (comboTimer <= 0) {
        comboCount = 0;
        comboTimer = 0;
        ui.hideCombo();
      }
    }

    if (comboCount >= 2 && inPlay) {
      const mult = COMBO_MULTIPLIERS[Math.min(comboCount, COMBO_MULTIPLIERS.length - 1)];
      ui.updateComboHud(comboCount, mult, Math.max(0, comboTimer), COMBO_DECAY);
    } else if (comboCount < 2) {
      ui.hideCombo();
    }

    // Power-up timer UI update
    if (snake.shieldActive && snake.shieldMesh) {
      ui.updatePowerUpTimer(
        'shield',
        true,
        snake.shieldTimeRemaining,
        SHIELD_DURATION_SECONDS
      );
    } else {
      ui.hidePowerUp();
    }

    snake.updatePowerUps(delta);
    const effectiveStep = stepDuration;

    if (inPlay) {
      accumulator += delta;
      while (accumulator >= effectiveStep) {
        accumulator -= effectiveStep;

        const result = snake.updateStep(food.cell, (pos) => obstacles.checkCollision(pos));

        if (result.ate) {
          const itemType = food.type;
          sound.playEat();

          const nowT = clock.elapsedTime;
          const timeSinceLastEat = nowT - lastEatTime;
          lastEatTime = nowT;

          if (timeSinceLastEat <= COMBO_WINDOW) {
            comboCount++;
            comboTimer = COMBO_DECAY;
          } else {
            comboCount = 1;
            comboTimer = 0;
            ui.hideCombo();
          }
          const comboMult = COMBO_MULTIPLIERS[Math.min(comboCount, COMBO_MULTIPLIERS.length - 1)];

          if (itemType === ITEM_TYPES.SHIELD) {
            snake.activateShield();
            sound.playPowerup();
            ui.showNotification('🛡️ SHIELD ACTIVE!', 'powerup');
            ui.showPowerUp('shield');
          } else {
            const pts = Math.floor(1 * comboMult);
            score += pts;
            ui.setScore(score);
          }

          food.emitCollectParticles(food.cell.clone(), food.getCollectColor());

          if (itemType !== ITEM_TYPES.FOOD) {
            const pts = Math.floor(3 * comboMult);
            score += pts;
            ui.setScore(score);
          }

          if (comboCount >= 2) {
            sound.playCombo();
          }

          respawnFoodAfterEat(itemType);
        }

        snake.emitTrail();

        if (result.dead) {
          comboCount = 0;
          comboTimer = 0;
          lastEatTime = -999;
          ui.hideCombo();
          ui.hidePowerUp();
          handleGameOver();
        }

        replay.record(snake.segments, snake.direction, score);
      }
    }
  }

  // ---- Replay state ----
  if (state === STATES.REPLAY) {
    const frame = replay.update(delta);
    if (frame) renderReplayFrame(frame);
  }

  // ---- Trail update ----
  snake.updateTrail(delta);

  // ---- Continuous animations ----
  const alpha = stepDuration > 0 ? accumulator / stepDuration : 1;

  if (state === STATES.PLAYING || state === STATES.PAUSED) {
    snake.render(alpha);
  }

  food.update(elapsed);
  food.updateParticles(delta);
  obstacles.update(elapsed, delta);
  levelMgr.updateDecorations(elapsed);

  lightMgr.setPointLightPosition(gridToWorldX(food.cell.x), 1.8, gridToWorldZ(food.cell.z));
  lightMgr.pulsePointLight(elapsed);
  if (snake.headPosition) {
    const hw =
      state === STATES.PLAYING || state === STATES.PAUSED
        ? snake.getHeadWorldInterpolated(alpha)
        : snake.headWorldPosition;
    lightMgr.setSpotLightTarget(hw.x, 0, hw.z);
  }

  if (state === STATES.PLAYING || state === STATES.REPLAY) {
    const headFollow =
      state === STATES.PLAYING ? snake.getHeadWorldInterpolated(alpha) : snake.headWorldPosition;
    camCtrl.followSnake(headFollow, snake.direction);
  }
  camCtrl.update(delta);

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
      mesh.position.set(gridToWorldX(seg.x), 0.38, gridToWorldZ(seg.z));
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
