/* --- CONFIGURATION & DOM ELEMENTS --- */
const circle = document.querySelector('.progress-ring__circle');
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const mainBtn = document.getElementById('main-btn');
const resetBtn = document.getElementById('reset-btn');
const modeBtns = document.querySelectorAll('.mode-btn');
const statusText = document.getElementById('timer-status');
const themeToggle = document.getElementById('theme-toggle');
const tipContainer = document.getElementById('tip-container');
const tipText = document.getElementById('tip-text');
const streakDisplay = document.getElementById('streak-count');
const sessionDisplay = document.getElementById('session-count');
const soundToggle = document.getElementById('sound-toggle');

// State Variables
let timerInterval = null;
let timeLeft = 25 * 60; // seconds
let totalTime = 25 * 60;
let isRunning = false;
let currentMode = 'focus'; // focus, deep, short, long
let soundEnabled = true;

// Persistence Data
let stats = {
    streak: 0,
    lastActiveDate: null,
    dailySessions: 0
};

/* --- INITIALIZATION --- */
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = circumference;

// Load Data
loadStats();
loadTheme();
updateInterface();

// Request Notification Permission
if ("Notification" in window) {
    Notification.requestPermission();
}

/* --- EVENT LISTENERS --- */
mainBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);
soundToggle.addEventListener('click', toggleSound);
themeToggle.addEventListener('click', toggleTheme);

// Mode Switching
modeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        switchMode(e.target.dataset.mode, parseInt(e.target.dataset.time));
        // Update active class
        modeBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
    });
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault(); // Prevent scroll
        toggleTimer();
    }
});

/* --- CORE FUNCTIONS --- */

function toggleTimer() {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    mainBtn.textContent = "Pause";
    mainBtn.style.backgroundColor = "var(--text-secondary)";
    
    // Hide tips while focusing
    tipContainer.classList.add('hidden');

    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateInterface();
        } else {
            handleTimerComplete();
        }
    }, 1000);
}

function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    mainBtn.textContent = "Resume";
    mainBtn.style.backgroundColor = "var(--accent-color)";
}

function resetTimer() {
    pauseTimer();
    // Reset time based on current mode
    const activeBtn = document.querySelector('.mode-btn.active');
    timeLeft = parseInt(activeBtn.dataset.time) * 60;
    updateInterface();
    mainBtn.textContent = `Start ${currentMode === 'focus' || currentMode === 'deep' ? 'Focus' : 'Break'}`;
    
    // Reset Ring
    setProgress(0); // 0% progress (full circle)
}

function switchMode(mode, minutes) {
    pauseTimer();
    currentMode = mode;
    totalTime = minutes * 60;
    timeLeft = totalTime;
    
    // Update Theme Colors based on mode
    const root = document.documentElement;
    if (mode === 'short' || mode === 'long') {
        root.style.setProperty('--accent-color', '#43c6ac'); // Green for breaks
        statusText.textContent = "Recharge Time";
    } else {
        // Check dark mode for color choice
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        root.style.setProperty('--accent-color', isDark ? '#7678ed' : '#4a90e2');
        statusText.textContent = "Focus Time";
    }

    updateInterface();
    mainBtn.textContent = "Start";
    
    // Immediate progress reset without animation lag
    circle.style.strokeDashoffset = 0; 
}

function updateInterface() {
    // 1. Update Time Text
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    timeDisplay.textContent = formattedTime;
    document.title = `${formattedTime} - SmartFocus`; // Update Browser Tab

    // 2. Update Progress Ring
    // Calculate percentage passed
    const timePassed = totalTime - timeLeft;
    const offset = circumference - (timePassed / totalTime) * circumference;
    circle.style.strokeDashoffset = offset;
}

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

/* --- LOGIC HANDLERS --- */

function handleTimerComplete() {
    pauseTimer();
    playNotificationSound();
    
    // Mobile Vibration
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    if (currentMode === 'focus' || currentMode === 'deep') {
        // Session Completed
        completeSession();
        showNotification("Great Job!", "Focus session complete. Time for a break.");
        
        // Suggest Break Mode
        statusText.textContent = "Session Complete!";
        showHealthTip();
    } else {
        // Break Completed
        showNotification("Break Over", "Time to get back to work!");
        statusText.textContent = "Break Over";
        tipContainer.classList.add('hidden');
    }
    
    mainBtn.textContent = "Start Next";
}

function completeSession() {
    const today = new Date().toDateString();
    
    // Check for streak reset
    if (stats.lastActiveDate !== today) {
        // If it's not today, check if it was yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (stats.lastActiveDate !== yesterday.toDateString()) {
            stats.streak = 0; // Reset streak if missed a day
        }
        stats.dailySessions = 0; // Reset daily count
        stats.lastActiveDate = today;
    }

    stats.dailySessions++;
    stats.streak++;
    saveStats();
    updateStatsDisplay();
}

/* --- FEATURES: TIPS, AUDIO, STORAGE --- */

const healthTips = [
    { icon: '👀', text: "Look at something 20 feet away for 20 seconds." },
    { icon: '💧', text: "Hydrate! Drink a full glass of water." },
    { icon: '🧘', text: "Stretch your neck and shoulders." },
    { icon: '🌬️', text: "Take 5 deep breaths. Inhale 4s, Hold 4s, Exhale 4s." },
    { icon: '🚶', text: "Stand up and walk around the room once." }
];

function showHealthTip() {
    const randomTip = healthTips[Math.floor(Math.random() * healthTips.length)];
    tipText.textContent = randomTip.text;
    tipContainer.querySelector('.tip-icon').textContent = randomTip.icon;
    tipContainer.classList.remove('hidden');
}

// Web Audio API for a nice chime (No external files)
function playNotificationSound() {
    if (!soundEnabled) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'sine';
    // Play a nice "Ding" (E5 note)
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    soundToggle.innerHTML = soundEnabled ? '<span class="sound-icon">🔊</span>' : '<span class="sound-icon">🔇</span>';
    soundToggle.classList.toggle('active');
}

function showNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, { body: body, icon: "favicon.ico" });
    }
}

/* --- STORAGE HELPER --- */
function saveStats() {
    localStorage.setItem('smartFocusStats', JSON.stringify(stats));
}

function loadStats() {
    const saved = localStorage.getItem('smartFocusStats');
    if (saved) {
        stats = JSON.parse(saved);
        
        // Check if day changed while app was closed to reset daily count display
        const today = new Date().toDateString();
        if (stats.lastActiveDate !== today) {
            stats.dailySessions = 0;
            saveStats();
        }
    }
    updateStatsDisplay();
}

function updateStatsDisplay() {
    streakDisplay.textContent = stats.streak;
    sessionDisplay.textContent = stats.dailySessions;
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '<span class="icon">🌙</span>';
    } else {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '<span class="icon">☀️</span>';
    }
    
    // Update ring color for current mode
    switchMode(currentMode, totalTime / 60);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<span class="icon">☀️</span>';
    }
}
