/* ==========================================================================
   CameraController.js — Controlo de câmaras (Perspectiva + Ortográfica)
   Requisito: Toggle suave entre PerspectiveCamera e OrthographicCamera (tecla C).
   Manter OrbitControls para rotação manual.
   ========================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BOARD_SIZE, CAMERA } from './config/gameConfig.js';

export class CameraController {
  /**
   * @param {HTMLElement} domElement — canvas do renderer
   */
  constructor(domElement) {
    const aspect = window.innerWidth / window.innerHeight;

    // ---- Requisito: PerspectiveCamera ----
    this.perspective = new THREE.PerspectiveCamera(
      CAMERA.perspectiveFov,
      aspect,
      CAMERA.clipNear,
      CAMERA.clipFar
    );
    this.perspective.position.set(
      CAMERA.perspectiveInit.x,
      CAMERA.perspectiveInit.y,
      CAMERA.perspectiveInit.z
    );

    // ---- Requisito: OrthographicCamera ----
    const frustum = BOARD_SIZE * CAMERA.orthoFrustumBoardFactor;
    this.orthoFrustum = frustum;
    this.ortho = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      CAMERA.clipNear,
      CAMERA.clipFar
    );
    this.ortho.position.set(CAMERA.orthoInit.x, CAMERA.orthoInit.y, CAMERA.orthoInit.z);
    this.ortho.lookAt(0, 0, 0);

    // Estado
    this.active = this.perspective; // câmara activa
    this.isPerspective = true;
    this._transitioning = false;
    this._transitionAlpha = 0;
    this._transitionDuration = CAMERA.switchDurationSeconds;

    // ---- Requisito: OrbitControls para rotação manual ----
    this.controls = new OrbitControls(this.active, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = CAMERA.orbitDamping;
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI * CAMERA.orbitMaxPolarPiFraction;
    this.controls.minDistance = CAMERA.orbitMinDistance;
    this.controls.maxDistance = CAMERA.orbitMaxDistance;
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
        CAMERA.orthoInit.y,
        this.controls.target.z + CAMERA.orthoInit.z
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
      this._followBehind.copy(direction).multiplyScalar(-CAMERA.followDistanceBehind);
      this._followTarget.set(headPos.x, 0, headPos.z);
      this._followPos.set(
        this._followTarget.x + this._followBehind.x,
        CAMERA.followCameraHeight,
        this._followTarget.z + this._followBehind.z
      );
      this.perspective.position.lerp(this._followPos, CAMERA.followLerpPosition);
      this.controls.target.lerp(this._followTarget, CAMERA.followLerpTarget);
    } else {
      this._orthoTarget.set(headPos.x, 0, headPos.z);
      this.controls.target.lerp(this._orthoTarget, CAMERA.orthoFollowLerp);
      this.ortho.position.x = THREE.MathUtils.lerp(
        this.ortho.position.x,
        headPos.x,
        CAMERA.orthoFollowLerp
      );
      this.ortho.position.z = THREE.MathUtils.lerp(
        this.ortho.position.z,
        headPos.z + CAMERA.orthoInit.z,
        CAMERA.orthoFollowLerp
      );
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
