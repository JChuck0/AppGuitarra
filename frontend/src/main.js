import { checkHealth } from './api/client.js';

const statusText = document.getElementById('server-status');

// Al cargar la página comprobamos si el backend responde.
async function showServerStatus() {
  try {
    const data = await checkHealth();
    statusText.textContent = `Servidor conectado (${data.status})`;
    statusText.className = 'text-green-700';
  } catch (error) {
    statusText.textContent = 'No se puede conectar con el servidor. ¿Está arrancado el backend?';
    statusText.className = 'text-red-700';
    console.error(error);
  }
}

showServerStatus();
