// Word list (hardcoded from provided CSV for reliability; can be replaced with fetch if needed)
const words = [
  { spanish: "gato", english: "cat" },
  { spanish: "perro", english: "dog" },
  { spanish: "pájaro", english: "bird" },
  { spanish: "pez", english: "fish" },
  { spanish: "caballo", english: "horse" }
];

// Game variables
let gameRunning = false;
let timerInterval;
let wordInterval;
let timeLeft = 120;
let caught = 0;
let missed = 0;
let currentWordIndex = -1;
let translationVisible = false;
let speed = 5; // Default speed (1-10, lower = faster)

// Elements (using unique IDs to avoid conflicts)
const wordBox = document.getElementById('word-box');
const timerDisplay = document.getElementById('game-timer');
const caughtDisplay = document.getElementById('caught');
const missedDisplay = document.getElementById('missed');
const toggleGameBtn = document.getElementById('toggle-game');
const toggleTranslationBtn = document.getElementById('toggle-translation');
const speedControl = document.getElementById('speed-control');
const resetBtn = document.getElementById('reset-game');

// Event listeners
toggleGameBtn.addEventListener('click', toggleGame);
toggleTranslationBtn.addEventListener('click', toggleTranslation);
speedControl.addEventListener('input', updateSpeed);
resetBtn.addEventListener('click', resetGame);
wordBox.addEventListener('click', catchWord);

// Functions
function toggleGame() {
  gameRunning = !gameRunning;
  toggleGameBtn.textContent = gameRunning ? 'Pausar' : 'Iniciar';
  if (gameRunning) {
    startTimer();
    showNextWord();
  } else {
    clearInterval(timerInterval);
    clearTimeout(wordInterval);
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function showNextWord() {
  if (!gameRunning) return;

  currentWordIndex = Math.floor(Math.random() * words.length);
  wordBox.textContent = words[currentWordIndex].spanish;
  wordBox.style.color = 'black'; // Reset color

  const wordDuration = (11 - speed) * 1000; // Speed 1: 10s, Speed 10: 1s
  wordInterval = setTimeout(() => {
    if (gameRunning) {
      missed++;
      missedDisplay.textContent = missed;
      showNextWord();
    }
  }, wordDuration);
}

function catchWord() {
  if (gameRunning && currentWordIndex !== -1) {
    clearTimeout(wordInterval);
    caught++;
    caughtDisplay.textContent = caught;
    showNextWord();
  }
}

function toggleTranslation() {
  translationVisible = !translationVisible;
  toggleTranslationBtn.textContent = translationVisible ? 'Ocultar Traducción' : 'Mostrar Traducción';
  if (translationVisible && currentWordIndex !== -1) {
    wordBox.textContent = words[currentWordIndex].english;
    wordBox.style.color = 'blue'; // Visual cue
  } else if (currentWordIndex !== -1) {
    wordBox.textContent = words[currentWordIndex].spanish;
    wordBox.style.color = 'black';
  }
}

function updateSpeed() {
  speed = parseInt(speedControl.value);
}

function resetGame() {
  endGame();
  timeLeft = 120;
  caught = 0;
  missed = 0;
  timerDisplay.textContent = timeLeft;
  caughtDisplay.textContent = caught;
  missedDisplay.textContent = missed;
  wordBox.textContent = 'Haz clic en "Iniciar"';
  toggleGameBtn.textContent = 'Iniciar';
  translationVisible = false;
  toggleTranslationBtn.textContent = 'Mostrar Traducción';
  speedControl.value = 5;
  speed = 5;
}

function endGame() {
  gameRunning = false;
  clearInterval(timerInterval);
  clearTimeout(wordInterval);
  toggleGameBtn.textContent = 'Iniciar';
  wordBox.textContent = 'Juego Terminado';
}
