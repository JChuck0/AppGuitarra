import { describe, it, expect } from 'vitest';
import { getMidiAt, getNoteAt, findPositions } from '../src/music/fretboard.js';

describe('getNoteAt', () => {
  it('devuelve las cuerdas al aire', () => {
    expect(getNoteAt(6, 0)).toBe('E2');
    expect(getNoteAt(1, 0)).toBe('E4');
  });

  it('cada traste sube un semitono', () => {
    expect(getNoteAt(6, 5)).toBe('A2');
    expect(getNoteAt(5, 3)).toBe('C3');
    expect(getNoteAt(6, 12)).toBe('E3');
  });

  it('la cuerda 6 traste 5 suena igual que la 5 al aire', () => {
    expect(getMidiAt(6, 5)).toBe(getMidiAt(5, 0));
  });

  it('lanza un error con cuerdas o trastes fuera de rango', () => {
    expect(() => getMidiAt(7, 0)).toThrow();
    expect(() => getMidiAt(6, 13)).toThrow();
    expect(() => getMidiAt(6, -1)).toThrow();
  });
});

describe('findPositions', () => {
  it('encuentra el Do en la cuerda 5', () => {
    const positions = findPositions('C', [5]);
    expect(positions.map((p) => p.fret)).toEqual([3]);
  });

  it('encuentra el Mi de la cuerda 6 al aire y en el traste 12', () => {
    const positions = findPositions('E', [6]);
    expect(positions.map((p) => p.fret)).toEqual([0, 12]);
  });

  it('busca en todas las cuerdas si no se indican', () => {
    const positions = findPositions('A');
    const strings = new Set(positions.map((p) => p.string));
    expect(strings.size).toBe(6);
  });
});
