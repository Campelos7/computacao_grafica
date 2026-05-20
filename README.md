# Snake Retro 3D — Three.js

Jogo da cobra em 3D com estética retro neon, em **Three.js**, para **Computação Gráfica**.

## Controlos

| Tecla | Acção |
|-------|-------|
| `W` / `↑` | Direcção absoluta: cima |
| `S` / `↓` | Direcção absoluta: baixo |
| `A` / `←` | Virar à esquerda (relativo à cobra) |
| `D` / `→` | Virar à direita (relativo à cobra) |
| `Espaço` | Pausar / retomar (jogo) · Iniciar a partir do menu principal · Sair do *game over* para o menu |
| `Escape` | Fechar sub-menu (níveis/skins/definições) · Abrir/fechar pausa durante o jogo |
| `C` | Alternar câmara (perspectiva ↔ ortográfica) |
| `1`–`4` | Alternar luzes: **1** direccional · **2** *spotlight* · **3** *point* (comida) · **4** ambiente |
| `M` | Alternar pós-processamento (CRT, bloom, etc.) |
| `P` | Som ligado / mudo |
| Rato | **OrbitControls** na pausa (rodar a vista). Clique no canvas para focar. |

O menu principal e as opções são **HTML/CSS** (botões e listas), não há `Raycaster` sobre malhas 3D para navegação.

## Requisitos académicos (resumo honesto)

### R1 — Objectos 3D complexos
- Primitivas e materiais PBR na cobra, comida e cenário.
- **Escudo no mapa** (pickup): orbe em `js/food/PowerUps.js` (`MeshStandardMaterial`, icosaedro).
- **Escudo activo** (à volta da cobra): `ShaderMaterial` com fresnel em `js/snake/Snake.js`.
- **Modelos GLB** (opcionais): `assets/models/` (`arcade_cabinet.glb`, `trophy.glb`), carregados por `js/ModelLoader.js` com fallback procedural.
- **Biomas**: objectos temáticos gerados em código sob `js/level/biomes/` (floresta, deserto, neve).

### R2 — Câmara
- `PerspectiveCamera` e `OrthographicCamera` com transição suave (tecla **C**).
- `OrbitControls` activos na **pausa** para inspecção da cena.

### R3 — Iluminação (4 tipos)
- `DirectionalLight`, `SpotLight`, `PointLight`, `AmbientLight` — ver `js/LightManager.js` e teclas **1–4**.

### R4 — Interacção
- Teclado para movimento, pausa e atalhos.
- Rato: órbita na pausa; UI de jogo em HTML.

### R5 — Animação
- Movimento da cobra com interpolação entre passos (`alpha` no *render*).
- Animações de pickups, obstáculos dinâmicos e decorações do nível (ver `LevelManager` e biomas).

**Nota:** não há modo *replay* com teclas dedicadas nem buffer de gravação ligado ao *loop* de jogo.

## Funcionalidades

- **Níveis** definidos em `levels/levelConfig.json` (três mapas: floresta tropical, deserto *canyon*, montanha de neve).
- **Dificuldade** (`js/level/difficultyPresets.js`): fácil / médio / difícil (velocidade, obstáculos, graça inicial em paredes móveis, áudio).
- **Obstáculos dinâmicos** (`js/obstacles/`): paredes móveis, blocos que aparecem/desaparecem; colisão com *sweep* ao longo do passo da cabeça.
- **Comida e escudo** (`js/food/`): torus da comida; orbe do escudo e spawn probabilístico. Anéis do troféu GLB são só decoração (`trophy-ring` no `LevelManager`), não pickups.
- **Pós-processamento** (`js/PostProcessing.js`): CRT, bloom, pixelate, *film grain*.
- **Som** (`js/SoundManager.js`): Web Audio API, SFX sintéticos, *stingers* por obstáculo; **música ambiente** distinta no menu (loop suave) e no jogo (chiptune), com **tempo e tom** ligados à dificuldade (`js/level/difficultyPresets.js`).
- **Morte**: *shake* da câmara, flash, cobra oculta (`explode()`), atraso antes do ecrã de *game over*.

Para **onde editar** cada coisa (geometria, som, biomas), vê `GUIDE_EDIT.md`.

## Performance

- Procedimento de medição (Chrome DevTools, cenários fixos, **P** = pós-processamento): [`PERF.md`](PERF.md).
- **FPS baixos:** tenta **P** (desligar pós-processamento); nas **Definições** desliga sombras; em `js/gameConfig.js` reduz `RENDER.internalScale` (ex.: `0.55`) ou `RENDER.maxSnakeStepsPerFrame` (ex.: `3`). *Bloom* / *film grain*: `POST_FX` no mesmo ficheiro.

## Checklist rápido (documentação vs código)

- [ ] GLB só em `assets/models/` + entradas em `ModelLoader.js`
- [ ] Pickups no mapa = `ITEM_TYPES` / `difficultyPresets.js` (`shield`); torus = comida (`Food.js`)
- [ ] Bioma activo = `js/level/biomes/<nome>/index.js` (não os `.js` monolíticos na raiz de `biomes/`)
- [ ] Parâmetros de equilíbrio (FPS, áudio, rio): `js/gameConfig.js`
- [ ] Tabela de resultados em `PERF.md` actualizada após mudanças visuais pesadas (água, névoa, post-FX)

```
computacao_grafica/
├── index.html
├── css/style.css
├── README.md
├── GUIDE_EDIT.md          — Guia rápido de edição (ficheiros-chave)
├── PERF.md                — Método e tabela de performance (Chrome)
├── assets/models/         — GLB opcionais (arcade, troféu); ver ModelLoader.js
├── textures/              — Texturas PNG usadas no chão / paredes
├── levels/
│   └── levelConfig.json   — Temas e meta-dados dos 3 níveis
└── js/
    ├── main.js            — Arranque, estados, *input*, *game loop*
    ├── gameConfig.js      — Parâmetros afináveis (render, post-FX, áudio, luz, rio)
    ├── food.js            — Reexporta js/food/ (compatibilidade de imports)
    ├── snake.js           — Reexporta js/snake/
    ├── Obstacles.js       — Orquestra obstáculos; lógica em obstacles/
    ├── LevelManager.js    — Níveis, tabuleiro, biomas, decorações
    ├── ModelLoader.js     — GLB de decoração + preparação de materiais
    ├── CameraController.js
    ├── LightManager.js
    ├── PostProcessing.js
    ├── SoundManager.js
    ├── UIManager.js
    ├── food/              — Comida, power-ups, spawn
    │   ├── index.js       — Classe Food
    │   ├── Food.js
    │   ├── PowerUps.js
    │   ├── SpawnManager.js
    │   └── constants.js
    ├── obstacles/         — Obstáculos dinâmicos + áudio de impacto
    │   ├── MovingObstacles.js
    │   ├── Walls.js
    │   ├── config.js
    │   └── audioTriggers.js
    ├── snake/             — Cobra, skins, cabeça para pré-visualização
    ├── level/
    │   ├── difficultyPresets.js
    │   └── biomes/        — forest / desert / snow (+ submódulos)
    └── utils/
        └── helpers.js
```

**Modelos 3D (GLB):** ficam apenas em **`assets/models/`** e são carregados por **`js/ModelLoader.js`** (único ponto de `GLTFLoader` para decoração). **Não** existe pasta `js/complex-objects/`. O cenário procedural por mapa está em **`js/level/biomes/<nome>/index.js`** (ficheiros `forest.js` / `desert.js` / `snow.js` ao lado são legado `@deprecated`, não usados pelo motor); a cobra em **`js/snake/`**.

## Como executar

Three.js via **CDN**; sem `npm` obrigatório. Servidor HTTP local por causa dos módulos ES:

```bash
python -m http.server 8080
# ou: npx serve .
```

Abrir `http://localhost:8080`.

## Tecnologias

- **Three.js** (versão referenciada no `index.html`) — WebGL
- **GLSL** — shaders de pós-processamento e escudo
- **ES Modules** — imports relativos entre ficheiros `.js`
