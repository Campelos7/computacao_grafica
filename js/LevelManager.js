/* ==========================================================================
   LevelManager.js — Sistema de Níveis com Biomas Naturais
   Requisito: Ficheiro JSON com temas diferentes (cores, nevoeiro, velocidade,
   obstáculos). loadLevel() limpa a cena, aplica o tema, gera obstáculos.
   A transição em fade entre níveis foi removida — o mapa carrega directamente.

   Modelos GLB (decoração): ficheiros em assets/models/, carregados no boot
   por js/ModelLoader.js (não existe pasta js/complex-objects/).

   Biomas: Floresta Tropical, Deserto Canyon, Montanha de Neve
   Cada nível inclui cenário procedural em js/level/biomes/, texturas .png,
   decorações com shader, skybox gradiente e (opcional) meshes GLB.
   ========================================================================== */
import * as THREE from 'three';
import { BOARD_SIZE, CELL_SIZE, createCanvasTexture, disposeGroup, hexToColor } from './utils/helpers.js';
import { addArenaPerimeterWalls } from './obstacles/Walls.js';
import { DIFFICULTY_PRESETS } from './level/difficultyPresets.js';
import { buildForestBiome } from './level/biomes/forest/index.js';
import { buildDesertBiome } from './level/biomes/desert/index.js';
import { buildSnowBiome } from './level/biomes/snow/index.js';

/* ══════════════════════════════════════════════════════════════════════════
   TEXTURAS IMPORTADAS (R1 — obrigatório pelo protocolo)
   Carregadas com TextureLoader a partir de ficheiros .png
   ══════════════════════════════════════════════════════════════════════════ */
const textureLoader = new THREE.TextureLoader();

/** Cache de texturas importadas para reutilização */
const importedTextures = {};

function loadImportedTexture(name, path, repeatX = 1, repeatY = 1) {
  if (importedTextures[name]) return importedTextures[name];
  const tex = textureLoader.load(path);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  importedTextures[name] = tex;
  return tex;
}

/* ══════════════════════════════════════════════════════════════════════════
   NORMAL MAPS & ROUGHNESS MAPS PROCEDURAIS (PBR completo)
   Gerados via Canvas para demonstrar conhecimento de Physically Based Rendering
   ══════════════════════════════════════════════════════════════════════════ */

/** Gera um Normal Map procedural via Canvas (simula relevo com ruído) */
function createProceduralNormalMap(size, intensity, noiseScale, biomeType) {
  // Performance: limitar tamanho máximo a 128
  size = Math.min(size, 128);
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;

  // Gerar heightmap com ruído
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0;
      // Múltiplas oitavas de ruído para mais detalhe
      h += Math.sin(x * noiseScale) * Math.cos(y * noiseScale) * 0.5;
      h += Math.sin(x * noiseScale * 2.3 + 1.7) * Math.cos(y * noiseScale * 2.1 + 0.8) * 0.25;
      h += Math.sin(x * noiseScale * 5.1 + 3.2) * Math.cos(y * noiseScale * 4.7 + 2.1) * 0.125;
      if (biomeType === 'forest') {
        h += Math.sin(x * 0.08 + y * 0.06) * 0.3; // ondulações de raízes
      } else if (biomeType === 'desert') {
        h += Math.sin(x * 0.04) * Math.sin(y * 0.02) * 0.4; // dunas
      } else if (biomeType === 'snow') {
        h += (Math.random() - 0.5) * 0.15; // cristais aleatórios
      }
      heights[y * size + x] = h;
    }
  }

  // Converter heightmap para normal map (Sobel)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const xP = heights[y * size + Math.min(x + 1, size - 1)];
      const xN = heights[y * size + Math.max(x - 1, 0)];
      const yP = heights[Math.min(y + 1, size - 1) * size + x];
      const yN = heights[Math.max(y - 1, 0) * size + x];
      const dx = (xN - xP) * intensity;
      const dy = (yN - yP) * intensity;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      d[idx]     = Math.floor(((dx / len) * 0.5 + 0.5) * 255); // R
      d[idx + 1] = Math.floor(((dy / len) * 0.5 + 0.5) * 255); // G
      d[idx + 2] = Math.floor(((1.0 / len) * 0.5 + 0.5) * 255); // B
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Gera um Roughness Map procedural via Canvas (variação de brilho na superfície) */
function createProceduralRoughnessMap(size, baseRoughness, variation, biomeType) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let r = baseRoughness;
      // Variação orgânica
      r += Math.sin(x * 0.12) * Math.cos(y * 0.1) * variation;
      r += Math.sin(x * 0.25 + y * 0.18) * variation * 0.5;
      if (biomeType === 'snow') {
        r -= 0.15; // neve é mais lisa
      } else if (biomeType === 'desert') {
        r += (Math.random() - 0.5) * 0.08; // areia granulada
      }
      const v = Math.max(0, Math.min(1, r)) * 255;
      d[idx] = d[idx + 1] = d[idx + 2] = Math.floor(v);
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}


/* ══════════════════════════════════════════════════════════════════════════
   TEXTURAS PROCEDURAIS POR BIOMA (complementam as importadas)
   ══════════════════════════════════════════════════════════════════════════ */

function createForestGroundTexture() {
  return createCanvasTexture(256, (ctx, size) => {
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size);
    grad.addColorStop(0, '#1a2a10');
    grad.addColorStop(0.5, '#142208');
    grad.addColorStop(1, '#1a2a10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * size, y = Math.random() * size;
      ctx.fillStyle = `rgba(34, ${80 + Math.floor(Math.random()*60)}, 20, ${0.12 + Math.random()*0.18})`;
      ctx.beginPath(); ctx.arc(x, y, 3 + Math.random() * 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.12)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      let cx = Math.random() * size, cy = Math.random() * size; ctx.moveTo(cx, cy);
      for (let j = 0; j < 8; j++) { cx += (Math.random()-0.5)*30; cy += (Math.random()-0.5)*30; ctx.lineTo(cx, cy); }
      ctx.stroke();
    }
    const cellPx = size / 10;
    ctx.strokeStyle = '#44ff44'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.06;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i*cellPx, 0); ctx.lineTo(i*cellPx, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*cellPx); ctx.lineTo(size, i*cellPx); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * size, y = Math.random() * size;
      ctx.fillStyle = `rgba(${40+Math.floor(Math.random()*30)}, ${100+Math.floor(Math.random()*80)}, 20, 0.2)`;
      ctx.beginPath(); ctx.ellipse(x, y, 3+Math.random()*3, 1.5+Math.random()*1.5, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill();
    }
  }, { repeat: [5, 5], pixelArt: false });
}

function createDesertGroundTexture() {
  return createCanvasTexture(256, (ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#3a2810'); grad.addColorStop(0.3, '#44300f');
    grad.addColorStop(0.7, '#3a2810'); grad.addColorStop(1, '#302008');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(${180+Math.floor(Math.random()*60)}, ${140+Math.floor(Math.random()*50)}, ${60+Math.floor(Math.random()*40)}, ${0.04+Math.random()*0.06})`;
      ctx.fillRect(Math.random()*size, Math.random()*size, 1, 1);
    }
    ctx.strokeStyle = 'rgba(20, 10, 0, 0.18)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      let cx = Math.random()*size, cy = Math.random()*size; ctx.moveTo(cx, cy);
      for (let j = 0; j < 6; j++) { cx += (Math.random()-0.5)*45; cy += (Math.random()-0.5)*45; ctx.lineTo(cx, cy); }
      ctx.stroke();
    }
    const cellPx = size / 10;
    ctx.strokeStyle = '#ff8833'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.06;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i*cellPx, 0); ctx.lineTo(i*cellPx, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*cellPx); ctx.lineTo(size, i*cellPx); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }, { repeat: [5, 5], pixelArt: false });
}

function createSnowGroundTexture() {
  return createCanvasTexture(256, (ctx, size) => {
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size);
    grad.addColorStop(0, '#c8d8e8'); grad.addColorStop(0.5, '#b0c0d4'); grad.addColorStop(1, '#a0b0c8');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 80; i++) {
      const x = Math.random()*size, y = Math.random()*size;
      const b = 200 + Math.floor(Math.random() * 55);
      ctx.fillStyle = `rgba(${b}, ${b+10}, 255, ${0.3+Math.random()*0.4})`;
      ctx.beginPath(); ctx.arc(x, y, 0.5+Math.random()*1.5, 0, Math.PI*2); ctx.fill();
    }
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = 'rgba(100, 120, 160, 0.07)';
      ctx.beginPath(); ctx.arc(Math.random()*size, Math.random()*size, 8+Math.random()*22, 0, Math.PI*2); ctx.fill();
    }
    const cellPx = size / 10;
    ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.08;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i*cellPx, 0); ctx.lineTo(i*cellPx, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*cellPx); ctx.lineTo(size, i*cellPx); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }, { repeat: [5, 5], pixelArt: false });
}

/* ── Texturas de parede por bioma ── */
function createForestWallTexture() {
  return createCanvasTexture(128, (ctx, size) => {
    ctx.fillStyle = '#1a2a15'; ctx.fillRect(0, 0, size, size);
    const bw = 32, bh = 16; ctx.globalAlpha = 0.15;
    for (let y = 0; y < size; y += bh) {
      const off = (Math.floor(y/bh)%2)*(bw/2);
      for (let x = -bw+off; x < size; x += bw) {
        ctx.strokeStyle = '#33aa33'; ctx.lineWidth = 0.6;
        ctx.strokeRect(x, y, bw-1, bh-1);
        ctx.fillStyle = `rgba(30, ${80+Math.floor(Math.random()*40)}, 20, 0.12)`;
        ctx.fillRect(x+2, y+2, bw-5, bh-5);
      }
    }
    ctx.strokeStyle = 'rgba(34, 120, 34, 0.2)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(20, size/2, 5, size); ctx.stroke();
    ctx.globalAlpha = 1.0;
  }, { repeat: [3, 1.5], pixelArt: false });
}

function createDesertWallTexture() {
  return createCanvasTexture(128, (ctx, size) => {
    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(0, 0, size, size);
    const bw = 32, bh = 16; ctx.globalAlpha = 0.15;
    for (let y = 0; y < size; y += bh) {
      const off = (Math.floor(y/bh)%2)*(bw/2);
      for (let x = -bw+off; x < size; x += bw) {
        ctx.strokeStyle = '#cc6611'; ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, bw-1, bh-1);
        ctx.fillStyle = `rgba(${140+Math.floor(Math.random()*40)}, ${80+Math.floor(Math.random()*30)}, 20, 0.08)`;
        ctx.fillRect(x+1, y+1, bw-3, bh-3);
      }
    }
    ctx.globalAlpha = 0.04;
    for (let y = 0; y < size; y += 3) { ctx.fillStyle = '#000'; ctx.fillRect(0, y, size, 1); }
    ctx.globalAlpha = 1.0;
  }, { repeat: [3, 1.5], pixelArt: false });
}

function createSnowWallTexture() {
  return createCanvasTexture(128, (ctx, size) => {
    ctx.fillStyle = '#1a2535'; ctx.fillRect(0, 0, size, size);
    const bw = 32, bh = 16; ctx.globalAlpha = 0.12;
    for (let y = 0; y < size; y += bh) {
      const off = (Math.floor(y/bh)%2)*(bw/2);
      for (let x = -bw+off; x < size; x += bw) {
        ctx.strokeStyle = '#4488cc'; ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, bw-1, bh-1);
      }
    }
    ctx.globalAlpha = 0.2;
    for (let y = 0; y < size; y += bh) { ctx.fillStyle = '#ddeeff'; ctx.fillRect(0, y, size, 2); }
    ctx.globalAlpha = 1.0;
  }, { repeat: [3, 1.5], pixelArt: false });
}

/* ══════════════════════════════════════════════════════════════════════════
   SKYBOX GRADIENTE POR BIOMA
   Esfera invertida com ShaderMaterial para gradiente vertical.
   ══════════════════════════════════════════════════════════════════════════ */

function createSkybox(topColor, midColor, bottomColor) {
  const skyGeo = new THREE.SphereGeometry(80, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor:    { value: new THREE.Color(topColor) },
      uMidColor:    { value: new THREE.Color(midColor) },
      uBottomColor: { value: new THREE.Color(bottomColor) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uBottomColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        vec3 color;
        if (h > 0.0) {
          color = mix(uMidColor, uTopColor, h);
        } else {
          color = mix(uMidColor, uBottomColor, -h);
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'skybox';
  return sky;
}

function createAtmosphericEffect(color1, color2, opacity, scaleX, scaleZ) {
  const group = new THREE.Group();
  group.name = 'atmospheric-fog';
  const c1 = new THREE.Color(color1), c2 = new THREE.Color(color2);
  const fogMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uColor1: { value: c1 }, uColor2: { value: c2 }, uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv; varying float vElevation; uniform float uTime;
      void main() {
        vUv = uv; vec3 pos = position;
        float wave = sin(pos.x*0.5+uTime*0.4)*cos(pos.z*0.3+uTime*0.3)*0.15;
        pos.y += wave; vElevation = wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor1; uniform vec3 uColor2; uniform float uOpacity;
      varying vec2 vUv; varying float vElevation;
      void main() {
        vec2 scrollUv = vUv + vec2(uTime*0.02, uTime*0.015);
        float n = sin(scrollUv.x*8.0)*cos(scrollUv.y*6.0+uTime*0.3);
        n += sin(scrollUv.x*4.0+uTime*0.2)*cos(scrollUv.y*3.0);
        n = n*0.5+0.5;
        vec3 color = mix(uColor1, uColor2, n);
        float edgeFade = smoothstep(0.0,0.15,vUv.x) * smoothstep(1.0,0.85,vUv.x)
                       * smoothstep(0.0,0.15,vUv.y) * smoothstep(1.0,0.85,vUv.y);
        float alpha = uOpacity * edgeFade * (0.6 + n*0.4 + vElevation*2.0);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(scaleX, scaleZ, 32, 32), fogMat);
  p1.rotation.x = -Math.PI/2; p1.name = 'fog-plane'; group.add(p1);
  const fogMat2 = fogMat.clone();
  fogMat2.uniforms = { uTime:{value:0}, uColor1:{value:c1.clone()}, uColor2:{value:c2.clone()}, uOpacity:{value:opacity*0.55} };
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(scaleX*0.65, scaleZ*0.65, 20, 20), fogMat2);
  p2.rotation.x = -Math.PI/2; p2.position.y = 0.7; p2.name = 'fog-plane-upper'; group.add(p2);
  return group;
}

/* ══════════════════════════════════════════════════════════════════════════
   DECORAÇÕES COMPLEXAS COM SHADER — Uma única por bioma

   Deserto: (reservado)
   Neve: Aurora Boreal (shader GLSL avançado)
   ══════════════════════════════════════════════════════════════════════════ */


/** ❄️ Aurora Boreal — Shader GLSL avançado no céu */
function createAuroraBorealis() {
  const g = new THREE.Group();
  g.name = 'aurora';

  const auroraMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vPos; uniform float uTime;
      void main() {
        vUv = uv; vPos = position;
        vec3 pos = position;
        pos.y += sin(pos.x * 0.3 + uTime * 0.5) * 2.0;
        pos.y += cos(pos.x * 0.15 + uTime * 0.3) * 1.5;
        pos.z += sin(pos.x * 0.2 + uTime * 0.4) * 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime; varying vec2 vUv; varying vec3 vPos;
      void main() {
        float x = vUv.x;
        float y = vUv.y;
        
        // Ondas de cor que se deslocam
        float wave1 = sin(x * 6.0 + uTime * 0.8) * 0.5 + 0.5;
        float wave2 = sin(x * 4.0 - uTime * 0.5 + 1.5) * 0.5 + 0.5;
        float wave3 = cos(x * 8.0 + uTime * 0.3) * 0.5 + 0.5;
        
        // Cores da aurora (verde, azul, roxo)
        vec3 green = vec3(0.1, 0.9, 0.3);
        vec3 blue = vec3(0.1, 0.4, 0.9);
        vec3 purple = vec3(0.6, 0.1, 0.8);
        
        vec3 color = mix(green, blue, wave1);
        color = mix(color, purple, wave2 * 0.4);
        color += vec3(0.0, wave3 * 0.15, wave3 * 0.1);
        
        // Fade vertical (mais intenso no centro)
        float vFade = smoothstep(0.0, 0.3, y) * smoothstep(1.0, 0.6, y);
        // Fade horizontal suave
        float hFade = smoothstep(0.0, 0.1, x) * smoothstep(1.0, 0.9, x);
        
        // Estrutura de cortina (linhas verticais subtis)
        float curtain = sin(x * 40.0 + uTime * 1.5) * 0.15 + 0.85;
        
        float alpha = vFade * hFade * curtain * 0.35;
        alpha *= 0.5 + wave1 * 0.3 + wave2 * 0.2;
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const auroraPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 8, 64, 16), auroraMat
  );
  auroraPlane.position.set(0, 20, -20);
  auroraPlane.rotation.x = -0.3;
  auroraPlane.name = 'aurora-plane';
  g.add(auroraPlane);

  // Uma segunda cortina menor
  const auroraMat2 = auroraMat.clone();
  auroraMat2.uniforms = { uTime: { value: 0 } };
  const auroraPlane2 = new THREE.Mesh(
    new THREE.PlaneGeometry(35, 6, 48, 12), auroraMat2
  );
  auroraPlane2.position.set(10, 18, -15);
  auroraPlane2.rotation.x = -0.2;
  auroraPlane2.rotation.y = 0.4;
  auroraPlane2.name = 'aurora-plane-2';
  g.add(auroraPlane2);

  return g;
}

/* Biomas separados por ficheiro:
   - level/biomes/forest.js
   - level/biomes/desert.js
   - level/biomes/snow.js */

/* ═══════════════════════════════════════════════════════════════════════════ */
export class LevelManager {
  constructor(scene, obstacles, lightManager, uiManager) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.lightManager = lightManager;
    this.ui = uiManager;
    this.levels = [];
    this.currentLevelIndex = 0;
    this.currentLevel = null;
    this.currentDifficultyId = 'easy';
    this.boardGroup = new THREE.Group(); this.boardGroup.name = 'board'; this.scene.add(this.boardGroup);
    this.decorGroup = new THREE.Group(); this.decorGroup.name = 'decorations'; this.scene.add(this.decorGroup);
    this.complexGroup = new THREE.Group();
    // Nome na árvore Three.js (útil no inspector). Não corresponde a nenhuma pasta do repo; GLB vivem em assets/models/ + ModelLoader.js.
    this.complexGroup.name = 'complex-objects';
    this.scene.add(this.complexGroup);
    this.skyboxMesh = null;
    this.loadedModels = {};
    this.gridHelper = null;

    // Cache de referências para animações (evita traverse() por frame)
    this._animRefs = {
      trophyStars: [],
      trophyRings: [],
      fogUniformMats: [],
      auroraUniformMats: [],
      pineTips: [],
      mushroomGlows: [],
      crystalLights: [],
      // Novos objectos animados
      creekWaterMats: [],       // Shader do riacho (floresta)
      oasisWaterMats: [],       // Água do oásis (deserto)
      campfireLights: [],       // Luz da fogueira (neve)
      frozenLakeMats: [],       // Shader do lago gelado (neve)
      treeCanopies: [],         // Copas de árvores p/ animação vento
      fernFronds: [],           // Folhas dos fetos p/ animação vento
      pineLayers: [],           // Camadas dos pinheiros p/ animação vento
      rabbitTails: [],          // Caudas dos coelhos
      palmLeaves: [],           // Folhas das palmeiras
      // Decoração exterior
      torchLights: [],          // Luzes das tochas (floresta)
      torchFlames: [],          // Chamas das tochas (floresta)
      braseiroLights: [],       // Luzes dos braseiros (deserto)
      braseiroFlames: [],       // Chamas dos braseiros (deserto)
      icePillarLights: [],      // Luzes dos pilares gelo (neve)
    };
  }

  /**
   * No menu principal o nível 3D completo ainda estava na cena — o GPU renderava
   * bioma + tabuleiro + obstáculos + pós-processamento só como fundo atrás do HTML.
   * @param {boolean} visible — false no menu (excepto pré-visualização de mapas)
   */
  setGameplayLayersVisible(visible) {
    this.boardGroup.visible = visible;
    this.decorGroup.visible = visible;
    this.complexGroup.visible = visible;
    if (this.gridHelper) this.gridHelper.visible = visible;
    if (this.skyboxMesh) this.skyboxMesh.visible = visible;
    this.scene.background = visible ? null : new THREE.Color(0x0a0a1a);
  }

  async loadConfig(url) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      this.levels = data.levels || [];
    } catch (err) {
      console.warn('Erro ao carregar levelConfig.json, usando nível padrão:', err);
      this.levels = [{
        id: 1, name: 'DEFAULT',
        biome: 'forest',
        theme: {
          background: '#0a1a0f', fogColor: '#1a3a1a', fogNear: 18, fogFar: 55,
          groundColor: '#1a2a10', groundEmissive: '#0a1a05', gridColor: '#44ff44', gridOpacity: 0.14,
          wallColor: '#1a2a15', wallEmissive: '#22cc44', ambientIntensity: 0.55, ambientColor: '#335522',
          directionalColor: '#aaffaa', directionalIntensity: 1.0, bloomStrength: 0.7,
        },
      }];
    }
  }

  /**
   * Mapa id → cena/object3D (ex.: arcade, trophy), preenchido por ModelLoader no boot.
   * @param {Record<string, THREE.Object3D>} models
   */
  setDecorModels(models) {
    this.loadedModels = models && typeof models === 'object' ? models : {};
  }

  _getGroundTexture(biome) {
    // PBR: Usa texturas importadas (.png) com normal maps e roughness maps procedurais
    switch (biome) {
      case 'forest': return {
        map: loadImportedTexture('moss_ground_floor', 'textures/moss_ground.png', 5, 5),
        normalMap: createProceduralNormalMap(256, 2.0, 0.06, 'forest'),
        roughnessMap: createProceduralRoughnessMap(256, 0.85, 0.1, 'forest'),
      };
      case 'desert': return {
        map: loadImportedTexture('sandstone_floor', 'textures/sandstone.png', 5, 5),
        normalMap: createProceduralNormalMap(256, 1.5, 0.04, 'desert'),
        roughnessMap: createProceduralRoughnessMap(256, 0.92, 0.06, 'desert'),
      };
      case 'snow': return {
        map: loadImportedTexture('ice_floor', 'textures/ice.png', 5, 5),
        normalMap: createProceduralNormalMap(256, 1.0, 0.08, 'snow'),
        roughnessMap: createProceduralRoughnessMap(256, 0.5, 0.12, 'snow'),
      };
      default: return {
        map: loadImportedTexture('moss_ground_floor', 'textures/moss_ground.png', 5, 5),
        normalMap: createProceduralNormalMap(256, 2.0, 0.06, 'forest'),
        roughnessMap: createProceduralRoughnessMap(256, 0.85, 0.1, 'forest'),
      };
    }
  }

  _getWallTexture(biome) {
    // PBR: Usa texturas importadas (.png) com normal maps nas paredes
    switch (biome) {
      case 'forest': return {
        map: loadImportedTexture('bark_wall', 'textures/bark.png', 3, 1.5),
        normalMap: createProceduralNormalMap(128, 3.0, 0.1, 'forest'),
        roughnessMap: createProceduralRoughnessMap(128, 0.9, 0.08, 'forest'),
      };
      case 'desert': return {
        map: loadImportedTexture('sandstone_wall', 'textures/sandstone.png', 3, 1.5),
        normalMap: createProceduralNormalMap(128, 2.0, 0.07, 'desert'),
        roughnessMap: createProceduralRoughnessMap(128, 0.95, 0.05, 'desert'),
      };
      case 'snow': return {
        map: loadImportedTexture('ice_wall', 'textures/ice.png', 3, 1.5),
        normalMap: createProceduralNormalMap(128, 1.5, 0.09, 'snow'),
        roughnessMap: createProceduralRoughnessMap(128, 0.4, 0.15, 'snow'),
      };
      default: return {
        map: loadImportedTexture('bark_wall', 'textures/bark.png', 3, 1.5),
        normalMap: createProceduralNormalMap(128, 3.0, 0.1, 'forest'),
        roughnessMap: createProceduralRoughnessMap(128, 0.9, 0.08, 'forest'),
      };
    }
  }

  _getSkyboxColors(biome, theme) {
    // Derivar cores do skybox a partir do tema para manter coerência com fog/background.
    // Mantém a estética do bioma, mas deixa o JSON controlar o "tom" principal.
    const mid = new THREE.Color(theme?.skyboxColor || theme?.background || '#0a0a1a');
    const fog = new THREE.Color(theme?.fogColor || theme?.background || '#000000');

    // Topo mais escuro (tendência para "night sky")
    const top = mid.clone().lerp(new THREE.Color(0x000000), biome === 'desert' ? 0.45 : 0.55);
    // Base aproxima-se do fog para transição natural com a névoa
    const bottom = fog.clone().lerp(mid, 0.15);

    return { top, mid, bottom };
  }

  _getDifficultyConfig(difficultyId = 'easy') {
    return DIFFICULTY_PRESETS[difficultyId] || DIFFICULTY_PRESETS.easy;
  }

  async loadLevel(levelIndex, difficultyId = 'easy', skipTransition = false) {
    this.currentLevelIndex = levelIndex;
    this.currentLevel = this.levels[levelIndex] || this.levels[0];
    this.currentDifficultyId = difficultyId;
    const level = this.currentLevel;
    const difficulty = this._getDifficultyConfig(difficultyId);
    const theme = level.theme;
    const biome = level.biome || 'forest';

    // Transição de nível removida — mapa carrega directamente

    // Cleanup
    disposeGroup(this.boardGroup);
    disposeGroup(this.decorGroup);
    disposeGroup(this.complexGroup);
    if (this.skyboxMesh) {
      this.scene.remove(this.skyboxMesh);
      this.skyboxMesh.geometry.dispose();
      this.skyboxMesh.material.dispose();
      this.skyboxMesh = null;
    }
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      this.gridHelper.material.dispose();
      this.gridHelper = null;
    }

    // ---- Skybox gradiente ----
    const skyColors = this._getSkyboxColors(biome, theme);
    this.skyboxMesh = createSkybox(skyColors.top, skyColors.mid, skyColors.bottom);
    this.scene.add(this.skyboxMesh);
    this.scene.background = null; // uso skybox em vez de cor plana

    this.scene.fog = new THREE.Fog(hexToColor(theme.fogColor), theme.fogNear || 20, theme.fogFar || 60);

    // ---- Tabuleiro ----
    const boardWidth = BOARD_SIZE * CELL_SIZE;
    const boardHeight = 0.5;
    const groundPBR = this._getGroundTexture(biome);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth, boardHeight, boardWidth),
      new THREE.MeshStandardMaterial({
        map: groundPBR.map,
        normalMap: groundPBR.normalMap,
        normalScale: new THREE.Vector2(0.8, 0.8),
        roughnessMap: groundPBR.roughnessMap,
        color: hexToColor(theme.groundColor || '#1a2a10'),
        emissive: hexToColor(theme.groundEmissive || '#0a1a05'), emissiveIntensity: 0.08,
        roughness: 0.9, metalness: 0.05,
      })
    );
    board.position.set(0, -boardHeight*0.5, 0);
    board.receiveShadow = true; board.name = 'board-floor';
    this.boardGroup.add(board);

    // ---- Paredes (PBR: textura importada + normalMap + roughnessMap) ----
    const wallHeight = 1.5, wallThick = 0.5, half = boardWidth*0.5;
    const wallPBR = this._getWallTexture(biome);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallPBR.map,
      normalMap: wallPBR.normalMap,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughnessMap: wallPBR.roughnessMap,
      color: hexToColor(theme.wallColor || '#1a2a15'),
      emissive: hexToColor(theme.wallEmissive || '#22cc44'), emissiveIntensity: 0.12,
      roughness: 0.7, metalness: 0.15,
    });
    addArenaPerimeterWalls(this.boardGroup, {
      boardWidth,
      wallMaterial: wallMat,
      hexToColor,
      wallEmissiveHex: theme.wallEmissive || '#22cc44',
      wallHeight,
      wallThick,
    });

    // ---- Grid ----
    const gridColor = hexToColor(theme.gridColor || '#44ff44');
    this.gridHelper = new THREE.GridHelper(boardWidth, BOARD_SIZE, gridColor, gridColor);
    this.gridHelper.position.y = 0.02;
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = (theme.gridOpacity || 0.15) * 0.5;
    this.scene.add(this.gridHelper);

    // ---- Obstáculos ----
    this.obstacles.generate(difficulty.obstacles || [], biome);

    // ---- Decorações GLTF ----
    this._placeDecorations();

    // ---- Bioma completo (objetos + decoração shader) ----
    this._buildBiomeEnvironment(biome, half);

    // Otimizações de performance (por nível)
    this._rebuildAnimRefsCache();
    this._optimizeComplexShadows();

    // ---- Luzes ----
    this.lightManager.applyTheme(theme);

    // ---- UI ----
    this.ui.setLevel(`MAPA: ${level.name} | DIFICULDADE: ${difficulty.name}`);

    // Após rebuild, grupos têm de ficar visíveis (no menu principal ficaram .visible = false).
    this.setGameplayLayersVisible(true);
    this.obstacles.group.visible = true;

    return level;
  }

  _buildBiomeEnvironment(biome, half) {
    const helpers = {
      loadImportedTexture,
      createAtmosphericEffect,
      createAuroraBorealis,
    };
    switch (biome) {
      case 'forest': buildForestBiome(this.complexGroup, half, helpers); break;
      case 'desert': buildDesertBiome(this.complexGroup, half, helpers); break;
      case 'snow': buildSnowBiome(this.complexGroup, half, helpers); break;
      default: buildForestBiome(this.complexGroup, half, helpers); break;
    }
  }

  _placeDecorations() {
    const half = (BOARD_SIZE * CELL_SIZE) / 2;
    const decorPositions = [
      { name: 'arcade', pos: new THREE.Vector3(-half-2, 0, -half-2), rot: Math.PI/4 },
      { name: 'arcade', pos: new THREE.Vector3(half+2, 0, -half-2), rot: -Math.PI/4 },
      { name: 'trophy', pos: new THREE.Vector3(-half-2, 0, half+2), rot: Math.PI/4 },
      { name: 'trophy', pos: new THREE.Vector3(half+2, 0, half+2), rot: -Math.PI/4 },
    ];
    for (const dec of decorPositions) {
      const model = this.loadedModels[dec.name];
      if (!model) continue;
      const clone = model.clone();
      clone.position.copy(dec.pos); clone.rotation.y = dec.rot;
      clone.name = `decor-${dec.name}`;
      clone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
      this.decorGroup.add(clone);
    }
  }

  updateDecorations(elapsed) {
    // ── Decorações GLTF (trophy) ──
    for (const child of this._animRefs.trophyStars) {
      child.rotation.y += 0.02;
      child.rotation.x = Math.sin(elapsed * 2) * 0.2;
    }
    for (const child of this._animRefs.trophyRings) {
      child.rotation.z += 0.03;
    }

    // ── Shaders atmosféricos (fog, aurora) ──
    for (const mat of this._animRefs.fogUniformMats) {
      if (mat?.uniforms?.uTime) mat.uniforms.uTime.value = elapsed;
    }
    for (const mat of this._animRefs.auroraUniformMats) {
      if (mat?.uniforms?.uTime) mat.uniforms.uTime.value = elapsed;
    }

    // ── Pontas dos pinheiros (rotação + pulsação) ──
    for (const child of this._animRefs.pineTips) {
      child.rotation.y += 0.03;
      child.rotation.x = Math.sin(elapsed * 2) * 0.15;
      child.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.15);
    }

    // ── Cogumelos bioluminescentes (pulsação de brilho) ──
    for (const child of this._animRefs.mushroomGlows) {
      const m = child.material;
      if (!m) continue;
      m.emissiveIntensity = 0.8 + Math.sin(elapsed * 3 + child.position.x * 5) * 0.5;
      m.opacity = 0.5 + Math.sin(elapsed * 2.5 + child.position.z * 3) * 0.3;
    }

    // ── Luzes dos cristais de gelo (variação intensidade) ──
    for (const child of this._animRefs.crystalLights) {
      child.intensity = 0.4 + Math.sin(elapsed * 2.5) * 0.3;
    }

    // ── NOVOS: Copas das árvores (balanço de vento) ──
    for (const child of this._animRefs.treeCanopies) {
      child.rotation.z = Math.sin(elapsed * 0.8 + child.position.x * 0.5) * 0.04;
      child.rotation.x = Math.cos(elapsed * 0.6 + child.position.z * 0.3) * 0.03;
    }

    // ── NOVOS: Folhas dos fetos (ondulação de vento) ──
    for (const child of this._animRefs.fernFronds) {
      child.rotation.x = -0.6 + Math.sin(elapsed * 1.2 + child.position.x * 2) * 0.1;
    }

    // ── NOVOS: Camadas dos pinheiros (leve balanço) ──
    for (const child of this._animRefs.pineLayers) {
      child.rotation.z = Math.sin(elapsed * 0.5 + child.position.y * 2) * 0.02;
    }

    // ── NOVOS: Shaders de água (riacho floresta) ──
    for (const mat of this._animRefs.creekWaterMats) {
      if (mat?.uniforms?.uTime) mat.uniforms.uTime.value = elapsed;
    }

    // ── NOVOS: Água do oásis (shader deserto) ──
    for (const mat of this._animRefs.oasisWaterMats) {
      if (mat?.uniforms?.uTime) mat.uniforms.uTime.value = elapsed;
    }

    // ── NOVOS: Luz da fogueira (flickering) ──
    for (const child of this._animRefs.campfireLights) {
      child.intensity = 1.0 + Math.sin(elapsed * 8) * 0.3 + Math.sin(elapsed * 13) * 0.15;
    }

    // ── NOVOS: Lago gelado (shader rachaduras neve) ──
    for (const mat of this._animRefs.frozenLakeMats) {
      if (mat?.uniforms?.uTime) mat.uniforms.uTime.value = elapsed;
    }

    // ── NOVOS: Caudas dos coelhos (balanço) ──
    for (const child of this._animRefs.rabbitTails) {
      child.rotation.x = Math.sin(elapsed * 4 + child.position.z) * 0.15;
    }

    // ── NOVOS: Folhas das palmeiras (vento) ──
    for (const child of this._animRefs.palmLeaves) {
      child.rotation.x = -0.8 + Math.sin(elapsed * 1.0 + child.position.x * 2) * 0.15;
      child.rotation.z = Math.cos(elapsed * 0.7 + child.position.z) * 0.05;
    }

    // ── EXTERIOR: Tochas da floresta (flickering) ──
    for (const child of this._animRefs.torchLights) {
      child.intensity = 0.4 + Math.sin(elapsed * 7 + child.position.x) * 0.15 + Math.sin(elapsed * 11) * 0.1;
    }
    for (const child of this._animRefs.torchFlames) {
      child.scale.setScalar(0.9 + Math.sin(elapsed * 6 + child.position.z) * 0.2);
    }

    // ── EXTERIOR: Braseiros do deserto (flickering) ──
    for (const child of this._animRefs.braseiroLights) {
      child.intensity = 0.6 + Math.sin(elapsed * 6) * 0.25 + Math.sin(elapsed * 10) * 0.15;
    }
    for (const child of this._animRefs.braseiroFlames) {
      child.scale.y = 0.8 + Math.sin(elapsed * 8 + child.position.x) * 0.3;
      child.rotation.y += 0.02;
    }

    // ── EXTERIOR: Pilares de gelo da neve (pulsação luz) ──
    for (const child of this._animRefs.icePillarLights) {
      child.intensity = 0.3 + Math.sin(elapsed * 1.5 + child.position.z * 0.5) * 0.15;
    }
  }

  _rebuildAnimRefsCache() {
    // Reset de todas as referências
    for (const k of Object.keys(this._animRefs)) this._animRefs[k] = [];

    // Decorações (trophy)
    this.decorGroup.traverse(child => {
      if (child.name === 'trophy-star') this._animRefs.trophyStars.push(child);
      if (child.name === 'trophy-ring') this._animRefs.trophyRings.push(child);
    });

    // Complexos / bioma — traverse uma única vez, categorizar por nome
    this.complexGroup.traverse(child => {
      const n = child.name;

      // Shaders atmosféricos
      if (n === 'fog-plane' || n === 'fog-plane-upper') {
        if (child.material?.uniforms?.uTime) this._animRefs.fogUniformMats.push(child.material);
      }
      if (n === 'aurora-plane' || n === 'aurora-plane-2') {
        if (child.material?.uniforms?.uTime) this._animRefs.auroraUniformMats.push(child.material);
      }

      // Objectos existentes
      if (n === 'pine-tip') this._animRefs.pineTips.push(child);
      if (n === 'mushroom-glow') this._animRefs.mushroomGlows.push(child);
      if (n === 'crystal-light') this._animRefs.crystalLights.push(child);

      // NOVOS: Animações de vento em vegetação
      if (n === 'tree-canopy') this._animRefs.treeCanopies.push(child);
      if (n === 'fern-frond') this._animRefs.fernFronds.push(child);
      if (n === 'pine-layer') this._animRefs.pineLayers.push(child);
      if (n === 'palm-leaf') this._animRefs.palmLeaves.push(child);

      // NOVOS: Shaders de água
      if (n === 'creek-water') {
        if (child.material?.uniforms?.uTime) this._animRefs.creekWaterMats.push(child.material);
      }
      if (n === 'oasis-water') {
        if (child.material?.uniforms?.uTime) this._animRefs.oasisWaterMats.push(child.material);
      }
      if (n === 'campfire-light') this._animRefs.campfireLights.push(child);
      if (n === 'frozen-lake-surface') {
        if (child.material?.uniforms?.uTime) this._animRefs.frozenLakeMats.push(child.material);
      }

      // NOVOS: Animais
      if (n === 'rabbit-tail') this._animRefs.rabbitTails.push(child);

      // EXTERIOR: Tochas, braseiros, pilares de gelo
      if (n === 'torch-light') this._animRefs.torchLights.push(child);
      if (n === 'torch-flame') this._animRefs.torchFlames.push(child);
      if (n === 'braseiro-light') this._animRefs.braseiroLights.push(child);
      if (n === 'braseiro-flame') this._animRefs.braseiroFlames.push(child);
      if (n === 'ice-pillar-light') this._animRefs.icePillarLights.push(child);
    });
  }

  _optimizeComplexShadows() {
    // Bioma + GLTF fora do tabuleiro: não projectam nem recebem sombras (reduz draw calls no shadow pass).
    // Mantém-se sombra principalmente no chão, cobra e comida (boardGroup / scene directa).
    const strip = (root) => {
      root.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = false;
          obj.receiveShadow = false;
        }
      });
    };
    strip(this.complexGroup);
    strip(this.decorGroup);
  }

  get speed() { return this._getDifficultyConfig(this.currentDifficultyId).speed; }
  /**
   * Segundos no início da partida em que colisões com paredes móveis não matam (0 em fácil).
   * @returns {number}
   */
  get movingWallGraceSeconds() {
    const d = this._getDifficultyConfig(this.currentDifficultyId);
    return typeof d.movingWallGraceSeconds === 'number' ? d.movingWallGraceSeconds : 0;
  }
  get powerups() { return this._getDifficultyConfig(this.currentDifficultyId).powerups || []; }
  /**
   * Intervalo de maçãs (comida) para spawnar escudo; `null` = sem escudos por esta regra.
   * @returns {number|null}
   */
  get shieldEveryApples() {
    const d = this._getDifficultyConfig(this.currentDifficultyId);
    const n = d.shieldEveryApples;
    if (n == null) return null;
    const v = Math.floor(Number(n));
    return Number.isFinite(v) && v > 0 ? v : null;
  }
  get biome() { return this.currentLevel ? (this.currentLevel.biome || 'forest') : 'forest'; }
  get difficulties() {
    return Object.values(DIFFICULTY_PRESETS).map(d => ({ id: d.id, name: d.name }));
  }
}
