/* ==========================================================================
   main.js — Orquestrador principal do jogo Snake Retro 3D
   
   Requisitos cobertos:
   - R1: Objetos 3D complexos   - R2: Toggle câmara (C)
   - R3: 4 luzes (1-4)          - R4: Teclado + Rato + Raycaster
  - R5: Animação  - Post-processing (M)
   - Níveis JSON   - Power-ups   - Skins   - High Score
   ========================================================================== */
import * as THREE from 'three';

import { DIRS, BOARD_SIZE } from './utils/helpers.js';
import { UIManager } from './UIManager.js';
import { LightManager } from './LightManager.js';
import { CameraController } from './CameraController.js';
import { PostProcessing } from './PostProcessing.js';
import { LevelManager } from './LevelManager.js';
import { Obstacles } from './Obstacles.js';
import { Snake, SNAKE_SKINS, createSkinHeadPreview } from './snake/index.js';
import { Food } from './food.js';
import { SoundManager } from './SoundManager.js';

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
let animationStarted = false;

function applyLevelVisualTheme(level) {
  const theme = level?.theme || {};
  // Exposição (tone mapping) por nível
  if (theme.exposure != null) {
    renderer.toneMappingExposure = theme.exposure;
  } else {
    renderer.toneMappingExposure = 1.1;
  }

  // Bloom por nível (PostProcessing)
  if (theme.bloomStrength != null) {
    postProc.setBloomStrength(theme.bloomStrength);
  }
}

// ---- Combo System ----
// Combo activa-se apenas quando se come 2 comidas num intervalo curto
let comboCount = 0;
let comboTimer = 0;
let lastEatTime = -999;            // timestamp da última comida
const COMBO_WINDOW = 2.0;          // segundos — janela para comer outra comida e activar combo
const COMBO_DECAY  = 3.0;          // segundos — tempo até o combo expirar depois de activado
const COMBO_MULTIPLIERS = [1, 1, 1.5, 2, 2.5, 3]; // combo 0,1,2,3,4,5+

// ---- Selections ----
let selectedMapIndex = 0;
let selectedDifficulty = 'easy';
let selectedSkinIndex = 0;

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

    ui.setLoadingProgress(40, 'Loading 3D models...');
    await levelMgr.loadModels((p) => {
      ui.setLoadingProgress(40 + p * 30, 'Loading 3D models...');
    });

    ui.setLoadingProgress(75, 'Building level...');
    const initialLevel = await levelMgr.loadLevel(selectedMapIndex, selectedDifficulty, true);
    food.setAvailablePowerups(levelMgr.powerups);
    stepDuration = levelMgr.speed;
    applyLevelVisualTheme(initialLevel);

    ui.setLoadingProgress(85, 'Creating menu...');
    createAmbientParticles(80);
    createPreviewSnake();

    ui.setLoadingProgress(100, 'Ready!');
    await new Promise(r => setTimeout(r, 400));
    ui.hideLoading();
    window.__snakeBootDone = true;

    enterMenu();
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
    if (!animationStarted) {
      animationStarted = true;
      animate();
    }
    ui.showNotification('Alguns recursos falharam, mas o jogo iniciou.', 'default', 3200);
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
   SUB-MENUS (HTML/2D)
   ══════════════════════════════════════════════════════════════════════════ */
function openSubMenu(page) {
  menuPage = page;
  ui.hideAllPanels();
  ui.showPanel('panel-main', false);

  if (page === MENU_PAGES.LEVELS) {
    ui.populateLevelGrid(levelMgr.levels, selectedMapIndex, (i) => {
      selectedMapIndex = i;
      levelMgr.loadLevel(selectedMapIndex, selectedDifficulty, true).then(() => { // preview em menu
        food.setAvailablePowerups(levelMgr.powerups);
        stepDuration = levelMgr.speed;
        applyLevelVisualTheme(levelMgr.currentLevel);
      });
    });
    ui.populateDifficultyGrid(levelMgr.difficulties, selectedDifficulty, (difficultyId) => {
      selectedDifficulty = difficultyId;
      levelMgr.loadLevel(selectedMapIndex, selectedDifficulty, true).then(() => { // preview em menu
        food.setAvailablePowerups(levelMgr.powerups);
        stepDuration = levelMgr.speed;
        applyLevelVisualTheme(levelMgr.currentLevel);
      });
    });
    ui.showPanel('panel-levels', true);
  }

  if (page === MENU_PAGES.SKINS) {
    ui.populateSkinGrid(SNAKE_SKINS, selectedSkinIndex, (i) => {
      selectedSkinIndex = i;
      snake.setSkin(i);
    }, createSkinHeadPreview);
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



/* ══════════════════════════════════════════════════════════════════════════
   GAME CONTROL
   ══════════════════════════════════════════════════════════════════════════ */
function enterMenu() {
  state = STATES.MENU;
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
  renderer.domElement.style.cursor = 'default';
}

async function startGame() {
  const currentLevel = await levelMgr.loadLevel(selectedMapIndex, selectedDifficulty, true); // sempre skip transition
  applyLevelVisualTheme(currentLevel);
  food.setAvailablePowerups(levelMgr.powerups);
  stepDuration = levelMgr.speed;

  state = STATES.PLAYING;
  menuPage = MENU_PAGES.MAIN;
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

  previewGroup.visible = false;
  snake.group.visible = true;
  food.group.visible = true;

  snake.reset();
  snake.setSkin(selectedSkinIndex);
  snake.clearTrail();
  food.respawnFood(snake.segments, obstacles.getOccupiedPositions());

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
    localStorage.setItem('snake3d_highscore', highScore.toString());
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

  // Espaço
  if (e.code === 'Space') {
    e.preventDefault();
    if (state === STATES.PLAYING || state === STATES.PAUSED) togglePause();
    if (state === STATES.MENU && menuPage === MENU_PAGES.MAIN) { sound.playMenuSelect(); startGame(); }
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

  // Post-Processing (M)
  if (e.code === 'KeyM') {
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
    gameTimer += delta;
    ui.setTimer(gameTimer);

    // Combo timer decay — combo expira após COMBO_DECAY segundos
    if (comboCount > 0) {
      comboTimer -= delta;
      if (comboTimer <= 0) {
        comboCount = 0;
        comboTimer = 0;
        ui.hideCombo();
      }
    }

    // Power-up timer UI update
    if (snake.shieldActive && snake.shieldMesh) {
      ui.updatePowerUpTimer('shield', true);
    }
    if (snake.speedTimer > 0) {
      ui.updatePowerUpTimer('speed', true, snake.speedTimer);
    } else if (!snake.shieldActive) {
      ui.hidePowerUp();
    }

    snake.updatePowerUps(delta);
    const effectiveStep = stepDuration / snake.speedMultiplier;

    accumulator += delta;
    while (accumulator >= effectiveStep) {
      accumulator -= effectiveStep;

      const result = snake.updateStep(food.foodCell, (pos) => obstacles.checkCollision(pos));

      /* ── Comeu COMIDA ── */
      if (result.ate) {
        sound.playEat();

        // Combo: só activa quando se come 2 comidas num intervalo curto
        const now = clock.elapsedTime;
        const timeSinceLastEat = now - lastEatTime;
        lastEatTime = now;

        if (timeSinceLastEat <= COMBO_WINDOW) {
          comboCount++;
          comboTimer = COMBO_DECAY;
        } else {
          comboCount = 1;
          comboTimer = 0;
          ui.hideCombo();
        }
        const comboMult = COMBO_MULTIPLIERS[Math.min(comboCount, COMBO_MULTIPLIERS.length - 1)];

        const pts = Math.floor(1 * comboMult);
        score += pts;
        ui.setScore(score);

        food.emitCollectParticles(food.foodCell.clone(), food.getCollectColor());

        if (comboCount >= 2) {
          sound.playCombo();
          ui.showCombo(comboCount, comboMult);
        }

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
        food.emitCollectParticles(food.shieldCell.clone(), food.getShieldCollectColor());
        food.removeShield();
        score += 3;
        ui.setScore(score);
      }

      // Emitir trail a cada step
      snake.emitTrail();

      if (result.dead) {
        comboCount = 0;
        comboTimer = 0;
        lastEatTime = -999;
        ui.hideCombo();
        ui.hidePowerUp();
        handleGameOver();
      }

    }
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

  lightMgr.setPointLightPosition(food.foodCell.x, 1.8, food.foodCell.z);
  lightMgr.pulsePointLight(elapsed);
  if (snake.headPosition) {
    lightMgr.setSpotLightTarget(snake.headPosition.x, 0, snake.headPosition.z);
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
