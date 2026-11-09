import { describe, it, expect } from 'vitest';
import { getNoteFromDegree, getDegree } from '../src/music/intervals.js';

describe('getNoteFromDegree', () => {
  it('calcula las notas de La menor', () => {
    expect(getNoteFromDegree('A', '1')).toBe('A');
    expect(getNoteFromDegree('A', 'b3')).toBe('C');
    expect(getNoteFromDegree('A', '5')).toBe('E');
  });

  it('da la vuelta a la octava', () => {
    expect(getNoteFromDegree('G', '4')).toBe('C');
  });

  it('lanza un error con un grado que no existe', () => {
    expect(() => getNoteFromDegree('A', '9')).toThrow();
  });
});

describe('getDegree', () => {
  it('distingue la 3 mayor de la b3', () => {
    expect(getDegree('A', 'C#')).toBe('3');
    expect(getDegree('A', 'C')).toBe('b3');
  });

  it('reconoce la séptima menor de un dominante', () => {
    expect(getDegree('E', 'D')).toBe('b7');
  });
});
