import * as THREE from "three";

export const BOARD_SIZE = 20;
export const CELL_SIZE = 1;

function createGroundTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, "#3f5f3d");
  bg.addColorStop(1, "#2d452b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2200; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 3 + 1;
    ctx.fillStyle = `rgba(20,30,18,${Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWallTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#6d7280";
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 48) {
    const rowShift = (Math.floor(y / 48) % 2) * 24;
    for (let x = -24 + rowShift; x < size; x += 96) {
      ctx.fillStyle = "rgba(130,138,152,0.45)";
      ctx.fillRect(x, y, 94, 46);
      ctx.strokeStyle = "rgba(45,50,58,0.45)";
      ctx.strokeRect(x, y, 94, 46);
    }
  }

  for (let i = 0; i < 1300; i += 1) {
    ctx.fillStyle = `rgba(25,25,30,${Math.random() * 0.18})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd7ff);
  scene.fog = new THREE.Fog(0xbfe6ff, 24, 70);

  const boardWidth = BOARD_SIZE * CELL_SIZE;
  const boardHeight = 0.6;

  const groundTexture = createGroundTexture();
  const wallTexture = createWallTexture();

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(boardWidth, boardHeight, boardWidth),
    new THREE.MeshStandardMaterial({
      map: groundTexture,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.04,
      bumpMap: groundTexture,
      bumpScale: 0.08,
    })
  );
  board.position.set(0, -boardHeight * 0.5, 0);
  board.receiveShadow = true;
  scene.add(board);

  const wallHeight = 2;
  const wallThickness = 0.7;
  const half = boardWidth * 0.5;
  const wallMaterial = new THREE.MeshStandardMaterial({
    map: wallTexture,
    color: 0xf0f4ff,
    roughness: 0.72,
    metalness: 0.15,
    bumpMap: wallTexture,
    bumpScale: 0.05,
  });

  const walls = [
    new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth + wallThickness * 2, wallHeight, wallThickness),
      wallMaterial
    ),
    new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth + wallThickness * 2, wallHeight, wallThickness),
      wallMaterial
    ),
    new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, boardWidth),
      wallMaterial
    ),
    new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, boardWidth),
      wallMaterial
    ),
  ];

  walls[0].position.set(0, wallHeight * 0.5, half + wallThickness * 0.5);
  walls[1].position.set(0, wallHeight * 0.5, -half - wallThickness * 0.5);
  walls[2].position.set(half + wallThickness * 0.5, wallHeight * 0.5, 0);
  walls[3].position.set(-half - wallThickness * 0.5, wallHeight * 0.5, 0);

  walls.forEach((wall) => {
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
  });

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.62);
  const directionalLight = new THREE.DirectionalLight(0xfff6d9, 1.35);
  directionalLight.position.set(15, 20, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(512, 512);
  directionalLight.shadow.camera.left = -18;
  directionalLight.shadow.camera.right = 18;
  directionalLight.shadow.camera.top = 18;
  directionalLight.shadow.camera.bottom = -18;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 40;

  const foodLight = new THREE.PointLight(0xffa31a, 1.1, 8);
  foodLight.position.set(0, 1.4, 0);
  foodLight.castShadow = false;

  const hemisphereLight = new THREE.HemisphereLight(0xd8f1ff, 0x6c8d52, 0.5);

  scene.add(ambientLight, directionalLight, hemisphereLight, foodLight);

  const floorGrid = new THREE.GridHelper(boardWidth, BOARD_SIZE, 0x8bc4f3, 0x6eaad7);
  floorGrid.position.y = 0.01;
  floorGrid.material.transparent = true;
  floorGrid.material.opacity = 0.14;
  scene.add(floorGrid);

  return {
    scene,
    boardWidth,
    lights: {
      ambient: ambientLight,
      directional: directionalLight,
      food: foodLight,
    },
  };
}

export function toggleLight(light) {
  light.visible = !light.visible;
}
