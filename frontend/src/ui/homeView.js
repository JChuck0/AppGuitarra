// Página de inicio (pages/inicio.html). Solo se puede ver con la sesión abierta.

import { getMe } from '../api/client.js';
import { clearToken, getToken } from '../api/session.js';

const LOGIN_PAGE = '/index.html';

function goToLogin() {
  window.location.replace(LOGIN_PAGE);
}

async function showUser() {
  const greeting = document.getElementById('greeting');
  try {
    const usuario = await getMe();
    greeting.textContent = `Hola, ${usuario.nombre}`;
  } catch (error) {
    // 401: el token ha caducado o no es válido, hay que volver a entrar.
    if (error.status === 401) {
      clearToken();
      goToLogin();
      return;
    }
    greeting.textContent = 'Hola';
    const errorText = document.getElementById('home-error');
    errorText.textContent = error.message;
    errorText.classList.remove('hidden');
  }
}

document.getElementById('logout').addEventListener('click', () => {
  clearToken();
  goToLogin();
});

if (getToken()) {
  showUser();
} else {
  goToLogin();
}
