/* ---- Utility functions ---- */
function $(id){
    return document.getElementById(id);
}

function qs(selector, ctx = document){
    return ctx.querySelector(selector);
}

function qsa(selector, ctx = document){
    return [...ctx.querySelectorAll(selector)];
}

function ClassGrade(grade){
    if (grade <= 100 && grade >= 90) return 'A'
    else if (grade < 90 && grade >= 80) return 'B';
    else if (grade < 80 && grade >= 75) return 'C';
    return 'D';
}

function GradeRemarks(grade){
    if (grade <= 100 && grade >= 90) return 'Satisfactory';
    else if (grade < 90 && grade >= 85) return 'Good';
    else if (grade < 85 && grade >= 80) return 'Fair';
    else if (grade < 80 && grade >= 75) return 'Poor';
    return 'Failed';
}

function TimeFormat(time){
    const [hour, minute] = time.split(":").map(Number);
    const period = hour >= 12 ? "PM" : "AM";
    return `${(hour % 12) || 12}:${String(minute).padStart(2, '0')} ${period}`;
}

function getSessions() {
    try {
        return JSON.parse(sessionStorage.getItem('nexus_user'));
    }
    catch {
        return null;
    }
}

function clearSessions(){
    sessionStorage.removeItem('nexus_user');
}

/* ---- End of Utility functions ---- */

/* ----- Clock ---- */
function StartClock() {
    const clock = $('topbar-clock');
    if (!clock) return;
    
    const tick = () => {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString('en-PH', {hour: '2-digit', second: '2-digit', minute: '2-digit'});
    };
    tick();
    setInterval(tick, 1000);
}

/* ----- End of Clock ---- */
/* ----- Login Page ---- */
function initLoginPage() {
    //redirect to dashboard if already logged in
    if(getSessions()){
        window.location.href = 'dashboard.html';
        return;
    }

    // For Tab Switching
    qsa('.tab').forEach(tab => {
        tab.addEventListerner(`click`, () => {
            qsa('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.target;
            $(`loginForm`).classList.toggle('hidden', target !== 'login');
            $(`registerForm`).classList.toggle('hidden', target !== 'register');
        });
});

//Login Form 
$('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ErrrorMsg = $(`loginError`);
    ErrorMsg.classList.add('hidden');


    const Student_SrCode = $(`loginID`).value.trim();
    const Student_Password = $(`loginPW`).value.trim();