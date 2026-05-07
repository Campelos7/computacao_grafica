/* ==========================================================================
   DESERTO — Oásis (NOVO)
   --------------------------------------------------------------------------
   Pequeno oásis com água, palmeiras e vegetação.
   
   GUIA DE EDIÇÃO:
   - Tamanho do lago: raio do SphereGeometry
   - Altura palmeira: parâmetros do tronco e posição das folhas
   - Cor da água: uniforms do shader
   ========================================================================== */
import * as THREE from 'three';

/** Palmeira simples para o oásis */
function createPalm(x, z, scale, mats) {
  const g = new THREE.Group(); g.name = 'oasis-palm';

  /* ── Tronco curvo (cilindros inclinados) ── */
  const segments = 4;
  let curX = 0, curY = 0, curAngle = 0.15;
  for (let i = 0; i < segments; i++) {
    const h = 0.6 * scale;
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06 * scale * (1 - i * 0.15), 0.08 * scale * (1 - i * 0.1), h, 6),
      mats.palmTrunk
    );
    curY += h * 0.5;
    seg.position.set(curX, curY, 0);
    seg.rotation.z = curAngle;
    curX += Math.sin(curAngle) * h * 0.3;
    curY += h * 0.4;
    curAngle += 0.05;
    seg.castShadow = true; g.add(seg);
  }

  /* ── Folhas (planos verdes irradiando do topo) ── */
  const topY = curY + 0.1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5 * scale, 0.15 * scale), mats.palmLeaf);
    leaf.position.set(
      curX + Math.cos(a) * 0.15 * scale, topY, Math.sin(a) * 0.15 * scale);
    leaf.rotation.y = a;
    leaf.rotation.x = -0.8;
    leaf.name = 'palm-leaf';
    g.add(leaf);
  }

  // Cocos (esferas castanhas)
  for (let i = 0; i < 2; i++) {
    const coco = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 * scale, 5, 4),
      new THREE.MeshStandardMaterial({ color: 0x6a4a20, roughness: 0.8 })
    );
    const ca = Math.random() * Math.PI * 2;
    coco.position.set(curX + Math.cos(ca) * 0.08 * scale, topY - 0.1, Math.sin(ca) * 0.08 * scale);
    g.add(coco);
  }

  g.position.set(x, 0, z); return g;
}

/** Oásis completo: lago + palmeiras + vegetação */
export function createOasis(x, z, scale, mats) {
  const g = new THREE.Group(); g.name = 'desert-oasis';

  /* ── Lago (shader de água animada) ── */
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#1a8877') },
      uColor2: { value: new THREE.Color('#44ccbb') },
    },
    vertexShader: `
      varying vec2 vUv; uniform float uTime;
      void main() {
        vUv = uv; vec3 pos = position;
        pos.y += sin(pos.x * 4.0 + uTime * 1.5) * 0.01;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor1; uniform vec3 uColor2;
      varying vec2 vUv;
      void main() {
        float n = sin(vUv.x * 10.0 + uTime * 2.0) * cos(vUv.y * 8.0 + uTime) * 0.5 + 0.5;
        vec3 color = mix(uColor1, uColor2, n);
        float d = length(vUv - vec2(0.5)) * 2.0;
        float alpha = smoothstep(1.0, 0.6, d) * 0.6;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(1.2 * scale, 24), waterMat);
  lake.rotation.x = -Math.PI / 2; lake.position.y = 0.02;
  lake.name = 'oasis-water'; g.add(lake);

  /* ── Margem de areia ── */
  const bankMat = new THREE.MeshStandardMaterial({ color: 0xccaa66, roughness: 0.95 });
  const bank = new THREE.Mesh(
    new THREE.TorusGeometry(1.25 * scale, 0.15 * scale, 6, 24), bankMat);
  bank.rotation.x = -Math.PI / 2; bank.position.y = 0.01; g.add(bank);

  /* ── Palmeiras à volta ── */
  const palmPositions = [
    [-0.8, -0.6, 0.9], [0.9, -0.3, 0.8], [-0.3, 0.9, 1.0], [0.5, 0.7, 0.75],
  ];
  for (const [px, pz, ps] of palmPositions) {
    g.add(createPalm(px * scale, pz * scale, ps * scale, mats));
  }

  /* ── Relva/vegetação baixa ── */
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x44aa33, roughness: 0.8, side: THREE.DoubleSide,
  });
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.9 * scale + Math.random() * 0.5 * scale;
    const blade = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05 * scale, 0.15 * scale), grassMat);
    blade.position.set(Math.cos(a) * r, 0.075 * scale, Math.sin(a) * r);
    blade.rotation.y = a; blade.rotation.x = -0.3; g.add(blade);
  }

  g.position.set(x, 0, z); return g;
}
