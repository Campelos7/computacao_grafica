# Performance — método reprodutível

Relatório curto para substituir percepção subjectiva por um procedimento fixo (Chrome DevTools). Os valores de FPS variam com GPU, drivers e carga do sistema; **repete a medição na tua máquina** e actualiza a tabela.

## Ambiente de registo (primeira passagem)

| Campo | Valor |
|--------|--------|
| Data | 2026-05-14 |
| SO | Microsoft Windows 11 Home |
| CPU | AMD Ryzen 5 7535HS with Radeon Graphics |
| RAM (GB) | 15,2 |
| Browser | Chrome (versão: _preencher em `chrome://version`_) |
| Resolução janela | _ex.: 1280×720 janela maximizada ao canvas_ |
| Three.js | Versão do CDN em `index.html` |

## Como medir (10–15 s por cenário)

1. Servir o projecto: `python -m http.server 8080` na raiz do repositório; abrir `http://localhost:8080`.
2. Chrome: **F12** → separador **Performance** → opções de gravação: activar **Screenshots** só se precisares; o importante é o gráfico de **Frames**.
3. Opcional: **Ctrl+Shift+P** → “Show frames per second (FPS) meter” (ou *Rendering* → *Frame Rendering Stats*) para leitura directa no ecrã.
4. Gravar **12 s** estáveis (botão Record → esperar → Stop). Anotar **FPS médio** a olho no painel ou **Frame time** médio (ms) na faixa principal.
5. Repetir o **mesmo** cenário com **pós-processamento desligado** (tecla **M** no jogo) e outra vez **ligado**, sem mudar mais nada.

## Cenários fixos (3)

| ID | Cenário | Passos exactos antes de gravar |
|----|---------|--------------------------------|
| **A** | Menu principal | Após o ecrã “Ready”, ficar no menu inicial (sem abrir LEVELS). Preview da cobra activa; bioma de jogo oculto. |
| **B** | Pré-visualização floresta + médio | Clicar **LEVELS** → primeiro mapa (FLORESTA TROPICAL) seleccionado → dificuldade **Médio** → manter o painel aberto com o tabuleiro e bioma visíveis. |
| **C** | Jogo floresta + difícil | Em **LEVELS**: floresta + **Difícil** → **BACK** → **Espaço** para iniciar; durante ~12 s mantém a cobra em movimento (ex.: **D**/**A** em alternância) sem pausar, para simular jogo activo. |

## Resultados (Post-FX on vs off)

Substituir `—` pelos valores medidos (FPS ou ms por frame, consistente em todas as linhas).

| Cenário | Post-FX **on** (FPS ou ms) | Post-FX **off** (FPS ou ms) | Notas |
|---------|---------------------------|-----------------------------|--------|
| A — Menu | — | — | Carga baixa; referência de baseline UI + preview. |
| B — Preview floresta médio | — | — | Bioma completo + névoa + riacho (`creek.js`); comparar com/sem CRT/bloom. |
| C — Jogo floresta difícil | — | — | Obstáculos activos + sombra no tabuleiro; maior stress. |

## Interpretação mínima

- **Δ grande entre on/off** na linha B ou C: o compositor em `PostProcessing.js` domina; optimizações de bioma têm menos peso relativo.
- **Δ pequeno, FPS baixo com FX off**: investigar draw calls / transparências (água, névoa, `DoubleSide`) e sombras no `boardGroup` / cobra, não só o rio.
- **Comparar medições:** indica no relatório `RENDER.internalScale` em `js/gameConfig.js` (por omissão `0.65`) para resultados serem comparáveis entre máquinas.

---

Última actualização do ficheiro: 2026-05-14.
