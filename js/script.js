/* ------------ panel toggles ------------ */
const container = document.getElementById('container');

document.getElementById('signUp').addEventListener('click', e => {
  e.preventDefault();
  container.classList.add('right-panel-active');
});

document.getElementById('signIn').addEventListener('click', e => {
  e.preventDefault();
  container.classList.remove('right-panel-active');
});

/* ------------ eye toggle ------------ */
function togglePassword(eyeIcon) {
  const input = eyeIcon.previousElementSibling;
  if (input.type === 'password') {
    input.type = 'text';
    eyeIcon.textContent = '🙈';
  } else {
    input.type = 'password';
    eyeIcon.textContent = '👁️';
  }
}

/* ------------ toast helper ------------ */
function showToast(message, type = 'info') {
  Toastify({
    text: message,
    duration: 4000,
    gravity: 'top',
    position: 'center',
    close: true,
    style: {
      background:
        type === 'success' ? '#2ecc71'
        : type === 'error' ? '#e74c3c'
        : '#3498db'
    }
  }).showToast();
}

/* ------------ AJAX: Sign‑Up ------------ */
document.getElementById('signupForm').addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const res = await fetch('/register', {
    method: 'POST',
    headers: { 'x-requested-with': 'fetch' },
    body: formData
  }).then(r => r.json()).catch(() => ({ ok:false, err:'network' }));

  if (res.ok) {
    showToast('✅ Registration successful! Please log in.', 'success');
    container.classList.remove('right-panel-active'); // switch to Sign‑In
    e.target.reset();
  } else {
    const msg =
      res.err === 'weakpass'
        ? '❌ Weak password!'
        : res.err === 'register'
        ? '❌ Email already exists. Choose another.'
        : '❌ Network error. Please try again.';
    showToast(msg, 'error');
    container.classList.add('right-panel-active');   // stay on Sign‑Up
  }
});

/* ------------ AJAX: Sign‑In ------------ */
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'x-requested-with': 'fetch' },
    body: formData
  }).then(r => r.json()).catch(() => ({ ok:false, err:'network' }));

  if (res.ok) {
    window.location.href = '/welcome.html';          // only on success
  } else {
    showToast('❌ Invalid login. Please try again.', 'error');
  }
});
