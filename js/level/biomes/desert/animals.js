/* ==========================================================================
   DESERTO — Animais e Tumbleweed (NOVO)
   --------------------------------------------------------------------------
   GUIA DE EDIÇÃO:
   - Escorpião: tamanho dos segmentos do corpo/cauda
   - Tumbleweed: são partículas shader que rolam com o vento
   ========================================================================== */
import * as THREE from 'three';

/** Escorpião low-poly */
export function createScorpion(x, z, scale) {
  const g = new THREE.Group(); g.name = 'desert-scorpion';
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x4a3020, emissive: 0x1a1008, emissiveIntensity: 0.1, roughness: 0.8,
  });
  const clawMat = new THREE.MeshStandardMaterial({
    color: 0x5a4030, emissive: 0x2a1810, emissiveIntensity: 0.1, roughness: 0.75,
  });

  // Corpo (elipse achatada)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 6, 5), bodyMat);
  body.position.y = 0.04 * scale; body.scale.set(1, 0.5, 1.4); g.add(body);

  // Cauda (segmentos curvos para cima)
  let tailY = 0.06 * scale, tailZ = 0.1 * scale;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 * scale * (1 - i * 0.1), 4, 4), bodyMat);
    tailZ += 0.04 * scale;
    tailY += 0.03 * scale;
    seg.position.set(0, tailY, tailZ); g.add(seg);
  }
  // Ferrão
  const sting = new THREE.Mesh(
    new THREE.ConeGeometry(0.012 * scale, 0.04 * scale, 4),
    new THREE.MeshStandardMaterial({ color: 0x220808, roughness: 0.5 })
  );
  sting.position.set(0, tailY + 0.03 * scale, tailZ);
  sting.rotation.x = 0.3; g.add(sting);

  // Pinças (2 esferas achatadas à frente)
  for (const side of [-1, 1]) {
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.03 * scale, 5, 4), clawMat);
    claw.position.set(side * 0.08 * scale, 0.03 * scale, -0.12 * scale);
    claw.scale.set(1.2, 0.6, 0.8); g.add(claw);
    // Braço
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008 * scale, 0.01 * scale, 0.08 * scale, 4), bodyMat);
    arm.position.set(side * 0.06 * scale, 0.04 * scale, -0.08 * scale);
    arm.rotation.z = side * 0.4; g.add(arm);
  }

  // Patas (3 de cada lado)
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004 * scale, 0.005 * scale, 0.06 * scale, 3), bodyMat);
      leg.position.set(
        side * 0.07 * scale, 0.02 * scale, (-0.03 + i * 0.04) * scale);
      leg.rotation.z = side * 0.8;
      g.add(leg);
    }
  }

  g.rotation.y = Math.random() * Math.PI * 2;
  g.position.set(x, 0, z); return g;
}

/** Tumbleweed — partículas shader que rolam pelo deserto */
export function createTumbleweeds(x, z, count, half) {
  const g = new THREE.Group(); g.name = 'desert-tumbleweeds';

  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * half * 2.5;
    positions[i * 3 + 1] = 0.08 + Math.random() * 0.1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * half * 2.5;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = 0.8 + Math.random() * 1.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#8a7a50') },
      uBounds: { value: half * 1.5 },
    },
    vertexShader: `
      attribute float aPhase; attribute float aSpeed;
      uniform float uTime; uniform float uBounds;
      varying float vAlpha;
      void main() {
        vec3 pos = position;
        pos.x += uTime * aSpeed * 0.5;
        pos.x = mod(pos.x + uBounds, uBounds * 2.0) - uBounds;
        pos.y += abs(sin(uTime * 2.0 + aPhase)) * 0.15;
        pos.z += sin(uTime * 0.5 + aPhase) * 0.3;
        vAlpha = 0.5 + sin(aPhase) * 0.2;
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = (4.0 + sin(aPhase) * 1.5) * (150.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor; varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        // Wireframe / tumbleweed look
        float ring = abs(sin(d * 20.0)) * 0.4 + 0.6;
        float alpha = (1.0 - d * 2.0) * vAlpha * ring;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'tumbleweeds';
  g.add(points);

  g.position.set(x, 0, z); return g;
}
