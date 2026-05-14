/* ==========================================================================
   ModelLoader.js — Carregamento único de modelos GLB de decoração do nível
   ==========================================================================
   Onde estão os ficheiros
   ------------------------
   • Coloca todos os .glb personalizados em:  assets/models/
   • URLs são relativas ao index.html (ex.: assets/models/trophy.glb).

   Ponto único de importação
   ---------------------------
   • Este módulo é o único que usa GLTFLoader para esses decorados.
   • O main.js chama loadDecorModels() e o LevelManager recebe o mapa
     via setDecorModels() — não há pasta js/complex-objects/ no projecto.

   Como adicionar um novo modelo GLB
   ----------------------------------
   1) Copia o ficheiro .glb para assets/models/.
   2) Acrescenta uma linha em DECOR_MODEL_ENTRIES: { id: 'nomeCurto', file: 'teu_modelo.glb' }.
   3) Se o nível precisar de o instanciar como decoração, usa o mesmo id
      na configuração de decorações do LevelManager (onde já existem
      arcade / trophy).
   4) Opcional: ajusta prepareDecorGltfScene() se precisares de regras
      extra de materiais (sombras, colorSpace, etc.).

   Fallback: se o .glb falhar ou não existir, loadDecorModels usa geometria
   procedural para ids conhecidos (ver createProceduralDecorModel).
   ========================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Base URL dos ficheiros .glb (colocar ficheiros em assets/models/). */
export const ASSETS_MODELS_BASE = 'assets/models';

export const DECOR_MODEL_ENTRIES = [
  { id: 'arcade', file: 'arcade_cabinet.glb' },
  { id: 'trophy', file: 'trophy.glb' },
];

/**
 * Ajusta malhas e materiais importados para o pipeline de cor do jogo e sombras leves.
 * @param {THREE.Object3D} root
 */
export function prepareDecorGltfScene(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (mat.map && 'colorSpace' in mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
      }
      if (mat.emissiveMap && 'colorSpace' in mat.emissiveMap) {
        mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      }
      if (mat.isMeshStandardMaterial) {
        if (mat.envMapIntensity == null) mat.envMapIntensity = 1;
      }
      mat.needsUpdate = true;
    }
  });
}

/**
 * Fallback quando o GLB não existe ou o pedido falha.
 * @param {'arcade'|'trophy'} name
 * @returns {THREE.Group}
 */
export function createProceduralDecorModel(name) {
  const group = new THREE.Group();
  if (name === 'arcade') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, emissive: 0x0d0d1a, roughness: 0.7, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.8), bodyMat);
    body.position.y = 1.2;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 }));
    screen.position.set(0, 0.5, 0.41);
    body.add(screen);
    const btnGeo = new THREE.SphereGeometry(0.06, 8, 6);
    [0xff00ff, 0x00ff00, 0xffff00, 0xff0000].forEach((c, i) => {
      const btn = new THREE.Mesh(btnGeo, new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 }));
      btn.position.set(-0.2 + i * 0.13, -0.3, 0.41);
      body.add(btn);
    });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.6 }));
    top.position.y = 2.55;
    body.add(top);
    group.add(body);
    group.scale.setScalar(0.7);
  }
  if (name === 'trophy') {
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.6, metalness: 0.4 }));
    pedestal.position.y = 0.3;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00, emissiveIntensity: 0.8, roughness: 0.1, metalness: 0.7 }));
    star.position.y = 0.9;
    star.name = 'trophy-star';
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 12, 24), new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6 }));
    ring.position.y = 0.9;
    ring.rotation.x = Math.PI / 2;
    ring.name = 'trophy-ring';
    group.add(pedestal, star, ring);
    group.scale.setScalar(0.8);
  }
  return group;
}

/**
 * @param {GLTFLoader} loader
 * @param {string} path
 * @param {number} [timeoutMs]
 * @returns {Promise<import('three/addons/loaders/GLTFLoader.js').GLTF>}
 */
function loadGLTF(loader, path, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Timeout a carregar modelo: ${path}`));
    }, timeoutMs);

    loader.load(
      path,
      (gltf) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(gltf);
      },
      undefined,
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

/**
 * Carrega todos os GLB registados; em falha usa geometria procedural.
 * @param {(progress01: number) => void} [onProgress] — 0..1 ao longo da lista
 * @returns {Promise<Record<string, THREE.Object3D>>}
 */
export async function loadDecorModels(onProgress) {
  const loader = new GLTFLoader();
  const out = {};
  const entries = DECOR_MODEL_ENTRIES;
  for (let i = 0; i < entries.length; i++) {
    const { id, file } = entries[i];
    const url = `${ASSETS_MODELS_BASE}/${file}`;
    try {
      const gltf = await loadGLTF(loader, url);
      prepareDecorGltfScene(gltf.scene);
      out[id] = gltf.scene;
    } catch (err) {
      console.warn(`Modelo "${url}" indisponível, usando fallback procedural.`, err);
      out[id] = createProceduralDecorModel(id);
    }
    if (onProgress) onProgress((i + 1) / entries.length);
  }
  return out;
}
