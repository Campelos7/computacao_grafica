/**
 * @fileoverview Configuração central — valores que costumas querer mudar sem caçar pelo projecto.
 *
 * **Filosofia:** constantes simples (números, strings, hex) agrupadas por domínio. Lógica de jogo
 * continua nos módulos respectivos; aqui só entram “parafusos” de equilíbrio visual / áudio / performance.
 *
 * **Outros sítios importantes (não duplicados aqui):**
 * - Velocidade da cobra, obstáculos, **áudio por dificuldade** (`musicNoteLength`, etc.): `js/level/difficultyPresets.js`
 * - Comida, spawn de escudo, `ITEM_TYPES`: `js/food/constants.js`
 * - Temas por nível (cores, bloom do nível): `levels/levelConfig.json` + `js/LevelManager.js`
 * - Melodias longas (arrays de Hz) da música de **jogo**: `js/SoundManager.js` → `_playGameMusicLoop`
 * - Melodias do **menu**: `js/SoundManager.js` → `_playMenuMusicLoop`
 * - GLB de decoração: `js/ModelLoader.js` + pasta `assets/models/`
 */

/* =============================================================================
   RENDER — Canvas WebGL, sombras do renderer, limite de passos da cobra
   ============================================================================= */

export const RENDER = {
  /**
   * Tecto de `devicePixelRatio`. Valor `1` evita render 2× em ecrãs Retina (muito mais barato).
   * @type {number}
   */
  maxPixelRatio: 1,

  /**
   * Largura/altura internas do buffer = janela × este factor; o canvas estica em CSS.
   * `1` = máxima nitidez; `0.55`–`0.65` = típico em portátil com GPU integrada.
   * @type {number}
   */
  internalScale: 0.65,

  /**
   * Máximo de passos lógicos da cobra por frame (evita picos após *hitch* / tab em segundo plano).
   * @type {number}
   */
  maxSnakeStepsPerFrame: 4,

  /**
   * Modo de mapa de sombras do **renderer** (não confundir com luzes individuais).
   * - `'basic'` — mais rápido, bordas mais duras.
   * - `'pcf'` — `THREE.PCFShadowMap`, mais suave e mais caro.
   * @type {'basic'|'pcf'}
   */
  shadowMapMode: 'basic',

  /**
   * `false` evita ordenar objectos por profundidade a cada frame (a cena é sobretudo opaca).
   * @type {boolean}
   */
  sortObjects: false,

  /** Exposição por defeito quando o nível não define `theme.exposure`. @type {number} */
  toneMappingExposureDefault: 1.1,
};

/* =============================================================================
   PÓS-PROCESSAMENTO — Bloom, CRT, film grain (`js/PostProcessing.js`)
   ============================================================================= */

export const POST_FX = {
  /**
   * Largura/altura internas do `UnrealBloomPass` = dimensão do buffer × este factor.
   * Menor = mais FPS, bloom ligeiramente mais “grosso”.
   * @type {number}
   */
  bloomInternalScale: 0.4,

  /**
   * Se `false`, o passo de *film grain* não corre (poupa um *fullscreen pass*).
   * @type {boolean}
   */
  filmGrainPassEnabled: false,

  /** Uniforms iniciais do shader CRT (scanlines, curvatura, etc.). */
  crt: {
    curvature: 6.0,
    scanlineIntensity: 0.06,
    /** Mais alto = scanlines mais finas (mais custo no fragment shader). */
    scanlineCount: 320.0,
    chromaOffset: 0.001,
    vignette: 0.25,
  },

  /**
   * Uniform `uPixelSize` do passo *pixelate* (quanto maior, menos blocos visíveis).
   * @type {{ x: number, y: number }}
   */
  pixelateVirtualResolution: { x: 1920, y: 1080 },
};

/* =============================================================================
   ÁUDIO — Ganhos do bus, música ambiente do menu (`js/SoundManager.js`)
   ============================================================================= */

export const AUDIO_BUS = {
  /** Volume linear master base (0–1). O painel Settings multiplica com o slider; **P** força 0. @type {number} */
  masterLinearGain: 0.35,
  /**
   * Bus **só** da música (ligado ao master). O slider em Settings multiplica este valor (0–100%).
   * Os SFX usam o bus `sfxGain` com ganho interno ~0.2–0.3 por nota.
   * @type {number}
   */
  musicLinearGain: 0.68,
  /**
   * Envelopes da melodia/baixo **antes** do `musicLinearGain` (cada nota é um oscilador → gain → musicGain).
   * Afinar aqui em vez de números mágicos dentro de `SoundManager.js`.
   */
  musicGame: {
    melodyAttack: 0.26,
    melodySustain: 0.2,
    bassPeak: 0.12,
  },
  /** Envelopes do loop do menu (sine/triangle ouvem-se mais baixos que o chiptune do jogo). */
  musicMenu: {
    melodyAttack: 0.34,
    melodySustain: 0.28,
    bassPeak: 0.2,
  },
};

/** Loop do menu: ritmo e tom global (não depende da dificuldade seleccionada). */
export const AMBIENT_MENU_MUSIC = {
  /** Duração de cada “slot” da grelha da melodia (s). Maior = mais lento. */
  noteLengthSec: 0.24,
  /** Multiplica todas as frequências do menu (1 = original). */
  pitchScale: 0.93,
  /**
   * Multiplica os envelopes do menu em `SoundManager` (melodia sine + baixo).
   * Valores >1 compensam a sine “suave” vs. o loop de jogo; limitado no código para evitar clipping.
   */
  menuLoopGainScale: 1.95,
};

/** Escudo activo na cobra: duração e afinação (`Snake.js`, HUD em `UIManager.js`). */
export const SHIELD = {
  /** Tempo total (s) com o escudo ligado; a barra do HUD esgota-se linearmente. */
  durationSec: 14,
};

/* =============================================================================
   LUZES — Sobretudo sombra da direccional (`js/LightManager.js`)
   ============================================================================= */

export const LIGHTING = {
  /** Tamanho do shadow map da luz direccional (quadrado). Menor = mais FPS na sombra. @type {number} */
  directionalShadowMapSize: 256,
};

/* =============================================================================
   BIOMA FLORESTA — Água do riacho (`js/level/biomes/forest/creek.js`)
   ============================================================================= */

export const FOREST_CREEK = {
  waterOpacity: 0.65,
  /** Brilho “sparkle” no shader; baixa se a floresta pesar na GPU. */
  sparkleIntensity: 0.55,
  waterColor1: '#1a6655',
  waterColor2: '#44bbaa',
};

/**
 * Resolve o tipo de shadow map do Three.js a partir de `RENDER.shadowMapMode`.
 * @param {typeof import('three')} THREE
 * @returns {number}
 */
export function getRendererShadowMapType(THREE) {
  return RENDER.shadowMapMode === 'pcf' ? THREE.PCFShadowMap : THREE.BasicShadowMap;
}
