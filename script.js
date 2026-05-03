/* =========================================
   GYM TRACKER v3.0 - script.js
   ========================================= */

// ---------- CONSTANTES ----------
const STORAGE_KEY = 'gymTrackerData';
const DEFAULT_DATA = {
    records: {},
    restDays: [],
    startDate: null,
    lastKnownTier: 0,
};

const MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Rangos (9 niveles ahora)
const RANK_NAMES = [
    null,           // tier 0 - sin rango
    'Aprendiz',     // tier 1 (días 1-10)   - amarillo
    'Iniciante',    // tier 2 (días 11-20)  - naranja
    'Constante',    // tier 3 (días 21-30)  - rojo
    'Comprometido', // tier 4 (días 31-40)  - magenta
    'Disciplinado', // tier 5 (días 41-50)  - violeta
    'Imparable',    // tier 6 (días 51-60)  - azul
    'Dedicado',     // tier 7 (días 61-70)  - azul claro
    'Élite',        // tier 8 (días 71-80)  - casi blanco
    'Leyenda',      // tier 9 (días 81+)    - blanco
];

const SCREEN_ORDER = ['home-screen', 'calendar-screen', 'gallery-screen', 'settings-screen'];

// Frases motivadoras de día de descanso
const REST_MESSAGES = [
    'Hoy descansás',
    'Recuperá fuerzas',
    'Día libre',
    'Shhh... descansando',
    'Recargando energía',
];

// Frases del día (de famosos)
const QUOTES = [
    { text: "La última repetición es la que cuenta.", author: "Arnold Schwarzenegger" },
    { text: "El dolor que sentís hoy es la fuerza que vas a sentir mañana.", author: "Arnold Schwarzenegger" },
    { text: "Lo más importante no es ganar, es haberlo intentado.", author: "Ronnie Coleman" },
    { text: "Light weight, baby!", author: "Ronnie Coleman" },
    { text: "Todos quieren ser fisicoculturistas, pero nadie quiere levantar pesas pesadas.", author: "Ronnie Coleman" },
    { text: "El cuerpo logra lo que la mente cree.", author: "Arnold Schwarzenegger" },
    { text: "La disciplina es el puente entre las metas y los logros.", author: "Jim Rohn" },
    { text: "No te detengas cuando estés cansado. Detente cuando hayas terminado.", author: "David Goggins" },
    { text: "La mente se rinde mil veces antes que el cuerpo.", author: "David Goggins" },
    { text: "La motivación es basura. Lo que necesitás es disciplina.", author: "David Goggins" },
    { text: "La excelencia no es un acto, es un hábito.", author: "Aristóteles" },
    { text: "He fallado más de 9000 tiros en mi carrera. Por eso tengo éxito.", author: "Michael Jordan" },
    { text: "Trabajá duro en silencio, dejá que el éxito haga el ruido.", author: "Frank Ocean" },
    { text: "Si querés algo que nunca tuviste, tenés que hacer algo que nunca hiciste.", author: "Thomas Jefferson" },
    { text: "El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el coraje para continuar.", author: "Winston Churchill" },
    { text: "Las cadenas del hábito son demasiado livianas para sentirse hasta que son demasiado pesadas para romperse.", author: "Warren Buffett" },
    { text: "Odié cada minuto del entrenamiento, pero dije: no abandones. Sufrí ahora y vivirás el resto de tu vida como un campeón.", author: "Muhammad Ali" },
    { text: "Todos tienen un plan hasta que reciben un golpe en la cara.", author: "Mike Tyson" },
    { text: "Si no creés en vos mismo, nadie lo hará.", author: "Kobe Bryant" },
    { text: "Mamba mentality es siempre tratar de ser la mejor versión de vos mismo.", author: "Kobe Bryant" },
    { text: "Don't be a skinny bitch.", author: "Chris Bumstead" },
];

// ---------- ESTADO ----------
let appData = loadData();
let currentYear = new Date().getFullYear();
let pendingDate = null;
let isRegistering = false;
let pendingDeleteKey = null; // Clave del día pendiente de borrar (para confirmación)
let pendingDeleteSource = null; // 'gallery' o 'day' (de dónde vino el borrado)

// ---------- UTILIDADES DE FECHA ----------
function dateToKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function keyToDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function todayKey() {
    return dateToKey(new Date());
}

function yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dateToKey(d);
}

function formatDateLong(key) {
    const d = keyToDate(key);
    const dayName = WEEKDAYS_FULL[d.getDay()];
    return `${dayName} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
}

function daysBetween(d1, d2) {
    const ms = 24 * 60 * 60 * 1000;
    return Math.round((d2 - d1) / ms);
}

function dayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isTodayRestDay() {
    const today = new Date();
    return appData.restDays.includes(today.getDay());
}

function isYesterdayRestDay() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return appData.restDays.includes(d.getDay());
}

// ---------- ALMACENAMIENTO ----------
function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_DATA };
        const data = JSON.parse(raw);
        return {
            records: data.records || {},
            restDays: data.restDays || [],
            startDate: data.startDate || null,
            lastKnownTier: data.lastKnownTier || 0,
        };
    } catch (e) {
        console.error('Error cargando datos:', e);
        return { ...DEFAULT_DATA };
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (e) {
        console.error('Error guardando datos:', e);
        showToast('Error al guardar. Capaz no hay espacio suficiente.');
    }
}

// ---------- LÓGICA DE RACHA ----------
function calculateCurrentStreak() {
    const records = appData.records;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let cursor = new Date(today);

    const todayK = dateToKey(cursor);
    if (!records[todayK]) {
        cursor.setDate(cursor.getDate() - 1);
    }

    while (true) {
        const key = dateToKey(cursor);
        const dayOfWeek = cursor.getDay();

        if (records[key]) {
            streak++;
        } else if (appData.restDays.includes(dayOfWeek)) {
            // descanso: ignora
        } else {
            break;
        }

        cursor.setDate(cursor.getDate() - 1);
        if (daysBetween(cursor, today) > 365 * 5) break;
    }

    return streak;
}

function calculateMaxStreak() {
    const recordKeys = Object.keys(appData.records).sort();
    if (recordKeys.length === 0) return 0;

    let maxStreak = 0;
    let currentStreak = 0;

    const firstDate = keyToDate(recordKeys[0]);
    const lastDate = keyToDate(recordKeys[recordKeys.length - 1]);

    const cursor = new Date(firstDate);
    while (cursor <= lastDate) {
        const key = dateToKey(cursor);
        const dayOfWeek = cursor.getDay();

        if (appData.records[key]) {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else if (appData.restDays.includes(dayOfWeek)) {
            // descanso
        } else {
            currentStreak = 0;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return maxStreak;
}

function getStreakNumberAtDay(dateKey) {
    if (!appData.records[dateKey]) return 0;

    let streak = 0;
    const targetDate = keyToDate(dateKey);
    const recordKeys = Object.keys(appData.records).sort();
    if (recordKeys.length === 0) return 0;

    const firstDate = keyToDate(recordKeys[0]);
    const cursor = new Date(firstDate);

    while (cursor <= targetDate) {
        const key = dateToKey(cursor);
        const dayOfWeek = cursor.getDay();

        if (appData.records[key]) {
            streak++;
        } else if (appData.restDays.includes(dayOfWeek)) {
            // descanso
        } else {
            streak = 0;
        }

        if (isSameDay(cursor, targetDate)) {
            return streak;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return streak;
}

// Tier según racha (ahora 9 niveles)
function getTier(streakNumber) {
    if (streakNumber <= 0) return 0;
    if (streakNumber <= 10) return 1;
    if (streakNumber <= 20) return 2;
    if (streakNumber <= 30) return 3;
    if (streakNumber <= 40) return 4;
    if (streakNumber <= 50) return 5;
    if (streakNumber <= 60) return 6;
    if (streakNumber <= 70) return 7;
    if (streakNumber <= 80) return 8;
    return 9;
}

function getRankName(streakNumber) {
    return RANK_NAMES[getTier(streakNumber)];
}

// ---------- MENSAJE DE ESTADO ----------
function getStatusMessage() {
    const streak = calculateCurrentStreak();
    const isRestDay = isTodayRestDay();
    const todayRegistered = !!appData.records[todayKey()];
    const totalDays = Object.keys(appData.records).length;

    if (totalDays === 0) {
        return 'Empecemos. Hoy es día 1.';
    }

    if (todayRegistered) {
        return 'Hecho. Día sumado.';
    }

    if (isRestDay) {
        return 'Hoy descansás. Recuperá fuerzas.';
    }

    if (streak > 0) {
        return `Llevás ${streak} día${streak > 1 ? 's' : ''} seguido${streak > 1 ? 's' : ''} 🔥`;
    }

    return '¿Ya fuiste hoy?';
}

// ---------- SALUDO ----------
function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
}

function animateGreeting() {
    const greetingEl = document.getElementById('greeting');
    const statusEl = document.getElementById('status-message');

    greetingEl.textContent = getGreeting();
    statusEl.textContent = getStatusMessage();

    greetingEl.classList.remove('fade-out');
    statusEl.style.opacity = '0';

    setTimeout(() => {
        greetingEl.classList.add('fade-out');
        statusEl.style.opacity = '1';
    }, 1200);
}

// ---------- FRASE DEL DÍA ----------
function showDailyQuote() {
    const today = new Date();
    const dayNum = dayOfYear(today);
    const quoteIndex = dayNum % QUOTES.length;
    const quote = QUOTES[quoteIndex];

    document.getElementById('quote-text').textContent = `"${quote.text}"`;
    document.getElementById('quote-author').textContent = `— ${quote.author}`;
}

// ---------- DÍA DE DESCANSO (overlay) ----------
function updateRestDayOverlay() {
    const overlay = document.getElementById('rest-day-overlay');
    const homeActive = document.getElementById('home-screen').classList.contains('active');

    if (isTodayRestDay() && homeActive) {
        // Mostrar overlay con frase aleatoria
        const restText = REST_MESSAGES[Math.floor(Math.random() * REST_MESSAGES.length)];
        document.getElementById('rest-text').textContent = restText;
        overlay.classList.add('visible');
    } else {
        overlay.classList.remove('visible');
    }
}

// ---------- ACTUALIZAR UI ----------
function updateStats() {
    const current = calculateCurrentStreak();
    const max = calculateMaxStreak();
    const total = Object.keys(appData.records).length;
    const tier = getTier(current);

    const streakEl = document.getElementById('current-streak');
    streakEl.textContent = current;
    streakEl.className = 'stat-value streak-value';
    if (tier > 0) streakEl.classList.add(`tier-${tier}`);

    document.getElementById('max-streak').textContent = max;
    document.getElementById('total-days').textContent = total;

    const rankBadge = document.getElementById('rank-badge');
    rankBadge.className = 'rank-badge';
    if (tier > 0) {
        rankBadge.textContent = RANK_NAMES[tier];
        rankBadge.classList.add(`tier-${tier}`, 'visible');
    } else {
        rankBadge.textContent = '';
    }

    updateBackgroundAura(tier);

    const statusEl = document.getElementById('status-message');
    if (statusEl) statusEl.textContent = getStatusMessage();

    updateRegisterButton();
    updateRestDayOverlay();
}

function updateBackgroundAura(tier) {
    const aura = document.getElementById('background-aura');
    aura.className = 'background-aura';

    const homeActive = document.getElementById('home-screen').classList.contains('active');
    if (!homeActive) {
        aura.classList.add('hidden');
        return;
    }

    if (tier > 0) aura.classList.add(`tier-${tier}`);
}

function updateRegisterButton() {
    const btn = document.getElementById('register-btn');
    const todayRegistered = !!appData.records[todayKey()];
    const yesterdayRegistered = !!appData.records[yesterdayKey()];
    const isRest = isTodayRestDay();

    // Si es día de descanso o ya registró todo, deshabilitar visualmente
    if ((todayRegistered && yesterdayRegistered) || isRest) {
        btn.classList.add('disabled');
    } else {
        btn.classList.remove('disabled');
    }
}

function renderCalendar() {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '';

    document.getElementById('current-year').textContent = currentYear;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let month = 0; month < 12; month++) {
        const monthBlock = document.createElement('div');
        monthBlock.className = 'month-block';

        const title = document.createElement('h3');
        title.className = 'month-title';
        title.textContent = MONTHS[month];
        monthBlock.appendChild(title);

        const weekdays = document.createElement('div');
        weekdays.className = 'weekdays';
        WEEKDAYS.forEach(d => {
            const wd = document.createElement('div');
            wd.className = 'weekday';
            wd.textContent = d;
            weekdays.appendChild(wd);
        });
        monthBlock.appendChild(weekdays);

        const grid = document.createElement('div');
        grid.className = 'days-grid';

        const firstDay = new Date(currentYear, month, 1);
        const lastDay = new Date(currentYear, month + 1, 0);
        let startOffset = firstDay.getDay() - 1;
        if (startOffset < 0) startOffset = 6;

        for (let i = 0; i < startOffset; i++) {
            const empty = document.createElement('div');
            empty.className = 'day empty';
            grid.appendChild(empty);
        }

        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dayDate = new Date(currentYear, month, d);
            const dayKey = dateToKey(dayDate);
            const dayEl = document.createElement('div');
            dayEl.className = 'day';
            dayEl.textContent = d;

            const dayOfWeek = dayDate.getDay();
            const isToday = isSameDay(dayDate, today);
            const isFuture = dayDate > today;
            const hasRecord = !!appData.records[dayKey];
            const isRestDay = appData.restDays.includes(dayOfWeek);

            if (isToday) dayEl.classList.add('today');

            if (hasRecord) {
                dayEl.classList.add('registered');
                const streakNum = getStreakNumberAtDay(dayKey);
                const tier = getTier(streakNum);
                if (tier > 0) dayEl.classList.add(`tier-${tier}`);
                dayEl.addEventListener('click', () => openDayModal(dayKey));
            } else if (isFuture) {
                dayEl.classList.add('future');
            } else if (isRestDay) {
                dayEl.classList.add('rest');
            } else {
                const hoursDiff = (today - dayDate) / (1000 * 60 * 60);
                if (hoursDiff >= 48) {
                    dayEl.classList.add('missed');
                }
            }

            grid.appendChild(dayEl);
        }

        monthBlock.appendChild(grid);
        container.appendChild(monthBlock);
    }
}

function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    const empty = document.getElementById('gallery-empty');
    grid.innerHTML = '';

    const keys = Object.keys(appData.records).sort().reverse();

    if (keys.length === 0) {
        empty.classList.add('visible');
        grid.style.display = 'none';
        return;
    }

    empty.classList.remove('visible');
    grid.style.display = 'grid';

    keys.forEach(key => {
        const record = appData.records[key];
        const item = document.createElement('div');
        item.className = 'gallery-item';

        const streakNum = getStreakNumberAtDay(key);
        const tier = getTier(streakNum);
        if (tier > 0) item.classList.add(`tier-${tier}`);

        const img = document.createElement('img');
        img.src = record.photo;
        img.alt = key;
        img.loading = 'lazy';

        const dateLabel = document.createElement('div');
        dateLabel.className = 'gallery-item-date';
        const d = keyToDate(key);
        dateLabel.textContent = `${d.getDate()}/${d.getMonth() + 1}`;

        item.appendChild(img);
        item.appendChild(dateLabel);
        item.addEventListener('click', () => openGalleryModal(key));
        grid.appendChild(item);
    });
}

function renderRestDays() {
    document.querySelectorAll('.rest-day-btn').forEach(btn => {
        const day = parseInt(btn.dataset.day);
        if (appData.restDays.includes(day)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function renderAll() {
    updateStats();
    renderCalendar();
    renderGallery();
    renderRestDays();
}

// ---------- NAVEGACIÓN ----------
function showScreen(screenId) {
    const currentScreen = document.querySelector('.screen.active');
    const newScreen = document.getElementById(screenId);
    if (!newScreen || currentScreen === newScreen) return;

    const currentIndex = SCREEN_ORDER.indexOf(currentScreen.id);
    const newIndex = SCREEN_ORDER.indexOf(screenId);
    const slideClass = newIndex > currentIndex ? 'slide-in-right' : 'slide-in-left';

    currentScreen.classList.remove('active');
    newScreen.classList.add('active', slideClass);

    setTimeout(() => {
        newScreen.classList.remove('slide-in-right', 'slide-in-left');
    }, 300);

    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.screen === screenId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (screenId === 'calendar-screen') renderCalendar();
    if (screenId === 'gallery-screen') renderGallery();
    if (screenId === 'home-screen') {
        updateStats();
        animateGreeting();
    }

    const aura = document.getElementById('background-aura');
    if (screenId === 'home-screen') {
        aura.classList.remove('hidden');
        const tier = getTier(calculateCurrentStreak());
        updateBackgroundAura(tier);
    } else {
        aura.classList.add('hidden');
    }

    // Actualizar overlay de descanso
    updateRestDayOverlay();
}

// ---------- MODALES ----------
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function openDayModal(dateKey) {
    const record = appData.records[dateKey];
    if (!record) return;

    const streakNum = getStreakNumberAtDay(dateKey);
    const tier = getTier(streakNum);
    const rankName = RANK_NAMES[tier] || '';

    document.getElementById('day-modal-date').textContent = formatDateLong(dateKey);
    document.getElementById('day-modal-image').src = record.photo;

    const rankEl = document.getElementById('day-modal-rank');
    rankEl.textContent = rankName;
    rankEl.className = 'plate-rank';
    if (tier > 0) rankEl.classList.add(`tier-${tier}`);

    const frame = document.getElementById('day-modal-frame');
    frame.className = 'photo-frame';
    if (tier > 0) frame.classList.add(`tier-${tier}`);

    document.getElementById('day-modal-delete').dataset.key = dateKey;
    openModal('day-modal');
}

function openGalleryModal(dateKey) {
    const record = appData.records[dateKey];
    if (!record) return;

    const streakNum = getStreakNumberAtDay(dateKey);
    const tier = getTier(streakNum);
    const rankName = RANK_NAMES[tier] || '';

    document.getElementById('gallery-modal-date').textContent = formatDateLong(dateKey);
    document.getElementById('gallery-modal-image').src = record.photo;

    const rankEl = document.getElementById('gallery-modal-rank');
    rankEl.textContent = rankName;
    rankEl.className = 'plate-rank';
    if (tier > 0) rankEl.classList.add(`tier-${tier}`);

    const frame = document.getElementById('gallery-modal-frame');
    frame.className = 'photo-frame';
    if (tier > 0) frame.classList.add(`tier-${tier}`);

    const downloadLink = document.getElementById('gallery-modal-download');
    downloadLink.href = record.photo;
    downloadLink.download = `gym-${dateKey}.jpg`;

    document.getElementById('gallery-modal-delete').dataset.key = dateKey;

    openModal('gallery-modal');
}

// ---------- TOAST ----------
let toastTimeout;
function showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('visible');
    }, duration);
}

// ---------- SONIDO LEVEL UP ----------
function playLevelUpSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99];

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = now + i * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    } catch (e) {
        console.warn('No se pudo reproducir sonido:', e);
    }
}

// ---------- LEVEL UP ----------
function checkLevelUp(previousTier, newTier) {
    if (newTier > previousTier && newTier > 0) {
        showLevelUpModal(newTier);
    }
}

function showLevelUpModal(tier) {
    const rankEl = document.getElementById('levelup-rank');
    rankEl.textContent = RANK_NAMES[tier];
    rankEl.className = 'level-up-rank';
    rankEl.classList.add(`tier-${tier}`);

    openModal('levelup-modal');
    playLevelUpSound();
}

// ---------- REGISTRO ----------
function startRegister() {
    if (isRegistering) return;

    // Si hoy es día de descanso → bloquear
    if (isTodayRestDay()) {
        // Cambia el texto del overlay aleatoriamente para que se note
        updateRestDayOverlay();
        showToast('Hoy es día de descanso 😴');
        return;
    }

    const todayK = todayKey();
    const yesterdayK = yesterdayKey();

    const todayRegistered = !!appData.records[todayK];
    const yesterdayRegistered = !!appData.records[yesterdayK];
    const yesterdayWasRest = isYesterdayRestDay();

    if (todayRegistered && (yesterdayRegistered || yesterdayWasRest)) {
        showToast('Ya registraste todo lo que podías.');
        return;
    }

    // Si ayer era descanso, no se puede registrar ayer
    if (todayRegistered && yesterdayWasRest) {
        showToast('Ayer fue día de descanso.');
        return;
    }

    if (todayRegistered && !yesterdayRegistered) {
        pendingDate = yesterdayK;
        triggerCamera();
        return;
    }

    if (!todayRegistered && (yesterdayRegistered || yesterdayWasRest)) {
        pendingDate = todayK;
        triggerCamera();
        return;
    }

    openModal('register-modal');
}

function triggerCamera() {
    const input = document.getElementById('camera-input');
    input.value = '';
    input.click();
}

function handlePhotoSelected(event) {
    const file = event.target.files[0];
    if (!file || !pendingDate) return;

    isRegistering = true;
    const targetDate = pendingDate;

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        compressImage(dataUrl, 1080, 0.75).then(compressed => {
            saveRecord(targetDate, compressed);
        }).catch(err => {
            console.error('Error comprimiendo:', err);
            saveRecord(targetDate, dataUrl);
        });
    };
    reader.readAsDataURL(file);
}

function saveRecord(dateKey, photoData) {
    const previousStreak = calculateCurrentStreak();
    const previousTier = getTier(previousStreak);

    appData.records[dateKey] = {
        photo: photoData,
        createdAt: new Date().toISOString(),
    };

    if (!appData.startDate) appData.startDate = dateKey;

    saveData();

    const newStreak = calculateCurrentStreak();
    const newTier = getTier(newStreak);
    appData.lastKnownTier = newTier;
    saveData();

    renderAll();

    const isToday = dateKey === todayKey();
    showToast(isToday ? '¡Día registrado! 💪' : 'Día de ayer registrado 💪');
    pendingDate = null;
    isRegistering = false;

    setTimeout(() => {
        checkLevelUp(previousTier, newTier);
    }, 600);
}

function compressImage(dataUrl, maxWidth = 1080, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            try {
                const compressed = canvas.toDataURL('image/jpeg', quality);
                resolve(compressed);
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// ---------- BORRADO CON CONFIRMACIÓN ----------
function requestDelete(dateKey, source) {
    pendingDeleteKey = dateKey;
    pendingDeleteSource = source;
    openModal('confirm-delete-modal');
}

function confirmDelete() {
    if (!pendingDeleteKey) return;

    const key = pendingDeleteKey;
    const source = pendingDeleteSource;

    delete appData.records[key];
    appData.lastKnownTier = getTier(calculateCurrentStreak());
    saveData();
    renderAll();

    closeModal('confirm-delete-modal');

    // Cerrar también el modal de origen
    if (source === 'gallery') closeModal('gallery-modal');
    if (source === 'day') closeModal('day-modal');

    pendingDeleteKey = null;
    pendingDeleteSource = null;

    showToast('Foto borrada');
}

// ---------- DÍAS DE DESCANSO ----------
function toggleRestDay(day) {
    const idx = appData.restDays.indexOf(day);
    if (idx >= 0) {
        appData.restDays.splice(idx, 1);
    } else {
        appData.restDays.push(day);
    }
    saveData();
    renderAll();
}

// ---------- RESET ----------
function resetAllData() {
    appData = { ...DEFAULT_DATA, records: {}, restDays: [], lastKnownTier: 0 };
    localStorage.removeItem(STORAGE_KEY);
    renderAll();
    closeModal('reset-modal');
    showToast('Todos los datos fueron borrados');
}

// ---------- INIT ----------
function init() {
    const now = new Date().getFullYear();
    if (now >= 2026 && now <= 2027) {
        currentYear = now;
    } else {
        currentYear = 2026;
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const screenId = btn.dataset.screen;
            if (screenId) showScreen(screenId);
        });
    });

    document.getElementById('register-btn').addEventListener('click', startRegister);

    document.getElementById('register-today').addEventListener('click', () => {
        pendingDate = todayKey();
        closeModal('register-modal');
        triggerCamera();
    });
    document.getElementById('register-yesterday').addEventListener('click', () => {
        pendingDate = yesterdayKey();
        closeModal('register-modal');
        triggerCamera();
    });
    document.getElementById('register-cancel').addEventListener('click', () => {
        pendingDate = null;
        closeModal('register-modal');
    });

    document.getElementById('camera-input').addEventListener('change', handlePhotoSelected);

    document.getElementById('prev-year').addEventListener('click', () => {
        if (currentYear > 2026) {
            currentYear--;
            renderCalendar();
        }
    });
    document.getElementById('next-year').addEventListener('click', () => {
        if (currentYear < 2027) {
            currentYear++;
            renderCalendar();
        }
    });

    // Modal día (calendario)
    document.getElementById('day-modal-close').addEventListener('click', () => closeModal('day-modal'));
    document.getElementById('day-modal-delete').addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        if (key) requestDelete(key, 'day');
    });

    // Modal galería (con borrar)
    document.getElementById('gallery-modal-close').addEventListener('click', () => closeModal('gallery-modal'));
    document.getElementById('gallery-modal-delete').addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        if (key) requestDelete(key, 'gallery');
    });

    // Modal confirmación borrado
    document.getElementById('confirm-delete-yes').addEventListener('click', confirmDelete);
    document.getElementById('confirm-delete-no').addEventListener('click', () => {
        pendingDeleteKey = null;
        pendingDeleteSource = null;
        closeModal('confirm-delete-modal');
    });

    document.getElementById('levelup-continue').addEventListener('click', () => closeModal('levelup-modal'));

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    document.querySelectorAll('.rest-day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const day = parseInt(btn.dataset.day);
            toggleRestDay(day);
        });
    });

    document.getElementById('reset-btn').addEventListener('click', () => openModal('reset-modal'));
    document.getElementById('reset-confirm').addEventListener('click', resetAllData);
    document.getElementById('reset-cancel').addEventListener('click', () => closeModal('reset-modal'));

    showDailyQuote();
    renderAll();
    animateGreeting();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
