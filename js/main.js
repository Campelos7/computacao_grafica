/* ==========================================================================
   main.js — Orquestrador principal do jogo Snake Retro 3D
   Parâmetros de render/sombra/cobra: `js/gameConfig.js` → `RENDER`.
   
   Requisitos cobertos:
   - R1: Objetos 3D complexos   - R2: Toggle câmara (C)
   - R3: 4 luzes (1-4)          - R4: Teclado + rato (Orbit na pausa) + UI HTML
  - R5: Animação  - Post-processing (M)
   - Níveis JSON   - Power-ups   - Skins   - High Score
   ========================================================================== */
import * as THREE from 'three';

import { DIRS, BOARD_SIZE, gridCellCenterWorldX, gridCellCenterWorldZ } from './utils/helpers.js';
import { UIManager } from './UIManager.js';
import { LightManager } from './LightManager.js';
import { CameraController } from './CameraController.js';
import { PostProcessing } from './PostProcessing.js';
import { LevelManager } from './LevelManager.js';
import { loadDecorModels } from './ModelLoader.js';
import { Obstacles } from './Obstacles.js';
import { Snake, SNAKE_SKINS, createSkinHeadPreview } from './snake/index.js';
import { Food } from './food.js';
import { SoundManager } from './SoundManager.js';
import { RENDER, getRendererShadowMapType, SHIELD } from './gameConfig.js';

window.__snakeBootStarted = true;

/* ══════════════════════════════════════════════════════════════════════════
   STATES
   ══════════════════════════════════════════════════════════════════════════ */
const STATES = {
  LOADING: 'loading',
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
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

/** @see {@link ./gameConfig.js} — `RENDER` */
const MAX_PIXEL_RATIO = RENDER.maxPixelRatio;
const RENDER_SCALE = RENDER.internalScale;
const MAX_SNAKE_STEPS_PER_FRAME = RENDER.maxSnakeStepsPerFrame;

// ---- Renderer (sem MSAA: o EffectComposer já re-renderiza tudo; MSAA duplicava custo GPU)
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.sortObjects = RENDER.sortObjects;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = getRendererShadowMapType(THREE);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = RENDER.toneMappingExposureDefault;
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
const sound = new SoundManager();
const postProc = new PostProcessing(renderer, scene, camCtrl.camera);

function syncRendererSize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const rw = Math.max(320, Math.floor(w * RENDER_SCALE));
  const rh = Math.max(240, Math.floor(h * RENDER_SCALE));
  camCtrl.resize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setSize(rw, rh, false);
  renderer.domElement.style.width = `${w}px`;
  renderer.domElement.style.height = `${h}px`;
  postProc.resize(rw, rh);
}

syncRendererSize();

ui.setLoadingProgress(5, 'Initializing...');

// ---- Game State ----
let state = STATES.LOADING;
let menuPage = MENU_PAGES.MAIN;
/** `true` quando o painel DEFINIÇÕES foi aberto a partir da pausa (voltar reabre a pausa, não o menu). */
let settingsOpenedFromPause = false;
let score = 0;
let stepDuration = 0.15;
let accumulator = 0;
let gameTimer = 0;
let lastHudTimerTick = -1;
/** Segundos restantes em que colisão com *movingWall* não mata (definido pela dificuldade). */
let movingWallGraceRemaining = 0;

// ---- Death Effect State ----
let deathShakeTimer = 0;
let deathSlowMotion = false;
let deathSlowTimer = 0;
let deathDelayTimer = 0;
let pendingGameOver = false;
const deathFlash = document.getElementById('death-flash');
const hudSound = document.getElementById('hud-sound');
const clock = new THREE.Clock();
let animationStarted = false;

function applyLevelVisualTheme(level) {
  const theme = level?.theme || {};
  // Exposição (tone mapping) por nível
  if (theme.exposure != null) {
    renderer.toneMappingExposure = theme.exposure;
  } else {
    renderer.toneMappingExposure = RENDER.toneMappingExposureDefault;
  }

  // Bloom por nível (PostProcessing)
  if (theme.bloomStrength != null) {
    postProc.setBloomStrength(theme.bloomStrength);
  }
}

let selectedMapIndex = 0;
let selectedDifficulty = 'easy';
let selectedSkinIndex = 0;
sound.applyDifficultyPreset(selectedDifficulty);

// ---- High Score (localStorage) ----
let highScore = parseInt(localStorage.getItem('snake3d_highscore') || '0', 10);
ui.setHighScore(highScore);

// (Menu 3D removido — o menu é agora 100% HTML/2D)

// ---- 2D Main Menu buttons ----
ui.btnMenuPlay?.addEventListener('click', () => {
  if (state === STATES.MENU) { sound.playMenuSelect(); startGame(); }
});
ui.btnMenuLevels?.addEventListener('click', () => {
  if (state === STATES.MENU) { sound.playMenuSelect(); openSubMenu(MENU_PAGES.LEVELS); }
});
ui.btnMenuSkins?.addEventListener('click', () => {
  if (state === STATES.MENU) { sound.playMenuSelect(); openSubMenu(MENU_PAGES.SKINS); }
});
ui.btnMenuSettings?.addEventListener('click', () => {
  if (state === STATES.MENU) { sound.playMenuSelect(); openSubMenu(MENU_PAGES.SETTINGS); }
});

// ---- Sound toggle click ----
hudSound?.addEventListener('click', () => {
  const muted = sound.toggleMute();
  if (hudSound) {
    hudSound.textContent = muted ? '🔇' : '🔊';
    hudSound.classList.toggle('muted', muted);
  }
});

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

    ui.setLoadingProgress(40, 'Loading 3D models...');
    const decorModels = await loadDecorModels((p) => {
      ui.setLoadingProgress(40 + p * 30, 'Loading 3D models...');
    });
    levelMgr.setDecorModels(decorModels);

    ui.setLoadingProgress(75, 'Building level...');
    const initialLevel = await levelMgr.loadLevel(selectedMapIndex, selectedDifficulty, true);
    food.setAvailablePowerups(levelMgr.powerups, levelMgr.shieldEveryApples);
    stepDuration = levelMgr.speed;
    applyLevelVisualTheme(initialLevel);

    ui.setLoadingProgress(85, 'Creating menu...');
    createPreviewSnake();

    ui.setLoadingProgress(100, 'Ready!');
    await new Promise(r => setTimeout(r, 400));
    ui.hideLoading();
    window.__snakeBootDone = true;

    enterMenu();
    ensureAudioResumeOnFirstGesture();
    if (!animationStarted) {
      animationStarted = true;
      animate();
    }
  } catch (err) {
    console.error('Erro na inicialização:', err);
    ui.setLoadingProgress(100, 'Erro ao carregar. A abrir menu...');
    await new Promise(r => setTimeout(r, 600));
    ui.hideLoading();
    window.__snakeBootDone = true;
    enterMenu();
    ensureAudioResumeOnFirstGesture();
    if (!animationStarted) {
      animationStarted = true;
      animate();
    }
    ui.showNotification('Alguns recursos falharam, mas o jogo iniciou.', 'default', 3200);
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
    mesh.castShadow = false;
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
   SUB-MENUS (HTML/2D)
   ══════════════════════════════════════════════════════════════════════════ */
function openSubMenu(page) {
  menuPage = page;
  ui.hideAllPanels();
  ui.showPanel('panel-main', false);

  if (page === MENU_PAGES.LEVELS) {
    levelMgr.setGameplayLayersVisible(true);
    obstacles.group.visible = true;
    ui.populateLevelGrid(levelMgr.levels, selectedMapIndex, (i) => {
      selectedMapIndex = i;
      levelMgr.loadLevel(selectedMapIndex, selectedDifficulty, true).then(() => { // preview em menu
        food.setAvailablePowerups(levelMgr.powerups, levelMgr.shieldEveryApples);
        stepDuration = levelMgr.speed;
        applyLevelVisualTheme(levelMgr.currentLevel);
        sound.applyDifficultyPreset(selectedDifficulty);
      });
    });
    ui.populateDifficultyGrid(levelMgr.difficulties, selectedDifficulty, (difficultyId) => {
      selectedDifficulty = difficultyId;
      sound.applyDifficultyPreset(selectedDifficulty);
      levelMgr.loadLevel(selectedMapIndex, selectedDifficulty, true).then(() => { // preview em menu
        food.setAvailablePowerups(levelMgr.powerups, levelMgr.shieldEveryApples);
        stepDuration = levelMgr.speed;
        applyLevelVisualTheme(levelMgr.currentLevel);
      });
    });
    ui.showPanel('panel-levels', true);
  }

  if (page === MENU_PAGES.SKINS) {
    levelMgr.setGameplayLayersVisible(false);
    obstacles.group.visible = false;
    ui.populateSkinGrid(SNAKE_SKINS, selectedSkinIndex, (i) => {
      selectedSkinIndex = i;
      snake.setSkin(i);
    }, createSkinHeadPreview);
    ui.showPanel('panel-skins', true);
  }

  if (page === MENU_PAGES.SETTINGS) {
    levelMgr.setGameplayLayersVisible(false);
    obstacles.group.visible = false;
    ui.updateSettingToggle('setting-postfx', postProc.enabled);
    ui.updateSettingToggle('setting-shadows', renderer.shadowMap.enabled);
    ui.updateSettingToggle('setting-music', sound.isMusicEnabled());
    ui.updateSettingToggle('setting-sfx', sound.isSfxEnabled());
    ui.syncAudioVolumeSliders(sound);
    ui.showPanel('panel-settings', true);
  }
}

function closeSubMenu() {
  menuPage = MENU_PAGES.MAIN;
  ui.hideAllPanels();
  ui.showPanel('panel-main', true);
  levelMgr.setGameplayLayersVisible(false);
  obstacles.group.visible = false;
}

/** Fecha DEFINIÇÕES e volta ao overlay de pausa (jogo continua em pausa). */
function closeSettingsAfterPause() {
  if (!settingsOpenedFromPause || state !== STATES.PAUSED) return;
  settingsOpenedFromPause = false;
  ui.showPanel('panel-settings', false);
  menuPage = MENU_PAGES.MAIN;
  levelMgr.setGameplayLayersVisible(true);
  obstacles.group.visible = true;
  ui.showPause(true);
}

function openSettingsFromPause() {
  if (state !== STATES.PAUSED) return;
  sound.playMenuSelect();
  settingsOpenedFromPause = true;
  ui.showPause(false);
  openSubMenu(MENU_PAGES.SETTINGS);
}



/* ══════════════════════════════════════════════════════════════════════════
   GAME CONTROL
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * O `AudioContext` nasce `suspended` sem gesto do utilizador. `enterMenu()` já chama
 * `startMenuMusic()`, mas o loop só fica audível após `resume()`. Este *one-shot*
 * garante desbloqueio + reinício da música do menu no primeiro clique ou tecla.
 */
let menuAudioGestureResumeArmed = false;
function ensureAudioResumeOnFirstGesture() {
  if (menuAudioGestureResumeArmed) return;
  menuAudioGestureResumeArmed = true;
  const onGesture = () => {
    sound.unlockFromUserGesture();
    if (state === STATES.MENU) sound.startMenuMusic();
  };
  document.addEventListener('pointerdown', onGesture, { once: true, capture: true });
  document.addEventListener('keydown', onGesture, { once: true, capture: true });
}

function enterMenu() {
  state = STATES.MENU;
  snake.clearDeathDebris();
  menuPage = MENU_PAGES.MAIN;
  ui.showMenu(true);
  ui.hideAllPanels();
  ui.showPanel('panel-main', true);
  previewGroup.visible = true;
  snake.group.visible = false;
  food.group.visible = false;

  // Câmara do menu — frontal, afastada
  camCtrl.resetPosition(
    new THREE.Vector3(0, 7.5, 20),
    new THREE.Vector3(0, 3.2, 0)
  );
  camCtrl.controls.enableRotate = false;
  camCtrl.setOrbitEnabled(false);
  renderer.domElement.style.cursor = 'default';

  levelMgr.setGameplayLayersVisible(false);
  obstacles.group.visible = false;

  sound.startMenuMusic();
}

async function startGame() {
  sound.unlockFromUserGesture();
  const currentLevel = await levelMgr.loadLevel(selectedMapIndex, selectedDifficulty, true); // sempre skip transition
  applyLevelVisualTheme(currentLevel);
  food.setAvailablePowerups(levelMgr.powerups, levelMgr.shieldEveryApples);
  stepDuration = levelMgr.speed;

  state = STATES.PLAYING;
  menuPage = MENU_PAGES.MAIN;
  settingsOpenedFromPause = false;
  score = 0;
  accumulator = 0;
  gameTimer = 0;
  lastHudTimerTick = -1;
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

  previewGroup.visible = false;
  snake.group.visible = true;
  food.group.visible = true;
  obstacles.group.visible = true;

  snake.reset();
  snake.setSkin(selectedSkinIndex);
  movingWallGraceRemaining = levelMgr.movingWallGraceSeconds;
  food.respawnFood(snake.segments, obstacles.getOccupiedPositions());

  sound.applyDifficultyPreset(selectedDifficulty);
  sound.startGameMusic();

  // Reset camera for gameplay (instant jump, bypasses damping)
  camCtrl.setOrbitEnabled(false);
  camCtrl.controls.enableRotate = true;
  camCtrl.resetPosition(
    new THREE.Vector3(0, 18, 14),
    new THREE.Vector3(0, 0, 0)
  );

  renderer.domElement.style.cursor = 'default';
  renderer.domElement.focus();
}

function handleGameOver(obstacleCause = null) {
  ui.showPause(false);
  settingsOpenedFromPause = false;
  camCtrl.setOrbitEnabled(false);
  // ── Efeito de morte dramático ──
  if (obstacleCause) sound.playObstacleStinger(obstacleCause);
  sound.playDeath();
  sound.stopMusic();

  // Flash vermelho
  if (deathFlash) {
    deathFlash.classList.add('active');
    setTimeout(() => deathFlash.classList.remove('active'), 150);
  }

  snake.explode();
  deathShakeTimer = 0.5; // 0.5s de camera shake
  pendingGameOver = true;
  deathDelayTimer = 1.4; // delay antes de mostrar overlay

  // Atualizar high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('snake3d_highscore', highScore.toString());
    ui.setHighScore(highScore);
  }
}

function returnToMenu() {
  state = STATES.MENU;
  ui.showGameOver(false);
  enterMenu();
}

/** Sai da pausa e volta ao menu principal (música de jogo parada, câmara de menu). */
function returnToMenuFromPause() {
  if (state !== STATES.PAUSED) return;
  settingsOpenedFromPause = false;
  ui.showPanel('panel-settings', false);
  sound.playMenuSelect();
  ui.showPause(false);
  sound.stopMusic();
  camCtrl.setOrbitEnabled(false);
  enterMenu();
}

function togglePause() {
  if (state === STATES.PLAYING) {
    state = STATES.PAUSED;
    ui.showPause(true);
    camCtrl.setOrbitEnabled(true);
    sound.stopMusic();
  } else if (state === STATES.PAUSED) {
    state = STATES.PLAYING;
    ui.showPause(false);
    camCtrl.setOrbitEnabled(false);
    if (settingsOpenedFromPause) {
      settingsOpenedFromPause = false;
      ui.showPanel('panel-settings', false);
      menuPage = MENU_PAGES.MAIN;
      levelMgr.setGameplayLayersVisible(true);
      obstacles.group.visible = true;
    }
    sound.startGameMusic();
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
    sound.playMenuSelect();
    postProc.setCamera(camCtrl.camera);
    ui.showNotification(camCtrl.isPerspective ? 'PERSPECTIVE CAM' : 'ORTHOGRAPHIC CAM', 'default');
  }

  // Luzes (1-4)
  if (e.code === 'Digit1') { lightMgr.toggle(0); ui.showNotification('DIRECTIONAL LIGHT', 'default'); }
  if (e.code === 'Digit2') { lightMgr.toggle(1); ui.showNotification('SPOTLIGHT', 'default'); }
  if (e.code === 'Digit3') { lightMgr.toggle(2); ui.showNotification('POINT LIGHT', 'default'); }
  if (e.code === 'Digit4') { lightMgr.toggle(3); ui.showNotification('AMBIENT LIGHT', 'default'); }

  // Som (M)
  if (e.code === 'KeyM') {
    const muted = sound.toggleMute();
    if (hudSound) {
      hudSound.textContent = muted ? '🔇' : '🔊';
      hudSound.classList.toggle('muted', muted);
    }
    ui.showNotification(`ÁUDIO (M): ${muted ? 'OFF' : 'ON'}`, 'default');
  }

  // Espaço
  if (e.code === 'Space') {
    e.preventDefault();
    if (state === STATES.PAUSED && settingsOpenedFromPause) return;
    if (state === STATES.PLAYING || state === STATES.PAUSED) togglePause();
    if (state === STATES.MENU && menuPage === MENU_PAGES.MAIN) { sound.playMenuSelect(); startGame(); }
    if (state === STATES.GAMEOVER) returnToMenu();
  }

  // Escape — voltar ao menu / fechar sub-menu
  if (e.code === 'Escape') {
    if (state === STATES.PAUSED && settingsOpenedFromPause) {
      sound.playMenuSelect();
      closeSettingsAfterPause();
    } else if (state === STATES.MENU && menuPage !== MENU_PAGES.MAIN) {
      closeSubMenu();
    } else if (state === STATES.PLAYING) {
      togglePause();
    } else if (state === STATES.PAUSED) {
      togglePause();
    }
  }

  // Post-Processing (P)
  if (e.code === 'KeyP') {
    const ppOn = postProc.toggle();
    ui.showNotification(`POST-FX: ${ppOn ? 'ON' : 'OFF'}`, 'default');
    ui.updateSettingToggle('setting-postfx', ppOn);
  }

});

// ---- Mouse ----
window.addEventListener('pointerdown', () => {
  renderer.domElement.focus();
});

// ---- Sub-menu back buttons ----
document.getElementById('btn-back-levels')?.addEventListener('click', closeSubMenu);
document.getElementById('btn-back-skins')?.addEventListener('click', closeSubMenu);
document.getElementById('btn-back-settings')?.addEventListener('click', () => {
  if (settingsOpenedFromPause && state === STATES.PAUSED) {
    sound.playMenuSelect();
    closeSettingsAfterPause();
  } else {
    closeSubMenu();
  }
});
document.getElementById('btn-pause-menu')?.addEventListener('click', returnToMenuFromPause);
document.getElementById('btn-pause-settings')?.addEventListener('click', openSettingsFromPause);

// ---- Settings toggles ----
document.getElementById('setting-music')?.addEventListener('click', () => {
  sound.unlockFromUserGesture();
  const on = sound.toggleMusicEnabled({ resumeInMenu: state === STATES.MENU });
  ui.updateSettingToggle('setting-music', on);
  ui.showNotification(`MÚSICA AMBIENTE: ${on ? 'ON' : 'OFF'}`, 'default');
});
document.getElementById('setting-sfx')?.addEventListener('click', () => {
  sound.unlockFromUserGesture();
  const on = sound.toggleSfxEnabled();
  ui.updateSettingToggle('setting-sfx', on);
  ui.showNotification(`EFEITOS: ${on ? 'ON' : 'OFF'}`, 'default');
});

function wireAudioVolumeSlider(rangeId) {
  const el = document.getElementById(rangeId);
  if (!el) return;
  const pctId = `${rangeId}-pct`;
  const apply = () => {
    sound.unlockFromUserGesture();
    const frac = Math.max(0, Math.min(1, Number(el.value) / 100));
    if (rangeId === 'vol-master') sound.setMasterVolume(frac);
    else if (rangeId === 'vol-music') sound.setMusicVolume(frac);
    else if (rangeId === 'vol-sfx') sound.setSfxVolume(frac);
    const lab = document.getElementById(pctId);
    if (lab) lab.textContent = `${Math.round(frac * 100)}%`;
  };
  el.addEventListener('input', apply);
}
wireAudioVolumeSlider('vol-master');
wireAudioVolumeSlider('vol-music');
wireAudioVolumeSlider('vol-sfx');

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
  syncRendererSize();
});

/* ══════════════════════════════════════════════════════════════════════════
   GAME LOOP
   ══════════════════════════════════════════════════════════════════════════ */
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (snake.hasDeathDebris()) snake.updateDeathDisassembly(delta, obstacles.isWorldPointBlocked.bind(obstacles));

  // ---- Menu state ----
  if (state === STATES.MENU) {
    updatePreviewSnake(elapsed);

    camCtrl.update(delta);
    // Menu: sem EffectComposer — o pipeline bloom+CRT+pixelate refazia o ecrã inteiro
    // por frame só para o fundo 3D atrás do overlay HTML (custo enorme em GPUs modestas).
    renderer.render(scene, camCtrl.camera);
    return;
  }

  // ---- Death effect update ----
  if (pendingGameOver) {
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
      ui.showPause(false);
      camCtrl.setOrbitEnabled(false);
      if (score > highScore) {
        ui.showNotification('🏆 NEW HIGH SCORE!', 'powerup');
      }
      ui.showGameOver(true, score, highScore);
    }

    // Continuar a renderizar durante a morte
    camCtrl.update(delta);
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
    gameTimer += delta;
    const timerTick = Math.floor(gameTimer);
    if (timerTick !== lastHudTimerTick) {
      lastHudTimerTick = timerTick;
      ui.setTimer(gameTimer);
    }

    snake.updatePowerUps(delta);

    // Power-up timer UI (escudo = tempo restante; speed = legado)
    if (snake.shieldActive && snake.shieldMesh) {
      ui.updatePowerUpTimer('shield', true, snake.shieldTimeRemaining, SHIELD.durationSec);
    } else if (snake.speedTimer > 0) {
      ui.updatePowerUpTimer('speed', true, snake.speedTimer, 10);
    } else {
      ui.hidePowerUp();
    }

    const effectiveStep = stepDuration / snake.speedMultiplier;

    const ignoreMovingWallsThisFrame = movingWallGraceRemaining > 0;

    accumulator += delta;
    let stepsThisFrame = 0;
    while (accumulator >= effectiveStep && stepsThisFrame < MAX_SNAKE_STEPS_PER_FRAME) {
      stepsThisFrame += 1;
      accumulator -= effectiveStep;

      const result = snake.updateStep(food.foodCell, (newHead, prevHead) => obstacles.checkCollisionAlongHeadMove(
        prevHead,
        newHead,
        { ignoreMovingWalls: ignoreMovingWallsThisFrame },
      ));

      /* ── Comeu COMIDA ── */
      if (result.ate) {
        sound.playEat();

        score += 1;
        ui.setScore(score);

        // Respawnar comida + tentar spawnar shield
        food.respawnFood(snake.segments, obstacles.getOccupiedPositions());
        food.trySpawnShield(snake.segments, obstacles.getOccupiedPositions());
      }

      /* ── Verificar SHIELD (independente da comida) ──
         Verificamos APÓS updateStep para usar a posição real da cabeça */
      if (food.shieldPresent && food.checkShieldCollision(snake.segments[0])) {
        snake.activateShield();
        sound.playPowerup();
        ui.showNotification('🛡️ SHIELD ACTIVE!', 'powerup');
        ui.showPowerUp('shield');
        food.removeShield();
        score += 3;
        ui.setScore(score);
      }

      if (result.shieldBroke) {
        ui.hidePowerUp();
        sound.playMenuSelect();
        ui.showNotification('🛡️ Escudo usado — sem protecção!', 'powerup');
      }

      if (result.dead) {
        ui.hidePowerUp();
        handleGameOver(result.obstacleCause ?? null);
      }

    }

    if (movingWallGraceRemaining > 0) {
      movingWallGraceRemaining = Math.max(0, movingWallGraceRemaining - delta);
    }
  }

  // ---- Continuous animations ----
  const alpha = stepDuration > 0 ? accumulator / stepDuration : 1;

  if (state === STATES.PLAYING || state === STATES.PAUSED) {
    snake.render(alpha);
  }

  const runWorldAnimations = state === STATES.PLAYING;
  if (runWorldAnimations) {
    food.update(elapsed);
    obstacles.update(elapsed, delta);
    levelMgr.updateDecorations(elapsed);
  }

  lightMgr.setPointLightPosition(
    gridCellCenterWorldX(food.foodCell.x),
    1.8,
    gridCellCenterWorldZ(food.foodCell.z),
  );
  lightMgr.pulsePointLight(elapsed);
  if (snake.headPosition) {
    lightMgr.setSpotLightTarget(
      gridCellCenterWorldX(snake.headPosition.x),
      0,
      gridCellCenterWorldZ(snake.headPosition.z),
    );
  }

  if (state === STATES.PLAYING) {
    camCtrl.followSnake(snake.headPosition, snake.direction);
  }
  camCtrl.update(delta);

  postProc.update(elapsed, delta);
  postProc.setCamera(camCtrl.camera);
  postProc.render();
}

/* ══════════════════════════════════════════════════════════════════════════
   START
   ══════════════════════════════════════════════════════════════════════════ */
init();
