/* ==========================================================================
   CameraController.js — Controlo de Câmaras (Perspectiva + Ortográfica)
   ═══════════════════════════════════════════════════════════════════════════

   Requisitos cobertos:
   - R2: Toggle câmara (tecla C) — PerspectiveCamera ↔ OrthographicCamera
   - Transição suave (interpolação smoothstep) entre câmaras
   - OrbitControls para rotação manual (rato)
   - Câmara perspectiva: segue a cobra com lerp
   - Câmara ortográfica: FIXA no centro do mapa (vista top-down)

   Primitivas Three.js:
   - PerspectiveCamera (projecção em perspectiva)
   - OrthographicCamera (projecção ortogonal)
   - OrbitControls (controlo por rato)
   ========================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BOARD_SIZE } from './utils/helpers.js';

export class CameraController {
  /**
   * Inicializa as duas câmaras e os OrbitControls.
   * @param {HTMLElement} domElement — canvas do renderer
   */
  constructor(domElement) {
    const aspect = window.innerWidth / window.innerHeight;

    /* ── Câmara 1: PerspectiveCamera ──
       FOV=60°, segue a cobra durante o jogo.
       Usada para vista 3D com profundidade. */
    this.perspective = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
    this.perspective.position.set(0, 18, 14);

    /* ── Câmara 2: OrthographicCamera ──
       Vista top-down FIXA no centro do mapa.
       Não segue a cobra — mostra o tabuleiro inteiro. */
    const frustum = BOARD_SIZE * 0.65;
    this.orthoFrustum = frustum;
    this.ortho = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 200
    );
    /* Posição fixa: directamente acima do centro do mapa */
    this.ortho.position.set(0, 35, 0.01);
    this.ortho.lookAt(0, 0, 0);

    /* ── Estado da câmara activa ── */
    this.active = this.perspective;
    this.isPerspective = true;

    /* ── Estado da transição suave ── */
    this._transitioning = false;
    this._transitionAlpha = 0;
    this._transitionDuration = 0.6; // segundos

    /* ── OrbitControls — controlo por rato ──
       Permite ao utilizador rodar a câmara manualmente.
       Desactivado na ortográfica (vista fixa). */
    this.controls = new OrbitControls(this.active, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.target.set(0, 0, 0);

    /* ── Vectores de trabalho (evita alocações por frame) ── */
    this._followBehind = new THREE.Vector3();
    this._followTarget = new THREE.Vector3();
    this._followPos    = new THREE.Vector3();
  }

  /* ══════════════════════════════════════════════════════════════════════════
     TOGGLE DE CÂMARA — Tecla C
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Alterna entre câmara perspectiva e ortográfica.
   * Usa transição suave com interpolação smoothstep.
   */
  switchCamera() {
    if (this._transitioning) return; // prevenir duplo-click

    /* Guardar estado de partida para interpolação */
    this._transStartPos = this.active.position.clone();
    this._transStartTarget = this.controls.target.clone();

    if (this.isPerspective) {
      /* ── Mudar para Ortográfica (vista top-down fixa) ── */
      this.active = this.ortho;
      this.controls.object = this.ortho;
      this.controls.enableRotate = false; // sem rotação na ortho

      /* Posição final: centro do mapa, a olhar para baixo */
      this._transEndPos = new THREE.Vector3(0, 35, 0.01);
      this._transEndTarget = new THREE.Vector3(0, 0, 0);
    } else {
      /* ── Mudar para Perspectiva (3D com profundidade) ── */
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
   * @returns {number} valor suavizado
   */
  _smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     SEGUIMENTO DA COBRA — Câmara Perspectiva
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Segue a cabeça da cobra com a câmara perspectiva.
   * Usa lerp para suavidade. A ortográfica é FIXA — não se move.
   * @param {THREE.Vector3} headPos — posição da cabeça
   * @param {THREE.Vector3} direction — direcção actual da cobra
   */
  followSnake(headPos, direction) {
    if (this._transitioning) return; // não seguir durante transição

    /* Só a perspectiva segue a cobra; a ortho fica fixa no centro */
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
    }
    /* Ortográfica: NÃO segue a cobra — permanece fixa em (0, 35, 0.01) */
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ACTUALIZAÇÃO POR FRAME
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Actualizar a cada frame. Processa transição suave se activa.
   * @param {number} [delta] — tempo desde último frame (s)
   */
  update(delta) {
    /* ── Transição suave entre câmaras ── */
    if (this._transitioning && delta) {
      this._transitionAlpha += delta / this._transitionDuration;

      if (this._transitionAlpha >= 1) {
        this._transitionAlpha = 1;
        this._transitioning = false;
      }

      const t = this._smoothstep(Math.min(this._transitionAlpha, 1));

      /* Interpolar posição e target */
      this.active.position.lerpVectors(this._transStartPos, this._transEndPos, t);
      this.controls.target.lerpVectors(this._transStartTarget, this._transEndTarget, t);
    }

    this.controls.update();
  }

  /* ══════════════════════════════════════════════════════════════════════════
     UTILIDADES
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Força a câmara a saltar imediatamente para uma posição/target.
   * Necessário porque OrbitControls com damping ignora mudanças directas.
   * @param {THREE.Vector3} position — posição da câmara
   * @param {THREE.Vector3} target — ponto para onde a câmara olha
   */
  resetPosition(position, target) {
    /* Forçar perspectiva se não estiver activa */
    if (!this.isPerspective) this.switchCamera();

    this.perspective.position.copy(position);
    this.controls.target.copy(target);
    this.perspective.lookAt(target);
    this.perspective.updateMatrixWorld();

    /* Desactivar damping temporariamente para aplicar posição instantaneamente */
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = true;
  }

  /**
   * Redimensionar quando a janela muda de tamanho.
   * @param {number} width — largura em pixels
   * @param {number} height — altura em pixels
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
   * Activa/desactiva OrbitControls (ex: durante pausa).
   * @param {boolean} enabled
   */
  setOrbitEnabled(enabled) {
    this.controls.enabled = enabled;
  }

  /**
   * Devolve a câmara activa (perspectiva ou ortográfica).
   * @returns {THREE.Camera}
   */
  get camera() {
    return this.active;
  }
}
