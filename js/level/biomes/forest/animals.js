/* ==========================================================================
   FLORESTA — Animais (NOVO)
   --------------------------------------------------------------------------
   Animais simples low-poly que dão vida ao cenário.
   
   GUIA DE EDIÇÃO:
   - Coelho: tamanho das esferas do corpo e orelhas
   - Borboleta: tamanho das asas (PlaneGeometry), velocidade no shader
   ========================================================================== */
import * as THREE from 'three';

/**
 * Cria um coelho low-poly sentado.
 * @param {number} x — posição X
 * @param {number} z — posição Z
 * @param {number} scale — escala
 */
export function createRabbit(x, z, scale) {
  const g = new THREE.Group();
  g.name = 'forest-rabbit';

  const furMat = new THREE.MeshStandardMaterial({
    color: 0x8a7a6a, emissive: 0x2a2018, emissiveIntensity: 0.05, roughness: 0.9,
  });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xeeddcc, roughness: 0.85 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 });
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0xff8888, emissive: 0xaa4444, emissiveIntensity: 0.2, roughness: 0.4,
  });

  // Corpo
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 8, 6), furMat);
  body.position.y = 0.12 * scale; body.scale.set(1, 0.85, 1.2); g.add(body);

  // Cabeça
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 8, 6), furMat);
  head.position.set(0, 0.22 * scale, -0.1 * scale); g.add(head);

  // Orelhas
  for (const ox of [-0.03, 0.03]) {
    const ear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015 * scale, 0.02 * scale, 0.1 * scale, 4), furMat);
    ear.position.set(ox * scale, 0.32 * scale, -0.1 * scale);
    ear.rotation.z = ox > 0 ? -0.15 : 0.15;
    g.add(ear);
    // Interior rosa
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008 * scale, 0.012 * scale, 0.08 * scale, 4), noseMat);
    inner.position.set(ox * scale, 0.32 * scale, -0.098 * scale);
    inner.rotation.z = ox > 0 ? -0.15 : 0.15;
    g.add(inner);
  }

  // Olhos
  for (const ox of [-0.03, 0.03]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012 * scale, 4, 4), eyeMat);
    eye.position.set(ox * scale, 0.24 * scale, -0.16 * scale);
    g.add(eye);
  }

  // Nariz
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.008 * scale, 4, 4), noseMat);
  nose.position.set(0, 0.21 * scale, -0.17 * scale); g.add(nose);

  // Cauda
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 5, 4), whiteMat);
  tail.position.set(0, 0.14 * scale, 0.12 * scale); tail.name = 'rabbit-tail'; g.add(tail);

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z);
  return g;
}

/**
 * Cria um grupo de borboletas animadas via shader.
 * @param {number} x — posição X central
 * @param {number} z — posição Z central
 * @param {number} count — nº de borboletas
 * @param {number} spread — raio de dispersão
 */
export function createButterflies(x, z, count, spread) {
  const g = new THREE.Group();
  g.name = 'forest-butterflies';

  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  const palette = [
    [1.0, 0.5, 0.2], [0.8, 0.3, 0.9], [0.2, 0.7, 1.0],
    [1.0, 0.9, 0.2], [0.3, 0.9, 0.5],
  ];

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = 0.5 + Math.random() * 2.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    phases[i] = Math.random() * Math.PI * 2;
    sizes[i] = 3 + Math.random() * 4;
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aPhase; attribute float aSize; attribute vec3 aColor;
      uniform float uTime; varying float vAlpha; varying vec3 vColor;
      void main() {
        vColor = aColor;
        vec3 pos = position;
        pos.x += sin(uTime * 0.8 + aPhase) * 1.5;
        pos.y += sin(uTime * 0.6 + aPhase * 2.0) * 0.5;
        pos.z += cos(uTime * 0.7 + aPhase * 1.5) * 1.2;
        vAlpha = 0.6 + sin(uTime * 4.0 + aPhase) * 0.3;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = aSize * (180.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      varying float vAlpha; varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float wing = abs(gl_PointCoord.x - 0.5) * 2.0;
        float body = 1.0 - smoothstep(0.0, 0.1, abs(gl_PointCoord.x - 0.5));
        vec3 color = mix(vColor, vec3(0.1), body);
        float alpha = (1.0 - d * 2.0) * vAlpha;
        gl_FragColor = vec4(color, alpha * 0.8);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'butterflies';
  g.add(points);

  g.position.set(x, 0, z);
  return g;
}
