    // Helpers
    const form        = document.getElementById('resetPasswordForm');
    const newPwdInput = document.getElementById('newPassword');
    const confirmInput= document.getElementById('confirmPassword');
    const strengthBar = document.querySelector('.rp-strength-bar');
    const criteriaEls = document.querySelectorAll('#criteriaList li');
    const successSection = document.getElementById('successMessage');
    src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"

    // Eye‑toggle buttons
    document.querySelectorAll('.rp-eye-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const wrapper = btn.closest('.rp-input-wrapper');
        const input   = wrapper.querySelector('input');
        btn.classList.toggle('active');
        if (btn.classList.contains('active')) {
          input.type = 'text';
        } else {
          input.type = 'password';
        }
      });
    });

    // Password strength rules
    const rules = {
      length:    pwd => pwd.length >= 8,
      uppercase: pwd => /[A-Z]/.test(pwd),
      number:    pwd => /[0-9]/.test(pwd),
      special:   pwd => /[^A-Za-z0-9]/.test(pwd)
    };

    function updateStrength() {
      const pwd = newPwdInput.value;
      let passed = 0;
      Object.entries(rules).forEach(([key, test]) => {
        const el = document.querySelector(`#criteriaList li[data-criteria="${key}"]`);
        if (test(pwd)) {
          el.classList.add('valid');
          passed++;
        } else {
          el.classList.remove('valid');
        }
      });
      // Width = percent of rules passed
      const pct = (passed / Object.keys(rules).length) * 100;
      strengthBar.style.width = pct + '%';
      // Change color based on strength
      strengthBar.style.backgroundColor =
        pct < 50 ? '#dc3545' :
        pct < 75 ? '#f1c40f' :
                   '#28a745';
    }

    newPwdInput.addEventListener('input', updateStrength);

    // Form submission
    form.addEventListener('submit', async e => {
      e.preventDefault();
      // Basic client‑side checks
      if (confirmInput.value !== newPwdInput.value) {
        return Toastify({
          text: "Passwords do not match.",
          duration: 3000,
          gravity: "top",
          position: "center",
          backgroundColor: "#e74c3c"
        }).showToast();
      }
      const strengthPct = parseInt(strengthBar.style.width);
      if (strengthPct < 100) {
        return Toastify({
          text: "Password does not meet all criteria.",
          duration: 3000,
          gravity: "top",
          position: "center",
          backgroundColor: "#e74c3c"
        }).showToast();
      }

      try {
        const res = await axios.post('/reset_password', {
          email: new URLSearchParams(window.location.search).get('email'),
          newPassword: newPwdInput.value
        }, {
          headers: { "X-Requested-With": "fetch" }
        });
        if (res.data.ok) {
          // Hide form, show success
          form.hidden = true;
          successSection.hidden = false;
        } else {
          Toastify({
            text: `Error: ${res.data.err}`,
            duration: 3000,
            gravity: "top",
            position: "center",
            backgroundColor: "#e74c3c"
          }).showToast();
        }
      } catch (err) {
        Toastify({
          text: "Server error. Try again.",
          duration: 3000,
          gravity: "top",
          position: "center",
          backgroundColor: "#e74c3c"
        }).showToast();
      }
    });

    // Clear form & hide success if user navigates back
    window.addEventListener('pageshow', () => {
      form.hidden = false;
      successSection.hidden = true;
      form.reset();
      strengthBar.style.width = '0%';
      criteriaEls.forEach(li => li.classList.remove('valid'));
    });