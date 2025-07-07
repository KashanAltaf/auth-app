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
        : type === 'error'   ? '#e74c3c'
        : '#3498db'
    }
  }).showToast();
}

/* ------------ AJAX: Sign‑Up (using Axios) ------------ */
document.getElementById('signupForm').addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);

  try {
    const res = await axios.post('/register', formData, {
      headers: { 'X-Requested-With': 'fetch' }
    });

    if (res.data.ok) {
      showToast('✅ Registration successful! Please log in.', 'success');
      container.classList.remove('right-panel-active'); // switch to Sign‑In
      e.target.reset();
    } else {
      const msg =
        res.data.err === 'weakpass'
          ? '❌ Weak password!'
          : res.data.err === 'register'
          ? '❌ Email already exists. Choose another.'
          : '❌ Registration error. Please try again.';
      showToast(msg, 'error');
      container.classList.add('right-panel-active');   // stay on Sign‑Up
    }
  } catch (err) {
    showToast('❌ Network error. Please try again.', 'error');
  }
});

/* ------------ AJAX: Sign‑In (using Axios) ------------ */
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const formData = new FormData(e.target);

  try {
    const res = await axios.post('/login', formData, {
      headers: { 'X-Requested-With': 'fetch' }
    });

    if (res.data.ok && res.data.token) {
      // store JWT for later authenticated requests
      localStorage.setItem('token', res.data.token);
      window.location.href = '/welcome.html';
    } else {
      showToast('❌ Invalid login. Please try again.', 'error');
    }
  } catch (err) {
    showToast('❌ Network error. Please try again.', 'error');
  }
});
