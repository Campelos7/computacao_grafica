/* ==========================================================================
   PostProcessing.js — Pipeline de Pós-Processamento Retro
   Requisito: EffectComposer pipeline com RenderPass, CRT Shader (scanlines,
   curvatura, aberração cromática), UnrealBloomPass, Pixelate Shader, FilmPass.
   Toggle completo com tecla M.
   ========================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ==========================================================================
   GLSL Shaders Personalizados
   Requisito: Shaders GLSL personalizados (CRT + Pixelate)
   ========================================================================== */

/**
 * CRT Shader — Scanlines animadas, curvatura de ecrã (vertex displacement),
 * aberração cromática subtil.
 */
const CRTShader = {
  name: 'CRTShader',
  uniforms: {
    tDiffuse:          { value: null },
    uTime:             { value: 0 },
    uResolution:       { value: new THREE.Vector2(800, 600) },
    // GUIA DE EDIÇÃO (CRT):
    // - uCurvature: curvatura do ecrã
    // - uScanlineIntensity: força das scanlines
    // - uScanlineCount: quantidade/frequência de scanlines
    // - uChromaOffset: separação RGB (aberração cromática)
    // - uVignette: escurecimento das bordas
    uCurvature:        { value: 6.0 },
    uScanlineIntensity:{ value: 0.06 },
    uScanlineCount:    { value: 500.0 },
    uChromaOffset:     { value: 0.001 },
    uVignette:         { value: 0.25 },
  },

  // Vertex shader — passthrough com UVs
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  // Fragment shader — CRT completo
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uCurvature;
    uniform float uScanlineIntensity;
    uniform float uScanlineCount;
    uniform float uChromaOffset;
    uniform float uVignette;

    varying vec2 vUv;

    // Curvatura de ecrã CRT (barrel distortion)
    vec2 curveUV(vec2 uv) {
      uv = uv * 2.0 - 1.0;
      vec2 offset = abs(uv.yx) / vec2(uCurvature, uCurvature);
      uv = uv + uv * offset * offset;
      uv = uv * 0.5 + 0.5;
      return uv;
    }

    void main() {
      // Aplicar curvatura
      vec2 curved = curveUV(vUv);

      // Cortar bordas (fora do ecrã curvo)
      if (curved.x < 0.0 || curved.x > 1.0 || curved.y < 0.0 || curved.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      // Aberração cromática — separar canais RGB com offset
      float offset = uChromaOffset;
      float r = texture2D(tDiffuse, vec2(curved.x + offset, curved.y)).r;
      float g = texture2D(tDiffuse, curved).g;
      float b = texture2D(tDiffuse, vec2(curved.x - offset, curved.y)).b;
      vec3 color = vec3(r, g, b);

      // Scanlines animadas
      float scanline = sin(curved.y * uScanlineCount * 3.14159 + uTime * 2.0) * 0.5 + 0.5;
      scanline = 1.0 - scanline * uScanlineIntensity;
      color *= scanline;

      // Scanline horizontal mais sutil
      float hline = sin(curved.x * uScanlineCount * 0.5 * 3.14159) * 0.5 + 0.5;
      color *= 1.0 - hline * uScanlineIntensity * 0.3;

      // Vinheta
      vec2 vigUV = curved * (1.0 - curved);
      float vig = vigUV.x * vigUV.y * 15.0;
      vig = pow(vig, uVignette);
      color *= vig;

      // Slight flicker
      float flicker = 1.0 - sin(uTime * 8.0) * 0.01;
      color *= flicker;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

/**
 * Pixelate Shader — Downsample para resolução retro (320x240)
 * + upscale nearest-neighbor.
 */
const PixelateShader = {
  name: 'PixelateShader',
  uniforms: {
    tDiffuse:    { value: null },
    uResolution: { value: new THREE.Vector2(800, 600) },
    // GUIA DE EDIÇÃO (PIXELATE):
    // - valores menores => imagem mais pixelizada
    // - valores maiores => efeito mais subtil
    uPixelSize:  { value: new THREE.Vector2(1920, 1080) },
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform vec2 uPixelSize;

    varying vec2 vUv;

    void main() {
      // Quantizar UVs para simular resolução baixa
      vec2 pixelatedUV = floor(vUv * uPixelSize) / uPixelSize;
      gl_FragColor = texture2D(tDiffuse, pixelatedUV);
    }
  `,
};

/**
 * Film Grain Shader — Substitui FilmPass depreciado.
 * Adiciona ruído e slight color shift para efeito retro.
 */
const FilmGrainShader = {
  name: 'FilmGrainShader',
  uniforms: {
    tDiffuse:       { value: null },
    uTime:          { value: 0 },
    // GUIA DE EDIÇÃO (GRAIN):
    // - uGrainIntensity: intensidade do ruído
    uGrainIntensity:{ value: 0.03 },
    uFlickerSpeed:  { value: 12.0 },
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrainIntensity;

    varying vec2 vUv;

    // Pseudo-random hash
    float random(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // Film grain
      float grain = random(vUv + vec2(uTime * 0.01, uTime * 0.013)) - 0.5;
      color.rgb += grain * uGrainIntensity;

      gl_FragColor = color;
    }
  `,
};

/* ═══════════════════════════════════════════════════════════════════════════ */
export class PostProcessing {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   */
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = true; // Pós-processamento ligado por defeito

    const size = renderer.getSize(new THREE.Vector2());

    // ---- Requisito: Pipeline EffectComposer ----
    this.composer = new EffectComposer(renderer);

    // 1. RenderPass — base render
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // 2. UnrealBloomPass — neon glow bloom
    // GUIA DE EDIÇÃO:
    // - strength: força do bloom
    // - radius: espalhamento do bloom
    // - threshold: quão "brilhante" precisa ser para aplicar bloom
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      0.5,   // strength — subtil glow
      0.4,   // radius
      0.82   // threshold — só materiais muito brilhantes
    );
    this.composer.addPass(this.bloomPass);

    // 3. ShaderPass (CRT) — scanlines + curvatura + aberração cromática
    this.crtPass = new ShaderPass(CRTShader);
    this.crtPass.uniforms.uResolution.value.set(size.x, size.y);
    this.composer.addPass(this.crtPass);

    // 4. ShaderPass (Pixelate) — downsample retro
    this.pixelPass = new ShaderPass(PixelateShader);
    this.pixelPass.uniforms.uResolution.value.set(size.x, size.y);
    this.pixelPass.uniforms.uPixelSize.value.set(1920, 1080);
    this.composer.addPass(this.pixelPass);

    // 5. ShaderPass (Film grain)
    this.filmPass = new ShaderPass(FilmGrainShader);
    this.composer.addPass(this.filmPass);

    // 6. OutputPass — correcção de cor final
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  /**
   * Requisito: Toggle completo com tecla M.
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * Actualiza a câmara usada no render pass.
   * @param {THREE.Camera} camera
   */
  setCamera(camera) {
    this.camera = camera;
    this.renderPass.camera = camera;
  }

  /**
   * Ajusta strength do bloom (por nível).
   * @param {number} strength
   */
  setBloomStrength(strength) {
    this.bloomPass.strength = strength;
  }

  /**
   * Actualiza uniforms dependentes do tempo.
   * @param {number} elapsed — tempo total decorrido
   * @param {number} delta — delta desde último frame
   */
  update(elapsed, delta) {
    this.crtPass.uniforms.uTime.value = elapsed;
    this.filmPass.uniforms.uTime.value = elapsed;
  }

  /**
   * Renderiza com ou sem pós-processamento.
   */
  render() {
    if (this.enabled) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Redimensionar quando a janela muda de tamanho.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.composer.setSize(width, height);
    this.crtPass.uniforms.uResolution.value.set(width, height);
    this.pixelPass.uniforms.uResolution.value.set(width, height);
    this.bloomPass.resolution.set(width, height);
  }
}
