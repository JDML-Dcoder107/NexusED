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
    try {
        const data = await fetch(`${API}/summary/${student_id}/summary`).then(response => response.json());
        $('statusGPA').textContent = data.gpa ?? '-';
        $('statusSubject').textContent = data.subject ?? '-';
        $('statusClasses').textContent = data.classes ?? '-';
        $('statusStanding').textContent = data.standing ?? '-';
    } catch (err) {
        console.error('Error loading summary: ', err);
    }
}

async function loadGrades(student_id) {
    try {
        const grades = await fetch(`${API}/student/${student_id}/grades`).then(response => response.json());
        const tbody = $('gradesBody');
        if (!grades.length) { tbody.innerHTML = '<tr><td colspan = "6" class="loading-cell">No grades available</td></tr>'; return; }
        tbody.innerHTML = grades.map((grade, index) => `
        <tr>
            <td>${String(index + 1).padStart(2, '0')}</td>
            <td>${grade.subject}</td>
            <td>${grade.gpa != null ? `<span class="gpa-pill ${ClassGrade(grade.gpa)}">${parseFloat(grade.gpa).toFixed(1)}</span>` : '<span class="gpa-pill c">PENDING</span>'}</td>    
            <td>${grade.semester}</td><td>${grade.school_year}</td>
            <td>${grade.gpa != null ? GradeRemarks(grade.gpa) : '-'}</td>
        </tr>.`).join('');
        renderBarChart(grades.filter(grade => grade.gpa != null));
    } catch (err) {
        console.error('Error loading grades: ', err);
    }
}

function renderBarChart(grades) {
    const ctx = $('gradesChart'); if (!ctx) return;
    ctx.innerHTML = grades.map(grade => `
        <div class = "bar-row">
            <span class = "bar-subject"> ${grade.subject}</span>
            <div class = "bar-track"> 
                <div class = "bar-fill style = "width: 0% data-target="${grade.gpa}""></div>
                <span class = "bar-grade"> ${parseFloat(grade.gpa).toFixed(1)}</span>
        </div>`).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => {
        qsa('.bar-fill').forEach(bar => bar.style.width = `${Math.min(bar.dataset.target, 100)}%`);
    }));
}

async function loadSchedule(student_id) {
    try {
        const sched = await fetch(`${API}/student/${student_id}/schedule`).then(response => response.json());
        const grid = $('scheduleGrid');
        if (!sched.length) { grid.innerHTML = '<div class="loading-cell">No schedule available</div>'; return; }
        const days = {};
        sched.forEach(s => { (days[s.day] = days[s.day] || []).push(s); });
        grid.innerHTML = Object.entries(days).map(([day, items]) => `
        <div class = "sched-day-group">
            <p class="schedule-day">${day}</p>
            ${items.map(s => `
                <div class="schedule-card">
                    <div class="sched-time"><span>${fmtTime(s.time_start)}</span><span style="color:var(--text-muted);font-size:9px;margin:2px 0">TO</span><span>${fmtTime(s.time_end)}</span></div>
                    <div class="sched-body"><p class="sched-subject">${s.subject}</p><p class="sched-meta">${s.instructor_name || s.instructor || '—'}</p></div>
                    <div class="sched-right"><span class="sched-room">${s.room}</span></div>
            </div>`).join('')}
        </div>`).join('');

    } catch (err) {
        console.error('Error loading schedule: ', err);
    }
}

async function loadAnnouncements() {
    try {
        const items = await fetch(`${API}/announcements`).then(r => r.json());
        const list = $('noticeList'); if (!list) return;
        if (!items.length) { list.innerHTML = '<div class="loading-cell">NO ANNOUNCEMENTS</div>'; return; }
        list.innerHTML = items.map((a, i) => {
            const date = new Date(a.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
            return `<div class="notice-card ${a.category}" style="animation-delay:${i * .07}s">
        <div class="notice-meta"><span class="notice-cat">${a.category}</span><span class="notice-date">${date}</span>
        ${a.prof_name ? `<span style="font-family:var(--font-mono);font-size:10px;color:var(--accent2)">— ${a.prof_name}</span>` : ''}
        </div>
        <p class="notice-title">${a.title}</p><p class="notice-body">${a.body}</p>
      </div>`;
        }).join('');
    } catch (err) {
        console.error('Error loading schedule: ', err);
    }
}

/* ── ENROLLMENT SECTION ── */
async function loadEnrollmentSection(sid) {
    const wrap = $('sec-enrollment'); if (!wrap) return;
    const [allSecs, enrolled] = await Promise.all([
        fetch(`${API}/sections`).then(r => r.json()).catch(() => []),
        fetch(`${API}/student/${sid}/enrolled`).then(r => r.json()).catch(() => []),
    ]);
    const enrolledCodes = new Set(enrolled.map(e => e.section_code));
    const list = $('enrollSectionList'); if (!list) return;

    function hasConflict(sec) {
        return enrolled.some(e =>
            e.day === sec.day &&
            !(toMin(sec.time_end) <= toMin(e.time_start) || toMin(sec.time_start) >= toMin(e.time_end)) &&
            e.section_code !== sec.section_code
        );
    }

    function render(filter = 'all') {
        const shown = allSecs.filter(s => {
            if (filter === 'enrolled') return enrolledCodes.has(s.section_code);
            if (filter === 'available') return !enrolledCodes.has(s.section_code) && s.enrolled_count < s.max_slots;
            return true;
        });
        if (!shown.length) { list.innerHTML = '<div class="loading-cell">NO SECTIONS FOUND</div>'; return; }
        list.innerHTML = shown.map((s, i) => {
            const isEnrolled = enrolledCodes.has(s.section_code);
            const isFull = s.enrolled_count >= s.max_slots;
            const conflict = !isEnrolled && hasConflict(s);
            const pct = Math.round((s.enrolled_count / s.max_slots) * 100);
            return `
        <div class="enroll-card" style="animation-delay:${i * .04}s">
          <div class="enroll-card-body">
            <div style="display:flex;align-items:center;gap:8px">
              <p class="enroll-subject">${s.subject}</p>
              ${conflict ? '<span class="conflict-tag">CONFLICT</span>' : ''}
            </div>
            <p class="enroll-meta">${s.prof_name} · ${s.day} ${fmtTime(s.time_start)}–${fmtTime(s.time_end)} · ${s.room}</p>
            <p class="enroll-code">${s.section_code} · ${s.semester} ${s.school_year}</p>
          </div>
          <div class="slots-info">
            <div>${s.enrolled_count}/${s.max_slots}</div>
            <div class="slot-bar"><div class="slot-fill ${isFull ? 'full' : ''}" style="width:${pct}%"></div></div>
          </div>
          ${isEnrolled
                    ? `<button class="drop-btn" onclick="dropSection('${sid}','${s.section_code}')">DROP</button>`
                    : isFull
                        ? `<button class="enroll-btn full" disabled>FULL</button>`
                        : conflict
                            ? `<button class="enroll-btn full" disabled title="Schedule conflict">CONFLICT</button>`
                            : `<button class="enroll-btn" onclick="enrollSection('${sid}','${s.section_code}')">ENROLL</button>`
                }
        </div>`;
        }).join('');
    }
    qsa('.filter-btn').forEach(b => b.addEventListener('click', () => {
        qsa('.filter-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active'); render(b.dataset.filter);
    }));
    render();
}

window.enrollSection = async (sid, code) => {
    try {
        const res = await fetch(`${API}/enroll`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: sid, section_code: code })
        });
        const d = await res.json();
        if (!res.ok) { alert(`⚠ ${d.error}`); return; }
        alert(`✓ ${d.message}`);
        location.reload();
    } catch { alert('Connection error'); }
};

window.dropSection = async (sid, code) => {
    if (!confirm(`Drop section ${code}? This cannot be undone.`)) return;
    await fetch(`${API}/drop`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: sid, section_code: code })
    });
    location.reload();
};

/* ═══════════════════════════════════════
   PROFESSOR DASHBOARD
   ═══════════════════════════════════════ */
let _profSections = [];
let _modalCtx = {};

async function initProfDashboard() {
  const prof = getSession('nexus_prof');
  if (!prof) { location.href='/'; return; }
  startClock();
  $('sidebarAvatar').textContent = prof.avatar_seed||'??';
  $('sidebarName').textContent   = prof.name;
  $('sidebarDept').textContent   = prof.department;
  $('welcomeMsg').textContent    = `Welcome back, ${prof.name.split(' ')[0]}`;

  setupNav();
  setupSidebar();
  $('logoutBtn').addEventListener('click',()=>{ clearSess('nexus_prof'); location.href='/'; });

  await Promise.all([loadProfSummary(prof.prof_id), loadProfSections(prof.prof_id)]);
  setupGradeModal();
  setupAnnounceForm(prof.prof_id);
}

async function loadProfSummary(pid) {
  try {
    const d = await fetch(`${API}/prof/${pid}/summary`).then(r=>r.json());
    $('statSecs').textContent     = d.total_sections??'—';
    $('statStudents').textContent = d.total_students??'—';
    $('statPending').textContent  = d.pending_grades??'—';
  } catch {}
}

async function loadProfSections(pid) {
  try {
    _profSections = await fetch(`${API}/prof/${pid}/sections`).then(r=>r.json());
    renderProfSections(pid);
    renderOverviewSections();
    populateGradeSectionSelect();
  } catch {}
}

function renderProfSections(pid) {
  const panel = $('sectionsPanel'); if (!panel) return;
  if (!_profSections.length) { panel.innerHTML='<div class="loading-cell">NO SECTIONS ASSIGNED</div>'; return; }
  panel.innerHTML = _profSections.map(s=>{
    const pct = Math.round((s.enrolled_count/s.max_slots)*100);
    return `
      <div class="section-card">
        <div class="section-card-body">
          <p class="section-code">${s.section_code}</p>
          <p class="section-title-txt">${s.subject}</p>
          <p class="section-meta">${s.day} · ${fmtTime(s.time_start)}–${fmtTime(s.time_end)} · ${s.room} · ${s.semester} ${s.school_year}</p>
        </div>
        <div class="section-slots">
          <div>${s.enrolled_count}/${s.max_slots} students</div>
          <div class="slot-bar"><div class="slot-fill ${s.enrolled_count>=s.max_slots?'full':''}" style="width:${pct}%"></div></div>
        </div>
        <button class="toggle-btn ${s.is_open?'open':'closed'}"
                onclick="toggleSection('${s.section_code}','${pid}',${s.is_open?0:1},this)">
          ${s.is_open?'OPEN':'CLOSED'}
        </button>
      </div>`;
  }).join('');
}

function renderOverviewSections() {
  const el = $('overviewSections'); if (!el) return;
  el.innerHTML = _profSections.slice(0,5).map(s=>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <span style="font-family:var(--font-mono);font-size:10px;color:var(--accent2)">${s.section_code}</span>
        <span style="margin-left:10px;font-size:13px;color:var(--text)">${s.subject}</span>
      </div>
      <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim)">${s.enrolled_count}/${s.max_slots}</span>
    </div>`).join('');
}

function populateGradeSectionSelect() {
  const sel = $('gradeSectionSelect'); if (!sel) return;
  _profSections.forEach(s=>{
    const o = document.createElement('option');
    o.value=s.section_code; o.textContent=`${s.section_code} — ${s.subject}`;
    sel.appendChild(o);
  });
  sel.addEventListener('change', ()=>{ if(sel.value) loadSectionGrades(sel.value, getSession('nexus_prof').prof_id); });
}

async function loadSectionGrades(code, pid) {
  const wrap = $('gradeTableWrap'); if (!wrap) return;
  wrap.innerHTML = '<div class="loading-cell">LOADING…</div>';
  try {
    const students = await fetch(`${API}/prof/${pid}/section/${code}/students`).then(r=>r.json());
    if (!students.length) { wrap.innerHTML='<div class="loading-cell">NO STUDENTS ENROLLED</div>'; return; }
    wrap.innerHTML = `
      <table class="data-table">
        <thead><tr>
          <th>#</th><th>STUDENT ID</th><th>NAME</th><th>COURSE</th><th>YR</th>
          <th>CURRENT GRADE</th><th>ACTION</th>
        </tr></thead>
        <tbody>
          ${students.map((s,i)=>`
            <tr>
              <td>${String(i+1).padStart(2,'0')}</td>
              <td>${s.student_id}</td>
              <td>${s.name}</td>
              <td style="font-size:11px;color:var(--text-dim)">${s.course}</td>
              <td>${s.year_level}</td>
              <td id="grade-cell-${s.student_id}">
                ${s.grade!=null ? `<span class="grade-pill ${gradeClass(s.grade)}">${parseFloat(s.grade).toFixed(1)}</span>` : '<span style="color:var(--text-muted);font-family:var(--font-mono);font-size:11px">—</span>'}
              </td>
              <td>
                <button class="edit-btn" onclick="openGradeModal('${s.student_id}','${s.name}','${code}','${pid}',${s.grade??''})">
                  ${s.grade!=null ? 'UPDATE' : 'ENTER GRADE'}
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch { wrap.innerHTML='<div class="loading-cell">ERROR LOADING DATA</div>'; }
}

window.toggleSection = async (code, pid, newState, btn) => {
  await fetch(`${API}/prof/section/toggle`,{ method:'PUT', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({section_code:code, prof_id:pid, is_open:newState}) });
  btn.textContent = newState ? 'OPEN' : 'CLOSED';
  btn.className   = `toggle-btn ${newState?'open':'closed'}`;
};

/* GRADE MODAL */
function setupGradeModal() {
  $('modalClose').addEventListener('click', ()=>$('gradeModal').classList.add('hidden'));
  $('gradeModal').addEventListener('click', e=>{ if(e.target===$('gradeModal')) $('gradeModal').classList.add('hidden'); });
  $('modalSave').addEventListener('click', saveGrade);
}

window.openGradeModal = (sid, name, code, pid, currentGrade) => {
  _modalCtx = { sid, code, pid };
  $('modalStudent').textContent = name;
  $('modalSubject').textContent  = `Section: ${code}`;
  $('modalGradeInput').value     = currentGrade!=null && currentGrade!=='' ? parseFloat(currentGrade).toFixed(1) : '';
  $('modalMsg').className='msg hidden';
  $('gradeModal').classList.remove('hidden');
  $('modalGradeInput').focus();
};

async function saveGrade() {
  const {sid,code,pid} = _modalCtx;
  const grade = parseFloat($('modalGradeInput').value);
  const msgEl = $('modalMsg'); msgEl.className='msg hidden';
  if (isNaN(grade)||grade<0||grade>100) {
    msgEl.textContent='⚠ Enter a valid grade (0–100)'; msgEl.className='msg msg--error'; return;
  }
  const btn = $('modalSave'); btn.disabled=true; qs('#modalSave .btn-text').textContent='SAVING…';
  try {
    const res = await fetch(`${API}/prof/grade`,{ method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({student_id:sid, section_code:code, grade, prof_id:pid}) });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error);
    msgEl.textContent=`✓ Grade saved: ${grade.toFixed(1)}`; msgEl.className='msg msg--success';
    // Update cell inline
    const cell = $(`grade-cell-${sid}`);
    if (cell) cell.innerHTML=`<span class="grade-pill ${gradeClass(grade)}">${grade.toFixed(1)}</span>`;
    setTimeout(()=>$('gradeModal').classList.add('hidden'), 900);
  } catch(err) {
    msgEl.textContent=`⚠ ${err.message}`; msgEl.className='msg msg--error';
  } finally { btn.disabled=false; qs('#modalSave .btn-text').textContent='SAVE GRADE'; }
}

function setupAnnounceForm(pid) {
  const form = $('announceForm'); if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msgEl = $('annMsg'); msgEl.className='msg hidden';
    const btn = qs('#announceForm .btn-primary'); btn.disabled=true;
    qs('#announceForm .btn-text').textContent='POSTING…';
    try {
      const res = await fetch(`${API}/prof/announcement`,{ method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ title:$('annTitle').value, body:$('annBody').value,
          category:$('annCat').value, prof_id:pid }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      msgEl.textContent='✓ Announcement posted!'; msgEl.className='msg msg--success';
      form.reset();
    } catch(err) {
      msgEl.textContent=`⚠ ${err.message}`; msgEl.className='msg msg--error';
    } finally { btn.disabled=false; qs('#announceForm .btn-text').textContent='POST ANNOUNCEMENT'; }
  });
}

/* ═══════════════════════════════════════
   PAGE DISPATCH
   ═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;
  if (path==='/professor'||path==='/professor.html') initProfDashboard();
  else if (path==='/dashboard'||path==='/dashboard.html') initDashboard();
  else initLoginPage();
});
JSEOF