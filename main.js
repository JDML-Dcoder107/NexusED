// Constant link for the API
const API = 'http://localhost:5000/api';

/* ---- Utility functions ---- */
function $(id) {
    return document.getElementById(id);
}

function qs(selector, ctx = document) {
    return ctx.querySelector(selector);
}

function qsa(selector, ctx = document) {
    return [...ctx.querySelectorAll(selector)];
}

function ClassGrade(grade) {
    if (grade <= 100 && grade >= 90) return 'A'
    else if (grade < 90 && grade >= 80) return 'B';
    else if (grade < 80 && grade >= 75) return 'C';
    return 'D';
}

function GradeRemarks(grade) {
    if (grade <= 100 && grade >= 90) return 'Satisfactory';
    else if (grade < 90 && grade >= 85) return 'Good';
    else if (grade < 85 && grade >= 80) return 'Fair';
    else if (grade < 80 && grade >= 75) return 'Poor';
    return 'Failed';
}

function TimeFormat(time) {
    const [hour, minute] = time.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    return `${(hour % 12) || 12}:${String(minute).padStart(2, '0')} ${period}`;
}

// FIX 1: getSession now accepts a key parameter instead of being hardcoded
function getSession(key) {
    try {
        return JSON.parse(sessionStorage.getItem(key));
    }
    catch {
        return null;
    }
}

function saveSession(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
}

function clearSessions() {
    sessionStorage.removeItem('nexus_user');
    sessionStorage.removeItem('nexus_prof');
}

/* ---- End of Utility functions ---- */

/* ----- Clock ---- */
function StartClock() {
    const clock = $('topbar-clock');
    if (!clock) return;

    const tick = () => {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString('en-PH', { hour: '2-digit', second: '2-digit', minute: '2-digit' });
    };
    tick();
    setInterval(tick, 1000);
}

/* ----- End of Clock ---- */

/* ----- Login Page ---- */
function initLoginPage() {
    if (getSession('nexus_user')) { location.href = '/dashboard'; return; }
    if (getSession('nexus_prof')) { location.href = '/professor'; return; }

    qsa('.tab').forEach(btn => btn.addEventListener('click', () => {
        qsa('.tab').forEach(t => t.classList.remove('tab_active'));
        btn.classList.add('tab_active');
        const tab = btn.dataset.tab;
        $('loginForm').classList.toggle('hidden', tab !== 'login');
        $('registrationForm').classList.toggle('hidden', tab !== 'register');
        $('professorForm').classList.toggle('hidden', tab !== 'professor');
    }));

    // Student login
    $('loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        const errEl = $('loginError'); errEl.classList.add('hidden');
        const btn = qs('#loginForm .btn-primary');
        btn.disabled = true; qs('#loginForm .btn-text').textContent = 'AUTHENTICATING…';
        try {
            const res = await fetch(`${API}/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id: $('loginID').value.trim(), password: $('loginPW').value })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            saveSession('nexus_user', data.student);
            location.href = '/dashboard';
        } catch (err) {
            errEl.textContent = `⚠ ${err.message}`; errEl.classList.remove('hidden');
            btn.disabled = false; qs('#loginForm .btn-text').textContent = 'AUTHENTICATE';
        }
    });

    // Register
    $('registrationForm').addEventListener('submit', async e => {
        e.preventDefault();
        // FIX 4 (HTML side): registerMSG class was "msg_hidden", now "msg hidden" so this className reset works
        const msgEl = $('registerMSG'); msgEl.className = 'msg hidden';
        const btn = qs('#registrationForm .btn-primary'); btn.disabled = true;
        qs('#registrationForm .btn-text').textContent = 'CREATING…';
        try {
            const res = await fetch(`${API}/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: $('registerName').value.trim(), email: $('registerEmail').value.trim(),
                    course: $('registeredCourse').value, year_level: parseInt($('registeredYearLevel').value),
                    password: $('registeredPassword').value
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            msgEl.textContent = `✓ Account created! Student ID: ${data.student_id}`;
            msgEl.className = 'msg msg--success'; $('registrationForm').reset();
        } catch (err) {
            msgEl.textContent = `⚠ ${err.message}`; msgEl.className = 'msg msg--error';
        } finally {
            btn.disabled = false; qs('#registrationForm .btn-text').textContent = 'CREATE ACCOUNT';
        }
    });

    // Professor login
    $('professorForm').addEventListener('submit', async e => {
        e.preventDefault();
        const errEl = $('profError'); errEl.classList.add('hidden');
        const btn = qs('#professorForm .btn-primary'); btn.disabled = true;
        qs('#professorForm .btn-text').textContent = 'VERIFYING…';
        try {
            const res = await fetch(`${API}/prof/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: $('profEmail').value.trim(), password: $('profPW').value })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            saveSession('nexus_prof', data.professor);
            location.href = '/professor';
        } catch (err) {
            errEl.textContent = `⚠ ${err.message}`; errEl.classList.remove('hidden');
            btn.disabled = false; qs('#professorForm .btn-text').textContent = 'FACULTY LOGIN';
        }
    });
}

/*Student Dashboard*/
async function initDashboard() {
    const user = getSession('nexus_user');
    if (!user) {
        location.href = '/';
        return;
    }
    StartClock();
    populateStudentProfile(user);
    setupNav();
    setupSidebar();
    $('logoutBTN').addEventListener('click', () => {
        clearSessions('nexus_user');
        location.href = '/';
    });
    await Promise.all([loadSummary(user.student_id), loadGrades(user.student_id), loadSchedule(user.student_id),
    loadAnnouncements(), loadEnrollmentSection(user.student_id)
    ]);
}
function populateStudentProfile(user) {
    $('sidebarAvatar').textContent = user.avatar_seed || '👤';
    $('sidebarName').textContent = user.name;
    $('sidebarSrcode').textContent = `SR-CODE:  ${user.student_id}`;
    $('welcomeMSG').textContent = `Welcome back, ${user.name.split(' ')[0]}`;
    $('profileAvatar').textContent = user.avater_seed || '👤';
    $('profile-card-name').textContent = user.name;
    $('profile-card-course').textContent = user.course;
    $('tagYear').textContent = `Year Level: ${user.year_level}`;
    $('tagID').textContent = user.student_id;
    $('profile-card-email').textContent = user.email;
}

function setupNav() {
    qsa('.nav-item').forEach(item => 
        item.addEventListener('click', e => {
            e.preventDefault();
            qsa('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            qsa('.dashboard-section').forEach(section => section.classList.remove('active'));
            $(`section-${item.dataset.section}`).classList.add('active');
            $('bcCurrent').textContent = qs('.nav-label', item).textContent;
            if (window.innerWidth <= 768) $('sidebar').classList.remove('open');
        }));
};

function setupSidebar() {
    const topBarMenu = $('menuToggle'); 
    if (!topBarMenu) return;
    topBarMenu.addEventListener('click', () => $('sidebar').classList.toggle('open'));
}

async function loadSummary(student_id) {
    try{
        const data = await fetch(`${API}/summary/${student_id}/summary`).then(response => response.json());
        $('statusGPA').textContent = data.gpa??'--';
        $('statusSubject').textContent = data.subject??'--';
        
    }
}
/* ----- End of Login Page ---- */

initLoginPage();
StartClock();