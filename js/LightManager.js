/* ==========================================================================
   LightManager.js — Gestão das 4 luzes obrigatórias
   Requisito: Implementar no mínimo 4 tipos de luz (Ambient, Directional,
   PointLight, Hemisphere). Teclas (1,2,3,4) para ligar/desligar com feedback.
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
    this.ambient = new THREE.AmbientLight(0x4422aa, 0.5);
    this.ambient.name = 'ambient';

    // ---- Requisito: DirectionalLight (tecla 2) ----
    this.directional = new THREE.DirectionalLight(0xff88ff, 1.0);
    this.directional.name = 'directional';
    this.directional.position.set(15, 22, 10);
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.set(1024, 1024);
    this.directional.shadow.camera.left   = -18;
    this.directional.shadow.camera.right  =  18;
    this.directional.shadow.camera.top    =  18;
    this.directional.shadow.camera.bottom = -18;
    this.directional.shadow.camera.near   = 1;
    this.directional.shadow.camera.far    = 50;
    this.directional.shadow.bias = -0.001;

    // ---- Requisito: PointLight (tecla 3) ----
    this.point = new THREE.PointLight(0xff6600, 1.2, 10);
    this.point.name = 'point';
    this.point.position.set(0, 1.4, 0);
    this.point.castShadow = false;

    // ---- Requisito: HemisphereLight (tecla 4) ----
    this.hemisphere = new THREE.HemisphereLight(0x4444ff, 0x222244, 0.5);
    this.hemisphere.name = 'hemisphere';

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
   * Aplica um tema de nível às luzes.
   * @param {object} theme — objecto do levelConfig
   */
  applyTheme(theme) {
    if (theme.ambientColor)        this.ambient.color.set(theme.ambientColor);
    if (theme.ambientIntensity != null) this.ambient.intensity = theme.ambientIntensity;
    if (theme.directionalColor)    this.directional.color.set(theme.directionalColor);
    if (theme.directionalIntensity != null) this.directional.intensity = theme.directionalIntensity;
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
      this.point.intensity = 1.2 + Math.sin(elapsedTime * 5.4) * 0.4;
    }
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
