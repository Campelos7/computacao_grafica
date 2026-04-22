/* ==========================================================================
   LevelManager.js — Sistema de Níveis com Biomas Naturais
   Requisito: Ficheiro JSON com temas diferentes (cores, nevoeiro, velocidade,
   obstáculos). loadLevel() limpa a cena, aplica o tema, gera obstáculos.
   Transição suave entre níveis (fade). Importar ≥2 modelos GLTF.
   
   Biomas: Floresta Tropical, Deserto Canyon, Montanha de Neve
   Cada nível inclui objetos complexos temáticos + texturas importadas +
   sistema de partículas + decorações com shader + skybox gradiente.
   ========================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BOARD_SIZE, CELL_SIZE, createCanvasTexture, disposeGroup, hexToColor } from './utils/helpers.js';

/* ══════════════════════════════════════════════════════════════════════════
   TEXTURAS IMPORTADAS (R1 — obrigatório pelo protocolo)
   Carregadas com TextureLoader a partir de ficheiros .png
   ══════════════════════════════════════════════════════════════════════════ */
const textureLoader = new THREE.TextureLoader();

/** Cache de texturas importadas para reutilização */
const importedTextures = {};

function loadImportedTexture(name, path, repeatX = 1, repeatY = 1) {
  if (importedTextures[name]) return importedTextures[name];
  const tex = textureLoader.load(path);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  importedTextures[name] = tex;
  return tex;
}

/* ══════════════════════════════════════════════════════════════════════════
   TEXTURAS PROCEDURAIS POR BIOMA (complementam as importadas)
   ══════════════════════════════════════════════════════════════════════════ */

function createForestGroundTexture() {
  return createCanvasTexture(256, (ctx, size) => {
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size);
    grad.addColorStop(0, '#1a2a10');
    grad.addColorStop(0.5, '#142208');
    grad.addColorStop(1, '#1a2a10');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * size, y = Math.random() * size;
      ctx.fillStyle = `rgba(34, ${80 + Math.floor(Math.random()*60)}, 20, ${0.12 + Math.random()*0.18})`;
      ctx.beginPath(); ctx.arc(x, y, 3 + Math.random() * 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.12)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      let cx = Math.random() * size, cy = Math.random() * size; ctx.moveTo(cx, cy);
      for (let j = 0; j < 8; j++) { cx += (Math.random()-0.5)*30; cy += (Math.random()-0.5)*30; ctx.lineTo(cx, cy); }
      ctx.stroke();
    }
    const cellPx = size / 10;
    ctx.strokeStyle = '#44ff44'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.06;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i*cellPx, 0); ctx.lineTo(i*cellPx, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*cellPx); ctx.lineTo(size, i*cellPx); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * size, y = Math.random() * size;
      ctx.fillStyle = `rgba(${40+Math.floor(Math.random()*30)}, ${100+Math.floor(Math.random()*80)}, 20, 0.2)`;
      ctx.beginPath(); ctx.ellipse(x, y, 3+Math.random()*3, 1.5+Math.random()*1.5, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill();
    }
  }, { repeat: [5, 5], pixelArt: false });
}

function createDesertGroundTexture() {
  return createCanvasTexture(256, (ctx, size) => {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#3a2810'); grad.addColorStop(0.3, '#44300f');
    grad.addColorStop(0.7, '#3a2810'); grad.addColorStop(1, '#302008');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(${180+Math.floor(Math.random()*60)}, ${140+Math.floor(Math.random()*50)}, ${60+Math.floor(Math.random()*40)}, ${0.04+Math.random()*0.06})`;
      ctx.fillRect(Math.random()*size, Math.random()*size, 1, 1);
    }
    ctx.strokeStyle = 'rgba(20, 10, 0, 0.18)'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      let cx = Math.random()*size, cy = Math.random()*size; ctx.moveTo(cx, cy);
      for (let j = 0; j < 6; j++) { cx += (Math.random()-0.5)*45; cy += (Math.random()-0.5)*45; ctx.lineTo(cx, cy); }
      ctx.stroke();
    }
    const cellPx = size / 10;
    ctx.strokeStyle = '#ff8833'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.06;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i*cellPx, 0); ctx.lineTo(i*cellPx, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*cellPx); ctx.lineTo(size, i*cellPx); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }, { repeat: [5, 5], pixelArt: false });
}

function createSnowGroundTexture() {
  return createCanvasTexture(256, (ctx, size) => {
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size);
    grad.addColorStop(0, '#c8d8e8'); grad.addColorStop(0.5, '#b0c0d4'); grad.addColorStop(1, '#a0b0c8');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 80; i++) {
      const x = Math.random()*size, y = Math.random()*size;
      const b = 200 + Math.floor(Math.random() * 55);
      ctx.fillStyle = `rgba(${b}, ${b+10}, 255, ${0.3+Math.random()*0.4})`;
      ctx.beginPath(); ctx.arc(x, y, 0.5+Math.random()*1.5, 0, Math.PI*2); ctx.fill();
    }
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = 'rgba(100, 120, 160, 0.07)';
      ctx.beginPath(); ctx.arc(Math.random()*size, Math.random()*size, 8+Math.random()*22, 0, Math.PI*2); ctx.fill();
    }
    const cellPx = size / 10;
    ctx.strokeStyle = '#88ccff'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.08;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(i*cellPx, 0); ctx.lineTo(i*cellPx, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i*cellPx); ctx.lineTo(size, i*cellPx); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }, { repeat: [5, 5], pixelArt: false });
}

/* ── Texturas de parede por bioma ── */
function createForestWallTexture() {
  return createCanvasTexture(128, (ctx, size) => {
    ctx.fillStyle = '#1a2a15'; ctx.fillRect(0, 0, size, size);
    const bw = 32, bh = 16; ctx.globalAlpha = 0.15;
    for (let y = 0; y < size; y += bh) {
      const off = (Math.floor(y/bh)%2)*(bw/2);
      for (let x = -bw+off; x < size; x += bw) {
        ctx.strokeStyle = '#33aa33'; ctx.lineWidth = 0.6;
        ctx.strokeRect(x, y, bw-1, bh-1);
        ctx.fillStyle = `rgba(30, ${80+Math.floor(Math.random()*40)}, 20, 0.12)`;
        ctx.fillRect(x+2, y+2, bw-5, bh-5);
      }
    }
    ctx.strokeStyle = 'rgba(34, 120, 34, 0.2)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(20, size/2, 5, size); ctx.stroke();
    ctx.globalAlpha = 1.0;
  }, { repeat: [3, 1.5], pixelArt: false });
}

function createDesertWallTexture() {
  return createCanvasTexture(128, (ctx, size) => {
    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(0, 0, size, size);
    const bw = 32, bh = 16; ctx.globalAlpha = 0.15;
    for (let y = 0; y < size; y += bh) {
      const off = (Math.floor(y/bh)%2)*(bw/2);
      for (let x = -bw+off; x < size; x += bw) {
        ctx.strokeStyle = '#cc6611'; ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, bw-1, bh-1);
        ctx.fillStyle = `rgba(${140+Math.floor(Math.random()*40)}, ${80+Math.floor(Math.random()*30)}, 20, 0.08)`;
        ctx.fillRect(x+1, y+1, bw-3, bh-3);
      }
    }
    ctx.globalAlpha = 0.04;
    for (let y = 0; y < size; y += 3) { ctx.fillStyle = '#000'; ctx.fillRect(0, y, size, 1); }
    ctx.globalAlpha = 1.0;
  }, { repeat: [3, 1.5], pixelArt: false });
}

function createSnowWallTexture() {
  return createCanvasTexture(128, (ctx, size) => {
    ctx.fillStyle = '#1a2535'; ctx.fillRect(0, 0, size, size);
    const bw = 32, bh = 16; ctx.globalAlpha = 0.12;
    for (let y = 0; y < size; y += bh) {
      const off = (Math.floor(y/bh)%2)*(bw/2);
      for (let x = -bw+off; x < size; x += bw) {
        ctx.strokeStyle = '#4488cc'; ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, bw-1, bh-1);
      }
    }
    ctx.globalAlpha = 0.2;
    for (let y = 0; y < size; y += bh) { ctx.fillStyle = '#ddeeff'; ctx.fillRect(0, y, size, 2); }
    ctx.globalAlpha = 1.0;
  }, { repeat: [3, 1.5], pixelArt: false });
}

/* ══════════════════════════════════════════════════════════════════════════
   SKYBOX GRADIENTE POR BIOMA
   Esfera invertida com ShaderMaterial para gradiente vertical.
   ══════════════════════════════════════════════════════════════════════════ */

function createSkybox(topColor, midColor, bottomColor) {
  const skyGeo = new THREE.SphereGeometry(80, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor:    { value: new THREE.Color(topColor) },
      uMidColor:    { value: new THREE.Color(midColor) },
      uBottomColor: { value: new THREE.Color(bottomColor) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uBottomColor;
      varying vec3 vWorldPos;
      void main() {
        float h = normalize(vWorldPos).y;
        vec3 color;
        if (h > 0.0) {
          color = mix(uMidColor, uTopColor, h);
        } else {
          color = mix(uMidColor, uBottomColor, -h);
        }
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'skybox';
  return sky;
}

/* ══════════════════════════════════════════════════════════════════════════
   SISTEMA DE PARTÍCULAS POR BIOMA
   Points + BufferGeometry + atributos animados
   ══════════════════════════════════════════════════════════════════════════ */

function createParticleSystem(biome, boardHalf) {
  const group = new THREE.Group();
  group.name = 'particle-system';

  if (biome === 'forest') {
    // ── Pirilampos (Fireflies) ──
    const count = 60;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * boardHalf * 2.5;
      positions[i*3+1] = 0.3 + Math.random() * 3.5;
      positions[i*3+2] = (Math.random() - 0.5) * boardHalf * 2.5;
      sizes[i] = 2 + Math.random() * 4;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#88ff44') },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          pos.x += sin(uTime * 0.3 + aPhase) * 0.5;
          pos.y += sin(uTime * 0.5 + aPhase * 2.0) * 0.3;
          pos.z += cos(uTime * 0.4 + aPhase * 1.5) * 0.4;
          vAlpha = (sin(uTime * 2.0 + aPhase * 3.0) * 0.5 + 0.5);
          vAlpha *= vAlpha;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float glow = 1.0 - d * 2.0;
          glow = pow(glow, 2.0);
          gl_FragColor = vec4(uColor, glow * vAlpha * 0.8);
        }
      `,
    });

    const points = new THREE.Points(geo, mat);
    points.name = 'fireflies';
    group.add(points);

  } else if (biome === 'desert') {
    // ── Areia soprada (Sand particles) ──
    const count = 100;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * boardHalf * 3;
      positions[i*3+1] = 0.1 + Math.random() * 2.5;
      positions[i*3+2] = (Math.random() - 0.5) * boardHalf * 3;
      speeds[i] = 1.0 + Math.random() * 3.0;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ccaa66') },
        uBounds: { value: boardHalf * 1.5 },
      },
      vertexShader: `
        attribute float aSpeed;
        attribute float aPhase;
        uniform float uTime;
        uniform float uBounds;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          pos.x += uTime * aSpeed;
          pos.x = mod(pos.x + uBounds, uBounds * 2.0) - uBounds;
          pos.y += sin(uTime * 1.5 + aPhase) * 0.15;
          pos.z += sin(uTime * 0.7 + aPhase * 2.0) * 0.3;
          vAlpha = 0.3 + sin(aPhase + uTime) * 0.15;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (1.5 + sin(aPhase) * 0.5) * (150.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float soft = 1.0 - d * 2.0;
          gl_FragColor = vec4(uColor, soft * vAlpha);
        }
      `,
    });

    const points = new THREE.Points(geo, mat);
    points.name = 'sand-particles';
    group.add(points);

  } else if (biome === 'snow') {
    // ── Flocos de neve (Snowflakes) ──
    const count = 120;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * boardHalf * 3;
      positions[i*3+1] = Math.random() * 12;
      positions[i*3+2] = (Math.random() - 0.5) * boardHalf * 3;
      sizes[i] = 2 + Math.random() * 4;
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.3 + Math.random() * 0.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ddeeff') },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        attribute float aSpeed;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          pos.y -= mod(uTime * aSpeed, 12.0);
          if (pos.y < 0.0) pos.y += 12.0;
          pos.x += sin(uTime * 0.5 + aPhase) * 1.2;
          pos.z += cos(uTime * 0.3 + aPhase * 1.3) * 0.8;
          vAlpha = 0.4 + sin(aPhase + uTime * 0.5) * 0.2;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * (180.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float soft = 1.0 - d * 2.0;
          float sparkle = pow(soft, 3.0);
          gl_FragColor = vec4(uColor, (soft * 0.6 + sparkle * 0.4) * vAlpha);
        }
      `,
    });

    const points = new THREE.Points(geo, mat);
    points.name = 'snowflakes';
    group.add(points);
  }

  return group;
}

/* ══════════════════════════════════════════════════════════════════════════
   EFEITO ATMOSFÉRICO — ShaderMaterial com scroll UV
   ══════════════════════════════════════════════════════════════════════════ */

function createAtmosphericEffect(color1, color2, opacity, scaleX, scaleZ) {
  const group = new THREE.Group();
  group.name = 'atmospheric-fog';
  const c1 = new THREE.Color(color1), c2 = new THREE.Color(color2);
  const fogMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uColor1: { value: c1 }, uColor2: { value: c2 }, uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv; varying float vElevation; uniform float uTime;
      void main() {
        vUv = uv; vec3 pos = position;
        float wave = sin(pos.x*0.5+uTime*0.4)*cos(pos.z*0.3+uTime*0.3)*0.15;
        pos.y += wave; vElevation = wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor1; uniform vec3 uColor2; uniform float uOpacity;
      varying vec2 vUv; varying float vElevation;
      void main() {
        vec2 scrollUv = vUv + vec2(uTime*0.02, uTime*0.015);
        float n = sin(scrollUv.x*8.0)*cos(scrollUv.y*6.0+uTime*0.3);
        n += sin(scrollUv.x*4.0+uTime*0.2)*cos(scrollUv.y*3.0);
        n = n*0.5+0.5;
        vec3 color = mix(uColor1, uColor2, n);
        float edgeFade = smoothstep(0.0,0.15,vUv.x) * smoothstep(1.0,0.85,vUv.x)
                       * smoothstep(0.0,0.15,vUv.y) * smoothstep(1.0,0.85,vUv.y);
        float alpha = uOpacity * edgeFade * (0.6 + n*0.4 + vElevation*2.0);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(scaleX, scaleZ, 32, 32), fogMat);
  p1.rotation.x = -Math.PI/2; p1.name = 'fog-plane'; group.add(p1);
  const fogMat2 = fogMat.clone();
  fogMat2.uniforms = { uTime:{value:0}, uColor1:{value:c1.clone()}, uColor2:{value:c2.clone()}, uOpacity:{value:opacity*0.55} };
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(scaleX*0.65, scaleZ*0.65, 20, 20), fogMat2);
  p2.rotation.x = -Math.PI/2; p2.position.y = 0.7; p2.name = 'fog-plane-upper'; group.add(p2);
  return group;
}

/* ══════════════════════════════════════════════════════════════════════════
   DECORAÇÕES COMPLEXAS COM SHADER — Uma única por bioma

   Floresta: Cascata (waterfall shader)
   Deserto: Fogueira (partículas de fogo + PointLight)
   Neve: Aurora Boreal (shader GLSL avançado)
   ══════════════════════════════════════════════════════════════════════════ */

/** 🌿 Cascata — Parede rochosa + água animada com ShaderMaterial + Espuma */
function createWaterfall(x, z) {
  const g = new THREE.Group();
  g.name = 'waterfall';

  // Parede de rocha atrás
  const rockTex = loadImportedTexture('bark', 'textures/bark.png', 2, 3);
  const rockMat = new THREE.MeshStandardMaterial({
    map: rockTex,
    color: 0x555544, emissive: 0x111108, emissiveIntensity: 0.03,
    roughness: 0.95, metalness: 0.05,
  });
  const rockWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.8), rockMat);
  rockWall.position.set(0, 2, 0.4);
  rockWall.castShadow = true; rockWall.receiveShadow = true;
  g.add(rockWall);

  // Saliências rochosas
  for (let i = 0; i < 3; i++) {
    const ledge = new THREE.Mesh(
      new THREE.BoxGeometry(0.5+Math.random()*0.8, 0.15, 0.3), rockMat
    );
    ledge.position.set((Math.random()-0.5)*1.5, 1+i*1.2, 0);
    ledge.castShadow = true;
    g.add(ledge);
  }

  // Água animada — PlaneGeometry com ShaderMaterial
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uWaterColor: { value: new THREE.Color('#2288aa') },
      uFoamColor: { value: new THREE.Color('#aaddee') },
    },
    vertexShader: `
      varying vec2 vUv; uniform float uTime;
      void main() {
        vUv = uv; vec3 pos = position;
        pos.z += sin(pos.y * 4.0 + uTime * 3.0) * 0.04;
        pos.x += sin(pos.y * 3.0 + uTime * 2.5) * 0.02;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime; uniform vec3 uWaterColor; uniform vec3 uFoamColor;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        uv.y = fract(uv.y - uTime * 0.8);
        float foam = sin(uv.x * 20.0 + uTime * 2.0) * cos(uv.y * 15.0) * 0.5 + 0.5;
        foam = pow(foam, 3.0);
        vec3 color = mix(uWaterColor, uFoamColor, foam * 0.5);
        float edgeFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);
        float alpha = 0.7 * edgeFade;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 4, 12, 24), waterMat);
  waterPlane.position.set(0, 2, -0.01);
  waterPlane.name = 'waterfall-water';
  g.add(waterPlane);

  // Poça na base
  const poolMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a6688, roughness: 0.05, metalness: 0.3,
    transparent: true, opacity: 0.6,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.5, 16), poolMat);
  pool.rotation.x = -Math.PI/2; pool.position.y = 0.02;
  pool.receiveShadow = true;
  g.add(pool);

  // SpotLight azul iluminando a base
  const spotLight = new THREE.SpotLight(0x4488cc, 1.5, 8, Math.PI/4, 0.5);
  spotLight.position.set(0, 3, -1.5);
  spotLight.target.position.set(0, 0, 0);
  spotLight.name = 'waterfall-light';
  g.add(spotLight);
  g.add(spotLight.target);

  // Espuma (pequenas esferas brancas na base)
  const foamMat = new THREE.MeshBasicMaterial({
    color: 0xcceeee, transparent: true, opacity: 0.5,
  });
  for (let i = 0; i < 8; i++) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.04+Math.random()*0.04, 4, 4), foamMat);
    const a = Math.random() * Math.PI * 2;
    bubble.position.set(Math.cos(a)*0.6, 0.05, Math.sin(a)*0.6);
    bubble.name = 'waterfall-bubble';
    g.add(bubble);
  }

  g.position.set(x, 0, z);
  return g;
}

/** 🏜️ Fogueira — Pedras + Troncos + Partículas de fogo + PointLight pulsante */
function createCampfire(x, z) {
  const g = new THREE.Group();
  g.name = 'campfire';

  // Base de pedras em círculo
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x555555, roughness: 0.9, metalness: 0.05,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i/8) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12+Math.random()*0.05, 0), stoneMat);
    stone.position.set(Math.cos(a)*0.35, 0.08, Math.sin(a)*0.35);
    stone.castShadow = true;
    g.add(stone);
  }

  // Troncos cruzados
  const logMat = new THREE.MeshStandardMaterial({
    color: 0x3a2010, emissive: 0x1a0800, emissiveIntensity: 0.15,
    roughness: 0.9, metalness: 0.0,
  });
  const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 5), logMat);
  log1.position.set(0, 0.12, 0); log1.rotation.z = Math.PI/2; log1.rotation.y = 0.3;
  g.add(log1);
  const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 5), logMat);
  log2.position.set(0, 0.14, 0); log2.rotation.z = Math.PI/2; log2.rotation.y = -0.4;
  g.add(log2);
  const log3 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 5), logMat);
  log3.position.set(0, 0.18, 0); log3.rotation.x = Math.PI/2; log3.rotation.z = 0.5;
  g.add(log3);

  // Chamas — Partículas com Points
  const flameCount = 40;
  const flamePos = new Float32Array(flameCount * 3);
  const flameSizes = new Float32Array(flameCount);
  const flamePhases = new Float32Array(flameCount);
  for (let i = 0; i < flameCount; i++) {
    flamePos[i*3] = (Math.random()-0.5)*0.3;
    flamePos[i*3+1] = 0.1 + Math.random()*0.8;
    flamePos[i*3+2] = (Math.random()-0.5)*0.3;
    flameSizes[i] = 3 + Math.random()*5;
    flamePhases[i] = Math.random()*Math.PI*2;
  }
  const flameGeo = new THREE.BufferGeometry();
  flameGeo.setAttribute('position', new THREE.BufferAttribute(flamePos, 3));
  flameGeo.setAttribute('aSize', new THREE.BufferAttribute(flameSizes, 1));
  flameGeo.setAttribute('aPhase', new THREE.BufferAttribute(flamePhases, 1));

  const flameMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aSize; attribute float aPhase;
      uniform float uTime;
      varying float vHeight; varying float vAlpha;
      void main() {
        vec3 pos = position;
        float t = mod(uTime * 1.5 + aPhase, 1.5);
        pos.y = 0.1 + t * 0.7;
        pos.x += sin(uTime * 3.0 + aPhase * 5.0) * 0.08 * t;
        pos.z += cos(uTime * 2.5 + aPhase * 4.0) * 0.06 * t;
        vHeight = t / 1.5;
        vAlpha = 1.0 - vHeight;
        vAlpha *= vAlpha;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = aSize * (1.0 - vHeight * 0.5) * (200.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying float vHeight; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float soft = 1.0 - d * 2.0;
        vec3 color = mix(vec3(1.0, 0.9, 0.2), vec3(1.0, 0.2, 0.0), vHeight);
        color = mix(color, vec3(0.3, 0.05, 0.0), vHeight * vHeight);
        gl_FragColor = vec4(color, soft * vAlpha * 0.9);
      }
    `,
  });
  const flames = new THREE.Points(flameGeo, flameMat);
  flames.name = 'campfire-flames';
  g.add(flames);

  // PointLight quente pulsante
  const fireLight = new THREE.PointLight(0xff6622, 2.0, 8);
  fireLight.position.set(0, 0.5, 0);
  fireLight.name = 'campfire-light';
  g.add(fireLight);

  // Fumo (partículas subtis cinzentas acima)
  const smokeCount = 15;
  const smokePos = new Float32Array(smokeCount * 3);
  const smokePhases = new Float32Array(smokeCount);
  for (let i = 0; i < smokeCount; i++) {
    smokePos[i*3] = (Math.random()-0.5)*0.2;
    smokePos[i*3+1] = 0.8 + Math.random()*1.5;
    smokePos[i*3+2] = (Math.random()-0.5)*0.2;
    smokePhases[i] = Math.random()*Math.PI*2;
  }
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  smokeGeo.setAttribute('aPhase', new THREE.BufferAttribute(smokePhases, 1));
  const smokeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aPhase; uniform float uTime; varying float vAlpha;
      void main() {
        vec3 pos = position;
        float t = mod(uTime * 0.4 + aPhase, 3.0);
        pos.y = 0.8 + t * 1.0;
        pos.x += sin(uTime*0.8+aPhase*3.0)*0.15*t;
        vAlpha = (1.0 - t/3.0) * 0.25;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = (5.0 + t*4.0) * (150.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float soft = 1.0 - d * 2.0;
        gl_FragColor = vec4(0.4, 0.38, 0.35, soft * vAlpha);
      }
    `,
  });
  const smoke = new THREE.Points(smokeGeo, smokeMat);
  smoke.name = 'campfire-smoke';
  g.add(smoke);

  g.position.set(x, 0, z);
  return g;
}

/** ❄️ Aurora Boreal — Shader GLSL avançado no céu */
function createAuroraBorealis() {
  const g = new THREE.Group();
  g.name = 'aurora';

  const auroraMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vPos; uniform float uTime;
      void main() {
        vUv = uv; vPos = position;
        vec3 pos = position;
        pos.y += sin(pos.x * 0.3 + uTime * 0.5) * 2.0;
        pos.y += cos(pos.x * 0.15 + uTime * 0.3) * 1.5;
        pos.z += sin(pos.x * 0.2 + uTime * 0.4) * 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime; varying vec2 vUv; varying vec3 vPos;
      void main() {
        float x = vUv.x;
        float y = vUv.y;
        
        // Ondas de cor que se deslocam
        float wave1 = sin(x * 6.0 + uTime * 0.8) * 0.5 + 0.5;
        float wave2 = sin(x * 4.0 - uTime * 0.5 + 1.5) * 0.5 + 0.5;
        float wave3 = cos(x * 8.0 + uTime * 0.3) * 0.5 + 0.5;
        
        // Cores da aurora (verde, azul, roxo)
        vec3 green = vec3(0.1, 0.9, 0.3);
        vec3 blue = vec3(0.1, 0.4, 0.9);
        vec3 purple = vec3(0.6, 0.1, 0.8);
        
        vec3 color = mix(green, blue, wave1);
        color = mix(color, purple, wave2 * 0.4);
        color += vec3(0.0, wave3 * 0.15, wave3 * 0.1);
        
        // Fade vertical (mais intenso no centro)
        float vFade = smoothstep(0.0, 0.3, y) * smoothstep(1.0, 0.6, y);
        // Fade horizontal suave
        float hFade = smoothstep(0.0, 0.1, x) * smoothstep(1.0, 0.9, x);
        
        // Estrutura de cortina (linhas verticais subtis)
        float curtain = sin(x * 40.0 + uTime * 1.5) * 0.15 + 0.85;
        
        float alpha = vFade * hFade * curtain * 0.35;
        alpha *= 0.5 + wave1 * 0.3 + wave2 * 0.2;
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const auroraPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 8, 64, 16), auroraMat
  );
  auroraPlane.position.set(0, 20, -20);
  auroraPlane.rotation.x = -0.3;
  auroraPlane.name = 'aurora-plane';
  g.add(auroraPlane);

  // Uma segunda cortina menor
  const auroraMat2 = auroraMat.clone();
  auroraMat2.uniforms = { uTime: { value: 0 } };
  const auroraPlane2 = new THREE.Mesh(
    new THREE.PlaneGeometry(35, 6, 48, 12), auroraMat2
  );
  auroraPlane2.position.set(10, 18, -15);
  auroraPlane2.rotation.x = -0.2;
  auroraPlane2.rotation.y = 0.4;
  auroraPlane2.name = 'aurora-plane-2';
  g.add(auroraPlane2);

  return g;
}

/* ══════════════════════════════════════════════════════════════════════════
   BIOMAS — Decorações de cada bioma (versão melhorada)
   ══════════════════════════════════════════════════════════════════════════ */

function buildForestBiome(complexGroup, half) {
  const barkTex = loadImportedTexture('bark', 'textures/bark.png', 1, 2);
  const mossGroundTex = loadImportedTexture('moss_ground', 'textures/moss_ground.png', 2, 2);
  const trunkMat = new THREE.MeshStandardMaterial({
    map: barkTex, color: 0x6a5240, emissive: 0x1a1008, emissiveIntensity: 0.1,
    roughness: 0.92, metalness: 0.0,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x228844, emissive: 0x114422, emissiveIntensity: 0.15, roughness: 0.8, metalness: 0.0,
  });
  const darkLeafMat = new THREE.MeshStandardMaterial({
    color: 0x1a6633, emissive: 0x0d3319, emissiveIntensity: 0.1, roughness: 0.85, metalness: 0.0,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    map: mossGroundTex, color: 0x446622, emissive: 0x223311, emissiveIntensity: 0.12,
    roughness: 0.9, metalness: 0.0,
  });
  const fruitMat = new THREE.MeshStandardMaterial({
    color: 0xff4422, emissive: 0xaa2211, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.1,
  });

  function createTree(x, z, scale, variant) {
    const g = new THREE.Group(); g.name = 'forest-tree';
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12*scale, 0.22*scale, 2.8*scale, 8), trunkMat);
    trunk.position.y = 1.4*scale; trunk.rotation.z = (Math.random()-0.5)*0.15;
    trunk.castShadow = true; trunk.receiveShadow = true; g.add(trunk);
    for (let i = 0; i < 4; i++) {
      const a = (i/4)*Math.PI*2 + Math.random()*0.3;
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.02*scale, 0.06*scale, 0.5*scale, 5), trunkMat);
      root.position.set(Math.cos(a)*0.18*scale, 0.12*scale, Math.sin(a)*0.18*scale);
      root.rotation.z = Math.cos(a)*0.6; root.rotation.x = Math.sin(a)*0.6; root.castShadow = true; g.add(root);
    }
    const mat = variant ? darkLeafMat : leafMat;
    for (const [lx,ly,lz,lr] of [[0,3.0,0,0.85],[-.35,3.3,.25,.55],[.4,3.15,-.2,.6],[-.15,3.5,-.35,.45],[.25,3.45,.35,.5],[0,3.7,0,.35]]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(lr*scale, 10, 8), mat);
      leaf.position.set(lx*scale, ly*scale, lz*scale); leaf.castShadow = true; g.add(leaf);
    }
    for (let i = 0; i < 3; i++) {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.05*scale, 6, 5), fruitMat);
      const a = Math.random()*Math.PI*2;
      fruit.position.set(Math.cos(a)*0.35*scale, (2.6+Math.random())*scale, Math.sin(a)*0.35*scale); g.add(fruit);
    }
    g.position.set(x, 0, z); return g;
  }

  function createMushroom(x, z, scale) {
    const g = new THREE.Group(); g.name = 'forest-mushroom';
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xccbb88, roughness: 0.8 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xcc3322, emissive: 0x661100, emissiveIntensity: 0.25, roughness: 0.6 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22ff66, emissiveIntensity: 1.2, roughness: 0.3, transparent: true, opacity: 0.7 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.06 * scale, 0.3 * scale, 6), stemMat);
    stem.position.set(0, 0.15 * scale, 0);
    g.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12*scale, 8, 6, 0, Math.PI*2, 0, Math.PI/2), capMat);
    cap.position.y = 0.3*scale; cap.castShadow = true; g.add(cap);
    for (let i = 0; i < 4; i++) {
      const a = (i/4)*Math.PI*2, dot = new THREE.Mesh(new THREE.SphereGeometry(0.015*scale, 4, 4), glowMat);
      dot.position.set(Math.cos(a)*0.08*scale, 0.32*scale, Math.sin(a)*0.08*scale); dot.name = 'mushroom-glow'; g.add(dot);
    }
    g.position.set(x, 0, z); return g;
  }

  function createFallenLog(x, z, rot) {
    const g = new THREE.Group(); g.name = 'forest-log';
    const logObj = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.8, 7), trunkMat);
    logObj.rotation.z = Math.PI/2; logObj.position.y = 0.12; logObj.castShadow = true; logObj.receiveShadow = true; g.add(logObj);
    const moss = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.2), mossMat);
    moss.position.y = 0.24; g.add(moss);
    g.rotation.y = rot; g.position.set(x, 0, z); return g;
  }

  function createFern(x, z, scale) {
    const g = new THREE.Group(); g.name = 'forest-fern';
    const fernMat = new THREE.MeshStandardMaterial({ color: 0x33aa44, emissive: 0x115522, emissiveIntensity: 0.1, roughness: 0.85, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const a = (i/6)*Math.PI*2;
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.15*scale, 0.5*scale), fernMat);
      frond.position.set(Math.cos(a)*0.08*scale, 0.2*scale, Math.sin(a)*0.08*scale);
      frond.rotation.y = a; frond.rotation.x = -0.6; g.add(frond);
    }
    g.position.set(x, 0, z); return g;
  }

  function createMossyRock(x, z, scale) {
    const g = new THREE.Group(); g.name = 'forest-rock';
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.95, metalness: 0.05 });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2*scale, 1), rockMat);
    rock.position.y = 0.12*scale; rock.scale.y = 0.6; rock.castShadow = true; rock.receiveShadow = true; g.add(rock);
    const mTop = new THREE.Mesh(new THREE.SphereGeometry(0.15*scale, 6, 4, 0, Math.PI*2, 0, Math.PI*0.4), mossMat);
    mTop.position.y = 0.16*scale; g.add(mTop);
    g.position.set(x, 0, z); return g;
  }

  const m = half + 1.5;
  [[-m,-m,1],[- m,m-2,.9],[m,-m+1,1.1],[m,m,.85],[-m-1,0,.95],[m+1,0,1.05],[-m+.5,m+2,.7],[m-.5,-m-2,.75]].forEach(([x,z,s], i) => complexGroup.add(createTree(x, z, s, i%2===0)));
  [[-m+3,-m+1,1.2],[m-2,m-2,1],[-3,-m+.5,.8],[5,m-.5,1.1],[-m+1,4,.9],[m-1,-3,1.3],[-6,-6,1],[4,4,.9]].forEach(([x,z,s]) => complexGroup.add(createMushroom(x, z, s)));
  complexGroup.add(createFallenLog(-m+2, -4, 0.3));
  complexGroup.add(createFallenLog(m-3, 5, -0.5));
  complexGroup.add(createFallenLog(2, -m+1, 1.2));
  [[-m+1,-2,1],[m-1,3,1.2],[-5,m-1,.8],[6,-m+1,1.1],[-m,6,.9],[m,-5,1]].forEach(([x,z,s]) => complexGroup.add(createFern(x, z, s)));
  [[-m+2,2,1.3],[m-1.5,-6,1],[-4,m-1,.8],[3,-m+2,1.1],[-7,5,.9],[8,3,1.2]].forEach(([x,z,s]) => complexGroup.add(createMossyRock(x, z, s)));

  // ── Cascata com shader (decoração complexa do bioma) ──
  complexGroup.add(createWaterfall(-m-0.5, 0));

  // Névoa atmosférica
  const fog = createAtmosphericEffect('#225533', '#44aa44', 0.2, 28, 28);
  fog.position.set(0, 0.8, 0); complexGroup.add(fog);

  // Partículas: pirilampos
  const particles = createParticleSystem('forest', half);
  complexGroup.add(particles);
}

function buildDesertBiome(complexGroup, half) {
  const sandstoneTex = loadImportedTexture('sandstone', 'textures/sandstone.png', 1, 2);
  const rockMat = new THREE.MeshStandardMaterial({
    map: sandstoneTex, color: 0xaa8855, emissive: 0x2a1a08, emissiveIntensity: 0.08,
    roughness: 0.95, metalness: 0.05,
  });
  const darkRockMat = new THREE.MeshStandardMaterial({
    color: 0x6b5530, roughness: 0.95, metalness: 0.05,
  });

  function createRockFormation(x, z, scale, type) {
    const g = new THREE.Group(); g.name = 'desert-rock';
    if (type === 'mesa') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6*scale, 0.9*scale, 2.5*scale, 7), rockMat);
      base.position.y = 1.25*scale; base.castShadow = true; base.receiveShadow = true; g.add(base);
      for (let y = 0.4; y < 2.2; y += 0.4) {
        const layer = new THREE.Mesh(new THREE.CylinderGeometry(0.65*scale, 0.65*scale, 0.05*scale, 7), darkRockMat);
        layer.position.y = y*scale; g.add(layer);
      }
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7*scale, 0.6*scale, 0.2*scale, 8), rockMat);
      top.position.y = 2.6*scale; top.castShadow = true; g.add(top);
    } else if (type === 'spire') {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1*scale, 0.35*scale, 3.5*scale, 6), rockMat);
      col.position.y = 1.75*scale; col.rotation.z = (Math.random()-0.5)*0.12; col.castShadow = true; g.add(col);
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12*scale+Math.random()*0.08*scale, 0), darkRockMat);
        const a = (i/4)*Math.PI*2;
        s.position.set(Math.cos(a)*0.3*scale, 0.08*scale, Math.sin(a)*0.3*scale); s.castShadow = true; g.add(s);
      }
    } else {
      const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.3*scale, 0.45*scale, 3.2*scale, 7), rockMat);
      pL.position.set(-0.9*scale, 1.6*scale, 0); pL.rotation.z = 0.08; pL.castShadow = true; g.add(pL);
      const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.25*scale, 0.4*scale, 3.0*scale, 7), rockMat);
      pR.position.set(0.9*scale, 1.5*scale, 0); pR.rotation.z = -0.1; pR.castShadow = true; g.add(pR);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.95*scale, 0.22*scale, 8, 16, Math.PI), rockMat);
      arch.position.set(0, 3.0*scale, 0); arch.rotation.z = Math.PI; arch.castShadow = true; g.add(arch);
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1*scale+Math.random()*0.12*scale, 0), darkRockMat);
        s.position.set((Math.random()-0.5)*2*scale, 0.08*scale, (Math.random()-0.5)*1.2*scale);
        s.rotation.set(Math.random(), Math.random(), Math.random()); s.castShadow = true; g.add(s);
      }
    }
    g.position.set(x, 0, z); return g;
  }

  function createCactus(x, z, scale) {
    const g = new THREE.Group(); g.name = 'desert-cactus';
    const cMat = new THREE.MeshStandardMaterial({ color: 0x2a6622, emissive: 0x0a2208, emissiveIntensity: 0.08, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1*scale, 0.12*scale, 1.2*scale, 8), cMat);
    body.position.y = 0.6*scale; body.castShadow = true; g.add(body);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06*scale, 0.07*scale, 0.5*scale, 6), cMat);
    armL.position.set(-0.18*scale, 0.7*scale, 0); armL.rotation.z = Math.PI/3; armL.castShadow = true; g.add(armL);
    const armLUp = new THREE.Mesh(new THREE.CylinderGeometry(0.05*scale, 0.06*scale, 0.35*scale, 6), cMat);
    armLUp.position.set(-0.32*scale, 0.95*scale, 0); armLUp.castShadow = true; g.add(armLUp);
    if (scale > 0.8) {
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05*scale, 0.06*scale, 0.4*scale, 6), cMat);
      armR.position.set(0.15*scale, 0.5*scale, 0); armR.rotation.z = -Math.PI/3.5; armR.castShadow = true; g.add(armR);
    }
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xff66aa, emissive: 0xcc3388, emissiveIntensity: 0.4, roughness: 0.4 });
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.05*scale, 6, 5), flowerMat);
    flower.position.y = 1.25*scale; g.add(flower);
    g.position.set(x, 0, z); return g;
  }

  function createSkull(x, z) {
    const g = new THREE.Group(); g.name = 'desert-skull';
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, emissive: 0x332211, emissiveIntensity: 0.05, roughness: 0.8 });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), boneMat);
    skull.position.y = 0.1; skull.scale.set(1, 0.85, 1.1); g.add(skull);
    for (const ry of [0.4, -0.4]) {
      const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), boneMat);
      bone.position.y = 0.02; bone.rotation.z = Math.PI/2; bone.rotation.y = ry; g.add(bone);
    }
    g.position.set(x, 0, z); return g;
  }

  function createSandDune(x, z, w, h) {
    const g = new THREE.Group(); g.name = 'desert-dune';
    const duneMat = new THREE.MeshStandardMaterial({ color: 0xbb9955, roughness: 0.95 });
    const dune = new THREE.Mesh(new THREE.SphereGeometry(w, 10, 8, 0, Math.PI*2, 0, Math.PI*0.4), duneMat);
    dune.position.y = -0.1; dune.scale.y = h/w; dune.receiveShadow = true; g.add(dune);
    g.position.set(x, 0, z); return g;
  }

  const m = half + 1.5;
  complexGroup.add(createRockFormation(-m, -m, 0.9, 'arch'));
  complexGroup.add(createRockFormation(m, m-1, 0.85, 'mesa'));
  complexGroup.add(createRockFormation(m+0.5, -m, 1.0, 'spire'));
  complexGroup.add(createRockFormation(-m-0.5, m, 0.75, 'spire'));
  complexGroup.add(createRockFormation(-m, 0, 0.7, 'mesa'));
  complexGroup.add(createRockFormation(m, 0, 0.65, 'spire'));
  [[-m+2,-5,1],[m-2,4,.85],[-6,m-1,1.2],[5,-m+1,.9],[-m+1,6,.7],[m-1,-7,1.1],[-3,-m+2,.8],[7,m-2,.95],[0,m-.5,.6]].forEach(([cx,cz,s]) => complexGroup.add(createCactus(cx, cz, s)));
  complexGroup.add(createSkull(-m+3, 3));
  complexGroup.add(createSkull(m-4, -5));
  complexGroup.add(createSkull(2, -m+1.5));
  complexGroup.add(createSandDune(-m+1, -3, 1.5, 0.35));
  complexGroup.add(createSandDune(m-1, 5, 1.8, 0.4));
  complexGroup.add(createSandDune(0, m-0.5, 2.0, 0.3));
  complexGroup.add(createSandDune(-5, -m+0.5, 1.4, 0.35));
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08+Math.random()*0.12, 0), darkRockMat);
    s.position.set((Math.random()-0.5)*(half*2+4), 0.05+Math.random()*0.06, (Math.random()-0.5)*(half*2+4));
    s.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0); s.castShadow = true; s.name = 'desert-pebble';
    complexGroup.add(s);
  }

  // ── Fogueira (decoração complexa do bioma) ──
  complexGroup.add(createCampfire(0, -m+2));

  // Névoa de poeira
  const fog = createAtmosphericEffect('#aa7744', '#cc9955', 0.15, 28, 28);
  fog.position.set(0, 1.0, 0); complexGroup.add(fog);

  // Partículas: areia soprada
  const particles = createParticleSystem('desert', half);
  complexGroup.add(particles);
}

function buildSnowBiome(complexGroup, half) {
  const iceTex = loadImportedTexture('ice', 'textures/ice.png', 1, 1);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.9 });
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x1a4428, emissive: 0x0a2214, emissiveIntensity: 0.08, roughness: 0.85 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xeef4ff, emissive: 0x8899aa, emissiveIntensity: 0.15, roughness: 0.6, metalness: 0.1 });
  const iceMat = new THREE.MeshStandardMaterial({
    map: iceTex, color: 0xaaddff, emissive: 0x4488cc, emissiveIntensity: 0.4,
    roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.7,
  });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.9 });

  function createPine(x, z, scale) {
    const g = new THREE.Group(); g.name = 'snow-pine';
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08*scale, 0.14*scale, 2.0*scale, 6), trunkMat);
    trunk.position.y = 1.0*scale; trunk.castShadow = true; g.add(trunk);
    for (const l of [{y:1.8,r:0.9,h:1.0},{y:2.4,r:0.7,h:0.8},{y:2.9,r:0.5,h:0.65},{y:3.3,r:0.3,h:0.5}]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(l.r*scale, l.h*scale, 8), pineMat);
      cone.position.y = l.y*scale; cone.castShadow = true; g.add(cone);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(l.r*0.65*scale, l.h*0.25*scale, 8), snowMat);
      cap.position.y = (l.y+l.h*0.35)*scale; g.add(cap);
    }
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.08*scale, 0), iceMat);
    tip.position.y = 3.7*scale; tip.name = 'pine-tip'; g.add(tip);
    const baseSnow = new THREE.Mesh(new THREE.CylinderGeometry(0.8*scale, 1.0*scale, 0.12*scale, 10), snowMat);
    baseSnow.position.y = 0.06*scale; baseSnow.receiveShadow = true; g.add(baseSnow);
    g.position.set(x, 0, z); return g;
  }

  function createIceCrystal(x, z, scale) {
    const g = new THREE.Group(); g.name = 'snow-crystal';
    const crystal = new THREE.Mesh(new THREE.CylinderGeometry(0.08*scale, 0.08*scale, 0.8*scale, 6), iceMat);
    crystal.position.y = 0.4*scale; crystal.castShadow = true; g.add(crystal);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.08*scale, 0.2*scale, 6), iceMat);
    top.position.y = 0.9*scale; g.add(top);
    for (let i = 0; i < 3; i++) {
      const a = (i/3)*Math.PI*2+Math.random()*0.5;
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.04*scale, 0.04*scale, 0.4*scale, 6), iceMat);
      sc.position.set(Math.cos(a)*0.12*scale, 0.25*scale, Math.sin(a)*0.12*scale);
      sc.rotation.z = Math.cos(a)*0.5; sc.rotation.x = Math.sin(a)*0.5; g.add(sc);
    }
    const light = new THREE.PointLight(0x88ccff, 0.6, 4);
    light.position.y = 0.5*scale; light.name = 'crystal-light'; g.add(light);
    g.position.set(x, 0, z); return g;
  }

  function createSnowBank(x, z, w, h) {
    const g = new THREE.Group(); g.name = 'snow-bank';
    const bank = new THREE.Mesh(new THREE.SphereGeometry(w, 10, 8, 0, Math.PI*2, 0, Math.PI*0.35), snowMat);
    bank.position.y = -0.05; bank.scale.y = h/w; bank.receiveShadow = true; g.add(bank);
    g.position.set(x, 0, z); return g;
  }

  function createFrozenRock(x, z, scale) {
    const g = new THREE.Group(); g.name = 'snow-rock';
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3*scale, 1), rockMat);
    rock.position.y = 0.15*scale; rock.scale.y = 0.7; rock.castShadow = true; rock.receiveShadow = true; g.add(rock);
    const snowTop = new THREE.Mesh(new THREE.SphereGeometry(0.25*scale, 6, 4, 0, Math.PI*2, 0, Math.PI*0.35), snowMat);
    snowTop.position.y = 0.2*scale; g.add(snowTop);
    for (let i = 0; i < 3; i++) {
      const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.015*scale, 0.12*scale, 4), iceMat);
      const a = (i/3)*Math.PI*2;
      icicle.position.set(Math.cos(a)*0.22*scale, 0.05*scale, Math.sin(a)*0.22*scale);
      icicle.rotation.x = Math.PI; g.add(icicle);
    }
    g.position.set(x, 0, z); return g;
  }

  function createSnowman(x, z) {
    const g = new THREE.Group(); g.name = 'snow-snowman';
    const bodyMat = snowMat.clone();
    for (const [r, y] of [[0.25,0.25],[0.18,0.6],[0.12,0.85]]) {
      const part = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), bodyMat);
      part.position.y = y; part.castShadow = true; g.add(part);
    }
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    for (const ex of [-0.04, 0.04]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), eyeMat);
      eye.position.set(ex, 0.88, -0.1); g.add(eye);
    }
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xff6622, emissive: 0x882200, emissiveIntensity: 0.2, roughness: 0.5 });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 5), noseMat);
    nose.position.set(0, 0.85, -0.13); nose.rotation.x = -Math.PI/2; g.add(nose);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.9 });
    for (const [px, rz] of [[-0.28, Math.PI/3], [0.25, -Math.PI/3.5]]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), stickMat);
      arm.position.set(px, 0.6, 0); arm.rotation.z = rz; g.add(arm);
    }
    g.position.set(x, 0, z); return g;
  }

  const m = half + 1.5;
  [[-m,-m,1],[-m,m,.85],[m,-m,.95],[m,m,1.1],[-m-1,0,.8],[m+1,0,.9],[-m,-4,.7],[m,5,.75],[0,-m-1,.65],[0,m+1,.7],[-m+1,m+1,.6],[m-1,-m-1,.55]].forEach(([px,pz,s]) => complexGroup.add(createPine(px, pz, s)));
  [[-m+2,-3,1.2],[m-3,5,1],[-5,m-1,.8],[6,-m+2,1.1],[-m+1,7,.9],[m-1,-6,1.3],[-8,2,.7],[3,m-2,.85]].forEach(([cx,cz,s]) => complexGroup.add(createIceCrystal(cx, cz, s)));
  complexGroup.add(createSnowBank(-m+1, -4, 1.5, 0.3));
  complexGroup.add(createSnowBank(m-2, 3, 1.8, 0.35));
  complexGroup.add(createSnowBank(0, m-0.5, 2.2, 0.25));
  complexGroup.add(createSnowBank(-4, -m+0.5, 1.3, 0.3));
  complexGroup.add(createSnowBank(5, -3, 1.0, 0.2));
  [[-m+3,2,1.2],[m-2,-5,.9],[-3,m-1.5,1],[5,-m+2,.8],[0,0,.6]].forEach(([rx,rz,s]) => complexGroup.add(createFrozenRock(rx, rz, s)));
  complexGroup.add(createSnowman(m-3, m-3));

  // ── Aurora Boreal (decoração complexa do bioma) ──
  complexGroup.add(createAuroraBorealis());

  // Nevoeiro frio
  const fog = createAtmosphericEffect('#667788', '#aabbcc', 0.2, 28, 28);
  fog.position.set(0, 0.5, 0); complexGroup.add(fog);

  // Partículas: flocos de neve
  const particles = createParticleSystem('snow', half);
  complexGroup.add(particles);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export class LevelManager {
  constructor(scene, obstacles, lightManager, uiManager) {
    this.scene = scene;
    this.obstacles = obstacles;
    this.lightManager = lightManager;
    this.ui = uiManager;
    this.levels = [];
    this.currentLevelIndex = 0;
    this.currentLevel = null;
    this.boardGroup = new THREE.Group(); this.boardGroup.name = 'board'; this.scene.add(this.boardGroup);
    this.decorGroup = new THREE.Group(); this.decorGroup.name = 'decorations'; this.scene.add(this.decorGroup);
    this.complexGroup = new THREE.Group(); this.complexGroup.name = 'complex-objects'; this.scene.add(this.complexGroup);
    this.skyboxMesh = null;
    this.gltfLoader = new GLTFLoader();
    this.loadedModels = {};
    this.gridHelper = null;
  }

  async loadConfig(url) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      this.levels = data.levels || [];
    } catch (err) {
      console.warn('Erro ao carregar levelConfig.json, usando nível padrão:', err);
      this.levels = [{
        id: 1, name: 'DEFAULT', speed: 0.15, boardSize: 20, scoreToAdvance: 999,
        biome: 'forest', obstacles: [], powerups: [],
        theme: {
          background: '#0a1a0f', fogColor: '#1a3a1a', fogNear: 18, fogFar: 55,
          groundColor: '#1a2a10', groundEmissive: '#0a1a05', gridColor: '#44ff44', gridOpacity: 0.14,
          wallColor: '#1a2a15', wallEmissive: '#22cc44', ambientIntensity: 0.55, ambientColor: '#335522',
          directionalColor: '#aaffaa', directionalIntensity: 1.0, bloomStrength: 0.7,
        },
      }];
    }
  }

  async loadModels(onProgress) {
    const modelDefs = [
      { name: 'arcade', path: 'models/arcade_cabinet.glb' },
      { name: 'trophy', path: 'models/trophy.glb' },
    ];
    for (let i = 0; i < modelDefs.length; i++) {
      const def = modelDefs[i];
      try {
        const gltf = await this._loadGLTF(def.path);
        this.loadedModels[def.name] = gltf.scene;
      } catch (err) {
        console.warn(`Modelo GLTF "${def.path}" não encontrado, criando proceduralmente.`);
        this.loadedModels[def.name] = this._createProceduralModel(def.name);
      }
      if (onProgress) onProgress((i + 1) / modelDefs.length);
    }
  }

  _loadGLTF(path) {
    return new Promise((resolve, reject) => { this.gltfLoader.load(path, resolve, undefined, reject); });
  }

  _createProceduralModel(name) {
    const group = new THREE.Group();
    if (name === 'arcade') {
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, emissive: 0x0d0d1a, roughness: 0.7, metalness: 0.3 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.8), bodyMat); body.position.y = 1.2;
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 }));
      screen.position.set(0, 0.5, 0.41); body.add(screen);
      const btnGeo = new THREE.SphereGeometry(0.06, 8, 6);
      [0xff00ff, 0x00ff00, 0xffff00, 0xff0000].forEach((c, i) => {
        const btn = new THREE.Mesh(btnGeo, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 }));
        btn.position.set(-0.2+i*0.13, -0.3, 0.41); body.add(btn);
      });
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.6 }));
      top.position.y = 2.55; body.add(top);
      group.add(body); group.scale.setScalar(0.7);
    }
    if (name === 'trophy') {
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.6, metalness: 0.4 }));
      pedestal.position.y = 0.3;
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 0.8, roughness: 0.1, metalness: 0.7 }));
      star.position.y = 0.9; star.name = 'trophy-star';
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 12, 24), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6 }));
      ring.position.y = 0.9; ring.rotation.x = Math.PI/2; ring.name = 'trophy-ring';
      group.add(pedestal, star, ring); group.scale.setScalar(0.8);
    }
    return group;
  }

  _getGroundTexture(biome) {
    switch (biome) {
      case 'forest': return createForestGroundTexture();
      case 'desert': return createDesertGroundTexture();
      case 'snow':   return createSnowGroundTexture();
      default:       return createForestGroundTexture();
    }
  }

  _getWallTexture(biome) {
    switch (biome) {
      case 'forest': return createForestWallTexture();
      case 'desert': return createDesertWallTexture();
      case 'snow':   return createSnowWallTexture();
      default:       return createForestWallTexture();
    }
  }

  _getSkyboxColors(biome) {
    switch (biome) {
      case 'forest': return { top: '#0a2010', mid: '#0f2a15', bottom: '#050d08' };
      case 'desert': return { top: '#1a1020', mid: '#352010', bottom: '#1a0a05' };
      case 'snow':   return { top: '#0a1530', mid: '#10192a', bottom: '#050a15' };
      default:       return { top: '#0a2010', mid: '#0f2a15', bottom: '#050d08' };
    }
  }

  async loadLevel(levelIndex, skipTransition = false) {
    this.currentLevelIndex = levelIndex;
    this.currentLevel = this.levels[levelIndex] || this.levels[0];
    const level = this.currentLevel;
    const theme = level.theme;
    const biome = level.biome || 'forest';

    if (!skipTransition) {
      await this.ui.showLevelTransition(level.name, level.description);
    }

    // Cleanup
    disposeGroup(this.boardGroup);
    disposeGroup(this.decorGroup);
    disposeGroup(this.complexGroup);
    if (this.skyboxMesh) {
      this.scene.remove(this.skyboxMesh);
      this.skyboxMesh.geometry.dispose();
      this.skyboxMesh.material.dispose();
      this.skyboxMesh = null;
    }
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      this.gridHelper.material.dispose();
      this.gridHelper = null;
    }

    // ---- Skybox gradiente ----
    const skyColors = this._getSkyboxColors(biome);
    this.skyboxMesh = createSkybox(skyColors.top, skyColors.mid, skyColors.bottom);
    this.scene.add(this.skyboxMesh);
    this.scene.background = null; // uso skybox em vez de cor plana

    this.scene.fog = new THREE.Fog(hexToColor(theme.fogColor), theme.fogNear || 20, theme.fogFar || 60);

    // ---- Tabuleiro ----
    const boardWidth = BOARD_SIZE * CELL_SIZE;
    const boardHeight = 0.5;
    const groundTex = this._getGroundTexture(biome);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth, boardHeight, boardWidth),
      new THREE.MeshStandardMaterial({
        map: groundTex, color: hexToColor(theme.groundColor || '#1a2a10'),
        emissive: hexToColor(theme.groundEmissive || '#0a1a05'), emissiveIntensity: 0.08,
        roughness: 0.9, metalness: 0.05,
      })
    );
    board.position.set(0, -boardHeight*0.5, 0);
    board.receiveShadow = true; board.name = 'board-floor';
    this.boardGroup.add(board);

    // ---- Paredes ----
    const wallHeight = 1.5, wallThick = 0.5, half = boardWidth*0.5;
    const wallTex = this._getWallTexture(biome);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex, color: hexToColor(theme.wallColor || '#1a2a15'),
      emissive: hexToColor(theme.wallEmissive || '#22cc44'), emissiveIntensity: 0.12,
      roughness: 0.7, metalness: 0.15,
    });
    const wallDefs = [
      { size: [boardWidth+wallThick*2, wallHeight, wallThick], pos: [0, wallHeight*0.5, half+wallThick*0.5] },
      { size: [boardWidth+wallThick*2, wallHeight, wallThick], pos: [0, wallHeight*0.5, -half-wallThick*0.5] },
      { size: [wallThick, wallHeight, boardWidth], pos: [half+wallThick*0.5, wallHeight*0.5, 0] },
      { size: [wallThick, wallHeight, boardWidth], pos: [-half-wallThick*0.5, wallHeight*0.5, 0] },
    ];
    for (const def of wallDefs) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(...def.size), wallMat);
      wall.position.set(...def.pos); wall.castShadow = true; wall.receiveShadow = true; wall.name = 'wall';
      const edgeMat = new THREE.MeshBasicMaterial({ color: hexToColor(theme.wallEmissive || '#22cc44'), transparent: true, opacity: 0.25 });
      const edge = new THREE.Mesh(new THREE.BoxGeometry(def.size[0]+0.02, 0.04, def.size[2]+0.02), edgeMat);
      edge.position.y = wallHeight*0.5; wall.add(edge);
      this.boardGroup.add(wall);
    }

    // ---- Grid ----
    const gridColor = hexToColor(theme.gridColor || '#44ff44');
    this.gridHelper = new THREE.GridHelper(boardWidth, BOARD_SIZE, gridColor, gridColor);
    this.gridHelper.position.y = 0.02;
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = (theme.gridOpacity || 0.15) * 0.5;
    this.scene.add(this.gridHelper);

    // ---- Obstáculos ----
    this.obstacles.generate(level.obstacles || [], biome);

    // ---- Decorações GLTF ----
    this._placeDecorations();

    // ---- Bioma completo (objetos + partículas + decoração shader) ----
    this._buildBiomeEnvironment(biome, half);

    // ---- Luzes ----
    this.lightManager.applyTheme(theme);

    // ---- UI ----
    this.ui.setLevel(`LEVEL ${level.id}: ${level.name}`);

    return level;
  }

  _buildBiomeEnvironment(biome, half) {
    switch (biome) {
      case 'forest': buildForestBiome(this.complexGroup, half); break;
      case 'desert': buildDesertBiome(this.complexGroup, half); break;
      case 'snow':   buildSnowBiome(this.complexGroup, half);   break;
      default:       buildForestBiome(this.complexGroup, half);  break;
    }
  }

  _placeDecorations() {
    const half = (BOARD_SIZE * CELL_SIZE) / 2;
    const decorPositions = [
      { name: 'arcade', pos: new THREE.Vector3(-half-2, 0, -half-2), rot: Math.PI/4 },
      { name: 'arcade', pos: new THREE.Vector3(half+2, 0, -half-2), rot: -Math.PI/4 },
      { name: 'trophy', pos: new THREE.Vector3(-half-2, 0, half+2), rot: Math.PI/4 },
      { name: 'trophy', pos: new THREE.Vector3(half+2, 0, half+2), rot: -Math.PI/4 },
    ];
    for (const dec of decorPositions) {
      const model = this.loadedModels[dec.name];
      if (!model) continue;
      const clone = model.clone();
      clone.position.copy(dec.pos); clone.rotation.y = dec.rot;
      clone.name = `decor-${dec.name}`;
      clone.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
      this.decorGroup.add(clone);
    }
  }

  updateDecorations(elapsed) {
    this.decorGroup.traverse(child => {
      if (child.name === 'trophy-star') { child.rotation.y += 0.02; child.rotation.x = Math.sin(elapsed*2)*0.2; }
      if (child.name === 'trophy-ring') { child.rotation.z += 0.03; }
    });
    this._updateComplexObjects(elapsed);
  }

  _updateComplexObjects(elapsed) {
    this.complexGroup.traverse(child => {
      // Névoa atmosférica
      if (child.name === 'fog-plane' || child.name === 'fog-plane-upper') {
        if (child.material?.uniforms) child.material.uniforms.uTime.value = elapsed;
      }
      // Pinheiro tips
      if (child.name === 'pine-tip') {
        child.rotation.y += 0.03; child.rotation.x = Math.sin(elapsed*2)*0.15;
        child.scale.setScalar(1+Math.sin(elapsed*4)*0.15);
      }
      // Cogumelos bioluminescentes
      if (child.name === 'mushroom-glow' && child.material) {
        child.material.emissiveIntensity = 0.8+Math.sin(elapsed*3+child.position.x*5)*0.5;
        child.material.opacity = 0.5+Math.sin(elapsed*2.5+child.position.z*3)*0.3;
      }
      // Cristais de gelo
      if (child.name === 'crystal-light') {
        child.intensity = 0.4+Math.sin(elapsed*2.5)*0.3;
      }
      // Partículas (fireflies, sand, snow)
      if (child.name === 'fireflies' || child.name === 'sand-particles' || child.name === 'snowflakes') {
        if (child.material?.uniforms) child.material.uniforms.uTime.value = elapsed;
      }
      // Cascata
      if (child.name === 'waterfall-water' && child.material?.uniforms) {
        child.material.uniforms.uTime.value = elapsed;
      }
      if (child.name === 'waterfall-bubble') {
        child.position.y = 0.05 + Math.sin(elapsed*4+child.position.x*10)*0.03;
      }
      if (child.name === 'waterfall-light') {
        child.intensity = 1.2 + Math.sin(elapsed*2)*0.4;
      }
      // Fogueira
      if (child.name === 'campfire-flames' && child.material?.uniforms) {
        child.material.uniforms.uTime.value = elapsed;
      }
      if (child.name === 'campfire-smoke' && child.material?.uniforms) {
        child.material.uniforms.uTime.value = elapsed;
      }
      if (child.name === 'campfire-light') {
        child.intensity = 1.5 + Math.sin(elapsed*6)*0.5 + Math.sin(elapsed*9)*0.3;
      }
      // Aurora
      if (child.name === 'aurora-plane' || child.name === 'aurora-plane-2') {
        if (child.material?.uniforms) child.material.uniforms.uTime.value = elapsed;
      }
    });
  }

  shouldAdvance(score) {
    return this.currentLevel ? score >= this.currentLevel.scoreToAdvance : false;
  }

  async advanceLevel() {
    const nextIndex = this.currentLevelIndex + 1;
    if (nextIndex >= this.levels.length) return null;
    return this.loadLevel(nextIndex);
  }

  get speed() { return this.currentLevel ? this.currentLevel.speed : 0.15; }
  get powerups() { return this.currentLevel ? (this.currentLevel.powerups || []) : []; }
  get biome() { return this.currentLevel ? (this.currentLevel.biome || 'forest') : 'forest'; }
}
