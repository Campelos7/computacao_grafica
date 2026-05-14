/* ==========================================================================
   SoundManager.js — Sistema de Som Retro 8-bit
   Usa Web Audio API para gerar sons sintetizados (sem ficheiros externos).
   Sons: eat, powerup, death, levelUp, menuSelect, menuHover
   Música ambiente: loop distinto no **menu** (suave) vs **jogo** (chiptune); no jogo,
   o tempo e o tom seguem o preset de dificuldade (`musicNoteLength`, `musicPitchMultiplier`).
   Ganhos e ritmo do menu: `js/gameConfig.js` (`AUDIO_BUS`, `AMBIENT_MENU_MUSIC`).
   O `AudioContext` começa `suspended`: `main.js` chama `unlockFromUserGesture()` no início de `startGame()` e `ensureAudioResumeOnFirstGesture()` após o menu carregar; `_ensureContext()` também tenta `resume()` ao criar/reusar o contexto.
   Tecla **P**: silêncio total (master). Volumes e ON/OFF em Settings (`localStorage` snake3d_vol_* / snake3d_setting_*).
   ========================================================================== */

import { getDifficultyAudioPreset } from './level/difficultyPresets.js';
import { OBSTACLE_HIT_SOUND, isDynamicObstacleSoundType } from './obstacles/audioTriggers.js';
import { AUDIO_BUS, AMBIENT_MENU_MUSIC } from './gameConfig.js';

function _readStoredBool(key, defaultTrue = true) {
  try {
    const v = localStorage.getItem(key);
    if (v === '0') return false;
    if (v === '1') return true;
  } catch (_) { /* ignore */ }
  return defaultTrue;
}

function _writeStoredBool(key, on) {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch (_) { /* ignore */ }
}

function _readStoredFloat(key, defaultVal = 1) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === '') return defaultVal;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return defaultVal;
    return Math.max(0, Math.min(1, n));
  } catch (_) {
    return defaultVal;
  }
}

function _writeStoredFloat(key, val) {
  try {
    localStorage.setItem(key, String(Math.max(0, Math.min(1, val))));
  } catch (_) { /* ignore */ }
}

export class SoundManager {
  constructor() {
    this.ctx = null;       // AudioContext criado no primeiro input do utilizador
    this.muted = false;
    this.musicPlaying = false;
    /** @type {'menu'|'game'} */
    this._musicMode = 'menu';
    this.musicGain = null;
    this.sfxGain = null;
    this.masterGain = null;
    this._musicEnabled = _readStoredBool('snake3d_setting_music', true);
    this._sfxEnabled = _readStoredBool('snake3d_setting_sfx', true);
    /** Multiplicadores 0–1 sobre `AUDIO_BUS` (master / música) e bus SFX. */
    this._volMaster = _readStoredFloat('snake3d_vol_master', 1);
    this._volMusic = _readStoredFloat('snake3d_vol_music', 1);
    this._volSfx = _readStoredFloat('snake3d_vol_sfx', 1);
    this._musicNodes = [];
    this._musicTimeout = null;
    this._initialized = false;
    this._difficultyAudio = getDifficultyAudioPreset('medium');
  }

  /** Actualiza tom/tempo da música e pitch dos SFX conforme o preset de dificuldade. */
  applyDifficultyPreset(difficultyId) {
    this._difficultyAudio = getDifficultyAudioPreset(difficultyId);
  }

  /** @param {number} f — Hz nominal */
  _hzSfx(f) {
    const v = f * this._difficultyAudio.sfxPitchMultiplier;
    return Math.min(20000, Math.max(40, v));
  }

  /** @param {number} f — Hz nominal (0 = silêncio / pausa na pauta) */
  _hzMusic(f) {
    if (!f) return 0;
    const v = f * this._difficultyAudio.musicPitchMultiplier;
    return Math.min(20000, Math.max(40, v));
  }

  /** Aplica `muted`, toggles de música/SFX e sliders de volume aos nós Web Audio. */
  _syncActualGains() {
    if (!this._initialized || !this.masterGain) return;
    this.masterGain.gain.value = this.muted
      ? 0
      : AUDIO_BUS.masterLinearGain * this._volMaster;
    if (this.musicGain) {
      this.musicGain.gain.value = this._musicEnabled
        ? AUDIO_BUS.musicLinearGain * this._volMusic
        : 0;
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = this._sfxEnabled ? this._volSfx : 0;
    }
  }

  getMasterVolume() {
    return this._volMaster;
  }

  getMusicVolume() {
    return this._volMusic;
  }

  getSfxVolume() {
    return this._volSfx;
  }

  /** @param {number} v — 0–1 */
  setMasterVolume(v) {
    const n = Math.max(0, Math.min(1, Number(v)));
    if (Number.isNaN(n)) return;
    this._volMaster = n;
    _writeStoredFloat('snake3d_vol_master', n);
    this._syncActualGains();
  }

  /** @param {number} v — 0–1 */
  setMusicVolume(v) {
    const n = Math.max(0, Math.min(1, Number(v)));
    if (Number.isNaN(n)) return;
    this._volMusic = n;
    _writeStoredFloat('snake3d_vol_music', n);
    this._syncActualGains();
  }

  /** @param {number} v — 0–1 */
  setSfxVolume(v) {
    const n = Math.max(0, Math.min(1, Number(v)));
    if (Number.isNaN(n)) return;
    this._volSfx = n;
    _writeStoredFloat('snake3d_vol_sfx', n);
    this._syncActualGains();
  }

  /* ── Inicialização lazy (exige gesto do utilizador) ── */
  _ensureContext() {
    if (this._initialized) {
      if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);

      this._initialized = true;
      this._syncActualGains();
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
      return true;
    } catch (e) {
      console.warn('Web Audio API não disponível:', e);
      return false;
    }
  }

  /**
   * Chama no **início** do mesmo turno de um clique/tecla (antes de qualquer `await`)
   * para o browser destravar o áudio. O `startGame()` faz isso automaticamente.
   */
  unlockFromUserGesture() {
    this._ensureContext();
  }

  isMusicEnabled() {
    return this._musicEnabled;
  }

  isSfxEnabled() {
    return this._sfxEnabled;
  }

  /**
   * Música ambiente (loop menu vs jogo). Persiste em `localStorage`.
   * @param {boolean} on
   * @param {{ resumeInMenu?: boolean }} [opts] — se `resumeInMenu === true`, força `startMenuMusic` ao ligar (ex.: painel Settings no menu).
   */
  setMusicEnabled(on, opts = {}) {
    const v = !!on;
    if (this._musicEnabled === v) return;
    this._musicEnabled = v;
    _writeStoredBool('snake3d_setting_music', v);
    if (!this._initialized) return;
    this._syncActualGains();
    if (!v) {
      this.stopMusic();
    } else if (!this.muted) {
      if (opts.resumeInMenu || this._musicMode === 'menu') {
        this.startMenuMusic();
      } else {
        this.startGameMusic();
      }
    }
  }

  /** @returns {boolean} novo estado */
  toggleMusicEnabled(opts = {}) {
    this.setMusicEnabled(!this._musicEnabled, opts);
    return this._musicEnabled;
  }

  /** Efeitos (comer, morte, cliques de menu, etc.). Persiste em `localStorage`. */
  setSfxEnabled(on) {
    const v = !!on;
    if (this._sfxEnabled === v) return;
    this._sfxEnabled = v;
    _writeStoredBool('snake3d_setting_sfx', v);
    this._syncActualGains();
  }

  /** @returns {boolean} novo estado */
  toggleSfxEnabled() {
    this.setSfxEnabled(!this._sfxEnabled);
    return this._sfxEnabled;
  }

  /* ── Toggle mute ── */
  toggleMute() {
    this._ensureContext();
    this.muted = !this.muted;
    this._syncActualGains();
    return this.muted;
  }

  /* ══════════════════════════════════════════════════════════════════
     EFEITOS SONOROS — Sintetizados com oscillators + gain envelopes
     ══════════════════════════════════════════════════════════════════ */

  /** 🍎 Comer comida — bleep agudo curto */
  playEat() {
    if (!this._ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // GUIA DE EDIÇÃO (eat):
    // - frequência inicial/final define tom do efeito
    // - envelope gain define duração/percussão
    osc.type = 'square';
    osc.frequency.setValueAtTime(this._hzSfx(880), t);
    osc.frequency.exponentialRampToValueAtTime(this._hzSfx(1320), t + 0.06);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** 🛡️ Apanhar power-up — arpejo ascendente */
  playPowerup() {
    if (!this._ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    // Muda o "arpejo" alterando este array de notas.
    const notes = [523, 659, 784, 1047].map((n) => this._hzSfx(n)); // C5 E5 G5 C6

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + i * 0.07;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  /** 💀 Morte — noise burst descendente */
  playDeath() {
    if (!this._ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;

    // Noise via oscillator com frequency sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(this._hzSfx(440), t);
    osc.frequency.exponentialRampToValueAtTime(this._hzSfx(40), t + 0.6);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.6);

    // Segundo oscillator — noise
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(this._hzSfx(220), t);
    osc2.frequency.exponentialRampToValueAtTime(this._hzSfx(30), t + 0.5);

    gain2.gain.setValueAtTime(0.2, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(t);
    osc2.stop(t + 0.5);
  }

  /** 🎉 Level Up — fanfarra curta ascendente */
  playLevelUp() {
    if (!this._ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const melody = [523, 659, 784, 1047, 1319].map((n) => this._hzSfx(n)); // C5 E5 G5 C6 E6

    melody.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + i * 0.09;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  /** 🧱 Colisão fatal com obstáculo dinâmico — stinger curto antes da morte (ver `obstacles/audioTriggers.js`). */
  playObstacleStinger(obstacleType) {
    if (!this._ensureContext() || this.muted) return;
    if (!isDynamicObstacleSoundType(obstacleType)) return;
    const spec = OBSTACLE_HIT_SOUND[obstacleType];
    if (!spec) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = obstacleType === 'disappearingBlock' ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(this._hzSfx(spec.baseFreq), t);
    osc.frequency.exponentialRampToValueAtTime(this._hzSfx(spec.sweepTo), t + 0.14);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.17);
  }

  /** 🖱️ Menu select — click curto */
  playMenuSelect() {
    if (!this._ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /** 🖱️ Menu hover — tick suave */
  playMenuHover() {
    if (!this._ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  /* ══════════════════════════════════════════════════════════════════
     MÚSICA AMBIENTE — Menu (calma) vs jogo (chiptune); tempo de jogo = dificuldade
     ══════════════════════════════════════════════════════════════════ */

  /** Música lenta do menu (independente da dificuldade seleccionada). */
  startMenuMusic() {
    if (!this._ensureContext()) return;
    if (!this._musicEnabled) {
      this.stopMusic();
      this._musicMode = 'menu';
      return;
    }
    const run = () => {
      this.stopMusic();
      this._musicMode = 'menu';
      this.musicPlaying = true;
      this._playMusicLoop();
    };
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(run).catch(run);
    } else {
      run();
    }
  }

  /** Música de jogo; usa `musicNoteLength` / `musicPitchMultiplier` do preset de dificuldade actual. */
  startGameMusic() {
    if (!this._ensureContext()) return;
    if (!this._musicEnabled) {
      this.stopMusic();
      this._musicMode = 'game';
      return;
    }
    const run = () => {
      this.stopMusic();
      this._musicMode = 'game';
      this.musicPlaying = true;
      this._playMusicLoop();
    };
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(run).catch(run);
    } else {
      run();
    }
  }

  /** @deprecated Usa `startGameMusic()` ou `startMenuMusic()`. */
  startMusic() {
    this.startGameMusic();
  }

  /** Para a música de fundo */
  stopMusic() {
    this.musicPlaying = false;
    if (this._musicTimeout) {
      clearTimeout(this._musicTimeout);
      this._musicTimeout = null;
    }
    this._musicNodes.forEach(n => {
      try { n.stop(); } catch (e) { /* ignore */ }
    });
    this._musicNodes = [];
  }

  /** @private Loop de música (menu ou jogo) */
  _playMusicLoop() {
    if (!this.musicPlaying || !this.ctx) return;
    if (this._musicMode === 'menu') this._playMenuMusicLoop();
    else this._playGameMusicLoop();
  }

  /** @private Menu — padrão suave (sine + baixo triangle), tempo fixo. */
  _playMenuMusicLoop() {
    if (!this.musicPlaying || !this.ctx) return;

    const t = this.ctx.currentTime;
    const noteLen = AMBIENT_MENU_MUSIC.noteLengthSec;
    const pitch = AMBIENT_MENU_MUSIC.pitchScale;
    const menuScale = Math.min(2.4, Math.max(1, AMBIENT_MENU_MUSIC.menuLoopGainScale ?? 1));
    const mm = AUDIO_BUS.musicMenu;
    const melAtk = Math.min(0.55, mm.melodyAttack * menuScale);
    const melSus = Math.min(0.48, mm.melodySustain * menuScale);
    const bassPk = Math.min(0.36, mm.bassPeak * menuScale);

    const melody = [
      196, 0, 220, 0, 247, 0, 294, 0,
      262, 0, 220, 0, 196, 0, 174, 0,
      220, 0, 247, 0, 262, 0, 294, 0,
      330, 0, 294, 0, 247, 0, 220, 0,
    ];

    const bass = [
      98, 0, 98, 0, 110, 0, 110, 0,
      123, 0, 123, 0, 98, 0, 98, 0,
      110, 0, 110, 0, 123, 0, 123, 0,
      98, 0, 98, 0, 87, 0, 87, 0,
    ];

    const totalDuration = melody.length * noteLen;

    melody.forEach((freq, i) => {
      if (freq === 0) return;
      const f = Math.min(20000, Math.max(40, freq * pitch));
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + i * noteLen;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(melAtk, start + 0.02);
      gain.gain.setValueAtTime(melSus, start + noteLen * 0.72);
      gain.gain.linearRampToValueAtTime(0, start + noteLen * 0.95);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(start);
      osc.stop(start + noteLen);
      this._musicNodes.push(osc);
    });

    bass.forEach((freq, i) => {
      if (freq === 0 || i % 2 !== 0) return;
      const f = Math.min(20000, Math.max(40, freq * pitch));
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + i * noteLen;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(bassPk, start + 0.02);
      gain.gain.linearRampToValueAtTime(0, start + noteLen * 1.85);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(start);
      osc.stop(start + noteLen * 2);
      this._musicNodes.push(osc);
    });

    this._musicTimeout = setTimeout(() => {
      this._musicNodes = [];
      if (this.musicPlaying) this._playMusicLoop();
    }, totalDuration * 1000);
  }

  /** @private Jogo — chiptune; velocidade e tom de `getDifficultyAudioPreset`. */
  _playGameMusicLoop() {
    if (!this.musicPlaying || !this.ctx) return;

    const t = this.ctx.currentTime;
    const melody = [
      262, 0, 330, 0, 392, 0, 330, 0,
      349, 0, 294, 0, 262, 0, 294, 0,
      392, 0, 440, 0, 392, 0, 330, 0,
      294, 0, 262, 0, 330, 0, 392, 0,
    ];

    const noteLen = this._difficultyAudio.musicNoteLength;
    const totalDuration = melody.length * noteLen;

    melody.forEach((freq, i) => {
      if (freq === 0) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + i * noteLen;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this._hzMusic(freq), start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(AUDIO_BUS.musicGame.melodyAttack, start + 0.01);
      gain.gain.setValueAtTime(AUDIO_BUS.musicGame.melodySustain, start + noteLen * 0.7);
      gain.gain.linearRampToValueAtTime(0, start + noteLen * 0.95);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(start);
      osc.stop(start + noteLen);
      this._musicNodes.push(osc);
    });

    const bass = [
      131, 131, 131, 131, 175, 175, 175, 175,
      147, 147, 147, 147, 131, 131, 131, 131,
      175, 175, 175, 175, 131, 131, 131, 131,
      147, 147, 147, 147, 175, 175, 175, 175,
    ];
    const bassNoteLen = noteLen;
    bass.forEach((freq, i) => {
      if (i % 2 !== 0) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + i * bassNoteLen;

      osc.type = 'square';
      osc.frequency.setValueAtTime(this._hzMusic(freq), start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(AUDIO_BUS.musicGame.bassPeak, start + 0.01);
      gain.gain.linearRampToValueAtTime(0, start + bassNoteLen * 1.8);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(start);
      osc.stop(start + bassNoteLen * 2);
      this._musicNodes.push(osc);
    });

    this._musicTimeout = setTimeout(() => {
      this._musicNodes = [];
      if (this.musicPlaying) this._playMusicLoop();
    }, totalDuration * 1000);
  }

  /** Limpa tudo */
  dispose() {
    this.stopMusic();
    if (this.ctx) this.ctx.close();
  }
}
