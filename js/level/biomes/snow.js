import * as THREE from 'three';

/**
 * BIOMA NEVE
 * --------------------------------------------------------------------------
 * GUIA RÁPIDO PARA A DEFESA:
 * - Pinheiro: `createPine(...)`
 * - Cristal de gelo: `createIceCrystal(...)`
 * - Banco de neve: `createSnowBank(...)`
 * - Rocha congelada: `createFrozenRock(...)`
 * - Boneco de neve: `createSnowman(...)`
 * - Distribuição no mapa: arrays no fim da função
 *
 * Dica:
 * - Para objetos mais "gelados", aumenta emissive nos materiais de gelo.
 * - Para cenário mais denso, adiciona mais entradas nos arrays de spawn.
 *
 * @param {THREE.Group} complexGroup
 * @param {number} half
 * @param {{loadImportedTexture: Function, createAtmosphericEffect: Function, createParticleSystem: Function, createAuroraBorealis: Function}} helpers
 */
export function buildSnowBiome(complexGroup, half, helpers) {
  const { loadImportedTexture, createAtmosphericEffect, createParticleSystem, createAuroraBorealis } = helpers;

  // Materiais base do bioma nevado.
  // Ajusta aqui para alterar neve, gelo, troncos e rocha.
  const iceTex = loadImportedTexture('ice', 'textures/ice.png', 1, 1);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.9 });
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x1a4428, emissive: 0x0a2214, emissiveIntensity: 0.08, roughness: 0.85 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xeef4ff, emissive: 0x8899aa, emissiveIntensity: 0.15, roughness: 0.6, metalness: 0.1 });
  const iceMat = new THREE.MeshStandardMaterial({
    map: iceTex, color: 0xaaddff, emissive: 0x4488cc, emissiveIntensity: 0.4,
    roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.7,
  });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.9 });

  // PINHEIRO.
  // Altera os níveis dos cones para mudar o formato da árvore.
  function createPine(x, z, scale) {
    const g = new THREE.Group(); g.name = 'snow-pine';
    // GUIA DE EDIÇÃO (PINHEIRO):
    // - Espessura do tronco: 1.º/2.º parâmetros do CylinderGeometry (0.08, 0.14)
    // - Altura do tronco: 3.º parâmetro do CylinderGeometry (2.0 * scale)
    // - Altura/largura de cada "camada" da copa: array `l` (y, r, h)
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.14 * scale, 2.0 * scale, 6), trunkMat);
    trunk.position.y = 1.0 * scale; trunk.castShadow = true; g.add(trunk);
    for (const l of [{ y: 1.8, r: 0.9, h: 1.0 }, { y: 2.4, r: 0.7, h: 0.8 }, { y: 2.9, r: 0.5, h: 0.65 }, { y: 3.3, r: 0.3, h: 0.5 }]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(l.r * scale, l.h * scale, 8), pineMat);
      cone.position.y = l.y * scale; cone.castShadow = true; g.add(cone);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(l.r * 0.65 * scale, l.h * 0.25 * scale, 8), snowMat);
      cap.position.y = (l.y + l.h * 0.35) * scale; g.add(cap);
    }
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.08 * scale, 0), iceMat);
    tip.position.y = 3.7 * scale; tip.name = 'pine-tip'; g.add(tip);
    const baseSnow = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * scale, 1.0 * scale, 0.12 * scale, 10), snowMat);
    baseSnow.position.y = 0.06 * scale; baseSnow.receiveShadow = true; g.add(baseSnow);
    g.position.set(x, 0, z); return g;
  }

  // CRISTAL DE GELO.
  // Se quiseres mais brilho, aumenta intensidade da PointLight.
  function createIceCrystal(x, z, scale) {
    const g = new THREE.Group(); g.name = 'snow-crystal';
    // GUIA DE EDIÇÃO (CRISTAL):
    // - Espessura do cristal: 1.º/2.º parâmetros do cilindro (0.08 * scale)
    // - Altura do cristal: 3.º parâmetro do cilindro (0.8 * scale)
    // - Intensidade da luz: PointLight(..., intensidade, alcance) -> (0.6, 4)
    const crystal = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.8 * scale, 6), iceMat);
    crystal.position.y = 0.4 * scale; crystal.castShadow = true; g.add(crystal);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.08 * scale, 0.2 * scale, 6), iceMat);
    top.position.y = 0.9 * scale; g.add(top);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.4 * scale, 6), iceMat);
      sc.position.set(Math.cos(a) * 0.12 * scale, 0.25 * scale, Math.sin(a) * 0.12 * scale);
      sc.rotation.z = Math.cos(a) * 0.5; sc.rotation.x = Math.sin(a) * 0.5; g.add(sc);
    }
    const light = new THREE.PointLight(0x88ccff, 0.6, 4);
    light.position.y = 0.5 * scale; light.name = 'crystal-light'; g.add(light);
    g.position.set(x, 0, z); return g;
  }

  // BANCO DE NEVE (montes baixos).
  function createSnowBank(x, z, w, h) {
    const g = new THREE.Group(); g.name = 'snow-bank';
    // GUIA DE EDIÇÃO (BANCO DE NEVE):
    // - Largura/tamanho base: variável `w`
    // - Altura visual: variável `h` (via bank.scale.y = h / w)
    const bank = new THREE.Mesh(new THREE.SphereGeometry(w, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.35), snowMat);
    bank.position.y = -0.05; bank.scale.y = h / w; bank.receiveShadow = true; g.add(bank);
    g.position.set(x, 0, z); return g;
  }

  // ROCHA CONGELADA COM ICÍCULOS.
  function createFrozenRock(x, z, scale) {
    const g = new THREE.Group(); g.name = 'snow-rock';
    // GUIA DE EDIÇÃO (ROCHA CONGELADA):
    // - Tamanho geral: 1.º parâmetro da DodecahedronGeometry (0.3 * scale)
    // - Altura da rocha: rock.scale.y (0.7)
    // - Comprimento dos icículos: 2.º parâmetro da ConeGeometry (0.12 * scale)
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 * scale, 1), rockMat);
    rock.position.y = 0.15 * scale; rock.scale.y = 0.7; rock.castShadow = true; rock.receiveShadow = true; g.add(rock);
    const snowTop = new THREE.Mesh(new THREE.SphereGeometry(0.25 * scale, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.35), snowMat);
    snowTop.position.y = 0.2 * scale; g.add(snowTop);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.015 * scale, 0.12 * scale, 4), iceMat);
      icicle.position.set(Math.cos(a) * 0.22 * scale, 0.05 * scale, Math.sin(a) * 0.22 * scale);
      icicle.rotation.x = Math.PI; g.add(icicle);
    }
    g.position.set(x, 0, z); return g;
  }

  // BONECO DE NEVE.
  // Aqui podes trocar nariz, olhos e braços rapidamente.
  function createSnowman(x, z) {
    const g = new THREE.Group(); g.name = 'snow-snowman';
    // GUIA DE EDIÇÃO (BONECO DE NEVE):
    // - Tamanho de cada esfera do corpo: array [r, y]
    // - Comprimento do nariz: 2.º parâmetro da ConeGeometry (0.12)
    // - Comprimento dos braços: 3.º parâmetro do CylinderGeometry (0.35)
    const bodyMat = snowMat.clone();
    for (const [r, y] of [[0.25, 0.25], [0.18, 0.6], [0.12, 0.85]]) {
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
    nose.position.set(0, 0.85, -0.13); nose.rotation.x = -Math.PI / 2; g.add(nose);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.9 });
    for (const [px, rz] of [[-0.28, Math.PI / 3], [0.25, -Math.PI / 3.5]]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), stickMat);
      arm.position.set(px, 0.6, 0); arm.rotation.z = rz; g.add(arm);
    }
    g.position.set(x, 0, z); return g;
  }

  // POSICIONAMENTO DOS OBJETOS NO BIOMA DE NEVE.
  // [x, z, s] => posição X, posição Z e escala.
  const m = half + 1.5;
  [[-m, -m, 1], [-m, m, 0.85], [m, -m, 0.95], [m, m, 1.1], [-m - 1, 0, 0.8], [m + 1, 0, 0.9], [-m, -4, 0.7], [m, 5, 0.75], [0, -m - 1, 0.65], [0, m + 1, 0.7], [-m + 1, m + 1, 0.6], [m - 1, -m - 1, 0.55]].forEach(([px, pz, s]) => complexGroup.add(createPine(px, pz, s)));
  [[-m + 2, -3, 1.2], [m - 3, 5, 1], [-5, m - 1, 0.8], [6, -m + 2, 1.1], [-m + 1, 7, 0.9], [m - 1, -6, 1.3], [-8, 2, 0.7], [3, m - 2, 0.85]].forEach(([cx, cz, s]) => complexGroup.add(createIceCrystal(cx, cz, s)));
  complexGroup.add(createSnowBank(-m + 1, -4, 1.5, 0.3));
  complexGroup.add(createSnowBank(m - 2, 3, 1.8, 0.35));
  complexGroup.add(createSnowBank(0, m - 0.5, 2.2, 0.25));
  complexGroup.add(createSnowBank(-4, -m + 0.5, 1.3, 0.3));
  complexGroup.add(createSnowBank(5, -3, 1.0, 0.2));
  [[-m + 3, 2, 1.2], [m - 2, -5, 0.9], [-3, m - 1.5, 1], [5, -m + 2, 0.8], [0, 0, 0.6]].forEach(([rx, rz, s]) => complexGroup.add(createFrozenRock(rx, rz, s)));
  complexGroup.add(createSnowman(m - 3, m - 3));

  // Efeitos atmosféricos da neve.
  complexGroup.add(createAuroraBorealis());
  const fog = createAtmosphericEffect('#667788', '#aabbcc', 0.2, 28, 28);
  fog.position.set(0, 0.5, 0); complexGroup.add(fog);
  const particles = createParticleSystem('snow', half);
  complexGroup.add(particles);
}
