import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../src/api/client.js';

describe('getErrorMessage', () => {
  it('devuelve el texto de detail cuando el backend manda un mensaje', () => {
    const data = { detail: 'Ya existe una cuenta con ese email' };
    expect(getErrorMessage(409, data)).toBe('Ya existe una cuenta con ese email');
  });

  it('traduce los errores de validación según el campo', () => {
    const data = { detail: [{ loc: ['body', 'password'], msg: 'String should have at least 8 characters' }] };
    expect(getErrorMessage(422, data)).toBe('La contraseña debe tener entre 8 y 72 caracteres');
  });

  it('usa un mensaje general si el campo no es conocido', () => {
    const data = { detail: [{ loc: ['body', 'otro'], msg: 'error' }] };
    expect(getErrorMessage(422, data)).toBe('Revisa los datos del formulario');
  });

  it('indica el código cuando la respuesta no tiene detail', () => {
    expect(getErrorMessage(500, null)).toBe('El servidor ha respondido con el código 500');
  });
});
