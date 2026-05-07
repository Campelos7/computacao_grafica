import * as THREE from 'three';

/**
 * BIOMA DESERTO
 * --------------------------------------------------------------------------
 * GUIA RÁPIDO PARA A DEFESA:
 * - Rocha principal/cânion: `createRockFormation(...)`
 * - Cacto: `createCactus(...)`
 * - Crânio decorativo: `createSkull(...)`
 * - Duna: `createSandDune(...)`
 * - Distribuição no mapa: arrays no fim da função
 *
 * Dica de edição:
 * - Escala dos objetos: parâmetro `scale`
 * - Cor/aspeto: materiais (`rockMat`, `darkRockMat`, etc.)
 * - Quantidade: número de entradas nos arrays `forEach`
 *
 * @param {THREE.Group} complexGroup
 * @param {number} half
 * @param {{loadImportedTexture: Function, createAtmosphericEffect: Function, createParticleSystem: Function}} helpers
 */
export function buildDesertBiome(complexGroup, half, helpers) {
  const { loadImportedTexture, createAtmosphericEffect, createParticleSystem } = helpers;

  // Materiais do deserto (pedra clara/escura).
  // Ajusta aqui para mudar a identidade visual geral.
  const sandstoneTex = loadImportedTexture('sandstone', 'textures/sandstone.png', 1, 2);
  const rockMat = new THREE.MeshStandardMaterial({
    map: sandstoneTex, color: 0xaa8855, emissive: 0x2a1a08, emissiveIntensity: 0.08,
    roughness: 0.95, metalness: 0.05,
  });
  const darkRockMat = new THREE.MeshStandardMaterial({
    color: 0x6b5530, roughness: 0.95, metalness: 0.05,
  });

  // FORMAÇÕES ROCHOSAS.
  // `type`:
  // - "mesa"  -> rocha larga em camadas
  // - "spire" -> pilar alto
  // - "arch"  -> arco rochoso (caso default do else)
  function createRockFormation(x, z, scale, type) {
    const g = new THREE.Group(); g.name = 'desert-rock';
    // GUIA DE EDIÇÃO (FORMAÇÕES ROCHOSAS):
    // - Altura geral: parâmetros de altura dos cilindros (ex.: 2.5 * scale, 3.5 * scale)
    // - Espessura: 1.º/2.º parâmetros dos cilindros (ex.: 0.6 * scale, 0.9 * scale)
    // - Tipo de formação: variável `type` ('mesa' | 'spire' | 'arch')
    if (type === 'mesa') {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6 * scale, 0.9 * scale, 2.5 * scale, 7), rockMat);
      base.position.y = 1.25 * scale; base.castShadow = true; base.receiveShadow = true; g.add(base);
      for (let y = 0.4; y < 2.2; y += 0.4) {
        const layer = new THREE.Mesh(new THREE.CylinderGeometry(0.65 * scale, 0.65 * scale, 0.05 * scale, 7), darkRockMat);
        layer.position.y = y * scale; g.add(layer);
      }
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7 * scale, 0.6 * scale, 0.2 * scale, 8), rockMat);
      top.position.y = 2.6 * scale; top.castShadow = true; g.add(top);
    } else if (type === 'spire') {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.35 * scale, 3.5 * scale, 6), rockMat);
      col.position.y = 1.75 * scale; col.rotation.z = (Math.random() - 0.5) * 0.12; col.castShadow = true; g.add(col);
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 * scale + Math.random() * 0.08 * scale, 0), darkRockMat);
        const a = (i / 4) * Math.PI * 2;
        s.position.set(Math.cos(a) * 0.3 * scale, 0.08 * scale, Math.sin(a) * 0.3 * scale); s.castShadow = true; g.add(s);
      }
    } else {
      const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.45 * scale, 3.2 * scale, 7), rockMat);
      pL.position.set(-0.9 * scale, 1.6 * scale, 0); pL.rotation.z = 0.08; pL.castShadow = true; g.add(pL);
      const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * scale, 0.4 * scale, 3.0 * scale, 7), rockMat);
      pR.position.set(0.9 * scale, 1.5 * scale, 0); pR.rotation.z = -0.1; pR.castShadow = true; g.add(pR);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.95 * scale, 0.22 * scale, 8, 16, Math.PI), rockMat);
      arch.position.set(0, 3.0 * scale, 0); arch.rotation.z = Math.PI; arch.castShadow = true; g.add(arch);
      for (let i = 0; i < 5; i++) {
        const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 * scale + Math.random() * 0.12 * scale, 0), darkRockMat);
        s.position.set((Math.random() - 0.5) * 2 * scale, 0.08 * scale, (Math.random() - 0.5) * 1.2 * scale);
        s.rotation.set(Math.random(), Math.random(), Math.random()); s.castShadow = true; g.add(s);
      }
    }
    g.position.set(x, 0, z); return g;
  }

  // CACTO.
  // Se quiseres um cacto mais "cartoon", aumenta espessuras e reduz altura.
  function createCactus(x, z, scale) {
    const g = new THREE.Group(); g.name = 'desert-cactus';
    // GUIA DE EDIÇÃO (CACTO):
    // - Espessura do tronco principal: 1.º/2.º parâmetros (0.1 * scale, 0.12 * scale)
    // - Altura do tronco principal: 3.º parâmetro (1.2 * scale)
    // - Espessura/altura dos braços: parâmetros dos CylinderGeometry dos braços
    const cMat = new THREE.MeshStandardMaterial({ color: 0x2a6622, emissive: 0x0a2208, emissiveIntensity: 0.08, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.12 * scale, 1.2 * scale, 8), cMat);
    body.position.y = 0.6 * scale; body.castShadow = true; g.add(body);
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.07 * scale, 0.5 * scale, 6), cMat);
    armL.position.set(-0.18 * scale, 0.7 * scale, 0); armL.rotation.z = Math.PI / 3; armL.castShadow = true; g.add(armL);
    const armLUp = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.35 * scale, 6), cMat);
    armLUp.position.set(-0.32 * scale, 0.95 * scale, 0); armLUp.castShadow = true; g.add(armLUp);
    if (scale > 0.8) {
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.4 * scale, 6), cMat);
      armR.position.set(0.15 * scale, 0.5 * scale, 0); armR.rotation.z = -Math.PI / 3.5; armR.castShadow = true; g.add(armR);
    }
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xff66aa, emissive: 0xcc3388, emissiveIntensity: 0.4, roughness: 0.4 });
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 6, 5), flowerMat);
    flower.position.y = 1.25 * scale; g.add(flower);
    g.position.set(x, 0, z); return g;
  }

  // CRÂNIO DECORATIVO (detalhe temático do deserto).
  function createSkull(x, z) {
    const g = new THREE.Group(); g.name = 'desert-skull';
    // GUIA DE EDIÇÃO (CRÂNIO):
    // - Tamanho do crânio: 1.º parâmetro da SphereGeometry (0.12)
    // - "Altura" do crânio: skull.scale.y (0.85)
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xddccaa, emissive: 0x332211, emissiveIntensity: 0.05, roughness: 0.8 });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), boneMat);
    skull.position.y = 0.1; skull.scale.set(1, 0.85, 1.1); g.add(skull);
    for (const ry of [0.4, -0.4]) {
      const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), boneMat);
      bone.position.y = 0.02; bone.rotation.z = Math.PI / 2; bone.rotation.y = ry; g.add(bone);
    }
    g.position.set(x, 0, z); return g;
  }

  // DUNA DE AREIA.
  // `w` controla largura; `h` controla altura aparente.
  function createSandDune(x, z, w, h) {
    const g = new THREE.Group(); g.name = 'desert-dune';
    // GUIA DE EDIÇÃO (DUNA):
    // - Largura da duna: variável `w`
    // - Altura da duna: variável `h` (aplicada em dune.scale.y = h / w)
    const duneMat = new THREE.MeshStandardMaterial({ color: 0xbb9955, roughness: 0.95 });
    const dune = new THREE.Mesh(new THREE.SphereGeometry(w, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), duneMat);
    dune.position.y = -0.1; dune.scale.y = h / w; dune.receiveShadow = true; g.add(dune);
    g.position.set(x, 0, z); return g;
  }

  // POSICIONAMENTO DOS OBJETOS DO DESERTO.
  // [x, z, s] => posição e escala.
  const m = half + 1.5;
  complexGroup.add(createRockFormation(-m, -m, 0.9, 'arch'));
  complexGroup.add(createRockFormation(m, m - 1, 0.85, 'mesa'));
  complexGroup.add(createRockFormation(m + 0.5, -m, 1.0, 'spire'));
  complexGroup.add(createRockFormation(-m - 0.5, m, 0.75, 'spire'));
  complexGroup.add(createRockFormation(-m, 0, 0.7, 'mesa'));
  complexGroup.add(createRockFormation(m, 0, 0.65, 'spire'));
  [[-m + 2, -5, 1], [m - 2, 4, 0.85], [-6, m - 1, 1.2], [5, -m + 1, 0.9], [-m + 1, 6, 0.7], [m - 1, -7, 1.1], [-3, -m + 2, 0.8], [7, m - 2, 0.95], [0, m - 0.5, 0.6]].forEach(([cx, cz, s]) => complexGroup.add(createCactus(cx, cz, s)));
  complexGroup.add(createSkull(-m + 3, 3));
  complexGroup.add(createSkull(m - 4, -5));
  complexGroup.add(createSkull(2, -m + 1.5));
  complexGroup.add(createSandDune(-m + 1, -3, 1.5, 0.35));
  complexGroup.add(createSandDune(m - 1, 5, 1.8, 0.4));
  complexGroup.add(createSandDune(0, m - 0.5, 2.0, 0.3));
  complexGroup.add(createSandDune(-5, -m + 0.5, 1.4, 0.35));
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.12, 0), darkRockMat);
    s.position.set((Math.random() - 0.5) * (half * 2 + 4), 0.05 + Math.random() * 0.06, (Math.random() - 0.5) * (half * 2 + 4));
    s.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0); s.castShadow = true; s.name = 'desert-pebble';
    complexGroup.add(s);
  }

  // Atmosfera poeirenta + partículas de areia.
  const fog = createAtmosphericEffect('#aa7744', '#cc9955', 0.15, 28, 28);
  fog.position.set(0, 1.0, 0); complexGroup.add(fog);
  const particles = createParticleSystem('desert', half);
  complexGroup.add(particles);
}
