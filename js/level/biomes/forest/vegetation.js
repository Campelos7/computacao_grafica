/* ==========================================================================
   FLORESTA — Vegetação Baixa (Fetos, Arbustos, Flores)
   --------------------------------------------------------------------------
   Plantas de chão que preenchem o cenário e dão densidade visual.
   
   GUIA DE EDIÇÃO:
   - Feto: nº de folhas no loop, tamanho do PlaneGeometry
   - Arbusto: nº de esferas, raio das esferas
   - Flores: cores no array FLOWER_COLORS, tamanho das pétalas
   ========================================================================== */
import * as THREE from 'three';

/* ── FETO / SAMAMBAIA ── */

/**
 * Cria um feto com folhas irradiando do centro.
 * @param {number} x — posição X
 * @param {number} z — posição Z
 * @param {number} scale — escala
 * @param {object} mats — materiais da floresta
 */
export function createFern(x, z, scale, mats) {
  const g = new THREE.Group();
  g.name = 'forest-fern';

  // Nº de folhas do feto (aumentar para mais densidade)
  const leafCount = 6;

  for (let i = 0; i < leafCount; i++) {
    const a = (i / leafCount) * Math.PI * 2;
    const frond = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15 * scale, 0.5 * scale),
      mats.fern
    );
    frond.position.set(
      Math.cos(a) * 0.08 * scale,
      0.2 * scale,
      Math.sin(a) * 0.08 * scale
    );
    frond.rotation.y = a;
    frond.rotation.x = -0.6;
    frond.name = 'fern-frond';
    g.add(frond);
  }

  g.position.set(x, 0, z);
  return g;
}


/* ── ARBUSTO (NOVO) ── */

/**
 * Cria um arbusto denso (grupo de esferas verdes).
 * @param {number} x — posição X
 * @param {number} z — posição Z
 * @param {number} scale — escala
 * @param {object} mats — materiais da floresta
 */
export function createBush(x, z, scale, mats) {
  const g = new THREE.Group();
  g.name = 'forest-bush';

  // Esferas que compõem o arbusto
  // [offsetX, offsetY, offsetZ, raio]
  const spheres = [
    [0,     0.15, 0,     0.2],
    [-0.12, 0.2,  0.1,   0.15],
    [0.1,   0.22, -0.08, 0.14],
    [0.05,  0.28, 0.12,  0.1],
    [-0.08, 0.1,  -0.1,  0.12],
  ];

  for (const [bx, by, bz, br] of spheres) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(br * scale, 8, 6),
      mats.bush
    );
    sphere.position.set(bx * scale, by * scale, bz * scale);
    sphere.castShadow = true;
    g.add(sphere);
  }

  g.position.set(x, 0, z);
  return g;
}


/* ── FLORES (NOVO) ── */

// Cores das flores — adiciona/remove para variar
const FLOWER_COLORS = [
  { color: 0xff88cc, emissive: 0xaa4488 },  // Rosa
  { color: 0xffee44, emissive: 0xaa9922 },  // Amarelo
  { color: 0xaa66ff, emissive: 0x663399 },  // Roxo
  { color: 0xff6644, emissive: 0xaa3322 },  // Laranja
  { color: 0x66bbff, emissive: 0x336699 },  // Azul claro
];

/**
 * Cria um grupo de flores pequenas no chão.
 * @param {number} x — posição X
 * @param {number} z — posição Z
 * @param {number} scale — escala
 */
export function createFlowerPatch(x, z, scale) {
  const g = new THREE.Group();
  g.name = 'forest-flowers';

  // Quantidade de flores no grupo (3 a 6)
  const count = 3 + Math.floor(Math.random() * 4);

  for (let i = 0; i < count; i++) {
    const flower = new THREE.Group();
    flower.name = 'flower';

    // Escolhe cor aleatória da paleta
    const palette = FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)];
    const petalMat = new THREE.MeshStandardMaterial({
      color: palette.color, emissive: palette.emissive,
      emissiveIntensity: 0.25, roughness: 0.4,
    });

    // Caule
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x2a6622, roughness: 0.8 });
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008 * scale, 0.01 * scale, 0.15 * scale, 4),
      stemMat
    );
    stem.position.y = 0.075 * scale;
    flower.add(stem);

    // Pétalas (4 a 6 planos em estrela)
    const petalCount = 4 + Math.floor(Math.random() * 3);
    for (let p = 0; p < petalCount; p++) {
      const pa = (p / petalCount) * Math.PI * 2;
      const petal = new THREE.Mesh(
        new THREE.PlaneGeometry(0.04 * scale, 0.025 * scale),
        petalMat
      );
      petal.material.side = THREE.DoubleSide;
      petal.position.set(
        Math.cos(pa) * 0.02 * scale,
        0.16 * scale,
        Math.sin(pa) * 0.02 * scale
      );
      petal.rotation.y = pa;
      petal.rotation.x = -0.4;
      flower.add(petal);
    }

    // Centro da flor (esfera pequena amarela)
    const center = new THREE.Mesh(
      new THREE.SphereGeometry(0.012 * scale, 5, 4),
      new THREE.MeshStandardMaterial({
        color: 0xffdd44, emissive: 0xccaa22,
        emissiveIntensity: 0.3, roughness: 0.3,
      })
    );
    center.position.y = 0.16 * scale;
    flower.add(center);

    // Posição aleatória dentro do grupo
    flower.position.set(
      (Math.random() - 0.5) * 0.4 * scale,
      0,
      (Math.random() - 0.5) * 0.4 * scale
    );
    g.add(flower);
  }

  g.position.set(x, 0, z);
  return g;
}
