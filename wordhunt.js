(() => {
  /* wordhunt.js
     Robust single-word "Word Hunt" game logic
     - No external CSV parser required
     - Waits for DOMContentLoaded
     - Defensive checks + helpful console messages
  */

  // Scoped state
  let words = [];
  let translationVisible = false;
  let timeLeft = 120;
  let timerInterval = null;
  let nextWordTimeout = null;
  let gameRunning = false;
  let caught = 0;
  let missed = 0;
  let currentWordIndex = -1;
  let speed = 5; // 1..10 (higher = faster)

  // Safe CSV loader (expects header with "spanish,english")
  async function loadCSV(path = "wordlist.csv") {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
      const text = await res.text();
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length <= 1) {
        console.warn("CSV appears empty or only header.", lines);
        words = [];
        return;
      }
      const header = lines[0].split(",").map(h => h.trim().toLowerCase());
      const spanishIdx = header.indexOf("spanish");
      const englishIdx = header.indexOf("english");

      words = lines.slice(1).map(line => {
        // split only on first comma pairs to be resilient if English contains commas
        const parts = line.split(",");
        // fallback when CSV columns are simple
        const spanish = (parts[0] || "").trim();
        const english = (parts.length > 1 ? parts.slice(1).join(",") : "").trim();
        return { spanish, english };
      });

      console.log(`Loaded ${words.length} words from ${path}`);
    } catch (err) {
      console.error("Error loading CSV:", err);
      words = [];
    }
  }

  // DOM-ready entry
  document.addEventListener("DOMContentLoaded", async () => {
    await loadCSV();

    // Query UI elements (IDs must match task1.html)
    const wordBox = document.getElementById("word-box");
    const timerDisplay = document.getElementById("timer");
    const caughtDisplay = document.getElementById("caught");
    const missedDisplay = document.getElementById("missed");
    const toggleGameBtn = document.getElementById("toggle-game");
    const toggleTranslationBtn = document.getElementById("toggle-translation");
    const speedControl = document.getElementById("speed-control");
    const resetBtn = document.getElementById("reset-game");
    const toggleScoreboardBtn = document.getElementById("toggle-scoreboard");
    const scoreboard = document.getElementById("scoreboard");

    // Basic presence checks
    if (!wordBox || !timerDisplay || !caughtDisplay || !missedDisplay || !toggleGameBtn || !toggleTranslationBtn || !speedControl || !resetBtn) {
      console.error("wordhunt.js: missing required DOM elements. Verify IDs in task1.html.");
      console.log({
        wordBox: !!wordBox,
        timerDisplay: !!timerDisplay,
        caughtDisplay: !!caughtDisplay,
        missedDisplay: !!missedDisplay,
        toggleGameBtn: !!toggleGameBtn,
        toggleTranslationBtn: !!toggleTranslationBtn,
        speedControl: !!speedControl,
        resetBtn: !!resetBtn,
        toggleScoreboardBtn: !!toggleScoreboardBtn,
      });
      return;
    }

    // Initialize UI
    timerDisplay.textContent = timeLeft;
    caughtDisplay.textContent = caught;
    missedDisplay.textContent = missed;
    wordBox.textContent = 'Haz clic en "Iniciar"';
    wordBox.dataset.hasWord = "";

    // --- Event listeners ---
    toggleGameBtn.addEventListener("click", () => {
      if (!gameRunning) startGame();
      else pauseGame();
    });

    toggleTranslationBtn.addEventListener("click", () => {
      translationVisible = !translationVisible;
      toggleTranslationBtn.textContent = translationVisible ? "Ocultar Traducción" : "Mostrar Traducción";
      refreshCurrentWordText();
    });

    speedControl.addEventListener("input", () => {
      const v = Number(speedControl.value);
      if (Number.isFinite(v) && v >= 1 && v <= 10) speed = v;
      else speed = 5;
    });

    resetBtn.addEventListener("click", resetGame);

    if (toggleScoreboardBtn && scoreboard) {
      // toggle button near Nueva Foto
      toggleScoreboardBtn.addEventListener("click", () => {
        scoreboard.classList.toggle("hidden");
        toggleScoreboardBtn.textContent = scoreboard.classList.contains("hidden") ? "Mostrar Marcador" : "Ocultar Marcador";
      });
    }

    // Clicking the boxed word marks it as "caught"
    wordBox.addEventListener("click", () => {
      if (!gameRunning) return;
      if (!wordBox.dataset.hasWord) return; // nothing to catch
      clearPendingWord();
      caught++;
      updateDisplays();
      scheduleNextWordImmediate();
    });

    // --- Core game functions ---
    function startGame() {
      if (words.length === 0) {
        alert("No hay palabras cargadas. Asegúrate de que wordlist.csv exista y tenga contenido.");
        return;
      }
      if (gameRunning) return;
      gameRunning = true;
      toggleGameBtn.textContent = "Pausar";
      startTimer();
      scheduleNextWordImmediate();
      console.log("Game started");
    }

    function pauseGame() {
      if (!gameRunning) return;
      gameRunning = false;
      toggleGameBtn.textContent = "Reanudar";
      clearInterval(timerInterval);
      clearPendingWord();
      console.log("Game paused");
    }

    function resetGame() {
      clearInterval(timerInterval);
      clearPendingWord();
      timeLeft = 120;
      timerDisplay.textContent = timeLeft;
      caught = 0;
      missed = 0;
      currentWordIndex = -1;
      gameRunning = false;
      toggleGameBtn.textContent = "Iniciar";
      wordBox.textContent = 'Haz clic en "Iniciar"';
      wordBox.dataset.hasWord = "";
      updateDisplays();
      console.log("Game reset");
    }

    function endGame() {
      gameRunning = false;
      clearInterval(timerInterval);
      clearPendingWord();
      toggleGameBtn.textContent = "Iniciar";
      wordBox.textContent = "Juego Terminado";
      wordBox.dataset.hasWord = "";
      alert(`Tiempo terminado.\nAcertadas: ${caught}\nFalladas: ${missed}`);
      console.log("Game ended");
    }

    function startTimer() {
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = timeLeft;
        if (timeLeft <= 0) {
          endGame();
        }
      }, 1000);
    }

    function clearPendingWord() {
      if (nextWordTimeout) {
        clearTimeout(nextWordTimeout);
        nextWordTimeout = null;
      }
    }

    function scheduleNextWordImmediate() {
      // choose new random word and show immediately
      clearPendingWord();
      if (!gameRunning || timeLeft <= 0) return;
      if (words.length === 0) return;

      currentWordIndex = Math.floor(Math.random() * words.length);
      showCurrentWord();
      // schedule auto-miss for this word
      const durationMs = Math.max(600, Math.round(4000 / (speed / 2))); // faster with larger speed
      nextWordTimeout = setTimeout(() => {
        // if still active, count as missed and go to next
        if (!gameRunning) return;
        if (!wordBox.dataset.hasWord) return;
        missed++;
        updateDisplays();
        scheduleNextWordImmediate();
      }, durationMs);
    }

    function showNextWord() {
      // same as scheduleNextWordImmediate but keeps any existing index flow
      scheduleNextWordImmediate();
    }

    function showCurrentWord() {
      const wd = words[currentWordIndex];
      if (!wd) {
        wordBox.textContent = "";
        wordBox.dataset.hasWord = "";
        return;
      }
      wordBox.textContent = translationVisible ? `${wd.spanish} (${wd.english})` : wd.spanish;
      wordBox.style.color = ""; // default color (inherit)
      wordBox.dataset.hasWord = "1";
    }

    function refreshCurrentWordText() {
      if (!wordBox.dataset.hasWord) return;
      if (currentWordIndex < 0 || !words[currentWordIndex]) return;
      showCurrentWord();
    }

    function updateDisplays() {
      timerDisplay.textContent = timeLeft;
      caughtDisplay.textContent = caught;
      missedDisplay.textContent = missed;
    }

    // Expose nothing to global scope; everything handled inside the listener
    console.log("wordhunt.js ready");
  }); // end DOMContentLoaded
})(); // end IIFE
