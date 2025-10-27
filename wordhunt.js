(() => {
  let words = [];
  let spanishMode = true;
  let currentWordIndex = 0;
  let timer = 120;
  let timerInterval = null;
  let gameRunning = false;
  let caught = 0;
  let missed = 0;
  let translationVisible = false;
  let dropSpeed = 5;
  let nextWordTimeout = null;

  document.addEventListener("DOMContentLoaded", async () => {
    await loadWordCSV();

    const scoreboard = document.getElementById("scoreboard");
    const toggleScoreboardBtn = document.getElementById("toggle-scoreboard");
    const timerDisplay = document.getElementById("timer");
    const caughtDisplay = document.getElementById("caught");
    const missedDisplay = document.getElementById("missed");
    const toggleGameBtn = document.getElementById("toggle-game");
    const resetGameBtn = document.getElementById("reset-game");
    const toggleTranslationBtn = document.getElementById("toggle-translation");
    const speedControl = document.getElementById("speed-control");
    const wordBox = document.getElementById("word-box");

    // Safety check
    if (!scoreboard || !toggleGameBtn || !wordBox) {
      console.error("Missing essential elements in HTML.");
      return;
    }

    /* Toggle scoreboard visibility */
    toggleScoreboardBtn.addEventListener("click", () => {
      scoreboard.classList.toggle("hidden");
      toggleScoreboardBtn.textContent = scoreboard.classList.contains("hidden")
        ? "Mostrar Marcador"
        : "Ocultar Marcador";
    });

    /* Core controls */
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
      refreshCurrentBoxText();
    });

    speedControl.addEventListener("input", () => {
      const val = Number(speedControl.value);
      dropSpeed = isFinite(val) && val > 0 ? val : 5;
    });

    wordBox.addEventListener("click", () => {
      if (!gameRunning || !wordBox.dataset.hasWord) return;
      caught++;
      updateScoreboard();
      showNextWordImmediate();
    });

    updateScoreboard();
    wordBox.textContent = 'Haz clic en "Iniciar"';

    /* === Functions === */
    async function loadWordCSV(path = "wordlist.csv") {
      try {
        const res = await fetch(path);
        const text = await res.text();
        const rows = text.trim().split("\n").slice(1).filter(Boolean);
        words = rows.map((r) => {
          const [spanish, english] = r.split(",");
          return { spanish: spanish.trim(), english: english.trim() };
        });
      } catch (err) {
        console.error("Error loading CSV:", err);
      }
    }

    function startGame() {
      if (words.length === 0) {
        alert("Aún no se han cargado las palabras.");
        return;
      }
      gameRunning = true;
      toggleGameBtn.textContent = "Pausar";
      startTimer();
      showNextWordImmediate();
    }

    function pauseGame() {
      gameRunning = false;
      toggleGameBtn.textContent = "Reanudar";
      clearInterval(timerInterval);
      clearPendingWord();
    }

    function resetGame() {
      clearInterval(timerInterval);
      clearPendingWord();
      timer = 120;
      caught = 0;
      missed = 0;
      gameRunning = false;
      toggleGameBtn.textContent = "Iniciar";
      updateScoreboard();
      wordBox.textContent = 'Haz clic en "Iniciar"';
      wordBox.dataset.hasWord = "";
      currentWordIndex = 0;
    }

    function startTimer() {
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        timer--;
        updateScoreboard();
        if (timer <= 0) endGame();
      }, 1000);
    }

    function endGame() {
      clearInterval(timerInterval);
      clearPendingWord();
      gameRunning = false;
      toggleGameBtn.textContent = "Iniciar";
      wordBox.dataset.hasWord = "";
      alert(`Tiempo terminado.\nAcertadas: ${caught}\nFalladas: ${missed}`);
    }

    function clearPendingWord() {
      if (nextWordTimeout) {
        clearTimeout(nextWordTimeout);
        nextWordTimeout = null;
      }
    }

    function showNextWordImmediate() {
      clearPendingWord();
      if (!gameRunning || timer <= 0) return;

      const wd = words[currentWordIndex % words.length];
      currentWordIndex++;

      const text = translationVisible
        ? `${wd.spanish} (${wd.english})`
        : wd.spanish;

      wordBox.textContent = text;
      wordBox.dataset.hasWord = "1";

      const intervalMs = Math.max(600, Math.round(4000 / (dropSpeed / 2)));
      nextWordTimeout = setTimeout(() => {
        if (!gameRunning) return;
        missed++;
        updateScoreboard();
        showNextWordImmediate();
      }, intervalMs);
    }

    function refreshCurrentBoxText() {
      if (!wordBox.dataset.hasWord) return;
      const idx = ((currentWordIndex - 1) % words.length + words.length) % words.length;
      const wd = words[idx];
      if (!wd) return;
      wordBox.textContent = translationVisible
        ? `${wd.spanish} (${wd.english})`
        : wd.spanish;
    }

    function updateScoreboard() {
      timerDisplay.textContent = timer;
      caughtDisplay.textContent = caught;
      missedDisplay.textContent = missed;
    }
  });
})();
