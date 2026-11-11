// Guarda la sesión del usuario (el token JWT) en el navegador.
// Se usa localStorage para que la sesión siga abierta al recargar la página
// o al pasar de una página a otra.

const TOKEN_KEY = 'guitarra_token';

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Devuelve el token guardado o null si no hay sesión.
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
