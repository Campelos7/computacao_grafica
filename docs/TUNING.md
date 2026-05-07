# Tuning rápido (para iniciantes)

Este projeto foi organizado para poderes mudar o comportamento do jogo **sem procurar “números mágicos”** pelo código.

## Onde mexer (90% dos casos)

### 1) Velocidade base do jogo (modo NORMAL)

- Ficheiro: `js/config/gameConfig.js`
- Variável: `SNAKE_STEP_REFERENCE_SECONDS`

O que significa:
- É a **duração de 1 passo** em segundos quando a dificuldade é **NORMAL** e o mapa tem `pace: 1`.
- **Mais alto = mais lento**
- **Mais baixo = mais rápido**

Exemplo:
- De `0.125` para `0.10` → a cobra fica mais rápida em todos os mapas, no NORMAL.

### 2) Velocidade de um mapa específico

- Ficheiro: `levels/levelConfig.json`
- Campo: `pace`

O que significa:
- Multiplica a duração do passo só nesse mapa.
- `pace < 1` → mapa mais rápido
- `pace > 1` → mapa mais lento

Exemplo:
- `pace: 0.9` → ligeiramente mais rápido
- `pace: 1.2` → mais lento

### 3) Dificuldade (FÁCIL / NORMAL / DIFÍCIL)

- Ficheiro: `js/config/gameConfig.js`
- Variável: `DIFFICULTY_LEVELS`

Campos:
- `snakeStepMult`: multiplica a duração do passo (>\(1\) mais lento; <\(1\) mais rápido)
- `obstacleSpeedMult`: multiplica as animações dos obstáculos

## Regra usada pelo jogo (resumo)

A duração do passo é calculada em `js/utils/helpers.js`:

\[
stepDuration = SNAKE\_STEP\_REFERENCE\_SECONDS \times paceDoMapa \times snakeStepMultDaDificuldade
\]

## Escudo (power-up)

- Ficheiro: `js/config/gameConfig.js`
- Variáveis:
  - `SHIELD_SPAWN_EVERY_N_APPLES` (por dificuldade; `null` desliga)
  - `SHIELD_DURATION_SECONDS`

## Obstáculos

- Mapa (JSON): `levels/levelConfig.json` → `obstacles`
- Fallback global (quando o mapa tem `obstacles: []` no DIFÍCIL):
  - `js/config/gameConfig.js` → `OBSTACLES_FALLBACK_WHEN_LEVEL_EMPTY`

