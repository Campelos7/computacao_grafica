# Snake Retro 3D — Three.js

Jogo da cobra em 3D com estética retro neon, construído com **Three.js** para a disciplina de **Computação Gráfica**.

## 🎮 Controlos

| Tecla | Acção |
|-------|-------|
| `W` / `↑` | Mover para cima (direcção absoluta) |
| `S` / `↓` | Mover para baixo (direcção absoluta) |
| `A` / `←` | Virar à esquerda (relativo à cobra) |
| `D` / `→` | Virar à direita (relativo à cobra) |
| `SPACE` | Pausar / Retomar / Iniciar jogo |
| `C` | Alternar câmara (Perspectiva ↔ Ortográfica) |
| `1` | Toggle Ambient Light |
| `2` | Toggle Directional Light |
| `3` | Toggle Point Light |
| `4` | Toggle Hemisphere Light |
| `R` | Replay (após Game Over) / Reiniciar (durante jogo) |
| `M` | Toggle Pós-Processamento (CRT + Bloom + Pixelate) |
| `B` | Retroceder replay |
| `N` | Velocidade do replay (0.5x → 1x → 2x → 4x) |
| 🖱️ Rato | OrbitControls (rotação da câmara) |

## 📋 Requisitos Académicos Implementados

### R1 — Objectos 3D Complexos
- Primitivas: `SphereGeometry`, `BoxGeometry`, `TorusGeometry`, `OctahedronGeometry`, `CylinderGeometry`, `IcosahedronGeometry`
- Materiais: `MeshStandardMaterial` com texturas Canvas pixel-art, bump maps, emissive
- `ShaderMaterial` com fresnel para escudo
- Importação de 2 modelos GLTF via `GLTFLoader` (arcade cabinet + trophy, com fallback procedural)
- `TextGeometry` para menu 3D

### R2 — Câmara
- Toggle suave entre `PerspectiveCamera` e `OrthographicCamera` (tecla C)
- `OrbitControls` para rotação manual (activo em pausa)
- Follow-camera com lerp para seguir a cobra

### R3 — Iluminação (4 tipos)
- `AmbientLight` (tecla 1)
- `DirectionalLight` com sombras (tecla 2)
- `PointLight` segue a comida, pulsa (tecla 3)
- `HemisphereLight` (tecla 4)
- Feedback visual na UI para cada luz

### R4 — Interação
- Teclado: WASD/Setas (mover), Espaço (pausar)
- Rato: OrbitControls para rotação
- `Raycaster` para menu 3D interactivo (hover + click em objectos 3D)

### R5 — Animação + Replay
- Movimento suave com interpolação `lerp`
- Comida com rotação e pulso
- Corpo da cobra com ondulação
- **Sistema de Replay**: buffer circular de 3000 frames, controlos play/pause/rewind/velocidade/timeline

### Funcionalidades Avançadas
- **3 Níveis** com temas JSON (Neon City, Cyber Maze, Void Realm)
- **Power-ups**: Velocidade (estrela dourada), Escudo (fresnel shader), Portal (anéis animados)
- **Obstáculos dinâmicos**: MovingWall (sin oscilação), DisappearingBlock (fade visibilidade)
- **Pós-processamento retro**: CRT shader (scanlines, curvatura, aberração cromática), UnrealBloomPass, Pixelate shader, Film grain
- **Menu 3D** com TextGeometry e Raycaster
- **Ecrã de carregamento** com barra de progresso

## 🗂️ Estrutura

```
computacao_grafica/
├── index.html              — Página principal + UI HTML
├── css/style.css           — Tema retro neon
├── js/
│   ├── main.js             — Orquestrador principal
│   ├── Snake.js            — Cobra 3D com texturas e power-ups
│   ├── Food.js             — Comida e power-ups 3D
│   ├── Obstacles.js        — Obstáculos dinâmicos
│   ├── LevelManager.js     — Sistema de níveis (JSON)
│   ├── ReplaySystem.js     — Buffer circular + reprodução
│   ├── CameraController.js — Câmaras + OrbitControls
│   ├── LightManager.js     — 4 tipos de luz + toggle
│   ├── PostProcessing.js   — CRT + Bloom + Pixelate + Film
│   ├── UIManager.js        — Gestão da interface
│   └── utils/helpers.js    — Constantes e utilitários
├── models/                 — Modelos GLTF (fallback procedural)
├── textures/               — Texturas (geradas proceduralmente)
├── levels/
│   └── levelConfig.json    — Configuração dos 3 níveis
└── README.md               — Este ficheiro
```

## 🚀 Como Executar

O projecto usa Three.js via CDN (sem necessidade de npm/build).
Necessita de um servidor HTTP local devido aos módulos ES:

```bash
# Opção 1: Python
python -m http.server 8080

# Opção 2: Node.js
npx serve .

# Opção 3: VS Code
# Usar extensão "Live Server"
```

Abrir `http://localhost:8080` no browser.

## 🛠️ Tecnologias

- **Three.js r161** — Motor 3D WebGL
- **GLSL** — Shaders personalizados (CRT, Pixelate, Film, Fresnel)
- **ES Modules** — Arquitectura modular sem bundler
- **Canvas API** — Texturas procedurais pixel-art
