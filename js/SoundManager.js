/* ==========================================================================
   SoundManager.js — Sistema de Som Retro 8-bit
   Usa Web Audio API para gerar sons sintetizados (sem ficheiros externos).
   Sons: eat, powerup, death, combo, levelUp, menuSelect, menuHover
   Música de fundo chiptune com osciladores.
   Toggle mute com tecla P.
   ========================================================================== */

export class SoundManager {
  constructor() {
    this.ctx = null;       // AudioContext criado no primeiro input do utilizador
    this.muted = false;
    this.musicPlaying = false;
    this.musicGain = null;
    this.masterGain = null;
    this._musicNodes = [];
    this._initialized = false;
  }

  /* ── Inicialização lazy (exige gesto do utilizador) ── */
  _ensureContext() {
    if (this._initialized) return true;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.12;
      this.musicGain.connect(this.masterGain);

      this._initialized = true;
      return true;
    } catch (e) {
      console.warn('Web Audio API não disponível:', e);
      return false;
    }
  }

  /* ── Toggle mute ── */
  toggleMute() {
    this._ensureContext();
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.35;
    }
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

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1320, t + 0.06);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /** 🛡️ Apanhar power-up — arpejo ascendente */
  playPowerup() {
    if (!this._ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6

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
      gain.connect(this.masterGain);
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
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.6);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.6);

    // Segundo oscillator — noise
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(220, t);
    osc2.frequency.exponentialRampToValueAtTime(30, t + 0.5);

    gain2.gain.setValueAtTime(0.2, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t);
    osc2.stop(t + 0.5);
  }

  /** 🔥 Combo activado — acorde duplo */
  playCombo() {
    if (!this._ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const chords = [[523, 659], [659, 784]]; // Dois acordes

    chords.forEach((chord, ci) => {
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = t + ci * 0.1;

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 0.18);
      });
    });
  }

  /** 🎉 Level Up — fanfarra curta ascendente */
  playLevelUp() {
    if (!this._ensureContext() || this.muted) return;
    const t = this.ctx.currentTime;
    const melody = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6

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
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.2);
    });
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
    gain.connect(this.masterGain);
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
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  /* ══════════════════════════════════════════════════════════════════
     MÚSICA DE FUNDO — Padrão chiptune simples com osciladores
     ══════════════════════════════════════════════════════════════════ */

  /** Inicia a música de fundo (loop) */
  startMusic() {
    if (!this._ensureContext() || this.musicPlaying) return;
    this.musicPlaying = true;
    this._playMusicLoop();
  }

  /** Para a música de fundo */
  stopMusic() {
    this.musicPlaying = false;
    this._musicNodes.forEach(n => {
      try { n.stop(); } catch (e) { /* ignore */ }
    });
    this._musicNodes = [];
  }

  /** @private Loop de música chiptune */
  _playMusicLoop() {
    if (!this.musicPlaying || !this.ctx) return;

    const t = this.ctx.currentTime;
    // Melodia simples tipo retro (notas MIDI como frequências)
    const melody = [
      // bar 1
      262, 0, 330, 0, 392, 0, 330, 0,
      // bar 2
      349, 0, 294, 0, 262, 0, 294, 0,
      // bar 3
      392, 0, 440, 0, 392, 0, 330, 0,
      // bar 4
      294, 0, 262, 0, 330, 0, 392, 0,
    ];

    const noteLen = 0.15;
    const totalDuration = melody.length * noteLen;

    melody.forEach((freq, i) => {
      if (freq === 0) return; // pausa

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + i * noteLen;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.01);
      gain.gain.setValueAtTime(0.1, start + noteLen * 0.7);
      gain.gain.linearRampToValueAtTime(0, start + noteLen * 0.95);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(start);
      osc.stop(start + noteLen);
      this._musicNodes.push(osc);
    });

    // Bass line
    const bass = [
      131, 131, 131, 131, 175, 175, 175, 175,
      147, 147, 147, 147, 131, 131, 131, 131,
      175, 175, 175, 175, 131, 131, 131, 131,
      147, 147, 147, 147, 175, 175, 175, 175,
    ];
    const bassNoteLen = noteLen;
    bass.forEach((freq, i) => {
      if (i % 2 !== 0) return; // toca a cada 2 ticks

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = t + i * bassNoteLen;

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.06, start + 0.01);
      gain.gain.linearRampToValueAtTime(0, start + bassNoteLen * 1.8);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(start);
      osc.stop(start + bassNoteLen * 2);
      this._musicNodes.push(osc);
    });

    // Agendar próximo loop
    this._musicTimeout = setTimeout(() => {
      this._musicNodes = [];
      if (this.musicPlaying) this._playMusicLoop();
    }, totalDuration * 1000);
  }

  /** Limpa tudo */
  dispose() {
    this.stopMusic();
    if (this._musicTimeout) clearTimeout(this._musicTimeout);
    if (this.ctx) this.ctx.close();
  }
}
