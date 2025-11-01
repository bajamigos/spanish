const webhookUrl = 'https://hooks.zapier.com/hooks/catch/25050495/urdpdfu/';

let timerInterval, seconds = 120, isRunning = false;
let mediaRecorder, audioChunks = [];

function updateTimerDisplay() {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('timer').textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (seconds <= 0) stopTimer();
}

function startTimer() {
    if (!isRunning && seconds > 0) {
        timerInterval = setInterval(() => {
            seconds--;
            updateTimerDisplay();
            if (seconds <= 0) stopTimer();
        }, 1000);
        isRunning = true;
    }
}

function stopTimer() {
    clearInterval(timerInterval);
    isRunning = false;
}

function resetTimer() {
    stopTimer();
    seconds = 120;
    updateTimerDisplay();
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            sendToZapier(audioBlob);
        };
        mediaRecorder.start();
        startTimer(); // Timer starts with recording.
        console.log('Recording—say something fun!');
    } catch (error) {
        alert('Mic trouble: ' + error.message);
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        stopTimer();
    }
}

async function sendToZapier(audioBlob) {
    const formData = new FormData();
    const timestamp = new Date().toISOString();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('timestamp', timestamp);
    formData.append('task', taskName); // taskName is defined in each page's script
    try {
        const response = await fetch(webhookUrl, { method: 'POST', body: formData });
        if (response.ok) {
            alert('Sent to your Drive—good job!');
        } else {
            throw new Error('Send failed');
        }
    } catch (error) {
        alert('Error: ' + error.message + '. Check wifi!');
    }
}

function attachEventListeners() {
    const startTimerBtn = document.getElementById('start-timer-btn');
    const startRecordBtn = document.getElementById('start-record-btn');
    const stopBtn = document.getElementById('stop-btn');
    const resetBtn = document.getElementById('reset-btn');
    if (startTimerBtn) startTimerBtn.addEventListener('click', startTimer);
    if (startRecordBtn) startRecordBtn.addEventListener('click', startRecording);
    if (stopBtn) stopBtn.addEventListener('click', () => {
        stopTimer();
        stopRecording();
    });
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);
}

async function updateProgress() {
    try {
        const response = await fetch('https://siele-elf-6477d7a8fbd0.herokuapp.com/progress');
        if (!response.ok) throw new Error('Elf is napping');
        const data = await response.json();
        const flashText = document.getElementById('flash-text');
        const pronText = document.getElementById('pron-text');
        const errorText = document.getElementById('error-text');
        const flashBar = document.getElementById('flash-bar');
        const pronBar = document.getElementById('pron-bar');
        const errorBar = document.getElementById('error-bar');
        const tutorsList = document.getElementById('top-tutors');
        if (flashText) flashText.textContent = `${data.flash.total}/50 (${data.flash.percent}%)`;
        if (pronText) pronText.textContent = `${data.pron.total}/50 (${data.pron.percent}%)`;
        if (errorText) errorText.textContent = `${data.error.total}/50 (${data.error.percent}%)`;
        if (flashBar) flashBar.value = data.flash.total;
        if (pronBar) pronBar.value = data.pron.total;
        if (errorBar) errorBar.value = data.error.total;
        if (tutorsList) tutorsList.innerHTML = data.topTutors.map((tutor, index) => `<li>${index + 1}. ${tutor}</li>`).join('');
        console.log('Numbers updated!');
    } catch (error) {
        console.error('Elf trouble:', error);
        // Backup numbers if elf is gone.
        const flashText = document.getElementById('flash-text');
        const pronText = document.getElementById('pron-text');
        const errorText = document.getElementById('error-text');
        const flashBar = document.getElementById('flash-bar');
        const pronBar = document.getElementById('pron-bar');
        const errorBar = document.getElementById('error-bar');
        const tutorsList = document.getElementById('top-tutors');
        if (flashText) flashText.textContent = '28/50 (56%)';
        if (pronText) pronText.textContent = '35/50 (70%)';
        if (errorText) errorText.textContent = '42/50 (84%)';
        if (flashBar) flashBar.value = 28;
        if (pronBar) pronBar.value = 35;
        if (errorBar) errorBar.value = 42;
        if (tutorsList) tutorsList.innerHTML = '<li>1. Maria - 45</li><li>2. Alex - 38</li><li>3. Sofia - 32</li>';
    }
}

function handleResponsive() {
    const isMobile = window.innerWidth < 768;
    const progressSection = document.querySelector('.progress-section');
    if (progressSection) {
        progressSection.style.flexDirection = isMobile ? 'row' : 'row';
    }
}

async function loadIncludes(headerCallback = () => {}) {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const footerPlaceholder = document.getElementById('footer-placeholder');
    try {
        const headerResponse = await fetch('header.html');
        if (!headerResponse.ok) throw new Error('Header not found');
        headerPlaceholder.innerHTML = await headerResponse.text();
        headerCallback(); // Run page-specific header init if provided
        const footerResponse = await fetch('footer.html');
        if (!footerResponse.ok) throw new Error('Footer not found');
        footerPlaceholder.innerHTML = await footerResponse.text();
        console.log('Header and footer are ready!');
        attachEventListeners();
        updateTimerDisplay();
        updateProgress();
        setInterval(updateProgress, 30000);
        handleResponsive();
    } catch (error) {
        console.error('Problem loading:', error);
        headerPlaceholder.innerHTML = '<div class="header-card"><a href="index.html" class="home-button">[HOME]</a><h1>SIELE S4 Study Guide</h1></div>';
        footerPlaceholder.innerHTML = '<div class="footer-card"><p>Backup footer—find the real one!</p></div>';
    }
}
