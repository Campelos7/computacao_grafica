/* ==========================================================================
   LevelManager.js — Sistema de Níveis
   Requisito: Ficheiro JSON com temas diferentes (cores, nevoeiro, velocidade,
   obstáculos). loadLevel() limpa a cena, aplica o tema, gera obstáculos.
   Transição suave entre níveis (fade). Importar ≥2 modelos GLTF.
   ========================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BOARD_SIZE, CELL_SIZE, createCanvasTexture, disposeGroup, hexToColor } from './utils/helpers.js';

/* ── Texturas procedurais de tabuleiro ── */

function createNeonGroundTexture(gridColor) {
  return createCanvasTexture(256, (ctx, size) => {
    // Fundo escuro
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, size, size);

    // Grelha neon — usar globalAlpha para subtileza
    const cellPx = size / 10;
    ctx.strokeStyle = gridColor || '#ff00ff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.15; // grid lines muito subtis
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellPx, 0);
      ctx.lineTo(i * cellPx, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellPx);
      ctx.lineTo(size, i * cellPx);
      ctx.stroke();
    }

    // Pontos nos cruzamentos
    ctx.globalAlpha = 0.2;
    for (let y = 0; y <= 10; y++) {
      for (let x = 0; x <= 10; x++) {
        ctx.fillStyle = gridColor || '#ff00ff';
        ctx.beginPath();
        ctx.arc(x * cellPx, y * cellPx, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;
  }, { repeat: [5, 5], pixelArt: false });
}

function createNeonWallTexture(wallColor) {
  return createCanvasTexture(128, (ctx, size) => {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, size, size);

    const bw = 32, bh = 16;
    const color = wallColor || '#00ffff';
    ctx.globalAlpha = 0.12;
    for (let y = 0; y < size; y += bh) {
      const off = (Math.floor(y / bh) % 2) * (bw / 2);
      for (let x = -bw + off; x < size; x += bw) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, bw - 1, bh - 1);
      }
    }

    // Linhas horizontais de varredura (scanline effect)
    ctx.globalAlpha = 0.02;
    for (let y = 0; y < size; y += 4) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, y, size, 1);
    }
    ctx.globalAlpha = 1.0;
  }, { repeat: [3, 1.5], pixelArt: true });
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export class LevelManager {
  /**
   * @param {THREE.Scene} scene
   * @param {Obstacles} obstacles
   * @param {LightManager} lightManager
   * @param {UIManager} uiManager
   */
  constructor(scene, obstacles, lightManager, uiManager) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.lightManager = lightManager;
    this.ui = uiManager;

    this.levels = [];
    this.currentLevelIndex = 0;
    this.currentLevel = null;

    // Grupo do cenário (tabuleiro, paredes, decorações)
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = 'board';
    this.scene.add(this.boardGroup);

    // Grupo das decorações GLTF
    this.decorGroup = new THREE.Group();
    this.decorGroup.name = 'decorations';
    this.scene.add(this.decorGroup);

    // GLTF Loader
    this.gltfLoader = new GLTFLoader();
    this.loadedModels = {};

    // Grid helper
    this.gridHelper = null;
  }

  /**
   * Carrega as configurações de nível do ficheiro JSON.
   * @param {string} url — caminho para o ficheiro JSON
   * @returns {Promise}
   */
  async loadConfig(url) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      this.levels = data.levels || [];
    } catch (err) {
      console.warn('Erro ao carregar levelConfig.json, usando nível padrão:', err);
      this.levels = [{
        id: 1, name: 'DEFAULT', speed: 0.15, boardSize: 20, scoreToAdvance: 999,
        obstacles: [], powerups: [],
        theme: {
          background: '#0a0a1a', fogColor: '#1a0a2e', fogNear: 22, fogFar: 65,
          groundEmissive: '#120024', gridColor: '#ff00ff', gridOpacity: 0.18,
          wallEmissive: '#00ffff', bloomStrength: 0.9,
        }
      }];
    }
  }

  /**
   * Requisito: Importar pelo menos 2 modelos GLTF para decoração.
   * Tenta carregar modelos; se não existirem, cria decorações procedurais.
   * @param {Function} onProgress — callback de progresso
   */
  async loadModels(onProgress) {
    const modelDefs = [
      { name: 'arcade', path: 'models/arcade_cabinet.glb' },
      { name: 'trophy', path: 'models/trophy.glb' },
    ];

    for (let i = 0; i < modelDefs.length; i++) {
      const def = modelDefs[i];
      try {
        const gltf = await this._loadGLTF(def.path);
        this.loadedModels[def.name] = gltf.scene;
        if (onProgress) onProgress((i + 1) / modelDefs.length);
      } catch (err) {
        console.warn(`Modelo GLTF "${def.path}" não encontrado, criando proceduralmente.`);
        this.loadedModels[def.name] = this._createProceduralModel(def.name);
        if (onProgress) onProgress((i + 1) / modelDefs.length);
      }
    }
  }

  /** @private Carrega um GLTF via Promise */
  _loadGLTF(path) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(path, resolve, undefined, reject);
    });
  }

  /**
   * Cria um modelo procedural de backup (quando .glb não existe).
   * Estes modelos demonstram o uso de primitivas 3D complexas.
   * @private
   */
  _createProceduralModel(name) {
    const group = new THREE.Group();

    if (name === 'arcade') {
      // Arcade cabinet — composto por Box + emissive screen
      const bodyGeo = new THREE.BoxGeometry(1.2, 2.4, 0.8);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e, emissive: 0x0d0d1a, roughness: 0.7, metalness: 0.3,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1.2;

      // Ecrã
      const screenGeo = new THREE.PlaneGeometry(0.8, 0.6);
      const screenMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8,
      });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 0.5, 0.41);
      body.add(screen);

      // Botões (esferas)
      const btnGeo = new THREE.SphereGeometry(0.06, 8, 6);
      const btnColors = [0xff00ff, 0x00ff00, 0xffff00, 0xff0000];
      for (let i = 0; i < 4; i++) {
        const btn = new THREE.Mesh(btnGeo, new THREE.MeshStandardMaterial({
          color: btnColors[i], emissive: btnColors[i], emissiveIntensity: 0.5,
        }));
        btn.position.set(-0.2 + i * 0.13, -0.3, 0.41);
        body.add(btn);
      }

      // Topo com letreiro
      const topGeo = new THREE.BoxGeometry(1.3, 0.3, 0.3);
      const topMat = new THREE.MeshStandardMaterial({
        color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.6,
      });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 2.55;
      body.add(top);

      group.add(body);
      group.scale.setScalar(0.7);
    }

    if (name === 'trophy') {
      // Troféu neon — pedestal + estrela
      const pedestalGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8);
      const pedestalMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a2e, emissive: 0x0d0d1a, roughness: 0.6, metalness: 0.4,
      });
      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.y = 0.3;

      // Estrela — OctahedronGeometry
      const starGeo = new THREE.OctahedronGeometry(0.3, 0);
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 0.8,
        roughness: 0.1, metalness: 0.7,
      });
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.y = 0.9;
      star.name = 'trophy-star';

      // Anel em volta da estrela
      const ringGeo = new THREE.TorusGeometry(0.35, 0.03, 12, 24);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.9;
      ring.rotation.x = Math.PI / 2;
      ring.name = 'trophy-ring';

      group.add(pedestal, star, ring);
      group.scale.setScalar(0.8);
    }

    return group;
  }

  /**
   * Requisito: Função loadLevel() que limpa a cena, aplica o tema,
   * gera obstáculos, ajusta velocidade.
   * @param {number} levelIndex — índice (0-based) do nível
   * @returns {object} — configuração do nível
   */
  async loadLevel(levelIndex, skipTransition = false) {
    this.currentLevelIndex = levelIndex;
    this.currentLevel = this.levels[levelIndex] || this.levels[0];
    const level = this.currentLevel;
    const theme = level.theme;

    // Transição suave: fade (skip during initial load)
    if (!skipTransition) {
      await this.ui.showLevelTransition(level.name, level.description);
    }

    // Limpar cenário anterior (prevenir memory leaks)
    disposeGroup(this.boardGroup);
    disposeGroup(this.decorGroup);
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      this.gridHelper.material.dispose();
      this.gridHelper = null;
    }

    // ---- Aplicar tema ----
    this.scene.background = hexToColor(theme.background);
    this.scene.fog = new THREE.Fog(
      hexToColor(theme.fogColor),
      theme.fogNear || 20,
      theme.fogFar || 60
    );

    // ---- Tabuleiro ----
    const boardWidth = BOARD_SIZE * CELL_SIZE;
    const boardHeight = 0.5;
    const groundTex = createNeonGroundTexture(theme.gridColor);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth, boardHeight, boardWidth),
      new THREE.MeshStandardMaterial({
        map: groundTex,
        color: 0x0d0d1a,
        emissive: hexToColor(theme.groundEmissive || '#120024'),
        emissiveIntensity: 0.08,
        roughness: 0.9,
        metalness: 0.05,
      })
    );
    board.position.set(0, -boardHeight * 0.5, 0);
    board.receiveShadow = true;
    board.name = 'board-floor';
    this.boardGroup.add(board);

    // ---- Paredes ----
    const wallHeight = 1.5;
    const wallThick = 0.5;
    const half = boardWidth * 0.5;
    const wallTex = createNeonWallTexture(theme.wallEmissive);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      color: 0x1a1a2e,
      emissive: hexToColor(theme.wallEmissive || '#00ffff'),
      emissiveIntensity: 0.12,
      roughness: 0.7,
      metalness: 0.15,
    });

    const wallDefs = [
      { size: [boardWidth + wallThick * 2, wallHeight, wallThick], pos: [0, wallHeight * 0.5, half + wallThick * 0.5] },
      { size: [boardWidth + wallThick * 2, wallHeight, wallThick], pos: [0, wallHeight * 0.5, -half - wallThick * 0.5] },
      { size: [wallThick, wallHeight, boardWidth], pos: [half + wallThick * 0.5, wallHeight * 0.5, 0] },
      { size: [wallThick, wallHeight, boardWidth], pos: [-half - wallThick * 0.5, wallHeight * 0.5, 0] },
    ];

    for (const def of wallDefs) {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(...def.size),
        wallMat
      );
      wall.position.set(...def.pos);
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.name = 'wall';

      // Linha de brilho no topo da parede
      const edgeMat = new THREE.MeshBasicMaterial({
        color: hexToColor(theme.wallEmissive || '#00ffff'),
        transparent: true,
        opacity: 0.25,
      });
      const edgeGeo = new THREE.BoxGeometry(def.size[0] + 0.02, 0.04, def.size[2] + 0.02);
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      edge.position.y = wallHeight * 0.5;
      wall.add(edge);

      this.boardGroup.add(wall);
    }

    // ---- Grid Helper ----
    const gridColor = hexToColor(theme.gridColor || '#ff00ff');
    this.gridHelper = new THREE.GridHelper(boardWidth, BOARD_SIZE, gridColor, gridColor);
    this.gridHelper.position.y = 0.02;
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = (theme.gridOpacity || 0.15) * 0.5;
    this.scene.add(this.gridHelper);

    // ---- Obstáculos ----
    this.obstacles.generate(level.obstacles || []);

    // ---- Decorações GLTF ----
    this._placeDecorations();

    // ---- Luzes do tema ----
    this.lightManager.applyTheme(theme);

    // ---- UI ----
    this.ui.setLevel(`LEVEL ${level.id}: ${level.name}`);

    return level;
  }

  /**
   * Coloca modelos GLTF de decoração nos cantos do tabuleiro.
   * Requisito: Importar pelo menos 2 modelos GLTF para decoração.
   * @private
   */
  _placeDecorations() {
    const half = (BOARD_SIZE * CELL_SIZE) / 2;
    const decorPositions = [
      { name: 'arcade', pos: new THREE.Vector3(-half - 2, 0, -half - 2), rot: Math.PI / 4 },
      { name: 'arcade', pos: new THREE.Vector3( half + 2, 0, -half - 2), rot: -Math.PI / 4 },
      { name: 'trophy', pos: new THREE.Vector3(-half - 2, 0,  half + 2), rot: Math.PI / 4 },
      { name: 'trophy', pos: new THREE.Vector3( half + 2, 0,  half + 2), rot: -Math.PI / 4 },
    ];

    for (const dec of decorPositions) {
      const model = this.loadedModels[dec.name];
      if (!model) continue;

      const clone = model.clone();
      clone.position.copy(dec.pos);
      clone.rotation.y = dec.rot;
      clone.name = `decor-${dec.name}`;

      // Animar as es­trelas dos troféus
      clone.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.decorGroup.add(clone);
    }
  }

  /**
   * Anima decorações (troféu a rodar, ecrã a piscar).
   * @param {number} elapsed
   */
  updateDecorations(elapsed) {
    this.decorGroup.traverse(child => {
      if (child.name === 'trophy-star') {
        child.rotation.y += 0.02;
        child.rotation.x = Math.sin(elapsed * 2) * 0.2;
      }
      if (child.name === 'trophy-ring') {
        child.rotation.z += 0.03;
      }
    });
  }

  /**
   * Verifica se o jogador deve avançar de nível.
   * @param {number} score
   * @returns {boolean}
   */
  shouldAdvance(score) {
    if (!this.currentLevel) return false;
    return score >= this.currentLevel.scoreToAdvance;
  }

  /**
   * Avança para o próximo nível.
   * @returns {Promise<object|null>} — novo nível ou null se não há mais
   */
  async advanceLevel() {
    const nextIndex = this.currentLevelIndex + 1;
    if (nextIndex >= this.levels.length) return null;
    return this.loadLevel(nextIndex);
  }

  /**
   * Obtém a velocidade actual do nível.
   */
  get speed() {
    return this.currentLevel ? this.currentLevel.speed : 0.15;
  }

  /**
   * Obtém os power-ups disponíveis no nível actual.
   */
  get powerups() {
    return this.currentLevel ? (this.currentLevel.powerups || []) : [];
  }
}
