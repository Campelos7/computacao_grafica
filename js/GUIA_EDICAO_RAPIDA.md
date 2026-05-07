# Guia de Edicao Rapida do Projeto

Este ficheiro resume **onde mexer** quando queres alterar aspeto/comportamento sem procurar no projeto inteiro.

## Skins da cobra (mais importante)

- Ficheiro: `js/snake/skinConfigs.js`
- Alterar:
  - `headColor`, `bodyColor` -> cor base
  - `headEmissive`, `bodyEmissive` -> brilho neon
  - `eyeColor`, `tongueColor` -> detalhes da cabeca
  - `hornColor`, `spineColor` -> detalhes exclusivos do dragao

## Geometria das skins

- Ficheiro: `js/snake/skinDetails.js`
- Alterar:
  - `SphereGeometry(...)` -> tamanho de olhos/cabeca esqueleto
  - `BoxGeometry(...)` -> focinho, lingua, sobrancelhas
  - `ConeGeometry(...)` -> presas/chifres/espinhas
  - `position.set(...)` -> localizacao de cada peca

## Tamanho geral da cobra

- Ficheiro: `js/snake/Snake.js`
- Constantes no topo:
  - `SNAKE_HEAD_RADIUS` -> tamanho da cabeca
  - `SNAKE_BODY_SIZE` -> largura/altura/profundidade do corpo
  - `SNAKE_RENDER_Y` -> altura da cobra no chao
  - `SHIELD_RADIUS` -> tamanho do escudo
  - `TRAIL_PARTICLE_RADIUS` -> tamanho do rasto
  - `EXPLOSION_RADIUS` -> tamanho da explosao ao morrer

## Biomas (objetos complexos)

- Floresta: `js/level/biomes/forest.js`
  - `createTree`, `createMushroom`, `createFallenLog`, `createFern`, `createMossyRock`
- Deserto: `js/level/biomes/desert.js`
  - `createRockFormation`, `createCactus`, `createSkull`, `createSandDune`
- Neve: `js/level/biomes/snow.js`
  - `createPine`, `createIceCrystal`, `createSnowBank`, `createFrozenRock`, `createSnowman`

## Obstaculos

- Ficheiro: `js/Obstacles.js`
- Alterar:
  - `BoxGeometry(...)` em `_addMovingWall` -> largura/altura/espessura da parede
  - `range` e `speed` -> distancia e velocidade de movimento
  - `BoxGeometry(...)` em `_addDisappearingBlock` -> tamanho do bloco
  - `interval` -> tempo de aparecer/desaparecer

## Comida e power-up

- Ficheiro: `js/food.js`
- Alterar:
  - `TorusGeometry(raio, tubo, ...)` -> tamanho da comida
  - `IcosahedronGeometry(raio, detalhe)` -> tamanho do shield
  - Nota: o spawn do shield é controlado pela dificuldade (ver `getShieldSpawnInterval` em `js/utils/helpers.js`)

## Luzes

- Ficheiro: `js/LightManager.js`
- Alterar:
  - Intensidade das luzes nos construtores (`DirectionalLight`, `SpotLight`, etc.)
  - Alcance/angulo do spotlight
  - `pulsePointLight` -> pulsacao da luz da comida

## Pos-processamento

- Ficheiro: `js/PostProcessing.js`
- Alterar:
  - `uCurvature`, `uScanlineIntensity`, `uScanlineCount` -> look CRT
  - `uPixelSize` -> pixelizacao
  - `uGrainIntensity` -> ruido
  - `UnrealBloomPass(strength, radius, threshold)` -> bloom

## Som

- Ficheiro: `js/SoundManager.js`
- Alterar:
  - `masterGain.gain.value` -> volume global
  - `musicGain.gain.value` -> volume da musica
  - Arrays `notes`, `melody`, `bass` -> notas e melodia

## Velocidade (modo NORMAL) e dificuldade

- **Queres mudar a velocidade base do modo NORMAL (em TODOS os mapas)?**
  - Ficheiro: `js/config/gameConfig.js`
  - Alterar: `SNAKE_STEP_REFERENCE_SECONDS`
    - Maior = mais lento
    - Menor = mais rápido
- **Queres que um mapa específico seja mais rápido/lento (mesma dificuldade)?**
  - Ficheiro: `levels/levelConfig.json`
  - Alterar: `pace` desse mapa (ex.: `pace: 0.9` mais rápido; `pace: 1.2` mais lento)
- **Queres que o modo FÁCIL/NORMAL/DIFÍCIL mude a velocidade?**
  - Ficheiro: `js/config/gameConfig.js`
  - Alterar: `DIFFICULTY_LEVELS[*].snakeStepMult`
    - \(>1\) = mais lento; \(<1\) = mais rápido

## Dificuldade (obstáculos / escudo)

- Ficheiro: `js/config/gameConfig.js` + `js/utils/helpers.js`
- Alterar:
  - `DIFFICULTY_LEVELS` -> multiplicadores (cobra/obstáculos)
  - `SHIELD_SPAWN_EVERY_N_APPLES` e `SHIELD_DURATION_SECONDS` -> escudo por dificuldade
  - `OBSTACLES_FALLBACK_WHEN_LEVEL_EMPTY` -> obstáculos default (quando o mapa não define)

