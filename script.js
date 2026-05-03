/* =========================================
   GYM TRACKER - script.js
   ========================================= */

// ---------- ESTADO Y CONSTANTES ----------
const STORAGE_KEY = 'gymTrackerData';
const DEFAULT_DATA = {
    records: {},        // { "2026-05-03": { photo: "data:image/...", streakAtDay: 5 } }
    restDays: [],       // Días de la semana de descanso (0=Domingo, 6=Sábado)
    startDate: null,    // Primera fecha en que se usó la app (formato YYYY-MM-DD)
};

let appData = loadData();
let currentYear = new Date().getFullYear();
let pendingDate = null; // Fecha que se está por registrar

const MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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
/**
 * Calcula la racha actual basándose en los registros y los días de descanso ACTUALES.
 * Recorre desde hoy hacia atrás:
 *   - Día con registro -> suma 1 a la racha
 *   - Día de descanso (según config actual) -> se ignora (no suma ni rompe)
 *   - Día sin registro y no de descanso, dentro del periodo válido -> rompe la racha
 *
 * Importante: como cambiar los días de descanso recalcula con la config actual,
 * los días que antes eran "no fui" ahora podrían ser "descanso", y viceversa.
 * Esto cumple con el requisito: la racha se recalcula contra la config actual.
 */
function calculateCurrentStreak() {
    const records = appData.records;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Si hoy todavía no se registró pero tampoco pasaron las 48hs, lo tratamos como "pendiente"
    // Es decir: empezamos a contar desde ayer si hoy no está registrado.
    // Si ayer tampoco está registrado y NO es día de descanso, la racha actual es 0.

    let streak = 0;
    let cursor = new Date(today);

    // Si hoy NO está registrado, arrancamos desde ayer (le damos chance al día actual)
    const todayK = dateToKey(cursor);
    if (!records[todayK]) {
        cursor.setDate(cursor.getDate() - 1);
    }

    // Recorremos hacia atrás
    while (true) {
        const key = dateToKey(cursor);
        const dayOfWeek = cursor.getDay();

        if (records[key]) {
            // Día registrado: suma a la racha
            streak++;
        } else if (appData.restDays.includes(dayOfWeek)) {
            // Día de descanso: se ignora, no suma ni rompe
        } else {
            // Día perdido (sin registro y no es descanso): se rompe la racha
            break;
        }

        cursor.setDate(cursor.getDate() - 1);

        // Límite de seguridad: no buscar más allá de 5 años atrás
        if (daysBetween(cursor, today) > 365 * 5) break;
    }

    return streak;
}

/**
 * Calcula la racha máxima histórica recorriendo todos los registros.
 * Para cada día registrado, calcula cuál sería la racha hasta ese día.
 */
function calculateMaxStreak() {
    const recordKeys = Object.keys(appData.records).sort();
    if (recordKeys.length === 0) return 0;

    let maxStreak = 0;
    let currentStreak = 0;

    // Recorremos día por día desde el primer registro hasta el último
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
            // descanso: no rompe ni suma
        } else {
            currentStreak = 0;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return maxStreak;
}

/**
 * Calcula, para un día específico que tiene registro, qué número de racha
 * representa ese día (para asignarle el color correcto en el calendario).
 */
function getStreakNumberAtDay(dateKey) {
    if (!appData.records[dateKey]) return 0;

    let streak = 0;
    const targetDate = keyToDate(dateKey);

    // Buscamos el comienzo de la racha actual
    // Tomamos el primer registro y vamos avanzando
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
            // descanso: no rompe ni suma
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

/**
 * Devuelve la clase de "tier" según el número de racha.
 * Cada 10 días sube un nivel. A partir del nivel 8 (días 71+) se queda en blanco.
 */
function getTierClass(streakNumber) {
    if (streakNumber <= 0) return '';
    if (streakNumber <= 10) return 'tier-1';
    if (streakNumber <= 20) return 'tier-2';
    if (streakNumber <= 30) return 'tier-3';
    if (streakNumber <= 40) return 'tier-4';
    if (streakNumber <= 50) return 'tier-5';
    if (streakNumber <= 60) return 'tier-6';
    if (streakNumber <= 70) return 'tier-7';
    return 'tier-8';
}

// ---------- ACTUALIZACIÓN DE UI ----------
function updateStats() {
    const current = calculateCurrentStreak();
    const max = calculateMaxStreak();
    const total = Object.keys(appData.records).length;

    document.getElementById('current-streak').textContent = current;
    document.getElementById('max-streak').textContent = max;
    document.getElementById('total-days').textContent = total;
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

        // Días de la semana (Lun-Dom)
        const weekdays = document.createElement('div');
        weekdays.className = 'weekdays';
        WEEKDAYS.forEach(d => {
            const wd = document.createElement('div');
            wd.className = 'weekday';
            wd.textContent = d;
            weekdays.appendChild(wd);
        });
        monthBlock.appendChild(weekdays);

        // Grid de días
        const grid = document.createElement('div');
        grid.className = 'days-grid';

        const firstDay = new Date(currentYear, month, 1);
        const lastDay = new Date(currentYear, month + 1, 0);
        // getDay(): 0=Domingo, 1=Lunes... Queremos Lunes=0 para alinear el grid
        let startOffset = firstDay.getDay() - 1;
        if (startOffset < 0) startOffset = 6; // Domingo va al final

        // Espacios vacíos antes del 1
        for (let i = 0; i < startOffset; i++) {
            const empty = document.createElement('div');
            empty.className = 'day empty';
            grid.appendChild(empty);
        }

        // Días del mes
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
                // Registrado: aplicar color según número de racha en ese día
                dayEl.classList.add('registered');
                const streakNum = getStreakNumberAtDay(dayKey);
                const tier = getTierClass(streakNum);
                if (tier) dayEl.classList.add(tier);

                dayEl.addEventListener('click', () => openDayModal(dayKey));
            } else if (isFuture) {
                dayEl.classList.add('future');
            } else if (isRestDay) {
                dayEl.classList.add('rest');
            } else {
                // Día pasado sin registro
                // Si pasaron más de 48hs desde ese día, se considera "no fui"
                const hoursDiff = (today - dayDate) / (1000 * 60 * 60);
                if (hoursDiff >= 48) {
                    dayEl.classList.add('missed');
                } else {
                    // Día de hoy o ayer sin registrar todavía: lo dejamos neutro
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

// ---------- NAVEGACIÓN ENTRE PANTALLAS ----------
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');

    // Actualizar nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.screen === screenId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Refrescar la pantalla cuando entrás
    if (screenId === 'calendar-screen') renderCalendar();
    if (screenId === 'gallery-screen') renderGallery();
    if (screenId === 'home-screen') updateStats();
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

    document.getElementById('day-modal-date').textContent = formatDateLong(dateKey);
    document.getElementById('day-modal-image').src = record.photo;
    document.getElementById('day-modal-delete').dataset.key = dateKey;
    openModal('day-modal');
}

function openGalleryModal(dateKey) {
    const record = appData.records[dateKey];
    if (!record) return;

    document.getElementById('gallery-modal-date').textContent = formatDateLong(dateKey);
    document.getElementById('gallery-modal-image').src = record.photo;

    const downloadLink = document.getElementById('gallery-modal-download');
    downloadLink.href = record.photo;
    downloadLink.download = `gym-${dateKey}.jpg`;

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

// ---------- REGISTRO DE DÍA ----------
function startRegister() {
    const todayK = todayKey();
    const yesterdayK = yesterdayKey();

    const todayRegistered = !!appData.records[todayK];
    const yesterdayRegistered = !!appData.records[yesterdayK];

    if (todayRegistered && yesterdayRegistered) {
        showToast('Ya registraste hoy y ayer.');
        return;
    }

    // Si hoy ya está pero ayer no, registrá ayer directo
    if (todayRegistered && !yesterdayRegistered) {
        pendingDate = yesterdayK;
        triggerCamera();
        return;
    }

    // Si hoy no está pero ayer sí, registrá hoy directo
    if (!todayRegistered && yesterdayRegistered) {
        pendingDate = todayK;
        triggerCamera();
        return;
    }

    // Si ninguno está registrado, preguntar cuál
    openModal('register-modal');
}

function triggerCamera() {
    const input = document.getElementById('camera-input');
    input.value = ''; // resetear para que onchange dispare aunque sea la misma foto
    input.click();
}

function handlePhotoSelected(event) {
    const file = event.target.files[0];
    if (!file || !pendingDate) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        // Comprimir/redimensionar para no llenar el localStorage
        compressImage(dataUrl, 1080, 0.75).then(compressed => {
            appData.records[pendingDate] = {
                photo: compressed,
                createdAt: new Date().toISOString(),
            };

            // Si era la primera vez, marcar startDate
            if (!appData.startDate) {
                appData.startDate = pendingDate;
            }

            saveData();
            renderAll();

            const isToday = pendingDate === todayKey();
            showToast(isToday ? '¡Día registrado! 💪' : 'Día de ayer registrado 💪');
            pendingDate = null;
        }).catch(err => {
            console.error('Error comprimiendo imagen:', err);
            // Fallback: guardar la imagen original
            appData.records[pendingDate] = {
                photo: dataUrl,
                createdAt: new Date().toISOString(),
            };
            if (!appData.startDate) appData.startDate = pendingDate;
            saveData();
            renderAll();
            showToast('¡Día registrado! 💪');
            pendingDate = null;
        });
    };
    reader.readAsDataURL(file);
}

/**
 * Comprime una imagen redimensionándola a un ancho máximo y reduciendo calidad.
 * Esto es importante porque localStorage tiene un límite de ~5-10MB.
 */
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

function deleteRecord(dateKey) {
    if (!appData.records[dateKey]) return;
    delete appData.records[dateKey];
    saveData();
    renderAll();
    closeModal('day-modal');
    showToast('Registro borrado');
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
    appData = { ...DEFAULT_DATA, records: {}, restDays: [] };
    localStorage.removeItem(STORAGE_KEY);
    renderAll();
    closeModal('reset-modal');
    showToast('Todos los datos fueron borrados');
}

// ---------- INICIALIZACIÓN ----------
function init() {
    // Año inicial: el actual si está entre 2026 y 2027, si no, 2026
    const now = new Date().getFullYear();
    if (now >= 2026 && now <= 2027) {
        currentYear = now;
    } else {
        currentYear = 2026;
    }

    // Navegación inferior
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const screenId = btn.dataset.screen;
            if (screenId) showScreen(screenId);
        });
    });

    // Botón principal de registrar
    document.getElementById('register-btn').addEventListener('click', startRegister);

    // Modal de elegir hoy/ayer
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

    // Input de cámara
    document.getElementById('camera-input').addEventListener('change', handlePhotoSelected);

    // Selector de año del calendario
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

    // Modal de día (calendario)
    document.getElementById('day-modal-close').addEventListener('click', () => closeModal('day-modal'));
    document.getElementById('day-modal-delete').addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        if (key && confirm('¿Seguro que querés borrar este día? Se eliminará la foto y el registro.')) {
            deleteRecord(key);
        }
    });

    // Modal de galería
    document.getElementById('gallery-modal-close').addEventListener('click', () => closeModal('gallery-modal'));

    // Cerrar modales al tocar fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Días de descanso
    document.querySelectorAll('.rest-day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const day = parseInt(btn.dataset.day);
            toggleRestDay(day);
        });
    });

    // Reset
    document.getElementById('reset-btn').addEventListener('click', () => openModal('reset-modal'));
    document.getElementById('reset-confirm').addEventListener('click', resetAllData);
    document.getElementById('reset-cancel').addEventListener('click', () => closeModal('reset-modal'));

    // Render inicial
    renderAll();
}

// Arrancar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
