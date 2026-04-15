/* ==========================================================================
   ReplaySystem.js — Sistema de gravação e reprodução (replay)
   Requisito: Gravar posições e rotações da cobra frame-a-frame num buffer
   circular. Permitir reproduzir com controlos (play/pause/rewind) via tecla R.
   ========================================================================== */
import * as THREE from 'three';

const MAX_FRAMES = 3000; // ~50s a 60fps

export class ReplaySystem {
  /**
   * @param {UIManager} uiManager
   */
  constructor(uiManager) {
    this.ui = uiManager;

    // Buffer circular
    this.buffer = [];
    this.writeIndex = 0;
    this.frameCount = 0;

    // Estado de reprodução
    this.isReplaying = false;
    this.isPlaying   = false;
    this.playHead    = 0;
    this.speed       = 1;  // 1x, 2x, 0.5x
    this._accumulator = 0;

    // Bind de eventos dos controlos de replay
    this._bindControls();
  }

  /**
   * Grava um frame do estado da cobra.
   * Chamado a cada game tick (não a cada render frame).
   * @param {Array<THREE.Vector3>} segments — posições dos segmentos
   * @param {THREE.Vector3} direction — direcção actual
   * @param {number} score — pontuação actual
   */
  record(segments, direction, score) {
    if (this.isReplaying) return;

    const frame = {
      segments: segments.map(s => ({ x: s.x, y: s.y, z: s.z })),
      direction: { x: direction.x, y: direction.y, z: direction.z },
      score: score,
      timestamp: performance.now(),
    };

    if (this.buffer.length < MAX_FRAMES) {
      this.buffer.push(frame);
    } else {
      this.buffer[this.writeIndex] = frame;
    }
    this.writeIndex = (this.writeIndex + 1) % MAX_FRAMES;
    this.frameCount = Math.min(this.frameCount + 1, MAX_FRAMES);
  }

  /**
   * Inicia o modo de replay.
   * @returns {boolean} — true se o replay foi iniciado
   */
  startReplay() {
    if (this.frameCount === 0) return false;
    this.isReplaying = true;
    this.isPlaying   = true;
    this.playHead    = 0;
    this.speed       = 1;
    this._accumulator = 0;
    this.ui.showReplayBar(true);
    this.ui.setReplayPlayButton(true);
    this.ui.setReplaySpeedLabel(this.speed);
    this.ui.setReplayTimeline(0, this.frameCount - 1);
    return true;
  }

  /**
   * Termina o modo de replay e volta ao jogo.
   */
  stopReplay() {
    this.isReplaying = false;
    this.isPlaying   = false;
    this.ui.showReplayBar(false);
  }

  /**
   * Alterna entre replay e jogo.
   * @returns {boolean} — true se entrou em replay, false se saiu
   */
  toggleReplay() {
    if (this.isReplaying) {
      this.stopReplay();
      return false;
    }
    return this.startReplay();
  }

  /**
   * Alterna play/pause durante replay.
   */
  togglePlay() {
    if (!this.isReplaying) return;
    this.isPlaying = !this.isPlaying;
    this.ui.setReplayPlayButton(this.isPlaying);
  }

  /**
   * Retrocede para o início.
   */
  rewind() {
    if (!this.isReplaying) return;
    this.playHead = 0;
    this._accumulator = 0;
    this.ui.setReplayTimeline(0, this.frameCount - 1);
  }

  /**
   * Cicla velocidade: 0.5x → 1x → 2x → 4x → 0.5x
   */
  cycleSpeed() {
    if (!this.isReplaying) return;
    const speeds = [0.5, 1, 2, 4];
    const idx = speeds.indexOf(this.speed);
    this.speed = speeds[(idx + 1) % speeds.length];
    this.ui.setReplaySpeedLabel(this.speed);
  }

  /**
   * Salta para um frame específico (ex: quando o utilizador arrasta o slider).
   * @param {number} frame
   */
  seekTo(frame) {
    if (!this.isReplaying) return;
    this.playHead = Math.max(0, Math.min(frame, this.frameCount - 1));
    this._accumulator = 0;
  }

  /**
   * Actualiza o replay a cada frame de render.
   * @param {number} delta — tempo desde último frame (s)
   * @returns {object|null} — frame actual para renderizar, ou null
   */
  update(delta) {
    if (!this.isReplaying) return null;

    if (this.isPlaying) {
      this._accumulator += delta * this.speed * 60; // converter para "game ticks"
      while (this._accumulator >= 1 && this.playHead < this.frameCount - 1) {
        this.playHead++;
        this._accumulator -= 1;
      }
      // Pausa automática no fim
      if (this.playHead >= this.frameCount - 1) {
        this.isPlaying = false;
        this.ui.setReplayPlayButton(false);
      }
    }

    this.ui.setReplayTimeline(this.playHead, this.frameCount - 1);

    return this.getFrame(this.playHead);
  }

  /**
   * Obtém um frame do buffer pela posição lógica.
   * O buffer é circular, por isso temos de converter.
   * @param {number} logicalIndex — 0 = frame mais antigo disponível
   * @returns {object|null}
   */
  getFrame(logicalIndex) {
    if (logicalIndex < 0 || logicalIndex >= this.frameCount) return null;

    let bufferIndex;
    if (this.frameCount < MAX_FRAMES) {
      bufferIndex = logicalIndex;
    } else {
      // Buffer cheio: o writeIndex aponta para o slot mais antigo
      bufferIndex = (this.writeIndex + logicalIndex) % MAX_FRAMES;
    }
    return this.buffer[bufferIndex] || null;
  }

  /**
   * Limpa o buffer (ex: ao reiniciar o jogo).
   */
  clear() {
    this.buffer = [];
    this.writeIndex = 0;
    this.frameCount = 0;
    this.stopReplay();
  }

  /** @private — Liga eventos dos botões de replay na UI */
  _bindControls() {
    if (this.ui.btnReplayPlay) {
      this.ui.btnReplayPlay.addEventListener('click', () => this.togglePlay());
    }
    if (this.ui.btnReplayRew) {
      this.ui.btnReplayRew.addEventListener('click', () => this.rewind());
    }
    if (this.ui.btnReplaySpeed) {
      this.ui.btnReplaySpeed.addEventListener('click', () => this.cycleSpeed());
    }
    if (this.ui.replayTimeline) {
      this.ui.replayTimeline.addEventListener('input', (e) => {
        this.seekTo(parseInt(e.target.value, 10));
      });
    }
  }
}
