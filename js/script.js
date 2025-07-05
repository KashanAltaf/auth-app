const container = document.getElementById('container');

document.getElementById('signUp').addEventListener('click', () => {
    container.classList.add('right-panel-active');
});

document.getElementById('signIn').addEventListener('click', () => {
    container.classList.add('right-panel-active');
});

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if(params.get('error')){
        alert(params.get('error') === 'login'
        ? 'Invalid credentials, try again.'
        : 'Registration failed, email may already exist');
    }
});