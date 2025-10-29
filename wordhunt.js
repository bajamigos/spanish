(() => {
  // --- Game State ---
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

  // --- Load Words from CSV ---
  async function loadWords() {
    try {
      const response = await fetch("wordlist.csv");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      const [header, ...rows] = lines;
      const wordsParsed = rows.map((r) => {
        const [spanish, english] = r.split(",");
        return { spanish: spanish.trim(), english: english.trim() };
      });
      words = wordsParsed;
      console.log(`Loaded ${words.length} words`);
    } catch (err) {
      console.error("Error loading CSV:", err);
      words = [];
    }
  }

  // --- Wait for DOM ---
  document.addEventListener("DOMContentLoaded", async () => {
    await loadWords();

    const scoreboard = document.getElementById("scoreboard");
    const toggleScoreboardBtn = document.getElementById("toggle-scoreboard");
    const wordBox = document.getElementById("word-box");
    const timerDisplay = document.getElementById("timer");
    const caughtDisplay = document.getElementById("caught");
    const missedDisplay = document.getElementById("missed");
    const toggleGameBtn = document.getElementById("toggle-game");
    const toggleTranslationBtn = document.getElementById("toggle-translation");
    const speedControl = document.getElementById("speed-control");
    const resetBtn = document.getElementById("reset-game");

    // --- Event Listeners ---
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
      refreshWordText();
    });

    speedControl.addEventListener("input", () => {
      const val = Number(speedControl.value);
      if (Number.isFinite(val) && val >= 1 && val <= 10) speed = val;
    });

    resetBtn.addEventListener("click", resetGame);

    wordBox.addEventListener("click", () => {
      if (!gameRunning || !wordBox.dataset.hasWord) return;
      caught++;
      updateDisplay();
      nextWord();
    });

    // --- Functions ---
    function startGame() {
      if (words.length === 0) {
        alert("No se han cargado las palabras aún.");
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
      updateDisplay();
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
      wordBox.dataset.hasWord = "1";
      wordBox.textContent = translationVisible ? `${spanish} (${english})` : spanish;

      const duration = Math.max(800, 4000 / (speed / 2));
      clearTimeout(nextWordTimeout);
      nextWordTimeout = setTimeout(() => {
        if (gameRunning) {
          missed++;
          updateDisplay();
          nextWord();
        }
      }, duration);
    }

    function refreshWordText() {
      if (!wordBox.dataset.hasWord || currentWordIndex < 0) return;
      const { spanish, english } = words[currentWordIndex];
      wordBox.textContent = translationVisible ? `${spanish} (${english})` : spanish;
    }

    function updateDisplay() {
      timerDisplay.textContent = timer;
      caughtDisplay.textContent = caught;
      missedDisplay.textContent = missed;
    }
  });
})();
