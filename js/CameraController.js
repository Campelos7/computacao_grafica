/* ==========================================================================
   CameraController.js — Controlo de câmaras (Perspectiva + Ortográfica)
   Requisito: Toggle suave entre PerspectiveCamera e OrthographicCamera (tecla C).
   Manter OrbitControls para rotação manual.
   ========================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BOARD_SIZE } from './utils/helpers.js';

export class CameraController {
  /**
   * @param {HTMLElement} domElement — canvas do renderer
   */
  constructor(domElement) {
    const aspect = window.innerWidth / window.innerHeight;

    // ---- Requisito: PerspectiveCamera ----
    this.perspective = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
    this.perspective.position.set(0, 18, 14);

    // ---- Requisito: OrthographicCamera ----
    const frustum = BOARD_SIZE * 0.65;
    this.orthoFrustum = frustum;
    this.ortho = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 200
    );
    this.ortho.position.set(0, 35, 0.01);
    this.ortho.lookAt(0, 0, 0);

    // Estado
    this.active = this.perspective; // câmara activa
    this.isPerspective = true;
    this._transitioning = false;
    this._transitionAlpha = 0;
    this._transitionDuration = 0.6; // segundos

    // ---- Requisito: OrbitControls para rotação manual ----
    this.controls = new OrbitControls(this.active, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.target.set(0, 0, 0);

    // Vectores de trabalho (evita alocações por frame)
    this._followBehind = new THREE.Vector3();
    this._followTarget = new THREE.Vector3();
    this._followPos    = new THREE.Vector3();
    this._orthoTarget  = new THREE.Vector3();
  }

  /**
   * Alterna entre câmara perspectiva e ortográfica.
   * Requisito: Toggle suave (tecla C) — transição interpolada.
   */
  switchCamera() {
    if (this._transitioning) return; // prevenir duplo-click

    // Guardar estado de partida
    this._transStartPos = this.active.position.clone();
    this._transStartTarget = this.controls.target.clone();

    // Trocar câmara
    if (this.isPerspective) {
      this.active = this.ortho;
      this.controls.object = this.ortho;
      this.controls.enableRotate = false;

      // Posicionar ortho no target actual antes de transicionar
      this._transEndPos = new THREE.Vector3(
        this.controls.target.x,
        35,
        this.controls.target.z + 0.01
      );
      this._transEndTarget = this.controls.target.clone();
    } else {
      this.active = this.perspective;
      this.controls.object = this.perspective;
      this.controls.enableRotate = true;

      this._transEndPos = this.perspective.position.clone();
      this._transEndTarget = this.controls.target.clone();
    }

    this.isPerspective = !this.isPerspective;
    this._transitioning = true;
    this._transitionAlpha = 0;
  }

  /**
   * Smoothstep easing — transição suave sem saltos bruscos.
   * @param {number} t — valor entre 0 e 1
   */
  _smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  /**
   * Segue a cabeça da cobra com a câmara perspectiva.
   * Usa lerp para suavidade.
   * @param {THREE.Vector3} headPos
   * @param {THREE.Vector3} direction
   */
  followSnake(headPos, direction) {
    if (this._transitioning) return; // não seguir durante transição

    if (this.isPerspective) {
      this._followBehind.copy(direction).multiplyScalar(-8);
      this._followTarget.set(headPos.x, 0, headPos.z);
      this._followPos.set(
        this._followTarget.x + this._followBehind.x,
        14,
        this._followTarget.z + this._followBehind.z
      );
      this.perspective.position.lerp(this._followPos, 0.08);
      this.controls.target.lerp(this._followTarget, 0.12);
    } else {
      this._orthoTarget.set(headPos.x, 0, headPos.z);
      // Lerp rápido para a câmara ortográfica acompanhar a cobra
      this.controls.target.lerp(this._orthoTarget, 0.6);
      // Mover a posição da câmara ortográfica para seguir a cabeça
      this.ortho.position.x = THREE.MathUtils.lerp(this.ortho.position.x, headPos.x, 0.6);
      this.ortho.position.z = THREE.MathUtils.lerp(this.ortho.position.z, headPos.z + 0.01, 0.6);
    }
  }

  /**
   * Actualizar a cada frame. Processa transição suave se activa.
   * @param {number} [delta] — tempo desde último frame (s)
   */
  update(delta) {
    // ── Transição suave entre câmaras ──
    if (this._transitioning && delta) {
      this._transitionAlpha += delta / this._transitionDuration;

      if (this._transitionAlpha >= 1) {
        this._transitionAlpha = 1;
        this._transitioning = false;
      }

      const t = this._smoothstep(Math.min(this._transitionAlpha, 1));

      // Interpolar posição e target
      this.active.position.lerpVectors(this._transStartPos, this._transEndPos, t);
      this.controls.target.lerpVectors(this._transStartTarget, this._transEndTarget, t);
    }

    this.controls.update();
  }

  /**
   * Força a câmara a saltar imediatamente para uma posição/target.
   * Necessário porque OrbitControls com damping ignora mudanças directas.
   */
  resetPosition(position, target) {
    // Forçar perspectiva se não estiver activa
    if (!this.isPerspective) this.switchCamera();

    this.perspective.position.copy(position);
    this.controls.target.copy(target);
    this.perspective.lookAt(target);
    this.perspective.updateMatrixWorld();

    // Desactivar damping temporariamente para aplicar posição instantaneamente
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = true;
  }

  /**
   * Redimensionar quando a janela muda de tamanho.
   */
  resize(width, height) {
    const aspect = width / height;

    this.perspective.aspect = aspect;
    this.perspective.updateProjectionMatrix();

    this.ortho.left   = -this.orthoFrustum * aspect;
    this.ortho.right  =  this.orthoFrustum * aspect;
    this.ortho.top    =  this.orthoFrustum;
    this.ortho.bottom = -this.orthoFrustum;
    this.ortho.updateProjectionMatrix();
  }

  /**
   * Activa/desactiva OrbitControls (ex: durante replay).
   */
  setOrbitEnabled(enabled) {
    this.controls.enabled = enabled;
  }

  /**
   * Devolve a câmara activa.
   */
  get camera() {
    return this.active;
  }
}
