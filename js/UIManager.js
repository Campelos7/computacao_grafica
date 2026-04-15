/* ==========================================================================
   UIManager.js — Gestão completa da interface (HUD, overlays, notificações)
   Requisito: UI com feedback visual para luzes, replay, pausas, game over
   ========================================================================== */

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
    this.skinGrid      = document.getElementById('skin-grid');

    // ---- Replay Bar ----
    this.replayBar      = document.getElementById('replay-bar');
    this.replayTimeline = document.getElementById('replay-timeline');
    this.replayFrame    = document.getElementById('replay-frame');
    this.btnReplayPlay  = document.getElementById('btn-replay-play');
    this.btnReplayRew   = document.getElementById('btn-replay-rew');
    this.btnReplaySpeed = document.getElementById('btn-replay-speed');

    // ---- Settings ----
    this.settingPostFx  = document.getElementById('setting-postfx');
    this.settingShadows = document.getElementById('setting-shadows');

    // ---- Notification Container ----
    this.notifContainer = document.getElementById('notification-container');
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
        <div class="lc-desc">${level.description || 'Classic snake gameplay'}</div>
        <div class="lc-speed">SPEED: ${Math.round((1 / level.speed) * 10) / 10}/s</div>
      `;
      card.addEventListener('click', () => {
        this.levelGrid.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (onSelect) onSelect(i);
      });
      this.levelGrid.appendChild(card);
    });
  }

  /**
   * Popula o grid de seleção de skins.
   * @param {Array} skins — array de configs de skin
   * @param {number} selectedIndex — índice selecionado
   * @param {Function} onSelect — callback quando uma skin é selecionada
   */
  populateSkinGrid(skins, selectedIndex, onSelect) {
    if (!this.skinGrid) return;
    this.skinGrid.innerHTML = '';
    skins.forEach((skin, i) => {
      const card = document.createElement('div');
      card.className = `skin-card${i === selectedIndex ? ' selected' : ''}`;
      const color = `#${skin.headColor.toString(16).padStart(6, '0')}`;
      card.innerHTML = `
        <div class="sc-preview" style="background:${color};color:${color}"></div>
        <div class="sc-name">${skin.name}</div>
      `;
      card.addEventListener('click', () => {
        this.skinGrid.querySelectorAll('.skin-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        if (onSelect) onSelect(i);
      });
      this.skinGrid.appendChild(card);
    });
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

  /* ── Replay Controls ── */
  showReplayBar(visible) {
    if (this.replayBar) this.replayBar.classList.toggle('visible', visible);
  }

  setReplayTimeline(current, max) {
    if (this.replayTimeline) {
      this.replayTimeline.max = max;
      this.replayTimeline.value = current;
    }
    if (this.replayFrame) {
      this.replayFrame.textContent = `${current}/${max}`;
    }
  }

  setReplayPlayButton(isPlaying) {
    if (this.btnReplayPlay) {
      this.btnReplayPlay.textContent = isPlaying ? '⏸' : '▶';
    }
  }

  setReplaySpeedLabel(speed) {
    if (this.btnReplaySpeed) {
      this.btnReplaySpeed.textContent = `${speed}x`;
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

  /* ── Helpers ── */
  _nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }
  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
