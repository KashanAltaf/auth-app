document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPass = document.getElementById('newPassword').value.trim();
  const confirmPass = document.getElementById('confirmPassword').value.trim();
  const email = sessionStorage.getItem('resetEmail'); // should be set during OTP step

  if (!email) return alert("No email found. Please retry the process.");

  if (newPass !== confirmPass) return alert("Passwords do not match.");

  const strong =
    /[A-Z]/.test(newPass) &&
    /[a-z]/.test(newPass) &&
    /[0-9]/.test(newPass) &&
    /[^A-Za-z0-9]/.test(newPass) &&
    newPass.length >= 8;

  const namePart = email.split('@')[0].replace(/[^a-z]/gi, '').toLowerCase();
  let containsName = false;
  for (let i = 0; i <= namePart.length - 3; i++) {
    if (newPass.toLowerCase().includes(namePart.slice(i, i + 3))) {
      containsName = true;
      break;
    }
  }

  if (!strong || containsName) {
    return alert("Password doesn't meet the security requirements.");
  }

  const res = await fetch('/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, newPassword: newPass })
  });

  const result = await res.json();

  if (result.ok) {
    alert("✅ Password reset successful. Please log in.");
    window.location.href = "/";
  } else {
    alert("❌ Something went wrong.");
  }
});
