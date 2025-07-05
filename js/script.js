const container = document.getElementById('container');

document.getElementById('signUp').addEventListener('click', () => {
    container.classList.add('right-panel-active');
});

document.getElementById('signIn').addEventListener('click', () => {
    container.classList.remove('right-panel-active');
});

function togglePassword(eyeIcon) {
  const input = eyeIcon.previousElementSibling;
  if (input.type === "password") {
    input.type = "text";
    eyeIcon.textContent = '🙈';
  } else {
    input.type = "password";
    eyeIcon.textContent = '👁️';
  }
}

function showToast(message, type='info'){
    Toastify({
        text: message,
        duration: 4000,
        gravity: 'top',
        position: 'right',
        style: {
            background: type === 'success'
            ? '#2ecc71'
            : type === 'error'
            ? '#e74c3c'
            : '#3498db'
        },
        close: true
    }).showToast();
}

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);

  switch (params.get('error')) {
    case 'login':
      showToast('❌ Invalid login. Please try again.', 'error');
      break;
    case 'register':
      showToast('❌ Email already exists. Choose another.', 'error');
      container.classList.add('right-panel-active');          // stay on Sign‑Up
      break;
    case 'weakpass':
      showToast(
        '❌ Weak password: 8+ chars, upper & lower, number, special, no email name.',
        'error'
      );
      container.classList.add('right-panel-active');          // stay on Sign‑Up
      break;
  }

  if (params.get('registered') === 'true') {
    showToast('✅ Registration successful! Please log in.', 'success');
    container.classList.remove('right-panel-active');         // back to Sign‑In
  }
});
