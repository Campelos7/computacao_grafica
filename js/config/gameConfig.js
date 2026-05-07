/* ==========================================================================
   gameConfig.js — Parâmetros de tuning (valores “à mão”) num único sítio

   Objetivo: um programador alterar rapidamente o comportamento do jogo sem
   espalhar números pelo código. Comentários em português indicam o efeito de
   cada valor.

   Nota: ritmo por mapa continua em levels/levelConfig.json (campo `pace`).
   ========================================================================== */

// ═══════════════════════════════════════════════════════════════════════════
// TABULEIRO
// ═══════════════════════════════════════════════════════════════════════════

/** Células por lado (grelha quadrada). */
export const BOARD_SIZE = 20;

/** Tamanho de cada célula em unidades de mundo (Three.js). */
export const CELL_SIZE = 1;

// ═══════════════════════════════════════════════════════════════════════════
// VELOCIDADE DA COBRA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Duração de um passo em segundos com dificuldade NORMAL e pace do mapa = 1.0.
 * Diminuir = cobra mais rápida no modo “referência”; Fácil/Difícil e `pace`
 * do JSON escalam a partir deste valor.
 */
export const SNAKE_STEP_REFERENCE_SECONDS = 0.125;

/**
 * Dificuldade global (independente do mapa escolhido).
 * - snakeStepMult: multiplica o intervalo entre passos (>1 = cobra mais lenta).
 * - obstacleSpeedMult: multiplica a velocidade das animações dos obstáculos (>1 = mais rápido).
 */
export const DIFFICULTY_LEVELS = [
  { id: 'easy', label: 'FÁCIL', snakeStepMult: 1.38, obstacleSpeedMult: 0.62 },
  { id: 'normal', label: 'NORMAL', snakeStepMult: 1.0, obstacleSpeedMult: 1.0 },
  { id: 'hard', label: 'DIFÍCIL', snakeStepMult: 0.68, obstacleSpeedMult: 1.5 },
];

// ═══════════════════════════════════════════════════════════════════════════
// ESCUDO (power-up)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A cada N maçãs normais comidas, nasce um escudo (por dificuldade).
 * Chaves = campo `id` de DIFFICULTY_LEVELS. null = escudo desligado nesse modo.
 */
export const SHIELD_SPAWN_EVERY_N_APPLES = {
  easy: 5,
  normal: 15,
  hard: null,
};

/** Quanto tempo o escudo protege e mantém o efeito visual, em segundos. */
export const SHIELD_DURATION_SECONDS = 8;

// ═══════════════════════════════════════════════════════════════════════════
// OBSTÁCULOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Em DIFÍCIL, se o nível no JSON tiver `obstacles: []`, usa-se esta lista.
 * Mesmo formato que em levelConfig.json.
 */
export const OBSTACLES_FALLBACK_WHEN_LEVEL_EMPTY = [
  { type: 'movingWall', position: [3, 0], axis: 'x', range: 4, speed: 1.5 },
  { type: 'movingWall', position: [-4, 2], axis: 'z', range: 3, speed: 1.2 },
  { type: 'disappearingBlock', position: [-5, 3], interval: 5 },
  { type: 'disappearingBlock', position: [6, -4], interval: 4 },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMBO (pontuação)
// ═══════════════════════════════════════════════════════════════════════════

/** Segundos entre comer duas comidas para subir o nível de combo. */
export const COMBO_WINDOW = 2.0;

/** Depois de activo, o combo expira após estes segundos sem nova comida. */
export const COMBO_DECAY = 3.0;

/**
 * Multiplicador de pontos por nível de combo (índice 0 = sem combo, 1 = primeiro nível, …).
 * O último valor repete-se para combos mais altos.
 */
export const COMBO_MULTIPLIERS = [1, 1, 1.5, 2, 2.5, 3];

/**
 * Modelo de combo (referência para o código em main.js):
 * - **Janela (COMBO_WINDOW):** se comeres outra peça dentro deste tempo após a anterior,
 *   o contador de sequência sobe; caso contrário a sequência reinicia (contador interno = 1
 *   para a comida actual ainda dar pontos base, sem mostrar HUD até streak ≥ 2).
 * - **Decay (COMBO_DECAY):** com streak ≥ 2, se não comeres nada durante este tempo,
 *   perdes o multiplicador (volta a 0). Cada nova comida válida na janela repõe o decay.
 * - **Multipliers:** índice = min(streak, len-1); streak 2 → ×1.5, etc.
 */

// ═══════════════════════════════════════════════════════════════════════════
// ARRANQUE DA RONDA
// ═══════════════════════════════════════════════════════════════════════════

/** Segundos antes do primeiro passo lógico (permite input e estabilizar câmara). */
export const ROUND_COUNTDOWN_SECONDS = 0.75;

// ═══════════════════════════════════════════════════════════════════════════
// ARMAZENAMENTO LOCAL (localStorage)
// ═══════════════════════════════════════════════════════════════════════════

export const STORAGE_KEYS = {
  DIFFICULTY: 'snake3d_difficulty',
  HIGHSCORE: 'snake3d_highscore',
  /** JSON: { uiScale, maxFps, highContrastFloor, keysMode } */
  SETTINGS: 'snake3d_settings',
};

// ═══════════════════════════════════════════════════════════════════════════
// CÂMARA (seguimento + orbit + transição perspectiva/ortográfica)
// ═══════════════════════════════════════════════════════════════════════════

export const CAMERA = {
  perspectiveFov: 60,
  clipNear: 0.1,
  clipFar: 200,
  /** Posição inicial da câmara perspectiva antes de seguir a cobra. */
  perspectiveInit: { x: 0, y: 18, z: 14 },
  /** Frustum ortográfico ≈ BOARD_SIZE * este factor (ajusta zoom “de cima”). */
  orthoFrustumBoardFactor: 0.65,
  /** Posição inicial da vista ortográfica (olhar para o centro do tabuleiro). */
  orthoInit: { x: 0, y: 35, z: 0.01 },
  /** Duração da animação ao alternar C entre perspectiva e ortográfica. */
  switchDurationSeconds: 0.6,
  orbitDamping: 0.08,
  orbitMinDistance: 5,
  orbitMaxDistance: 50,
  /** maxPolarAngle = Math.PI * este valor (limite de inclinação para baixo). */
  orbitMaxPolarPiFraction: 0.48,
  /** Distância atrás da cabeça, na direcção oposta ao movimento. */
  followDistanceBehind: 8,
  /** Altura Y da câmara perspectiva ao seguir a cobra. */
  followCameraHeight: 14,
  /** Suavidade: lerp da posição da câmara perspectiva (0–1, maior = mais rápido). */
  followLerpPosition: 0.14,
  /** Suavidade: lerp do target / orbit target em perspectiva. */
  followLerpTarget: 0.22,
  /** Em vista ortográfica, quão rápido o target e a posição seguem a cabeça. */
  orthoFollowLerp: 0.6,
};

// ═══════════════════════════════════════════════════════════════════════════
// RENDERIZADOR E CENA (valores iniciais em main.js)
// ═══════════════════════════════════════════════════════════════════════════

export const RENDER = {
  /** Limite superior de devicePixelRatio para equilíbrio qualidade / desempenho. */
  pixelRatioMax: 1.5,
  toneMappingExposure: 1.1,
};

export const SCENE_DEFAULTS = {
  background: 0x0a0a1a,
  fogColor: 0x1a0a2e,
  fogNear: 22,
  fogFar: 65,
};
