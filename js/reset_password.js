// Elements
const form           = document.getElementById('resetPasswordForm');
const newPwdInput    = document.getElementById('newPassword');
const confirmInput   = document.getElementById('confirmPassword');
const strengthBar    = document.querySelector('.rp-strength-bar');
const criteriaEls    = document.querySelectorAll('#criteriaList li');
const successSection = document.getElementById('successMessage');
const emailDisplay   = document.getElementById('userEmail');
const emailInput     = document.getElementById('emailInput');

// 1. Populate email from URL
const params = new URLSearchParams(window.location.search);
const email  = params.get('email') || '';
emailDisplay.textContent = email;
emailInput.value = email;

// 2. Eye‑toggle handlers for both inputs
document.querySelectorAll('.rp-eye-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp = btn.closest('.rp-input-wrapper').querySelector('input');
    btn.classList.toggle('active');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
});

// 3. Password strength rules (same as signup)
const rules = {
  length:    pwd => pwd.length >= 8,
  uppercase: pwd => /[A-Z]/.test(pwd),
  number:    pwd => /[0-9]/.test(pwd),
  special:   pwd => /[^A-Za-z0-9]/.test(pwd)
};

// 4. Update strength meter & criteria list
function updateStrength() {
  const pwd = newPwdInput.value;
  let passed = 0;
  Object.entries(rules).forEach(([key, test]) => {
    const li = document.querySelector(`#criteriaList li[data-criteria="${key}"]`);
    if (test(pwd)) {
      li.classList.add('valid');
      passed++;
    } else {
      li.classList.remove('valid');
    }
  });
  const pct = (passed / Object.keys(rules).length) * 100;
  strengthBar.style.width = pct + '%';
  strengthBar.style.backgroundColor =
    pct < 50 ? '#dc3545' :
    pct < 75 ? '#f1c40f' :
               '#28a745';
}
newPwdInput.addEventListener('input', updateStrength);

// 5. Form submission
form.addEventListener('submit', async e => {
  e.preventDefault();

  // a) Confirm passwords match
  if (newPwdInput.value !== confirmInput.value) {
    return Toastify({
      text: "Passwords do not match.",
      duration: 3000,
      gravity: "top",
      position: "center",
      backgroundColor: "#e74c3c"
    }).showToast();
  }

  // b) All strength criteria passed?
  const pct = parseInt(strengthBar.style.width);
  if (pct < 100) {
    return Toastify({
      text: "Password does not meet all criteria.",
      duration: 3000,
      gravity: "top",
      position: "center",
      backgroundColor: "#e74c3c"
    }).showToast();
  }

  // c) Send to server
  try {
    const res = await axios.post('/reset-password', {
      email,
      newPassword: newPwdInput.value
    }, {
      headers: { "X-Requested-With": "fetch" }
    });

    if (res.data.ok) {
      form.hidden = true;
      successSection.hidden = false;
    } else {
      // Handle same-as-old or other errors
      const msg = res.data.err === 'samepass'
        ? 'New password cannot be the same as the old one.'
        : 'Error: ' + res.data.err;
      Toastify({
        text: `❌ ${msg}`,
        duration: 3000,
        gravity: "top",
        position: "center",
        backgroundColor: "#e74c3c"
      }).showToast();
    }
  } catch {
    Toastify({
      text: "Server error. Try again.",
      duration: 3000,
      gravity: "top",
      position: "center",
      backgroundColor: "#e74c3c"
    }).showToast();
  }
});

// 6. Reset UI when navigating back
window.addEventListener('pageshow', () => {
  form.hidden = false;
  successSection.hidden = true;
  form.reset();
  strengthBar.style.width = '0%';
  criteriaEls.forEach(li => li.classList.remove('valid'));
});
