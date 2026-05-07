/* ==========================================================================
   NEVE — Animais (NOVO)
   --------------------------------------------------------------------------
   GUIA DE EDIÇÃO:
   - Pinguim: tamanho das esferas, cor do bico
   - Fogueira: partículas shader, PointLight intensidade
   ========================================================================== */
import * as THREE from 'three';

/** Pinguim low-poly */
export function createPenguin(x, z, scale) {
  const g = new THREE.Group(); g.name = 'snow-penguin';

  const blackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.75 });
  const orangeMat = new THREE.MeshStandardMaterial({
    color: 0xff8822, emissive: 0xaa4400, emissiveIntensity: 0.2, roughness: 0.5,
  });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });

  // Corpo (cápsula preta)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 8, 6), blackMat);
  body.position.y = 0.12 * scale; body.scale.set(1, 1.3, 0.9);
  body.castShadow = true; g.add(body);

  // Barriga branca
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.07 * scale, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), whiteMat);
  belly.position.set(0, 0.1 * scale, -0.04 * scale);
  belly.rotation.x = Math.PI; g.add(belly);

  // Cabeça
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06 * scale, 8, 6), blackMat);
  head.position.set(0, 0.26 * scale, 0); g.add(head);

  // Olhos
  for (const ox of [-0.025, 0.025]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.01 * scale, 4, 4), eyeMat);
    eye.position.set(ox * scale, 0.28 * scale, -0.05 * scale);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.006 * scale, 4, 4), whiteMat);
    white.position.set(ox * scale, 0.28 * scale, -0.055 * scale);
    g.add(eye, white);
  }

  // Bico
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.015 * scale, 0.04 * scale, 4), orangeMat);
  beak.position.set(0, 0.26 * scale, -0.065 * scale);
  beak.rotation.x = -Math.PI / 2; g.add(beak);

  // Asas/barbatanas
  for (const [sx, rz] of [[-0.1, 0.5], [0.1, -0.5]]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.02 * scale, 0.12 * scale, 0.04 * scale), blackMat);
    wing.position.set(sx * scale, 0.12 * scale, 0);
    wing.rotation.z = rz; g.add(wing);
  }

  // Pés
  for (const fx of [-0.03, 0.03]) {
    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.03 * scale, 0.01 * scale, 0.04 * scale), orangeMat);
    foot.position.set(fx * scale, 0.01 * scale, -0.02 * scale); g.add(foot);
  }

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z); return g;
}

/** Fogueira com partículas de fogo e luz */
export function createCampfire(x, z, scale, mats) {
  const g = new THREE.Group(); g.name = 'snow-campfire';

  // Base de pedras
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.04 * scale, 0), mats.rock);
    stone.position.set(Math.cos(a) * 0.1 * scale, 0.02 * scale, Math.sin(a) * 0.1 * scale);
    stone.scale.y = 0.6; g.add(stone);
  }

  // Troncos em X
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.9 });
  for (const rot of [0.4, -0.4]) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015 * scale, 0.02 * scale, 0.2 * scale, 5), logMat);
    log.position.y = 0.04 * scale;
    log.rotation.z = Math.PI / 2; log.rotation.y = rot; g.add(log);
  }

  // Luz do fogo
  const fireLight = new THREE.PointLight(0xff6622, 1.2, 5);
  fireLight.position.y = 0.15 * scale; fireLight.name = 'campfire-light'; g.add(fireLight);

  // Partículas de fogo (shader simples)
  const count = 12;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 0.08 * scale;
    positions[i * 3 + 1] = 0.05 * scale + Math.random() * 0.2 * scale;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.08 * scale;
    phases[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const fireMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aPhase; uniform float uTime; varying float vAlpha; varying float vHeight;
      void main() {
        vec3 pos = position;
        float life = mod(uTime * 1.5 + aPhase, 2.0);
        pos.y += life * 0.3;
        pos.x += sin(uTime * 3.0 + aPhase) * 0.03;
        vHeight = life / 2.0; vAlpha = 1.0 - vHeight;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = (3.0 - life) * (120.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying float vAlpha; varying float vHeight;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        vec3 color = mix(vec3(1.0, 0.6, 0.1), vec3(1.0, 0.2, 0.0), vHeight);
        float alpha = (1.0 - d * 2.0) * vAlpha * 0.8;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const fire = new THREE.Points(geo, fireMat);
  fire.name = 'campfire-particles'; g.add(fire);

  g.position.set(x, 0, z); return g;
}
