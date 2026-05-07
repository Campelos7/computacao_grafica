/* ==========================================================================
   FLORESTA — Cogumelos
   --------------------------------------------------------------------------
   Cogumelo decorativo com pé, chapéu vermelho e pontos brilhantes.
   
   GUIA DE EDIÇÃO:
   - Espessura do pé: 1.º/2.º parâmetros do CylinderGeometry (0.04, 0.06)
   - Altura do pé: 3.º parâmetro (0.3)
   - Tamanho do chapéu: 1.º parâmetro da SphereGeometry (0.12 * scale)
   - Brilho dos pontos: emissiveIntensity do glowMat (1.2)
   - Quantidade de pontos: limite do loop (for i < 4)
   ========================================================================== */
import * as THREE from 'three';

/**
 * Cria um cogumelo bioluminescente.
 * @param {number} x — posição X
 * @param {number} z — posição Z
 * @param {number} scale — escala
 * @param {object} mats — materiais (não usa mats directamente, tem materiais próprios)
 */
export function createMushroom(x, z, scale) {
  const g = new THREE.Group();
  g.name = 'forest-mushroom';

  /* ── Materiais específicos do cogumelo ── */
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0xccbb88, roughness: 0.8,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xcc3322, emissive: 0x661100,
    emissiveIntensity: 0.25, roughness: 0.6,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x44ff88, emissive: 0x22ff66,
    emissiveIntensity: 1.2, roughness: 0.3,
    transparent: true, opacity: 0.7,
  });

  /* ── Pé do cogumelo ── */
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04 * scale, 0.06 * scale, 0.3 * scale, 6),
    stemMat
  );
  stem.position.set(0, 0.15 * scale, 0);
  g.add(stem);

  /* ── Chapéu (meia esfera) ── */
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.12 * scale, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    capMat
  );
  cap.position.y = 0.3 * scale;
  cap.castShadow = true;
  g.add(cap);

  /* ── Pontos brilhantes (bioluminescência) ── */
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.015 * scale, 4, 4),
      glowMat
    );
    dot.position.set(
      Math.cos(a) * 0.08 * scale,
      0.32 * scale,
      Math.sin(a) * 0.08 * scale
    );
    dot.name = 'mushroom-glow';
    g.add(dot);
  }

  g.position.set(x, 0, z);
  return g;
}
