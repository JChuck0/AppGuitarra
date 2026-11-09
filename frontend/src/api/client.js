// Funciones para comunicarse con el backend (FastAPI).

// Dirección del backend en desarrollo.
export const API_URL = 'http://localhost:8000';

// Comprueba que el backend está levantado.
// Devuelve el JSON de /health, p. ej. { status: 'ok' }.
export async function checkHealth() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error(`El servidor ha respondido con el código ${response.status}`);
  }
  return response.json();
}
