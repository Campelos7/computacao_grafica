/* ==========================================================================
   LightManager.js — Gestão das 4 luzes obrigatórias (refinadas)
   Requisito: Implementar no mínimo 4 tipos de luz (Ambient, Directional,
   PointLight, Hemisphere). Teclas (1,2,3,4) para ligar/desligar com feedback.
   Refinamentos: Sombras de alta qualidade, configuração por bioma,
   pulsação atmosférica na HemisphereLight.
   ========================================================================== */
import * as THREE from 'three';

export class LightManager {
  /**
   * @param {THREE.Scene} scene
   * @param {UIManager} uiManager
   */
  constructor(scene, uiManager) {
    this.scene = scene;
    this.ui = uiManager;

    // ---- Requisito: AmbientLight (tecla 1) ----
    this.ambient = new THREE.AmbientLight(0x4422aa, 1.2);
    this.ambient.name = 'ambient';

    // ---- Requisito: DirectionalLight (tecla 2) — Sombras refinadas ----
    this.directional = new THREE.DirectionalLight(0xff88ff, 2.0);
    this.directional.name = 'directional';
    this.directional.position.set(15, 22, 10);
    this.directional.castShadow = true;
    // Shadow map de alta resolução para sombras mais nítidas
    this.directional.shadow.mapSize.set(2048, 2048);
    this.directional.shadow.camera.left   = -18;
    this.directional.shadow.camera.right  =  18;
    this.directional.shadow.camera.top    =  18;
    this.directional.shadow.camera.bottom = -18;
    this.directional.shadow.camera.near   = 0.5;
    this.directional.shadow.camera.far    = 55;
    this.directional.shadow.bias = -0.0005;
    this.directional.shadow.normalBias = 0.02;
    this.directional.shadow.radius = 2; // PCFSoft blur subtil

    // ---- Requisito: PointLight (tecla 3) — Segue a comida ----
    this.point = new THREE.PointLight(0xff6600, 2.5, 35, 1.2);
    this.point.name = 'point';
    this.point.position.set(0, 1.4, 0);
    this.point.castShadow = false;

    // ---- Requisito: HemisphereLight (tecla 4) — Céu/Chão atmosférico ----
    this.hemisphere = new THREE.HemisphereLight(0x4444ff, 0x222244, 1.0);
    this.hemisphere.name = 'hemisphere';

    // Guardar cores base do hemisphere para pulsação
    this._hemiSkyBase = new THREE.Color(0x4444ff);
    this._hemiGroundBase = new THREE.Color(0x222244);

    // Array ordenado (índice = tecla - 1)
    this.lights = [this.ambient, this.directional, this.point, this.hemisphere];
    this.names  = ['Ambient', 'Directional', 'Point', 'Hemisphere'];

    // Adicionar à cena
    this.lights.forEach(l => this.scene.add(l));

    // Sincronizar estado inicial na UI
    this._syncUI();
  }

  /**
   * Alterna visibilidade de uma luz por índice (0-3).
   * Chamado quando o utilizador prime teclas 1-4.
   * @param {number} index
   */
  toggle(index) {
    if (index < 0 || index >= this.lights.length) return;
    const light = this.lights[index];
    light.visible = !light.visible;
    this._syncUI();
  }

  /**
   * Aplica um tema de nível às luzes (configuração por bioma).
   * @param {object} theme — objecto do levelConfig
   */
  applyTheme(theme) {
    if (theme.ambientColor)        this.ambient.color.set(theme.ambientColor);
    if (theme.ambientIntensity != null) this.ambient.intensity = theme.ambientIntensity;
    if (theme.directionalColor)    this.directional.color.set(theme.directionalColor);
    if (theme.directionalIntensity != null) this.directional.intensity = theme.directionalIntensity;

    // Hemisphere — cores sky/ground por bioma para iluminação atmosférica
    if (theme.hemiSkyColor) {
      this.hemisphere.color.set(theme.hemiSkyColor);
      this._hemiSkyBase.set(theme.hemiSkyColor);
    }
    if (theme.hemiGroundColor) {
      this.hemisphere.groundColor.set(theme.hemiGroundColor);
      this._hemiGroundBase.set(theme.hemiGroundColor);
    }
    if (theme.hemiIntensity != null) this.hemisphere.intensity = theme.hemiIntensity;

    // PointLight — cor por bioma
    if (theme.pointColor) this.point.color.set(theme.pointColor);
    if (theme.pointIntensity != null) this.point.intensity = theme.pointIntensity;
  }

  /**
   * Actualiza a posição do PointLight para seguir a comida.
   */
  setPointLightPosition(x, y, z) {
    this.point.position.set(x, y, z);
  }

  /**
   * Pulsa a intensidade do PointLight (chamado no game loop).
   */
  pulsePointLight(elapsedTime) {
    if (this.point.visible) {
      this.point.intensity = 2.5 + Math.sin(elapsedTime * 5.4) * 0.8;
    }
  }

  /**
   * Pulsação atmosférica subtil da HemisphereLight — dá vida ao bioma.
   * @param {number} elapsed — tempo total
   */
  pulseHemisphere(elapsed) {
    if (!this.hemisphere.visible) return;
    const pulse = Math.sin(elapsed * 0.8) * 0.08;
    this.hemisphere.intensity = (this.hemisphere.intensity || 0.5) + pulse * 0.1;
  }

  /** @private */
  _syncUI() {
    this.lights.forEach((light, i) => {
      this.ui.setLightStatus(i, light.visible);
    });
  }

  /**
   * Devolve estado de todas as luzes (para debug/UI).
   */
  getStatus() {
    return this.lights.map((l, i) => ({
      name: this.names[i],
      visible: l.visible,
    }));
  }
}
