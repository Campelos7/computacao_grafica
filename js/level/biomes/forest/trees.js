/* ==========================================================================
   FLORESTA — Árvores
   --------------------------------------------------------------------------
   Árvore principal da floresta com tronco, raízes, copa multi-esfera e frutos.
   
   GUIA DE EDIÇÃO:
   - Altura do tronco: 3.º parâmetro do CylinderGeometry (2.8 * scale)
   - Espessura topo/base: 1.º e 2.º parâmetros (0.12, 0.22)
   - Tamanho da copa: raio "lr" no array de posições das folhas
   - Quantidade de frutos: limite do loop (for i < 3)
   - Quantidade de raízes: limite do loop (for i < 4)
   ========================================================================== */
import * as THREE from 'three';

/**
 * Cria uma árvore da floresta.
 * @param {number} x — posição X no mundo
 * @param {number} z — posição Z no mundo
 * @param {number} scale — escala geral da árvore
 * @param {boolean} variant — se true usa folha escura
 * @param {object} mats — materiais da floresta (de materials.js)
 */
export function createTree(x, z, scale, variant, mats) {
  const g = new THREE.Group();
  g.name = 'forest-tree';

  /* ── Tronco ── */
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, 2.8 * scale, 8),
    mats.trunk
  );
  trunk.position.y = 1.4 * scale;
  trunk.rotation.z = (Math.random() - 0.5) * 0.15;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  g.add(trunk);

  /* ── Raízes (4 raízes à volta da base) ── */
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
    const root = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02 * scale, 0.06 * scale, 0.5 * scale, 5),
      mats.trunk
    );
    root.position.set(
      Math.cos(a) * 0.18 * scale,
      0.12 * scale,
      Math.sin(a) * 0.18 * scale
    );
    root.rotation.z = Math.cos(a) * 0.6;
    root.rotation.x = Math.sin(a) * 0.6;
    root.castShadow = true;
    g.add(root);
  }

  /* ── Copa (esferas sobrepostas) ── */
  // Cada entrada: [offsetX, offsetY, offsetZ, raio]
  const mat = variant ? mats.darkLeaf : mats.leaf;
  const canopyPositions = [
    [0,     3.0,  0,     0.85],
    [-0.35, 3.3,  0.25,  0.55],
    [0.4,   3.15, -0.2,  0.6],
    [-0.15, 3.5,  -0.35, 0.45],
    [0.25,  3.45, 0.35,  0.5],
    [0,     3.7,  0,     0.35],
  ];
  for (const [lx, ly, lz, lr] of canopyPositions) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(lr * scale, 10, 8),
      mat
    );
    leaf.position.set(lx * scale, ly * scale, lz * scale);
    leaf.castShadow = true;
    leaf.name = 'tree-canopy';
    g.add(leaf);
  }

  /* ── Frutos (pequenas esferas vermelhas na copa) ── */
  for (let i = 0; i < 3; i++) {
    const fruit = new THREE.Mesh(
      new THREE.SphereGeometry(0.05 * scale, 6, 5),
      mats.fruit
    );
    const a = Math.random() * Math.PI * 2;
    fruit.position.set(
      Math.cos(a) * 0.35 * scale,
      (2.6 + Math.random()) * scale,
      Math.sin(a) * 0.35 * scale
    );
    g.add(fruit);
  }

  g.position.set(x, 0, z);
  return g;
}
