export function createUI() {
  const hud = document.createElement("div");
  hud.className = "hud";
  hud.innerHTML = `
    <div class="title">Snake 3D</div>
    <div id="score">Pontuação: 0</div>
    <div>Curvas: A/D ou setas esquerda/direita</div>
    <div>Direção absoluta: W/S ou setas cima/baixo</div>
    <div>C: alternar câmara</div>
    <div>1/2/3: luzes</div>
    <div>R: reiniciar</div>
    <div>Rato: OrbitControls</div>
  `;
  document.body.appendChild(hud);

  const scoreLabel = hud.querySelector("#score");

  function setScore(value) {
    scoreLabel.textContent = `Pontuação: ${value}`;
  }

  function setGameOver(visible) {
    const existing = hud.querySelector("#gameover");
    if (visible && !existing) {
      const el = document.createElement("div");
      el.id = "gameover";
      el.style.marginTop = "8px";
      el.style.color = "#ff7b72";
      el.textContent = "Game Over! Prime R para recomeçar.";
      hud.appendChild(el);
    }
    if (!visible && existing) {
      existing.remove();
    }
  }

  return { setScore, setGameOver };
}
