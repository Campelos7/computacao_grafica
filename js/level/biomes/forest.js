import * as THREE from 'three';

/**
 * BIOMA FLORESTA
 * --------------------------------------------------------------------------
 * GUIA RÁPIDO PARA A DEFESA (onde mexer):
 * - Árvore: função `createTree(...)`
 * - Cogumelo: função `createMushroom(...)`
 * - Tronco caído: função `createFallenLog(...)`
 * - Feto: função `createFern(...)`
 * - Rocha com musgo: função `createMossyRock(...)`
 * - Quantidade/posição dos objetos: blocos no fim da função (arrays `forEach`)
 *
 * Dica:
 * - Para mudar TAMANHO usa `scale`
 * - Para mudar COR mexe nos materiais (`new THREE.MeshStandardMaterial(...)`)
 * - Para mudar FORMA mexe nas geometrias (`CylinderGeometry`, `SphereGeometry`, etc.)
 * - Para mudar QUANTIDADE duplica/remove entradas dos arrays de spawn
 *
 * @param {THREE.Group} complexGroup
 * @param {number} half
 * @param {{loadImportedTexture: Function, createAtmosphericEffect: Function, createParticleSystem: Function}} helpers
 */
export function buildForestBiome(complexGroup, half, helpers) {
  const { loadImportedTexture, createAtmosphericEffect, createParticleSystem } = helpers;

  // Materiais base da floresta (casca, folhas, musgo e frutos).
  // Altera aqui para mudar o "look" geral do bioma.
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

  // ARVORE PRINCIPAL DA FLORESTA.

  function createTree(x, z, scale, variant) {
    const g = new THREE.Group(); g.name = 'forest-tree';
    // GUIA DE EDIÇÃO (ÁRVORE):
    // - Altura do tronco: 3.º parâmetro do CylinderGeometry (2.8 * scale)
    // - Espessura topo/base do tronco: 1.º e 2.º parâmetros (0.12 * scale, 0.22 * scale)
    // - Altura geral da árvore: trunk.position.y (1.4 * scale) e posições Y das folhas
    // - Tamanho da copa: raio "lr" em SphereGeometry(lr * scale, ...)
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, 2.8 * scale, 8), trunkMat);
    trunk.position.y = 1.4 * scale; trunk.rotation.z = (Math.random() - 0.5) * 0.15;
    trunk.castShadow = true; trunk.receiveShadow = true; g.add(trunk);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * scale, 0.06 * scale, 0.5 * scale, 5), trunkMat);
      root.position.set(Math.cos(a) * 0.18 * scale, 0.12 * scale, Math.sin(a) * 0.18 * scale);
      root.rotation.z = Math.cos(a) * 0.6; root.rotation.x = Math.sin(a) * 0.6; root.castShadow = true; g.add(root);
    }
    const mat = variant ? darkLeafMat : leafMat;
    for (const [lx, ly, lz, lr] of [[0, 3.0, 0, 0.85], [-0.35, 3.3, 0.25, 0.55], [0.4, 3.15, -0.2, 0.6], [-0.15, 3.5, -0.35, 0.45], [0.25, 3.45, 0.35, 0.5], [0, 3.7, 0, 0.35]]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(lr * scale, 10, 8), mat);
      leaf.position.set(lx * scale, ly * scale, lz * scale); leaf.castShadow = true; g.add(leaf);
    }
    for (let i = 0; i < 3; i++) {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 6, 5), fruitMat);
      const a = Math.random() * Math.PI * 2;
      fruit.position.set(Math.cos(a) * 0.35 * scale, (2.6 + Math.random()) * scale, Math.sin(a) * 0.35 * scale); g.add(fruit);
    }
    g.position.set(x, 0, z); return g;
  }

  // COGUMELO DECORATIVO.
  // Ajusta o chapéu, brilho e tamanho via `scale` e materiais.
  function createMushroom(x, z, scale) {
    const g = new THREE.Group(); g.name = 'forest-mushroom';
    // GUIA DE EDIÇÃO (COGUMELO):
    // - Espessura do pé: 1.º/2.º parâmetros do CylinderGeometry (0.04, 0.06)
    // - Altura do pé: 3.º parâmetro do CylinderGeometry (0.3)
    // - Tamanho do chapéu: 1.º parâmetro da SphereGeometry (0.12 * scale)
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xccbb88, roughness: 0.8 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xcc3322, emissive: 0x661100, emissiveIntensity: 0.25, roughness: 0.6 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x44ff88, emissive: 0x22ff66, emissiveIntensity: 1.2, roughness: 0.3, transparent: true, opacity: 0.7 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.06 * scale, 0.3 * scale, 6), stemMat);
    stem.position.set(0, 0.15 * scale, 0);
    g.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    cap.position.y = 0.3 * scale; cap.castShadow = true; g.add(cap);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.015 * scale, 4, 4), glowMat);
      dot.position.set(Math.cos(a) * 0.08 * scale, 0.32 * scale, Math.sin(a) * 0.08 * scale); dot.name = 'mushroom-glow'; g.add(dot);
    }
    g.position.set(x, 0, z); return g;
  }

  // TRONCO CAÍDO.
  // Útil para variar o cenário com elementos horizontais.
  function createFallenLog(x, z, rot) {
    const g = new THREE.Group(); g.name = 'forest-log';
    // GUIA DE EDIÇÃO (TRONCO CAÍDO):
    // - Espessura do tronco: 1.º/2.º parâmetros do CylinderGeometry (0.12, 0.15)
    // - Comprimento do tronco: 3.º parâmetro (1.8)
    const logObj = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.8, 7), trunkMat);
    logObj.rotation.z = Math.PI / 2; logObj.position.y = 0.12; logObj.castShadow = true; logObj.receiveShadow = true; g.add(logObj);
    const moss = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.2), mossMat);
    moss.position.y = 0.24; g.add(moss);
    g.rotation.y = rot; g.position.set(x, 0, z); return g;
  }

  // FETO/PLANTA BAIXA.
  // Podes aumentar densidade aumentando o número de folhas (loop).
  function createFern(x, z, scale) {
    const g = new THREE.Group(); g.name = 'forest-fern';
    // GUIA DE EDIÇÃO (FETO):
    // - Largura da folha: 1.º parâmetro do PlaneGeometry (0.15 * scale)
    // - Comprimento da folha: 2.º parâmetro (0.5 * scale)
    // - Quantidade de folhas: limite do loop (for i < 6)
    const fernMat = new THREE.MeshStandardMaterial({ color: 0x33aa44, emissive: 0x115522, emissiveIntensity: 0.1, roughness: 0.85, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.15 * scale, 0.5 * scale), fernMat);
      frond.position.set(Math.cos(a) * 0.08 * scale, 0.2 * scale, Math.sin(a) * 0.08 * scale);
      frond.rotation.y = a; frond.rotation.x = -0.6; g.add(frond);
    }
    g.position.set(x, 0, z); return g;
  }

  // ROCHA COM TOPO DE MUSGO.
  // Alterar geometria aqui muda rapidamente o estilo das pedras.
  function createMossyRock(x, z, scale) {
    const g = new THREE.Group(); g.name = 'forest-rock';
    // GUIA DE EDIÇÃO (ROCHA):
    // - Tamanho da rocha: 1.º parâmetro do DodecahedronGeometry (0.2 * scale)
    // - "Altura" da rocha: rock.scale.y (0.6)
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 0.95, metalness: 0.05 });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 * scale, 1), rockMat);
    rock.position.y = 0.12 * scale; rock.scale.y = 0.6; rock.castShadow = true; rock.receiveShadow = true; g.add(rock);
    const mTop = new THREE.Mesh(new THREE.SphereGeometry(0.15 * scale, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.4), mossMat);
    mTop.position.y = 0.16 * scale; g.add(mTop);
    g.position.set(x, 0, z); return g;
  }

  // POSICIONAMENTO DOS OBJETOS NO MAPA.
  // Cada entrada [x, z, s] = posição X, posição Z, escala.
  const m = half + 1.5;
  [[-m, -m, 1], [-m, m - 2, 0.9], [m, -m + 1, 1.1], [m, m, 0.85], [-m - 1, 0, 0.95], [m + 1, 0, 1.05], [-m + 0.5, m + 2, 0.7], [m - 0.5, -m - 2, 0.75]].forEach(([x, z, s], i) => complexGroup.add(createTree(x, z, s, i % 2 === 0)));
  [[-m + 3, -m + 1, 1.2], [m - 2, m - 2, 1], [-3, -m + 0.5, 0.8], [5, m - 0.5, 1.1], [-m + 1, 4, 0.9]].forEach(([x, z, s]) => complexGroup.add(createMushroom(x, z, s)));
  complexGroup.add(createFallenLog(-m + 2, -4, 0.3));
  complexGroup.add(createFallenLog(m - 3, 5, -0.5));
  [[-m + 1, -2, 1], [m - 1, 3, 1.2], [-5, m - 1, 0.8], [6, -m + 1, 1.1]].forEach(([x, z, s]) => complexGroup.add(createFern(x, z, s)));
  [[-m + 2, 2, 1.3], [m - 1.5, -6, 1], [-4, m - 1, 0.8], [3, -m + 2, 1.1]].forEach(([x, z, s]) => complexGroup.add(createMossyRock(x, z, s)));

  // Atmosfera e partículas do bioma.
  const fog = createAtmosphericEffect('#225533', '#44aa44', 0.2, 28, 28);
  fog.position.set(0, 0.8, 0); complexGroup.add(fog);
  const particles = createParticleSystem('forest', half);
  complexGroup.add(particles);
}
