/* ==========================================================================
   FLORESTA — Riacho (NOVO)
   --------------------------------------------------------------------------
   Riacho de água com shader animado que atravessa o cenário.
   
   GUIA DE EDIÇÃO:
   - Largura do riacho: width
   - Comprimento: length
   - Cor da água: uniforms uColor1/uColor2
   - Velocidade: multiplicador do uTime no shader
   ========================================================================== */
import * as THREE from 'three';

/**
 * Cria um riacho com água animada via shader.
 * @param {number} x — posição X central
 * @param {number} z — posição Z central
 * @param {number} length — comprimento do riacho
 * @param {number} width — largura do riacho
 * @param {number} rotation — rotação Y
 */
export function createCreek(x, z, length, width, rotation) {
  const g = new THREE.Group();
  g.name = 'forest-creek';

  /* ── Shader de água ── */
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#1a6655') },
      uColor2: { value: new THREE.Color('#44bbaa') },
      uOpacity: { value: 0.65 },
    },
    vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.y += sin(pos.x * 3.0 + uTime * 2.0) * 0.015;
        pos.y += cos(pos.z * 2.0 + uTime * 1.5) * 0.01;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float flow = sin(vUv.x * 12.0 + uTime * 3.0) * 0.5 + 0.5;
        flow += sin(vUv.x * 6.0 - uTime * 2.0 + vUv.y * 4.0) * 0.3;
        float sparkle = pow(sin(vUv.x * 30.0 + uTime * 5.0) * sin(vUv.y * 20.0 + uTime * 3.0), 8.0) * 0.4;
        vec3 color = mix(uColor1, uColor2, flow);
        color += vec3(sparkle);
        float edgeFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
        gl_FragColor = vec4(color, uOpacity * edgeFade);
      }
    `,
  });

  /* ── Superfície da água ── */
  const waterPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(length, width, 32, 8),
    waterMat
  );
  waterPlane.rotation.x = -Math.PI / 2;
  waterPlane.position.y = 0.02;
  waterPlane.name = 'creek-water';
  g.add(waterPlane);

  /* ── Margens (tiras de terra/pedra) ── */
  const bankMat = new THREE.MeshStandardMaterial({
    color: 0x3a2a18, roughness: 0.95, metalness: 0.0,
  });
  for (const side of [-1, 1]) {
    const bank = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.06, width * 0.15),
      bankMat
    );
    bank.position.set(0, 0.01, side * (width * 0.55));
    bank.receiveShadow = true;
    g.add(bank);
  }

  /* ── Pedras nas margens ── */
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.9 });
  for (let i = 0; i < 8; i++) {
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.04 + Math.random() * 0.06, 0),
      stoneMat
    );
    const side = Math.random() > 0.5 ? 1 : -1;
    stone.position.set(
      (Math.random() - 0.5) * length * 0.9,
      0.03,
      side * (width * 0.45 + Math.random() * 0.1)
    );
    stone.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(stone);
  }

  g.rotation.y = rotation;
  g.position.set(x, 0, z);
  return g;
}
