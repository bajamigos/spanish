(() => {
  // Everything is scoped and isolated
  let words = [];
  let gameRunning = false;
  let translationVisible = false;
  let timer = 120;
  let caught = 0;
  let missed = 0;
  let speed = 5;
  let timerInterval = null;
  let nextWordTimeout = null;
  let currentWordIndex = -1;

  async function loadWords() {
    try {
      const response = await fetch("wordlist.csv");
      const text = await response.text();
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      const [header, ...rows] = lines;
      words = rows.map((r) => {
        const [spanish, english] = r.split(",");
        return { spanish: spanish.trim(), english: english.trim() };
      });
      console.log(`Wordhunt: loaded ${words.length} words`);
    } catch (err) {
      console.error("Wordhunt CSV error:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await loadWords();

    // Local, isolated selectors
    const scoreboard = document.getElementById("wordhunt-scoreboard");
    const toggleScoreboardBtn = document.getElementById("toggle-wordhunt-scoreboard");
    const wordBox = document.getElementById("wordhunt-word-box");
    const timerDisplay = document.getElementById("wordhunt-timer");
    const caughtDisplay = document.getElementById("wordhunt-caught");
    const missedDisplay = document.getElementById("wordhunt-missed");
    const toggleGameBtn = document.getElementById("wordhunt-toggle-game");
    const toggleTranslationBtn = document.getElementById("wordhunt-toggle-translation");
    const speedControl = document.getElementById("wordhunt-speed-control");
    const resetBtn = document.getElementById("wordhunt-reset-game");

    // Make sure all exist (defensive)
    if (!wordBox) {
      console.error("Wordhunt: missing game elements");
      return;
    }

    // Independent toggle button
    toggleScoreboardBtn.addEventListener("click", () => {
      scoreboard.classList.toggle("hidden");
      toggleScoreboardBtn.textContent = scoreboard.classList.contains("hidden")
        ? "Mostrar Marcador"
        : "Ocultar Marcador";
    });

    toggleGameBtn.addEventListener("click", () => {
      if (!gameRunning) startGame();
      else pauseGame();
    });

    toggleTranslationBtn.addEventListener("click", () => {
      translationVisible = !translationVisible;
      toggleTranslationBtn.textContent = translationVisible
        ? "Ocultar Traducción"
        : "Mostrar Traducción";
      refreshWord();
    });

    speedControl.addEventListener("input", () => {
      const val = Number(speedControl.value);
      speed = val >= 1 && val <= 10 ? val : 5;
    });

    resetBtn.addEventListener("click", resetGame);

    wordBox.addEventListener("click", () => {
      if (!gameRunning || !wordBox.dataset.hasWord) return;
      caught++;
      updateStats();
      nextWord();
    });

    // Functions
    function startGame() {
      if (words.length === 0) {
        alert("No se han cargado las palabras todavía.");
        return;
      }
      gameRunning = true;
      toggleGameBtn.textContent = "Pausar";
      startTimer();
      nextWord();
    }

    function pauseGame() {
      gameRunning = false;
      toggleGameBtn.textContent = "Reanudar";
      clearInterval(timerInterval);
      clearTimeout(nextWordTimeout);
    }

    function resetGame() {
      clearInterval(timerInterval);
      clearTimeout(nextWordTimeout);
      timer = 120;
      caught = 0;
      missed = 0;
      gameRunning = false;
      toggleGameBtn.textContent = "Iniciar";
      wordBox.textContent = 'Haz clic en "Iniciar"';
      wordBox.dataset.hasWord = "";
      updateStats();
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
      clearTimeout(nextWordTimeout);
      gameRunning = false;
      toggleGameBtn.textContent = "Iniciar";
      wordBox.textContent = "Juego Terminado";
      wordBox.dataset.hasWord = "";
      alert(`Tiempo terminado.\nAcertadas: ${caught}\nFalladas: ${missed}`);
    }

    function nextWord() {
      if (!gameRunning || timer <= 0) return;
      currentWordIndex = Math.floor(Math.random() * words.length);
      const { spanish, english } = words[currentWordIndex];
      wordBox.textContent = translationVisible
        ? `${spanish} (${english})`
        : spanish;
      wordBox.dataset.hasWord = "1";

      clearTimeout(nextWordTimeout);
      const duration = Math.max(800, 4000 / (speed / 2));
      nextWordTimeout = setTimeout(() => {
        if (gameRunning) {
          missed++;
          updateStats();
          nextWord();
        }
      }, duration);
    }

    function refreshWord() {
      if (!wordBox.dataset.hasWord || currentWordIndex < 0) return;
      const { spanish, english } = words[currentWordIndex];
      wordBox.textContent = translationVisible
        ? `${spanish} (${english})`
        : spanish;
    }

    function updateStats() {
      timerDisplay.textContent = timer;
      caughtDisplay.textContent = caught;
      missedDisplay.textContent = missed;
    }
  });
})();
