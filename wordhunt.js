(() => {
  /* ==========================
     Simplified Static Word Game
     ========================== */

  let words = [];
  let spanishMode = true;
  let currentWordIndex = 0;
  let timer = 120;
  let timerInterval = null;
  let gameRunning = false;
  let caught = 0;
  let missed = 0;
  let translationVisible = false;
  let dropSpeed = 5; // still adjustable, controls how long before next word

  /* Load CSV Words */
  fetch("wordlist.csv")
    .then((res) => res.text())
    .then((text) => {
      const rows = text.trim().split("\n").slice(1);
      words = rows.map((row) => {
        const [spanish, english] = row.split(",");
        return { spanish: spanish.trim(), english: english.trim() };
      });
    })
    .catch((err) => console.error("Error loading CSV:", err));

  /* Elements */
  const timerDisplay = document.getElementById("timer");
  const caughtDisplay = document.getElementById("caught");
  const missedDisplay = document.getElementById("missed");
  const toggleGameBtn = document.getElementById("toggle-game");
  const resetGameBtn = document.getElementById("reset-game");
  const toggleTranslationBtn = document.getElementById("toggle-translation");
  const speedControl = document.getElementById("speed-control");
  const wordBox = document.getElementById("word-box");

  /* Button Events */
  toggleGameBtn.addEventListener("click", () => {
    if (!gameRunning) startGame();
    else pauseGame();
  });

  resetGameBtn.addEventListener("click", resetGame);

  toggleTranslationBtn.addEventListener("click", () => {
    translationVisible = !translationVisible;
    toggleTranslationBtn.textContent = translationVisible
      ? "Ocultar Traducción"
      : "Mostrar Traducción";
  });

  speedControl.addEventListener("input", () => {
    dropSpeed = Number(speedControl.value);
  });

  wordBox.addEventListener("click", () => {
    if (!gameRunning || wordBox.textContent === "Haz clic en \"Iniciar\"") return;
    caught++;
    updateScoreboard();
    showNextWord();
  });

  /* ==========================
     Game Logic
     ========================== */
  function startGame() {
    if (words.length === 0) {
      alert("Aún no se han cargado las palabras.");
      return;
    }

    gameRunning = true;
    toggleGameBtn.textContent = "Pausar";
    startTimer();
    showNextWord();
  }

  function pauseGame() {
    gameRunning = false;
    toggleGameBtn.textContent = "Reanudar";
    clearInterval(timerInterval);
  }

  function resetGame() {
    clearInterval(timerInterval);
    timer = 120;
    caught = 0;
    missed = 0;
    gameRunning = false;
    toggleGameBtn.textContent = "Iniciar";
    updateScoreboard();
    wordBox.textContent = "Haz clic en \"Iniciar\"";
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timer--;
      timerDisplay.textContent = timer;
      if (timer <= 0) endGame();
    }, 1000);
  }

  function endGame() {
    clearInterval(timerInterval);
    gameRunning = false;
    alert(`Tiempo terminado.\nAcertadas: ${caught}\nFalladas: ${missed}`);
  }

  function showNextWord() {
    if (!gameRunning || timer <= 0) return;

    const wordData = words[currentWordIndex % words.length];
    currentWordIndex++;

    const text = translationVisible
      ? `${wordData.spanish} (${wordData.english})`
      : wordData.spanish;

    wordBox.textContent = text;

    // Wait before next word
    setTimeout(() => {
      if (!gameRunning) return;
      missed++;
      updateScoreboard();
      showNextWord();
    }, 4000 / (dropSpeed / 2));
  }

  function updateScoreboard() {
    caughtDisplay.textContent = caught;
    missedDisplay.textContent = missed;
    timerDisplay.textContent = timer;
  }
})();
