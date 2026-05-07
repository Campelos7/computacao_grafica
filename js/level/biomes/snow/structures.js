/* ==========================================================================
   NEVE — Lago Gelado e Igloo (NOVO)
   --------------------------------------------------------------------------
   GUIA DE EDIÇÃO:
   - Lago: raio CircleGeometry, shader de rachaduras
   - Igloo: raio SphereGeometry, tamanho da porta
   ========================================================================== */
import * as THREE from 'three';

/** Lago gelado com rachaduras no gelo (shader) */
export function createFrozenLake(x, z, radius, mats) {
  const g = new THREE.Group(); g.name = 'snow-frozen-lake';

  /* ── Superfície de gelo (shader com rachaduras) ── */
  const iceSurfaceMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#99ccee') },
      uCrackColor: { value: new THREE.Color('#ffffff') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uCrackColor; uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv * 5.0;
        float crack = 0.0;
        crack += smoothstep(0.02, 0.0, abs(sin(uv.x * 3.1 + uv.y * 1.7) * cos(uv.y * 2.3)));
        crack += smoothstep(0.02, 0.0, abs(sin(uv.x * 1.9 - uv.y * 2.8) * cos(uv.x * 3.5)));
        crack = min(crack, 1.0) * 0.5;
        vec3 color = mix(uColor, uCrackColor, crack);
        float shine = pow(sin(uTime * 0.5 + vUv.x * 10.0) * 0.5 + 0.5, 4.0) * 0.15;
        color += vec3(shine);
        float d = length(vUv - vec2(0.5)) * 2.0;
        float alpha = smoothstep(1.0, 0.7, d) * 0.8;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const surface = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), iceSurfaceMat);
  surface.rotation.x = -Math.PI / 2; surface.position.y = 0.03;
  surface.name = 'frozen-lake-surface'; g.add(surface);

  /* ── Borda de neve à volta ── */
  const border = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.02, radius * 0.08, 6, 24), mats.snow);
  border.rotation.x = -Math.PI / 2; border.position.y = 0.01; g.add(border);

  g.position.set(x, 0, z); return g;
}

/** Igloo */
export function createIgloo(x, z, scale, mats) {
  const g = new THREE.Group(); g.name = 'snow-igloo';

  /* ── Domo principal (meia esfera) ── */
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.5 * scale, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.snow);
  dome.position.y = 0; dome.castShadow = true; g.add(dome);

  /* ── Linhas de blocos (anéis horizontais) ── */
  const blockMat = new THREE.MeshStandardMaterial({
    color: 0xd0dde8, roughness: 0.7, metalness: 0.05,
  });
  for (let i = 1; i <= 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.48 * scale * (1 - i * 0.15), 0.008 * scale, 4, 24), blockMat);
    ring.position.y = i * 0.12 * scale;
    ring.rotation.x = -Math.PI / 2; g.add(ring);
  }

  /* ── Entrada (cilindro horizontal + arco) ── */
  const entrance = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15 * scale, 0.15 * scale, 0.3 * scale, 8, 1, false, 0, Math.PI),
    mats.snow);
  entrance.position.set(0, 0.1 * scale, -0.45 * scale);
  entrance.rotation.z = Math.PI / 2; entrance.rotation.y = Math.PI / 2;
  entrance.castShadow = true; g.add(entrance);

  /* ── Escuridão da porta (plano preto) ── */
  const doorMat = new THREE.MeshBasicMaterial({ color: 0x111122 });
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.1 * scale, 8, 0, Math.PI), doorMat);
  door.position.set(0, 0.1 * scale, -0.55 * scale);
  door.rotation.y = Math.PI; g.add(door);

  g.position.set(x, 0, z); return g;
}
