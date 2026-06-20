/* ===================================================
   STUDYBLOOM - script.js
   Student Planner | Vanilla JS + localStorage
=================================================== */

// ─── STATE ────────────────────────────────────────
let userName = '';
let tasks      = [];
let courses    = [];
let countdowns = [];
let schedule   = [];
let cardData   = {};
let profilePicBase64 = '';
let selectedCardColor = '#ffd6e0';
let countdownIntervalId = null;

// ─── DOM HELPERS ──────────────────────────────────
const $ = id => document.getElementById(id);

// ─── INIT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadAll();
  setupNav();
  setupSidebar();
  setupWelcomeModal();
  setupStudentCard();
  setupTodo();
  setupCourses();
  setupCountdown();
  setupSchedule();
  renderDashboard();

  // Start live countdown ticker
  countdownIntervalId = setInterval(() => {
    renderCountdownCards();
    updateDashboardCountdown();
  }, 1000);
});

// ─── LOCALSTORAGE ─────────────────────────────────
function loadAll() {
  userName         = localStorage.getItem('sb_userName') || '';
  tasks            = JSON.parse(localStorage.getItem('sb_tasks')      || '[]');
  courses          = JSON.parse(localStorage.getItem('sb_courses')    || '[]');
  countdowns       = JSON.parse(localStorage.getItem('sb_countdowns') || '[]');
  schedule         = JSON.parse(localStorage.getItem('sb_schedule')   || '[]');
  cardData         = JSON.parse(localStorage.getItem('sb_card')       || '{}');
  profilePicBase64 = localStorage.getItem('sb_profilePic')            || '';
  selectedCardColor= localStorage.getItem('sb_cardColor')             || '#ffd6e0';
}

function saveAll() {
  localStorage.setItem('sb_userName',   userName);
  localStorage.setItem('sb_tasks',      JSON.stringify(tasks));
  localStorage.setItem('sb_courses',    JSON.stringify(courses));
  localStorage.setItem('sb_countdowns', JSON.stringify(countdowns));
  localStorage.setItem('sb_schedule',   JSON.stringify(schedule));
  localStorage.setItem('sb_card',       JSON.stringify(cardData));
  localStorage.setItem('sb_profilePic', profilePicBase64);
  localStorage.setItem('sb_cardColor',  selectedCardColor);
}

// ─── TOAST ────────────────────────────────────────
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 2800);
}

// ─── WELCOME MODAL ────────────────────────────────
function setupWelcomeModal() {
  const modal = $('welcome-modal');
  if (!userName) {
    modal.classList.remove('hidden');
  } else {
    applyUserName();
  }

  $('welcome-save-btn').addEventListener('click', () => {
    const val = $('welcome-name-input').value.trim();
    if (!val) { showToast('Please enter your name! 🌸'); return; }
    userName = val;
    localStorage.setItem('sb_userName', userName);
    modal.classList.add('hidden');
    applyUserName();
    renderDashboard();
  });

  $('welcome-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('welcome-save-btn').click();
  });
}

function applyUserName() {
  $('greeting-topbar').textContent = `Hello, ${userName} 👋`;
  $('dashboard-greeting').textContent = `Hello, ${userName} 👋`;
}

// ─── NAVIGATION ───────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = link.dataset.section;
      switchSection(target);
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        $('sidebar').classList.remove('open');
      }
    });
  });
}

function switchSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const sec  = $(name);
  const link = document.querySelector(`[data-section="${name}"]`);
  if (sec)  sec.classList.remove('hidden');
  if (link) link.classList.add('active');

  // Refresh section-specific renders
  if (name === 'dashboard')    renderDashboard();
  if (name === 'todo')         renderTasks();
  if (name === 'courses')      renderCourses();
  if (name === 'countdown')    renderCountdownCards();
  if (name === 'schedule')     renderTimetable();
  if (name === 'student-card') loadCardForm();
}

// ─── SIDEBAR TOGGLE ───────────────────────────────
function setupSidebar() {
  $('menu-toggle').addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
  });
  $('sidebar-toggle').addEventListener('click', () => {
    $('sidebar').classList.remove('open');
  });
  // Click outside to close on mobile
  $('main-wrapper').addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      $('sidebar').classList.remove('open');
    }
  });
}

// ─── DASHBOARD ────────────────────────────────────
function renderDashboard() {
  applyUserName();

  // Pending tasks
  const pending = tasks.filter(t => !t.completed).length;
  $('pending-count').textContent = pending;

  // Courses count
  $('courses-count').textContent = courses.length;

  // Next upcoming countdown
  updateDashboardCountdown();

  // Today's classes
  renderTodayClasses();
}

function updateDashboardCountdown() {
  const now = Date.now();
  const upcoming = countdowns
    .filter(c => new Date(c.date).getTime() > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const el = $('next-countdown-label');
  if (!upcoming.length) {
    el.textContent = '—';
    return;
  }
  const next = upcoming[0];
  const diff = new Date(next.date).getTime() - now;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  el.textContent = `${next.title}: ${d}d ${h}h`;
}

function renderTodayClasses() {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today = days[new Date().getDay()];
  const todayClasses = schedule
    .filter(c => c.day === today)
    .sort((a, b) => a.start.localeCompare(b.start));

  const container = $('today-classes-list');
  if (!todayClasses.length) {
    container.innerHTML = '<p class="no-items-msg">No classes today 🎉</p>';
    return;
  }
  container.innerHTML = todayClasses.map(c => `
    <div class="today-class-item">
      <strong>${c.name}</strong>
      <span> · ${c.start} – ${c.end} · ${c.room || 'No room'}</span>
      ${c.tutor ? `<span> · ${c.tutor}</span>` : ''}
    </div>
  `).join('');
}

// ─── STUDENT CARD ─────────────────────────────────
function setupStudentCard() {
  // Upload area click
  $('upload-area').addEventListener('click', () => $('profile-pic-input').click());

  // Profile pic input
  $('profile-pic-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      profilePicBase64 = ev.target.result;
      updateCardPreview();
    };
    reader.readAsDataURL(file);
  });

  // Live preview on input
  ['card-name','card-major','card-school','card-birthday'].forEach(id => {
    $(id).addEventListener('input', updateCardPreview);
  });

  // Color picker
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      selectedCardColor = swatch.dataset.color;
      updateCardPreview();
    });
  });

  // Save card
  $('save-card-btn').addEventListener('click', saveCard);
}

function loadCardForm() {
  if (cardData.name)     $('card-name').value     = cardData.name;
  if (cardData.major)    $('card-major').value    = cardData.major;
  if (cardData.school)   $('card-school').value   = cardData.school;
  if (cardData.birthday) $('card-birthday').value = cardData.birthday;

  // Set selected color swatch
  const savedColor = selectedCardColor;
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === savedColor);
  });

  updateCardPreview();
}

function updateCardPreview() {
  const name     = $('card-name').value     || 'Your Name';
  const major    = $('card-major').value    || 'Major';
  const school   = $('card-school').value   || 'School / University';
  const birthday = $('card-birthday').value;

  $('sc-name').textContent   = name;
  $('sc-major').textContent  = major;
  $('sc-school').textContent = `🏫 ${school}`;
  $('sc-birthday').textContent = birthday
    ? `🎂 ${formatDate(birthday)}`
    : '🎂 Birthday';

  $('student-card-preview').style.background = selectedCardColor;

  // Profile pic
  if (profilePicBase64) {
    $('sc-photo').src = profilePicBase64;
    $('sc-photo').classList.remove('hidden');
    $('sc-photo-placeholder').classList.add('hidden');

    const thumb = $('profile-preview-thumb');
    thumb.src = profilePicBase64;
    thumb.classList.remove('hidden');
    $('upload-placeholder').classList.add('hidden');
  } else {
    $('sc-photo').classList.add('hidden');
    $('sc-photo-placeholder').classList.remove('hidden');
  }
}

function saveCard() {
  cardData = {
    name:     $('card-name').value.trim(),
    major:    $('card-major').value.trim(),
    school:   $('card-school').value.trim(),
    birthday: $('card-birthday').value,
  };
  saveAll();
  showToast('Student card saved! 🪪✨');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
}

// ─── TO-DO LIST ───────────────────────────────────
function setupTodo() {
  $('add-task-btn').addEventListener('click', addTask);
  $('save-tasks-btn').addEventListener('click', () => {
    localStorage.setItem('sb_tasks', JSON.stringify(tasks));
    showToast('Tasks saved! ✅');
  });
  renderTasks();
}

function addTask() {
  const title = $('todo-title').value.trim();
  const desc  = $('todo-desc').value.trim();
  const deadline = $('todo-deadline').value;

  if (!title) { showToast('Task title is required! 📝'); return; }
  if (!desc)  { showToast('Task description is required! 📝'); return; }

  tasks.push({ id: Date.now(), title, desc, deadline, completed: false });
  $('todo-title').value    = '';
  $('todo-desc').value     = '';
  $('todo-deadline').value = '';

  renderTasks();
  renderDashboard();
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) t.completed = !t.completed;
  renderTasks();
  renderDashboard();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  renderTasks();
  renderDashboard();
}

function renderTasks() {
  const container = $('todo-list');
  if (!tasks.length) {
    container.innerHTML = '<p class="no-items-msg">No tasks yet. Add one above! ✨</p>';
    return;
  }
  // Show incomplete first, then completed
  const sorted = [...tasks].sort((a, b) => a.completed - b.completed);
  container.innerHTML = sorted.map(t => `
    <div class="todo-item ${t.completed ? 'completed' : ''}" id="task-${t.id}">
      <div class="todo-checkbox ${t.completed ? 'checked' : ''}" onclick="toggleTask(${t.id})">
        ${t.completed ? '✓' : ''}
      </div>
      <div class="todo-content">
        <div class="todo-title">${escHtml(t.title)}</div>
        <div class="todo-desc">${escHtml(t.desc)}</div>
        ${t.deadline ? `<div class="todo-deadline">⏰ ${formatDateTime(t.deadline)}</div>` : ''}
      </div>
      <div class="todo-actions">
        <button class="btn btn-danger" onclick="deleteTask(${t.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

function formatDateTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ─── COURSES ──────────────────────────────────────
function setupCourses() {
  $('add-course-btn').addEventListener('click', addCourse);
  $('save-courses-btn').addEventListener('click', () => {
    // We save without PDF blobs (already stored) — just course meta
    const saveable = courses.map(c => ({
      id: c.id, name: c.name, desc: c.desc, files: c.files
    }));
    localStorage.setItem('sb_courses', JSON.stringify(saveable));
    showToast('Courses saved! 📚✨');
    renderDashboard();
  });
  renderCourses();
}

function addCourse() {
  const name = $('course-name').value.trim();
  const desc = $('course-desc').value.trim();
  const fileInput = $('course-pdf-input');

  if (!name) { showToast('Course name is required! 📚'); return; }

  const course = { id: Date.now(), name, desc, files: [] };

  // Read PDFs as base64 for persistence
  const files = Array.from(fileInput.files || []);
  if (files.length === 0) {
    courses.push(course);
    $('course-name').value = '';
    $('course-desc').value = '';
    fileInput.value = '';
    renderCourses();
    renderDashboard();
    return;
  }

  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      course.files.push({ name: file.name, data: ev.target.result });
      loaded++;
      if (loaded === files.length) {
        courses.push(course);
        $('course-name').value = '';
        $('course-desc').value = '';
        fileInput.value = '';
        renderCourses();
        renderDashboard();
      }
    };
    reader.readAsDataURL(file);
  });
}

function deleteCourse(id) {
  courses = courses.filter(c => c.id !== id);
  renderCourses();
  renderDashboard();
}

function renderCourses() {
  const container = $('courses-list');
  if (!courses.length) {
    container.innerHTML = '<p class="no-items-msg">No courses yet. Add one above! 📚</p>';
    return;
  }
  container.innerHTML = courses.map(c => `
    <div class="course-card">
      <div class="course-card-title">📘 ${escHtml(c.name)}</div>
      ${c.desc ? `<div class="course-card-desc">${escHtml(c.desc)}</div>` : ''}
      ${c.files && c.files.length ? `
        <div class="course-files">
          <div class="course-files-title">📄 Lesson Files</div>
          ${c.files.map(f => `
            <div class="course-file-item">
              📎 <a href="${f.data}" download="${escHtml(f.name)}">${escHtml(f.name)}</a>
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div class="course-card-actions">
        <button class="btn btn-danger" onclick="deleteCourse(${c.id})">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

// ─── COUNTDOWNS ───────────────────────────────────
function setupCountdown() {
  $('add-countdown-btn').addEventListener('click', addCountdown);
  $('save-countdowns-btn').addEventListener('click', () => {
    localStorage.setItem('sb_countdowns', JSON.stringify(countdowns));
    showToast('Countdowns saved! ⏳✨');
  });
  renderCountdownCards();
}

function addCountdown() {
  const title = $('countdown-title').value.trim();
  const date  = $('countdown-date').value;

  if (!title) { showToast('Event title is required! ⏳'); return; }
  if (!date)  { showToast('Event date & time is required! ⏳'); return; }
  if (new Date(date).getTime() <= Date.now()) {
    showToast('Please choose a future date & time!'); return;
  }

  countdowns.push({ id: Date.now(), title, date });
  $('countdown-title').value = '';
  $('countdown-date').value  = '';
  renderCountdownCards();
}

function deleteCountdown(id) {
  countdowns = countdowns.filter(c => c.id !== id);
  renderCountdownCards();
  updateDashboardCountdown();
}

function renderCountdownCards() {
  const container = $('countdowns-list');
  if (!countdowns.length) {
    container.innerHTML = '<p class="no-items-msg">No countdowns yet. Add one above! ⏳</p>';
    return;
  }
  container.innerHTML = countdowns.map(c => {
    const target = new Date(c.date).getTime();
    const now    = Date.now();
    const diff   = target - now;
    let timerHtml;
    if (diff <= 0) {
      timerHtml = `<div class="countdown-past">🎉 This event has passed!</div>`;
    } else {
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000)  / 60000);
      const secs = Math.floor((diff % 60000)    / 1000);
      timerHtml = `
        <div class="countdown-display">
          <div class="cd-unit"><span class="cd-num">${String(days).padStart(2,'0')}</span><span class="cd-lbl">Days</span></div>
          <div class="cd-unit"><span class="cd-num">${String(hrs).padStart(2,'0')}</span><span class="cd-lbl">Hrs</span></div>
          <div class="cd-unit"><span class="cd-num">${String(mins).padStart(2,'0')}</span><span class="cd-lbl">Mins</span></div>
          <div class="cd-unit"><span class="cd-num">${String(secs).padStart(2,'0')}</span><span class="cd-lbl">Secs</span></div>
        </div>`;
    }
    const eventDate = new Date(c.date).toLocaleString('en-US', {
      month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
    return `
      <div class="countdown-card" id="cd-${c.id}">
        <div class="countdown-event-title">⏳ ${escHtml(c.title)}</div>
        <div class="countdown-event-date">${eventDate}</div>
        ${timerHtml}
        <button class="btn btn-danger" onclick="deleteCountdown(${c.id})">🗑️ Remove</button>
      </div>
    `;
  }).join('');
}

// ─── SCHEDULE ─────────────────────────────────────
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function setupSchedule() {
  $('add-class-btn').addEventListener('click', saveClassEntry);
  $('save-schedule-btn').addEventListener('click', () => {
    localStorage.setItem('sb_schedule', JSON.stringify(schedule));
    showToast('Schedule saved! 🗓️✨');
    renderDashboard();
  });
  renderTimetable();
}

function saveClassEntry() {
  const name  = $('class-name').value.trim();
  const tutor = $('class-tutor').value.trim();
  const room  = $('class-room').value.trim();
  const day   = $('class-day').value;
  const start = $('class-start').value;
  const end   = $('class-end').value;
  const editIdx = parseInt($('edit-class-index').value);

  if (!name)  { showToast('Class name is required! 🗓️'); return; }
  if (!start) { showToast('Start time is required! 🗓️'); return; }
  if (!end)   { showToast('End time is required! 🗓️'); return; }
  if (start >= end) { showToast('End time must be after start time!'); return; }

  const entry = { id: Date.now(), name, tutor, room, day, start, end };

  if (editIdx >= 0) {
    schedule[editIdx] = { ...schedule[editIdx], name, tutor, room, day, start, end };
    $('edit-class-index').value = -1;
    $('add-class-btn').textContent = '➕ Add Class';
  } else {
    schedule.push(entry);
  }

  clearClassForm();
  renderTimetable();
  renderDashboard();
}

function editClass(idx) {
  const c = schedule[idx];
  $('class-name').value  = c.name;
  $('class-tutor').value = c.tutor || '';
  $('class-room').value  = c.room  || '';
  $('class-day').value   = c.day;
  $('class-start').value = c.start;
  $('class-end').value   = c.end;
  $('edit-class-index').value = idx;
  $('add-class-btn').textContent = '✏️ Update Class';
  $('class-name').focus();
  // Scroll to form
  $('schedule').querySelector('.card-panel').scrollIntoView({ behavior: 'smooth' });
}

function deleteClass(idx) {
  schedule.splice(idx, 1);
  renderTimetable();
  renderDashboard();
  if (parseInt($('edit-class-index').value) === idx) {
    clearClassForm();
    $('edit-class-index').value = -1;
    $('add-class-btn').textContent = '➕ Add Class';
  }
}

function clearClassForm() {
  ['class-name','class-tutor','class-room','class-start','class-end'].forEach(id => $(id).value = '');
  $('class-day').value = 'Monday';
}

function renderTimetable() {
  const container = $('schedule-timetable');
  const todayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];

  // Build header row
  let html = `<div class="tt-header-cell">Day</div>`;
  DAYS.forEach(day => {
    const isToday = day === todayName;
    html += `<div class="tt-header-cell ${isToday ? 'today-col' : ''}">${day.substring(0,3)}</div>`;
  });

  // Build class cells per day
  DAYS.forEach((day, colIdx) => {
    // The first column in each row is the day label — but we're using a pure grid, so skip time column for simplicity
  });

  // Single-row timetable: day columns with stacked class blocks
  html += `<div class="tt-time-col"><span class="tt-time-label">Classes</span></div>`;
  DAYS.forEach(day => {
    const dayCls = schedule
      .map((c, i) => ({ ...c, _idx: i }))
      .filter(c => c.day === day)
      .sort((a, b) => a.start.localeCompare(b.start));

    if (!dayCls.length) {
      html += `<div class="tt-day-col"><div class="tt-empty"></div></div>`;
    } else {
      html += `<div class="tt-day-col">`;
      dayCls.forEach(c => {
        html += `
          <div class="tt-class-block">
            <div class="tt-class-name">${escHtml(c.name)}</div>
            <div class="tt-class-time">⏰ ${c.start} – ${c.end}</div>
            ${c.room  ? `<div class="tt-class-room">📍 ${escHtml(c.room)}</div>`  : ''}
            ${c.tutor ? `<div class="tt-class-room">👤 ${escHtml(c.tutor)}</div>` : ''}
            <div class="tt-class-actions">
              <button class="btn btn-edit" onclick="editClass(${c._idx})">✏️</button>
              <button class="btn btn-danger" onclick="deleteClass(${c._idx})">🗑️</button>
            </div>
          </div>`;
      });
      html += `</div>`;
    }
  });

  container.innerHTML = html;
}

// ─── UTILITY ──────────────────────────────────────
/** Escape HTML to prevent XSS */
function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── AUTO-SAVE on navigation away ─────────────────
// Persist the most recent state on every change so nothing is lost
// even without clicking Save (for critical data like tasks/countdowns).
// The explicit Save buttons remain for user confirmation + toast.
window.addEventListener('beforeunload', () => {
  localStorage.setItem('sb_tasks',      JSON.stringify(tasks));
  localStorage.setItem('sb_courses',    JSON.stringify(courses));
  localStorage.setItem('sb_countdowns', JSON.stringify(countdowns));
  localStorage.setItem('sb_schedule',   JSON.stringify(schedule));
  localStorage.setItem('sb_card',       JSON.stringify(cardData));
  localStorage.setItem('sb_profilePic', profilePicBase64);
  localStorage.setItem('sb_cardColor',  selectedCardColor);
  localStorage.setItem('sb_userName',   userName);
});
