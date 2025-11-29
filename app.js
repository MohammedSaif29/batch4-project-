// Detect where the backend is running:
// - If page is served from http://localhost:3000  → same origin, API_BASE = ''
// - If page is served from Live Server (:5500 etc.) → call http://localhost:3000
const API_BASE = (window.location.port === '3000')
  ? ''
  : 'http://localhost:3000';

/* ----------------- NAV + PAGE HANDLING ----------------- */

function showPage(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`${page}-page`);
  if (el) el.classList.add('active');

  // update nav active state
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active-nav'));
  const navMatch = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (navMatch) navMatch.classList.add('active-nav');

  if (page === 'donor') loadRequests();
  if (page === 'admin') loadAdminPending();
  updateUserDisplay();
}

/* ----------------- TOKEN & USER DISPLAY ----------------- */

function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function removeToken() { localStorage.removeItem('token'); }

function updateUserDisplay() {
  const token = getToken();
  const display = document.getElementById('donor-username-display');
  if (!display) return;

  if (!token) {
    display.textContent = '';
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    display.textContent = payload.username ? `Logged in: ${payload.username}` : '';
  } catch (e) {
    display.textContent = '';
  }
}

/* ----------------- MODALS ----------------- */

function openDonorAuth() { document.getElementById('donor-auth-modal').style.display = 'flex'; }
function closeDonorAuth() { document.getElementById('donor-auth-modal').style.display = 'none'; }
function openAdminLogin() { document.getElementById('admin-login-modal').style.display = 'flex'; }
function closeAdminLogin() { document.getElementById('admin-login-modal').style.display = 'none'; }

/* ----------------- AUTH: DONOR ----------------- */

async function donorLogin() {
  const username = document.getElementById('donor-username').value.trim();
  const password = document.getElementById('donor-password').value;
  if (!username || !password) { alert('Enter username and password'); return; }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) throw new Error(data.message || 'Login failed');

    // server returns { success, token, user }
    setToken(data.token);
    closeDonorAuth();
    showPage('donor');
  } catch (err) {
    console.error(err);
    alert('Login failed: ' + (err.message || err));
  }
}

async function donorRegister() {
  const username = document.getElementById('donor-username').value.trim();
  const password = document.getElementById('donor-password').value;
  if (!username || !password) { alert('Enter username and password'); return; }

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ username, password, role: 'donor' })
    });
    const data = await res.json();

    if (!res.ok || !data.success) throw new Error(data.message || 'Register failed');

    setToken(data.token);
    alert('Registered and logged in');
    closeDonorAuth();
    showPage('donor');
  } catch (err) {
    console.error(err);
    alert('Register failed: ' + (err.message || err));
  }
}

/* ----------------- AUTH: ADMIN ----------------- */

async function adminLogin() {
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value;
  if (!username || !password) { alert('Enter username and password'); return; }

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Login failed');
    }

    // optional: ensure this user is actually an admin
    if (!data.user || data.user.role !== 'admin') {
      throw new Error('This account is not an admin');
    }

    setToken(data.token);
    closeAdminLogin();
    showPage('admin');
  } catch (err) {
    console.error(err);
    alert('Admin login failed: ' + err.message);
  }
}

function handleLogout() {
  removeToken();
  showPage('home');
}

/* ----------------- DONOR: REQUESTS & DONATIONS ----------------- */

async function loadRequests() {
  const container = document.getElementById('requests-container');
  if (!container) return;
  container.innerHTML = '<div class="text-sm text-slate-300">Loading...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/requests`);
    const body = await res.json();
    const list = Array.isArray(body) ? body : (body && body.data) ? body.data : [];

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="text-sm text-slate-400">No requests found</div>';
      return;
    }

    container.innerHTML = '';
    list.forEach(r => {
      const card = document.createElement('div');
      card.className = 'card p-6 flex justify-between items-start border border-white/5 bg-slate-950/80';

      const neededVal = (r.amountNeeded ?? r.amount_needed ?? r.amount ?? null);
      const neededText = formatCurrency(neededVal);

      card.innerHTML = `
        <div class="flex-1 pr-6">
          <div class="font-semibold text-lg text-white">${escapeHtml(r.title || 'Request #' + r.id)}</div>
          <div class="text-sm text-slate-300 mt-1">${escapeHtml(r.description || '')}</div>
          <div class="text-xs text-slate-400 mt-3">Status: ${escapeHtml(r.status || 'open')}</div>
        </div>
        <div class="flex flex-col items-end">
          <div class="text-xs text-slate-400">Amount Needed</div>
          <div class="text-2xl font-extrabold text-pink-300 mt-1">${neededText}</div>
          <button class="mt-4 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 text-slate-950 px-4 py-2 rounded-full text-sm font-semibold donate-btn hover:opacity-90 transition">
            Donate Now
          </button>
        </div>
      `;

      container.appendChild(card);
      const btn = card.querySelector('.donate-btn');
      if (btn) btn.addEventListener('click', () => promptDonate(r.id));
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="text-sm text-red-400">Error loading requests</div>';
  }
}

function promptDonate(requestId) {
  const amount = prompt('Enter donation amount (numbers only)');
  if (!amount) return;
  const num = Number(amount.replace(/[^0-9.-]/g, ''));
  if (isNaN(num) || num <= 0) { alert('Please enter a valid positive number'); return; }
  handleDonate(requestId, num);
}

async function handleDonate(requestId, amount) {
  const token = getToken();

  try {
    const res = await fetch(`${API_BASE}/api/donate`, {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {})
      },
      body: JSON.stringify({ requestId, donorName: 'Anonymous', amount })
    });

    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.message || 'Donate failed');

    alert('Donation sent. Thank you!');
    loadRequests();
  } catch (err) {
    console.error(err);
    alert('Donation failed: ' + (err.message || err));
  }
}

/* ----------------- ADMIN: PENDING REQUESTS ----------------- */

async function loadAdminPending() {
  const container = document.getElementById('admin-pending-container');
  if (!container) return;
  container.innerHTML = '<div class="text-sm text-slate-300">Loading...</div>';

  const token = getToken();
  if (!token) {
    container.innerHTML = '<div class="text-sm text-slate-400">Please login as admin.</div>';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/requests/pending`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const body = await res.json();
    const list = Array.isArray(body) ? body : (body && body.data) ? body.data : [];

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="text-sm text-slate-400">No pending requests</div>';
      return;
    }

    container.innerHTML = '';
    list.forEach(r => {
      const card = document.createElement('div');
      card.className = 'p-4 bg-slate-950/80 border border-white/5 rounded-xl flex justify-between items-start';

      card.innerHTML = `
        <div>
          <div class="font-semibold text-white">${escapeHtml(r.title || 'Request #' + r.id)}</div>
          <div class="text-sm text-slate-300 mt-1">${escapeHtml(r.description || '')}</div>
        </div>
        <div class="flex flex-col gap-2">
          <button class="bg-emerald-500 text-slate-950 px-3 py-1 rounded-full text-xs font-semibold approve-btn hover:bg-emerald-400 transition">Approve</button>
          <button class="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold reject-btn hover:bg-red-400 transition">Reject</button>
        </div>
      `;

      container.appendChild(card);
      const approveBtn = card.querySelector('.approve-btn');
      const rejectBtn = card.querySelector('.reject-btn');
      if (approveBtn) approveBtn.addEventListener('click', () => updateRequestStatus(r.id, 'approved'));
      if (rejectBtn) rejectBtn.addEventListener('click', () => updateRequestStatus(r.id, 'rejected'));
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="text-sm text-red-400">Error loading pending requests</div>';
  }
}

async function updateRequestStatus(id, status) {
  const token = getToken();
  if (!token) { alert('Login required'); return; }

  try {
    const res = await fetch(`${API_BASE}/api/requests/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type':'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Update failed');

    alert('Request updated');
    loadAdminPending();
  } catch (err) {
    console.error(err);
    alert('Update failed: ' + err.message);
  }
}

/* ----------------- HELPERS ----------------- */

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/[&<>"'`]/g, c => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":"&#39;",
    '`':'&#96;'
  }[c]));
}

function formatCurrency(v) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (!isFinite(n) || isNaN(n)) return '—';
  return '₹' + new Intl.NumberFormat('en-IN').format(n);
}

/* ----------------- INITIALISE UI ----------------- */

showPage('home');
updateUserDisplay();
