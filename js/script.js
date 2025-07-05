const container = document.getElementById('container');

document.getElementById('signUp').addEventListener('click', () => {
    container.classList.add('right-panel-active');
});

document.getElementById('signIn').addEventListener('click', () => {
    container.classList.remove('right-panel-active');
});

function togglePassword(eyeIcon) {
    const input = eyeIcon.previousElementSibling;
    if(input.type === "password"){
        eyeIcon.classList.toggle('fa-eye-slash');
    }
    else{
        eyeIcon.classList.toggle('fa-eye');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if(params.get('error')){
        alert(params.get('error') === 'login'
        ? 'Invalid credentials, try again.'
        : 'Registration failed, email may already exist');
    }
});