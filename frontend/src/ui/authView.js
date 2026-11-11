// Pantalla de inicio de sesión y registro (index.html).

import { checkHealth, login, register } from '../api/client.js';
import { getToken, saveToken } from '../api/session.js';

const HOME_PAGE = '/pages/inicio.html';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const serverStatus = document.getElementById('server-status');

function showError(form, message) {
  const errorText = form.querySelector('.form-error');
  errorText.textContent = message;
  errorText.classList.toggle('hidden', !message);
}

// Cambia entre el formulario de login y el de registro.
function showForm(formToShow) {
  for (const form of [loginForm, registerForm]) {
    form.classList.toggle('hidden', form !== formToShow);
    showError(form, '');
  }
}

// Guarda el token y pasa a la página de inicio.
async function startSession(email, password) {
  const data = await login(email, password);
  saveToken(data.access_token);
  window.location.href = HOME_PAGE;
}

// Desactiva el botón mientras se espera al servidor para evitar envíos dobles.
async function handleSubmit(event, action) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button[type="submit"]');
  showError(form, '');
  button.disabled = true;

  try {
    await action(new FormData(form));
  } catch (error) {
    showError(form, error.message);
  } finally {
    button.disabled = false;
  }
}

async function doLogin(formData) {
  await startSession(formData.get('email').trim(), formData.get('password'));
}

// Después de registrarse se inicia sesión directamente.
async function doRegister(formData) {
  const email = formData.get('email').trim();
  const password = formData.get('password');
  await register(email, password, formData.get('nombre').trim());
  await startSession(email, password);
}

async function showServerStatus() {
  try {
    await checkHealth();
    serverStatus.textContent = 'Servidor conectado';
    serverStatus.className = 'text-sm text-green-700 mb-6';
  } catch (error) {
    serverStatus.textContent = error.message;
    serverStatus.className = 'text-sm text-red-700 mb-6';
  }
}

// Si ya hay sesión abierta no hace falta volver a entrar.
if (getToken()) {
  window.location.replace(HOME_PAGE);
}

document.getElementById('show-register').addEventListener('click', (event) => {
  event.preventDefault();
  showForm(registerForm);
});
document.getElementById('show-login').addEventListener('click', (event) => {
  event.preventDefault();
  showForm(loginForm);
});
loginForm.addEventListener('submit', (event) => handleSubmit(event, doLogin));
registerForm.addEventListener('submit', (event) => handleSubmit(event, doRegister));

showServerStatus();
