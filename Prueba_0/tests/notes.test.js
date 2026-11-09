import { describe, it, expect } from 'vitest';
import { noteToFrequency, toSpanishName, GUITAR_STRINGS, CHORDS } from '../src/notes.js';

describe('noteToFrequency', () => {
  it('devuelve 440 Hz para el La4 de referencia', () => {
    expect(noteToFrequency('A4')).toBeCloseTo(440, 2);
  });

  it('calcula las frecuencias de las 6 cuerdas al aire', () => {
    expect(noteToFrequency('E2')).toBeCloseTo(82.41, 2);
    expect(noteToFrequency('A2')).toBeCloseTo(110.0, 2);
    expect(noteToFrequency('D3')).toBeCloseTo(146.83, 2);
    expect(noteToFrequency('G3')).toBeCloseTo(196.0, 2);
    expect(noteToFrequency('B3')).toBeCloseTo(246.94, 2);
    expect(noteToFrequency('E4')).toBeCloseTo(329.63, 2);
  });

  it('entiende las notas con sostenido', () => {
    expect(noteToFrequency('G#3')).toBeCloseTo(207.65, 2);
  });

  it('lanza un error si la nota no existe', () => {
    expect(() => noteToFrequency('H2')).toThrow();
  });
});

describe('toSpanishName', () => {
  it('traduce las notas a notación latina', () => {
    expect(toSpanishName('E2')).toBe('Mi2');
    expect(toSpanishName('G#3')).toBe('Sol#3');
  });
});

describe('datos de referencia', () => {
  it('define las 6 cuerdas ordenadas de grave a aguda', () => {
    const notes = GUITAR_STRINGS.map((guitarString) => guitarString.note);
    expect(notes).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  });

  it('incluye los 5 acordes básicos', () => {
    const names = CHORDS.map((chord) => chord.name);
    expect(names).toEqual(['Mi mayor', 'La menor', 'Re mayor', 'Sol mayor', 'Do mayor']);
  });
});
