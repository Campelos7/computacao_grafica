# Guia de edição (GUIDE_EDIT)

Este ficheiro substitui referências desactualizadas (ex.: obstáculos só em `Obstacles.js`, *raycaster* de menu, *replay* com teclas **R**/**B**/**N**). Indica **onde** mexer no código actual.

## Config central (`js/gameConfig.js`)

**Primeiro sítio para “afinar” o jogo sem espalhar números:** render (`RENDER`), pós-processamento (`POST_FX`), ganhos de áudio (`AUDIO_BUS`), ritmo do menu (`AMBIENT_MENU_MUSIC`), sombra da luz direccional (`LIGHTING`), água do riacho (`FOREST_CREEK`). O próprio ficheiro lista o que *não* está lá (dificuldade, comida, GLB, melodias longas).

---

## Pastas principais

| Pasta | Conteúdo |
|-------|-----------|
| `js/food/` | Comida (torus), escudo no mapa, spawn e constantes (`ITEM_TYPES` em `food/constants.js`). |
| `js/obstacles/` | Paredes móveis, blocos, texturas de tijolo, constantes de colisão, sons de impacto (`audioTriggers.js`). `Obstacles.js` só orquestra. |
| `js/snake/` | Lógica da cobra, skins, pré-visualização de cabeça no menu. |
| `js/level/biomes/` | Objectos do cenário por mapa (`forest`, `desert`, `snow`) e `index.js` por bioma. **Não** uses os ficheiros monolíticos `forest.js` / `desert.js` / `snow.js` na raiz de `biomes/` — estão marcados como `@deprecated`; o motor importa sempre `.../forest/index.js`, etc. |
| `js/level/` | `difficultyPresets.js` (velocidade, obstáculos, áudio). |
| `js/gameConfig.js` | **Parâmetros afináveis** (render, post-FX, áudio bus, menu, sombra, rio) — ver secção no topo deste guia. |
| `assets/models/` | Ficheiros `.glb` de decoração; registo e carga em `js/ModelLoader.js`. |
| `levels/` | `levelConfig.json` — temas e nomes dos níveis. |

**Nota:** não existe pasta `js/complex-objects/` no repositório.

---

## Skins da cobra

- **Lista e cores base:** `js/snake/skinConfigs.js`
- **Geometria extra (chifres, olhos, etc.):** `js/snake/skinDetails.js`
- **Tamanhos / escudo / passo:** constantes no topo de `js/snake/Snake.js`

---

## Comida, pickups no mapa e escudo

**Pickups activos no mapa:** apenas **shield** — orbe translúcido (`js/food/PowerUps.js`); ao apanhar, activa o escudo na cobra (`main.js` + `Snake`). A lista `powerups` nos presets (`difficultyPresets.js`) só inclui `'shield'`.

**Não existem** anéis nem portal como item no mapa. A geometria **torus** em `Food.js` é **só a comida** (objectivo de pontos), não um power-up.

**Anéis do troféu (GLB):** malhas nomeadas `trophy-ring` em `LevelManager.updateDecorations()` são **só decoração** do modelo carregado; não são pickups nem power-ups.

**Nota sobre “speed”:** a cobra ainda tem `speedMultiplier` / `speedTimer` e o HUD pode mostrar contagem para `'speed'` (`UIManager.js`), mas **não há** pickup no mapa que chame `activateSpeedBoost` — resíduo de API/UI, não confundir com a comida torus.

- **Classe agregadora:** `js/food/index.js` (`Food`)
- **Mesh da comida:** `js/food/Food.js`
- **Escudo (spawn e mesh):** `js/food/PowerUps.js`, `js/food/constants.js` (`SHIELD_SPAWN_PROBABILITY_ON_EAT`, `ITEM_TYPES`)
- **Células livres para spawn:** `js/food/SpawnManager.js`
- Import legado: `import { Food } from './food.js'` → reexporta `food/`.

---

## Obstáculos dinâmicos

- **Orquestração e colisão com *sweep*:** `js/Obstacles.js`
- **Construção, animação, teste ponto a ponto:** `js/obstacles/MovingObstacles.js`
- **Geometrias e cores por bioma:** `js/obstacles/config.js`
- **Paredes estáticas da arena:** `js/obstacles/Walls.js`
- **Preset por dificuldade** (lista `obstacles`): `js/level/difficultyPresets.js`
- **Som ao morrer contra obstáculo:** `js/obstacles/audioTriggers.js` + `SoundManager.playObstacleStinger`

---

## Níveis, chão e céu

- **Carga de JSON, tabuleiro, céu, decorações:** `js/LevelManager.js`
- **Bioma concreto:** `js/level/biomes/<nome>/index.js` e ficheiros vizinhos no mesmo directório.

---

## Performance, GPU, floresta e rio

- **Medição reprodutível:** vê [`PERF.md`](PERF.md) (cenários A/B/C, Chrome Performance, **P** = pós-processamento on/off).
- **Resolução de render, sombras do renderer, passos da cobra:** `js/gameConfig.js` → `RENDER` (`internalScale`, `shadowMapMode`, `maxSnakeStepsPerFrame`). `main.js` importa estes valores.
- **Film grain / bloom / CRT:** `js/gameConfig.js` → `POST_FX` (o `main.js` não contém estes números).
- **Sombras no bioma decorativo:** após construir o nível, `LevelManager._optimizeComplexShadows()` desactiva `castShadow` / `receiveShadow` em **todo** o `complexGroup` e `decorGroup` (cenário exterior + GLB). **Intencional:** menos trabalho no *shadow pass*; sombras ficam sobretudo no tabuleiro / entidades de jogo.
- **Riacho:** cores, opacidade e sparkle em `js/gameConfig.js` → `FOREST_CREEK` (o ficheiro `creek.js` lê dali).
- **Bloom:** escala interna em `POST_FX.bloomInternalScale` (não é fixo a 40% no código do compositor).
- **Névoa:** `createAtmosphericEffect` em `LevelManager.js` — planos transparentes grandes; mesmo tipo de trade-off (qualidade vs *fill*).

---

## Modelos GLB (decoração do nível)

O texto abaixo replica o cabeçalho de `js/ModelLoader.js` (mantém-te alinhado com esse ficheiro ao editar).

**Onde estão os ficheiros**

- Coloca todos os `.glb` personalizados em: `assets/models/`
- URLs são relativas ao `index.html` (ex.: `assets/models/trophy.glb`).

**Ponto único de importação**

- `ModelLoader.js` é o único módulo que usa `GLTFLoader` para esses decorados.
- `main.js` chama `loadDecorModels()` e o `LevelManager` recebe o mapa via `setDecorModels()` — não há pasta `js/complex-objects/` no projecto.

**Como adicionar um novo modelo GLB**

1. Copia o ficheiro `.glb` para `assets/models/`.
2. Acrescenta uma linha em `DECOR_MODEL_ENTRIES`: `{ id: 'nomeCurto', file: 'teu_modelo.glb' }`.
3. Se o nível precisar de o instanciar como decoração, usa o mesmo `id` na configuração de decorações do `LevelManager` (onde já existem `arcade` / `trophy`).
4. Opcional: ajusta `prepareDecorGltfScene()` se precisares de regras extra de materiais (sombras, `colorSpace`, etc.).

**Fallback:** se o `.glb` falhar ou não existir, `loadDecorModels` usa geometria procedural para ids conhecidos (ver `createProceduralDecorModel`).

---

## Luzes

- **Quatro luzes e teclas 1–4:** `js/LightManager.js` (ordem: direccional, *spot*, *point*, ambiente)

---

## Câmara

- **Perspectiva / ortográfica, órbita na pausa:** `js/CameraController.js`

---

## Pós-processamento

- **Uniforms CRT, bloom, pixelate:** `js/PostProcessing.js`

---

## Som

- **SFX, música ambiente (menu vs jogo), dificuldade:** `js/SoundManager.js` (`startMenuMusic` / `startGameMusic`; tempo de jogo em `difficultyPresets.js` → `musicNoteLength`).
- **Preset de áudio por dificuldade:** `js/level/difficultyPresets.js` (`audio` + `getDifficultyAudioPreset`)

---

## UI e estados

- **Menus HTML, painéis, HUD:** `js/UIManager.js` + `index.html` + `css/style.css`
- **Fluxo de jogo e teclas:** `js/main.js`

---

## O que **não** procurar neste projecto

- **Raycaster** para clicar em texto 3D do menu — o menu é DOM.
- **Replay** com **R**, retroceder **B**, velocidade **N** — não está ligado ao `main.js`.
- **Partículas** na morte — `Snake.explode()` apenas oculta a cobra; efeito visual é *shake* + flash + UI.
- **Portal / anéis como power-up no mapa** — não existem; só shield (comida = torus em `food/Food.js`).

Se reintroduzires *replay* ou menu 3D com *raycaster*, actualiza este guia e o `README.md`.
