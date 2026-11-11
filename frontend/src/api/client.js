// Funciones para comunicarse con el backend (FastAPI).

import { getToken } from './session.js';

// Dirección del backend en desarrollo.
export const API_URL = 'http://localhost:8000';

// Error de la API con el código HTTP, para que las páginas puedan
// distinguir, por ejemplo, un 401 (sesión caducada) de otros errores.
// status vale 0 cuando ni siquiera se ha podido conectar con el servidor.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Mensajes para los errores de validación (422) de cada campo.
const FIELD_MESSAGES = {
  email: 'El email no es válido',
  password: 'La contraseña debe tener entre 8 y 72 caracteres',
  nombre: 'Escribe tu nombre',
};

// Convierte la respuesta de error del backend en un texto para el usuario.
// FastAPI manda "detail" como texto en los errores normales (401, 409...) y
// como una lista de errores por campo cuando falla la validación (422).
export function getErrorMessage(status, data) {
  const detail = data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    // loc es la ruta del campo, por ejemplo ['body', 'password'].
    const field = detail[0].loc?.at(-1);
    return FIELD_MESSAGES[field] ?? 'Revisa los datos del formulario';
  }
  return `El servidor ha respondido con el código ${status}`;
}

// Función común para todas las peticiones. Manda y recibe JSON y, si hay
// sesión, añade la cabecera Authorization con el token.
async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch solo falla así cuando no hay conexión o el servidor está apagado.
    throw new ApiError('No se puede conectar con el servidor. ¿Está arrancado el backend?', 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(getErrorMessage(response.status, data), response.status);
  }
  return data;
}

// Comprueba que el backend está levantado.
// Devuelve el JSON de /health, p. ej. { status: 'ok' }.
export function checkHealth() {
  return request('/health');
}

export function register(email, password, nombre) {
  return request('/auth/register', { method: 'POST', body: { email, password, nombre } });
}

// Devuelve { access_token, token_type }.
export function login(email, password) {
  return request('/auth/login', { method: 'POST', body: { email, password } });
}

// Datos del usuario que ha iniciado sesión.
export function getMe() {
  return request('/users/me');
}
