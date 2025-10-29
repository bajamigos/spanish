(() => {
  // All scoped — nothing leaks to global scope.
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
      if (!response.ok) throw new Error(`CSV load failed: ${response.status}`);
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

    // Isolated elements
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

    // Safety check
    if (!scoreboard || !toggleScoreboardBtn || !wordBox) return;

    // Start hidden
    scoreboard.classList.add("hidden");

    // Toggle scoreboard visibility
    toggleScoreboardBtn.addEventListener("click", () => {
      const hidden = scoreboard.classList.toggle("hidden");
      toggleScoreboardBtn.textContent = hidden ? "Mostrar Marcador" : "Ocultar Marcador";
    });

    // Game controls
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

    // --- Game Logic ---
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

      // Linear mapping: speed 1 → 30s, speed 10 → 10s
      const minTime = 10; // seconds
      const maxTime = 30; // seconds
      const durationSeconds = maxTime - ((speed - 1) * (maxTime - minTime) / 9);
      const duration = durationSeconds * 1000;

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
