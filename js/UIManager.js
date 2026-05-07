/* ==========================================================================
   UIManager.js — Gestão completa da interface (HUD, overlays, notificações)
   Requisito: UI com feedback visual para luzes, pausas, game over
   ========================================================================== */
import * as THREE from 'three';

export class UIManager {
  constructor() {
    // ---- Loading Screen ----
    this.loadingScreen = document.getElementById('loading-screen');
    this.loadingBar    = document.getElementById('loading-bar');
    this.loadingText   = document.getElementById('loading-text');

    // ---- HUD ----
    this.hudScore     = document.getElementById('hud-score');
    this.hudLevel     = document.getElementById('hud-level');
    this.hudHighscore = document.getElementById('hud-highscore');
    this.hudTimer     = document.getElementById('hud-timer');

    // ---- Light Indicators ----
    this.lightIndicators = document.querySelectorAll('.light-indicator');

    // ---- Overlays ----
    this.pauseOverlay    = document.getElementById('pause-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.goScore         = document.getElementById('go-score');
    this.goHighscore     = document.getElementById('go-highscore');
    this.levelTransition = document.getElementById('level-transition');
    this.ltName          = document.getElementById('lt-name');
    this.ltSub           = document.getElementById('lt-sub');
    this.menuOverlay     = document.getElementById('menu-overlay');

    // ---- Main Menu ----
    this.panelMain       = document.getElementById('panel-main');
    this.btnMenuPlay     = document.getElementById('btn-menu-play');
    this.btnMenuLevels   = document.getElementById('btn-menu-levels');
    this.btnMenuSkins    = document.getElementById('btn-menu-skins');
    this.btnMenuSettings = document.getElementById('btn-menu-settings');

    // ---- Sub-menu panels ----
    this.panelLevels   = document.getElementById('panel-levels');
    this.panelSkins    = document.getElementById('panel-skins');
    this.panelSettings = document.getElementById('panel-settings');
    this.levelGrid     = document.getElementById('level-grid');
    this.difficultyGrid = document.getElementById('difficulty-grid');
    this.skinGrid      = document.getElementById('skin-grid');

    // ---- Settings ----
    this.settingPostFx  = document.getElementById('setting-postfx');
    this.settingShadows = document.getElementById('setting-shadows');

    // ---- Notification Container ----
    this.notifContainer = document.getElementById('notification-container');

    // ---- Power-up Indicator ----
    this.hudPowerup = document.getElementById('hud-powerup');
    this.powerupIcon = document.getElementById('powerup-icon');
    this.powerupLabel = document.getElementById('powerup-label');
    this.powerupBar = document.getElementById('powerup-bar');

    // ---- Combo Display ----
    this.hudCombo = document.getElementById('hud-combo');
    this.comboText = document.getElementById('combo-text');
    this.comboMult = document.getElementById('combo-mult');
    this._comboTimeout = null;
  }

  /* ── Loading ── */
  setLoadingProgress(pct, text) {
    if (this.loadingBar) this.loadingBar.style.width = `${pct}%`;
    if (this.loadingText) this.loadingText.textContent = text || `Loading... ${Math.round(pct)}%`;
  }

  hideLoading() {
    if (!this.loadingScreen) return;
    this.loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      this.loadingScreen.style.display = 'none';
    }, 900);
  }

  /* ── HUD ── */
  setScore(value) {
    if (this.hudScore) this.hudScore.textContent = value;
  }

  setLevel(name) {
    if (this.hudLevel) this.hudLevel.textContent = name || '';
  }

  setHighScore(value) {
    if (this.hudHighscore) this.hudHighscore.textContent = `HI: ${value}`;
  }

  setTimer(seconds) {
    if (!this.hudTimer) return;
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    this.hudTimer.textContent = `${min}:${sec}`;
  }

  /* ── Light Indicators ── */
  setLightStatus(index, isOn) {
    const el = this.lightIndicators[index];
    if (!el) return;
    el.classList.toggle('on', isOn);
    el.classList.toggle('off', !isOn);
    const label = el.querySelector('.light-label');
    if (label) {
      const base = label.dataset.name || '';
      label.textContent = `${base} ${isOn ? 'ON' : 'OFF'}`;
    }
  }

  /* ── Pause ── */
  showPause(visible) {
    if (this.pauseOverlay) this.pauseOverlay.classList.toggle('visible', visible);
  }

  /* ── Game Over ── */
  showGameOver(visible, score, highScore) {
    if (this.gameoverOverlay) this.gameoverOverlay.classList.toggle('visible', visible);
    if (visible && this.goScore) this.goScore.textContent = `SCORE: ${score}`;
    if (visible && this.goHighscore && highScore != null) {
      this.goHighscore.textContent = `HIGH SCORE: ${highScore}`;
    }
  }

  /* ── Level Transition ── */
  async showLevelTransition(levelName, description) {
    if (!this.levelTransition) return;
    if (this.ltName) this.ltName.textContent = levelName;
    if (this.ltSub) this.ltSub.textContent = description || '';
    // Fade in
    await this._nextFrame();
    this.levelTransition.classList.add('visible');
    // Hold
    await this._wait(2000);
    // Fade out
    this.levelTransition.classList.remove('visible');
    await this._wait(600);
  }

  /* ── Menu ── */
  showMenu(visible) {
    if (!this.menuOverlay) return;
    if (visible) {
      this.menuOverlay.classList.add('visible');
      this.menuOverlay.classList.remove('hidden');
      document.body.classList.add('menu-active');
    } else {
      this.menuOverlay.classList.remove('visible');
      this.menuOverlay.classList.add('hidden');
      document.body.classList.remove('menu-active');
    }
  }

  /* ── Sub-Menu Panels ── */
  showPanel(panelId, visible) {
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.toggle('visible', visible);
  }

  hideAllPanels() {
    this.showPanel('panel-levels', false);
    this.showPanel('panel-skins', false);
    this.showPanel('panel-settings', false);
  }

  /**
   * Popula o grid de seleção de níveis.
   * @param {Array} levels — array de configs de nível
   * @param {number} selectedIndex — índice selecionado
   * @param {Function} onSelect — callback quando um nível é selecionado
   */
  populateLevelGrid(levels, selectedIndex, onSelect) {
    if (!this.levelGrid) return;
    this.levelGrid.innerHTML = '';
    levels.forEach((level, i) => {
      const card = document.createElement('div');
      card.className = `level-card${i === selectedIndex ? ' selected' : ''}`;
      card.innerHTML = `
        <div class="lc-num">${level.id}</div>
        <div class="lc-name">${level.name}</div>
        <div class="lc-desc">${level.description || 'Escolhe este mapa para jogar'}</div>
      `;
      card.addEventListener('click', () => {
        this.levelGrid.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (onSelect) onSelect(i);
      });
      this.levelGrid.appendChild(card);
    });
  }

  populateDifficultyGrid(difficulties, selectedId, onSelect) {
    if (!this.difficultyGrid) return;
    this.difficultyGrid.innerHTML = '';
    difficulties.forEach((difficulty) => {
      const card = document.createElement('div');
      card.className = `difficulty-card${difficulty.id === selectedId ? ' selected' : ''}`;
      card.innerHTML = `
        <div class="dc-name">${difficulty.name}</div>
      `;
      card.addEventListener('click', () => {
        this.difficultyGrid.querySelectorAll('.difficulty-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (onSelect) onSelect(difficulty.id);
      });
      this.difficultyGrid.appendChild(card);
    });
  }

  /**
   * Popula o grid de seleção de skins com preview 3D da cabeça.
   * Usa um renderer offscreen para capturar uma snapshot de cada cabeça.
   * @param {Array} skins — array de configs de skin
   * @param {number} selectedIndex — índice selecionado
   * @param {Function} onSelect — callback quando uma skin é selecionada
   * @param {Function} [createHeadFn] — função (skin) => THREE.Mesh que cria a cabeça 3D
   */
  populateSkinGrid(skins, selectedIndex, onSelect, createHeadFn) {
    if (!this.skinGrid) return;
    this.skinGrid.innerHTML = '';

    // Limpar renderers anteriores
    if (this._skinRenderers) {
      this._skinRenderers.forEach(r => r.dispose());
    }
    this._skinRenderers = [];
    if (this._skinAnimId) cancelAnimationFrame(this._skinAnimId);

    const previewCanvases = [];

    skins.forEach((skin, i) => {
      const card = document.createElement('div');
      card.className = `skin-card${i === selectedIndex ? ' selected' : ''}`;

      if (createHeadFn) {
        /* ── Preview 3D: mini-canvas com a cabeça da skin a rodar ── */
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        canvas.className = 'sc-preview sc-preview-3d';
        canvas.style.borderRadius = '50%';
        canvas.style.margin = '0 auto 14px';
        canvas.style.display = 'block';

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(120, 120);
        renderer.setClearColor(0x000000, 0);
        this._skinRenderers.push(renderer);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
        camera.position.set(0, 0.1, 1.6);
        camera.lookAt(0, 0, 0);

        // Iluminação para o preview
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(2, 3, 4);
        scene.add(dirLight);
        const backLight = new THREE.DirectionalLight(skin.headColor, 0.5);
        backLight.position.set(-2, 1, -2);
        scene.add(backLight);

        // Criar mesh da cabeça
        const headMesh = createHeadFn(skin);
        scene.add(headMesh);

        previewCanvases.push({ renderer, scene, camera, headMesh });

        const nameDiv = document.createElement('div');
        nameDiv.className = 'sc-name';
        nameDiv.textContent = skin.name;

        card.appendChild(canvas);
        card.appendChild(nameDiv);
      } else {
        /* ── Fallback: círculo de cor ── */
        const color = `#${skin.headColor.toString(16).padStart(6, '0')}`;
        card.innerHTML = `
          <div class="sc-preview" style="background:${color};color:${color}"></div>
          <div class="sc-name">${skin.name}</div>
        `;
      }

      card.addEventListener('click', () => {
        this.skinGrid.querySelectorAll('.skin-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (onSelect) onSelect(i);
      });
      this.skinGrid.appendChild(card);
    });

    // Animar as cabeças (rotação lenta)
    if (previewCanvases.length > 0) {
      const animatePreviews = () => {
        this._skinAnimId = requestAnimationFrame(animatePreviews);
        for (const p of previewCanvases) {
          p.headMesh.rotation.y += 0.015;
          p.renderer.render(p.scene, p.camera);
        }
      };
      animatePreviews();
    }
  }

  /**
   * Atualiza o estado visual de um setting toggle.
   */
  updateSettingToggle(elementId, isActive) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = isActive ? 'ON' : 'OFF';
      el.classList.toggle('active', isActive);
    }
  }

  /* ── Notificações ── */
  showNotification(text, type = 'default', duration = 2000) {
    if (!this.notifContainer) return;
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = text;
    this.notifContainer.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, duration);
  }

  /* ── Power-up Indicator ── */

  /**
   * Mostra o indicador de power-up activo no HUD.
   * @param {string} type — 'shield', 'speed', etc.
   */
  showPowerUp(type) {
    if (!this.hudPowerup) return;
    const icons = { shield: '🛡️', speed: '⚡' };
    const labels = { shield: 'SHIELD', speed: 'SPEED' };
    if (this.powerupIcon) this.powerupIcon.textContent = icons[type] || '✨';
    if (this.powerupLabel) this.powerupLabel.textContent = labels[type] || type.toUpperCase();
    if (this.powerupBar) this.powerupBar.style.width = '100%';
    this.hudPowerup.classList.remove('hidden');
  }

  /**
   * Actualiza a barra de countdown do power-up.
   * @param {string} type — tipo do power-up
   * @param {boolean} active — se está activo
   * @param {number} [remaining] — segundos restantes (opcional para shield permanente)
   */
  updatePowerUpTimer(type, active, remaining) {
    if (!this.hudPowerup || !active) return;
    if (remaining != null && this.powerupBar) {
      const pct = Math.max(0, Math.min(100, (remaining / 10) * 100));
      this.powerupBar.style.width = `${pct}%`;
    }
  }

  /**
   * Esconde o indicador de power-up.
   */
  hidePowerUp() {
    if (this.hudPowerup) this.hudPowerup.classList.add('hidden');
  }

  /* ── Combo Display ── */

  /**
   * Mostra o indicador de combo no HUD com animação.
   * @param {number} count — número de comidas seguidas
   * @param {number} multiplier — multiplicador de pontos
   */
  showCombo(count, multiplier) {
    if (!this.hudCombo) return;
    if (this.comboText) this.comboText.textContent = `COMBO ×${count}`;
    if (this.comboMult) this.comboMult.textContent = `×${multiplier} PTS`;

    // Re-trigger animation
    this.hudCombo.classList.remove('hidden');
    this.hudCombo.style.animation = 'none';
    // Force reflow
    void this.hudCombo.offsetHeight;
    this.hudCombo.style.animation = '';

    // Auto-hide after 3s (reset if called again)
    if (this._comboTimeout) clearTimeout(this._comboTimeout);
    this._comboTimeout = setTimeout(() => {
      this.hideCombo();
    }, 3000);
  }

  /**
   * Esconde o display de combo.
   */
  hideCombo() {
    if (this.hudCombo) this.hudCombo.classList.add('hidden');
    if (this._comboTimeout) {
      clearTimeout(this._comboTimeout);
      this._comboTimeout = null;
    }
  }

  /* ── Helpers ── */
  _nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }
  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
