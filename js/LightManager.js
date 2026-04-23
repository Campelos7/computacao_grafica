/* ==========================================================================
   LightManager.js — Gestão das 4 luzes obrigatórias (redesenhadas)
   Requisito: Implementar no mínimo 4 tipos de luz.
   Teclas (1,2,3,4) para ligar/desligar com feedback visual claro.

   Cada luz tem um papel visual DISTINTO e ÚNICO:
   1 — DirectionalLight (Sol): luz principal, sombras nítidas
   2 — SpotLight (Holofote): cone focado que segue a cabeça da cobra
   3 — PointLight (Aura): brilho forte e localizado na comida
   4 — AmbientLight (Base): iluminação mínima global
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

    // ---- 1. DirectionalLight (tecla 1) — Sol/Lua, sombras ----
    this.directional = new THREE.DirectionalLight(0xff88ff, 2.0);
    this.directional.name = 'directional';
    this.directional.position.set(15, 22, 10);
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.set(1024, 1024);
    this.directional.shadow.camera.left   = -18;
    this.directional.shadow.camera.right  =  18;
    this.directional.shadow.camera.top    =  18;
    this.directional.shadow.camera.bottom = -18;
    this.directional.shadow.camera.near   = 0.5;
    this.directional.shadow.camera.far    = 55;
    this.directional.shadow.bias = -0.0005;
    this.directional.shadow.normalBias = 0.02;
    this.directional.shadow.radius = 2;

    // ---- 2. SpotLight (tecla 2) — Holofote que segue a cobra ----
    this.spot = new THREE.SpotLight(0xffffff, 5.0, 30, Math.PI / 6, 0.4, 1.0);
    this.spot.name = 'spotlight';
    this.spot.position.set(0, 12, 0);
    this.spot.castShadow = true;
    this.spot.shadow.mapSize.set(512, 512);
    this.spot.shadow.bias = -0.001;
    this.spot.shadow.normalBias = 0.02;
    // Target para o spotlight — será atualizado no game loop
    this._spotTarget = new THREE.Object3D();
    this._spotTarget.position.set(0, 0, 0);
    this.scene.add(this._spotTarget);
    this.spot.target = this._spotTarget;

    // ---- 3. PointLight (tecla 3) — Aura forte na comida ----
    this.point = new THREE.PointLight(0xff6600, 4.0, 12, 1.5);
    this.point.name = 'point';
    this.point.position.set(0, 1.8, 0);
    this.point.castShadow = false;

    // ---- 4. AmbientLight (tecla 4) — Iluminação base mínima ----
    this.ambient = new THREE.AmbientLight(0x4422aa, 0.3);
    this.ambient.name = 'ambient';

    // Array ordenado (índice = tecla - 1)
    this.lights = [this.directional, this.spot, this.point, this.ambient];
    this.names  = ['Directional', 'Spotlight', 'Point', 'Ambient'];

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
    // Directional
    if (theme.directionalColor)    this.directional.color.set(theme.directionalColor);
    if (theme.directionalIntensity != null) this.directional.intensity = theme.directionalIntensity;

    // SpotLight
    if (theme.spotColor)    this.spot.color.set(theme.spotColor);
    if (theme.spotIntensity != null) this.spot.intensity = theme.spotIntensity;

    // PointLight — cor por bioma
    if (theme.pointColor) this.point.color.set(theme.pointColor);
    if (theme.pointIntensity != null) this.point.intensity = theme.pointIntensity * 3.0;

    // Ambient
    if (theme.ambientColor)        this.ambient.color.set(theme.ambientColor);
    if (theme.ambientIntensity != null) this.ambient.intensity = theme.ambientIntensity * 0.5;
  }

  /**
   * Atualiza a posição do PointLight para seguir a comida.
   */
  setPointLightPosition(x, y, z) {
    this.point.position.set(x, y, z);
  }

  /**
   * Atualiza a posição do SpotLight para seguir a cabeça da cobra.
   * O spotlight fica acima da cobra e aponta para ela.
   */
  setSpotLightTarget(x, y, z) {
    this._spotTarget.position.set(x, y, z);
    // Spotlight fica 12 unidades acima e ligeiramente atrás
    this.spot.position.set(x, 12, z + 2);
  }

  /**
   * Pulsa a intensidade do PointLight (chamado no game loop).
   * Pulsação mais forte para ser visualmente óbvia.
   */
  pulsePointLight(elapsedTime) {
    if (this.point.visible) {
      this.point.intensity = 4.0 + Math.sin(elapsedTime * 4.0) * 1.5;
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
