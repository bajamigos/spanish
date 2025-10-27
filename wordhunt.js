(() => {
  /* ==========================
     Word Hunt Game Logic (Scoped)
     ========================== */

  let words = [];
  let spanishMode = true;
  let currentWordIndex = 0;
  let timer = 120;
  let timerInterval = null;
  let gameRunning = false;
  let caught = 0;
  let missed = 0;
  let dropSpeed = 5; // user-adjustable
  let translationVisible = false;

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
  const scoreboard = document.getElementById("scoreboard");
  const toggleScoreboardBtn = document.getElementById("toggle-scoreboard");
  const timerDisplay = document.getElementById("timer");
  const caughtDisplay = document.getElementById("caught");
  const missedDisplay = document.getElementById("missed");
  const toggleGameBtn = document.getElementById("toggle-game");
  const resetGameBtn = document.getElementById("reset-game");
  const toggleTranslationBtn = document.getElementById("toggle-translation");
  const speedControl = document.getElementById("speed-control");
  const wordArea = document.getElementById("wordhunt-area");
  const imageContainer = document.querySelector(".image-container img");

  /* Scoreboard toggle */
  toggleScoreboardBtn.addEventListener("click", () => {
    scoreboard.classList.toggle("collapsed");
  });

  /* Game control buttons */
  toggleGameBtn.addEventListener("click", () => {
    if (!gameRunning) startGame();
    else pauseGame();
  });

  resetGameBtn.addEventListener("click", resetGame);

  toggleTranslationBtn.addEventListener("click", () => {
    translationVisible = !translationVisible;
    toggleTranslationBtn.textContent = translationVisible
      ? "🇬🇧 Ocultar Traducción"
      : "🇪🇸 Mostrar Traducción";
  });

  speedControl.addEventListener("input", () => {
    dropSpeed = Number(speedControl.value);
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
    toggleGameBtn.textContent = "⏸️ Pausar";

    startTimer();
    spawnNextWord();
  }

  function pauseGame() {
    gameRunning = false;
    toggleGameBtn.textContent = "▶️ Reanudar";
    clearInterval(timerInterval);
  }

  function resetGame() {
    clearInterval(timerInterval);
    timer = 120;
    caught = 0;
    missed = 0;
    updateScoreboard();
    clearWords();
    gameRunning = false;
    toggleGameBtn.textContent = "▶️ Iniciar";
  }

  /* Timer */
  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timer--;
      timerDisplay.textContent = timer;
      if (timer <= 0) endGame();
    }, 1000);
  }

  /* End of round */
  function endGame() {
    clearInterval(timerInterval);
    gameRunning = false;
    alert(`⏰ Tiempo terminado!\n✅ Acertadas: ${caught}\n❌ Falladas: ${missed}`);
  }

  /* Spawn one word at a time */
  function spawnNextWord() {
    if (!gameRunning || timer <= 0) return;

    const wordData = words[currentWordIndex % words.length];
    currentWordIndex++;

    const wordEl = document.createElement("div");
    wordEl.classList.add("falling-word");
    wordEl.textContent = spanishMode ? wordData.spanish : wordData.english;

    // Random side: left or right of the image
    const containerRect = document
      .querySelector(".game-wrapper")
      .getBoundingClientRect();
    const imageRect = imageContainer.getBoundingClientRect();
    const leftZone = Math.random() < 0.5;

    let xPos;
    if (leftZone) {
      // left side
      xPos = Math.random() * (imageRect.left - containerRect.left - 100);
    } else {
      // right side
      const rightStart = imageRect.right - containerRect.left + 100;
      xPos =
        rightStart + Math.random() * (containerRect.width - rightStart - 50);
    }

    wordEl.style.left = `${xPos}px`;
    wordEl.style.top = `0px`;
    wordArea.appendChild(wordEl);

    const fallDuration = 4000 / (dropSpeed / 2); // speed factor
    const start = Date.now();

    function fall() {
      if (!gameRunning) return;
      const elapsed = Date.now() - start;
      const progress = elapsed / fallDuration;
      const y = progress * (wordArea.clientHeight - 40);
      wordEl.style.top = `${y}px`;

      if (translationVisible) {
        wordEl.textContent = spanishMode
          ? `${wordData.spanish} (${wordData.english})`
          : `${wordData.english} (${wordData.spanish})`;
      }

      if (progress < 1) {
        requestAnimationFrame(fall);
      } else {
        if (wordEl.parentElement) wordArea.removeChild(wordEl);
        missed++;
        updateScoreboard();
        if (gameRunning) setTimeout(spawnNextWord, 500);
      }
    }

    requestAnimationFrame(fall);

    wordEl.addEventListener("click", () => {
      if (!gameRunning) return;
      caught++;
      updateScoreboard();
      if (wordEl.parentElement) wordEl.remove();
      setTimeout(spawnNextWord, 500);
    });
  }

  function clearWords() {
    wordArea.innerHTML = "";
  }

  /* Update scoreboard */
  function updateScoreboard() {
    caughtDisplay.textContent = caught;
    missedDisplay.textContent = missed;
    timerDisplay.textContent = timer;
  }
})();
