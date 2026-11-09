import { describe, it, expect } from 'vitest';
import {
  getPitchClass,
  noteToMidi,
  midiToNote,
  midiToFrequency,
  frequencyToMidi,
  noteToFrequency,
  getCentsDifference,
  transposeNote,
  toSpanishName,
} from '../src/music/notes.js';

describe('getPitchClass', () => {
  it('devuelve la posición de la nota dentro de la octava', () => {
    expect(getPitchClass('C')).toBe(0);
    expect(getPitchClass('A')).toBe(9);
    expect(getPitchClass('B')).toBe(11);
  });

  it('trata igual un bemol y su sostenido', () => {
    expect(getPitchClass('Bb')).toBe(getPitchClass('A#'));
  });

  it('lanza un error con una nota que no existe', () => {
    expect(() => getPitchClass('H')).toThrow();
  });
});

describe('noteToMidi y midiToNote', () => {
  it('convierte las notas de referencia', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('E2')).toBe(40);
  });

  it('entiende sostenidos y bemoles', () => {
    expect(noteToMidi('G#3')).toBe(56);
    expect(noteToMidi('Bb3')).toBe(58);
  });

  it('midiToNote hace la conversión contraria', () => {
    expect(midiToNote(40)).toBe('E2');
    expect(midiToNote(56)).toBe('G#3');
  });

  it('lanza un error si falta la octava', () => {
    expect(() => noteToMidi('E')).toThrow();
  });
});

describe('frecuencias', () => {
  it('el La4 son 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 5);
  });

  it('calcula las 6 cuerdas al aire', () => {
    expect(noteToFrequency('E2')).toBeCloseTo(82.41, 2);
    expect(noteToFrequency('A2')).toBeCloseTo(110.0, 2);
    expect(noteToFrequency('E4')).toBeCloseTo(329.63, 2);
  });

  it('frequencyToMidi es la operación contraria', () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 5);
    expect(frequencyToMidi(noteToFrequency('E2'))).toBeCloseTo(40, 5);
  });
});

describe('getCentsDifference', () => {
  it('es 0 con la misma frecuencia', () => {
    expect(getCentsDifference(440, 440)).toBe(0);
  });

  it('un semitono son 100 cents', () => {
    expect(getCentsDifference(noteToFrequency('A#4'), 440)).toBeCloseTo(100, 5);
  });

  it('es negativo si la nota está más grave', () => {
    expect(getCentsDifference(435, 440)).toBeLessThan(0);
  });
});

describe('transposeNote', () => {
  it('sube y baja semitonos', () => {
    expect(transposeNote('E2', 5)).toBe('A2');
    expect(transposeNote('C4', -1)).toBe('B3');
  });
});

describe('toSpanishName', () => {
  it('traduce con y sin octava', () => {
    expect(toSpanishName('G#3')).toBe('Sol#3');
    expect(toSpanishName('A')).toBe('La');
    expect(toSpanishName('Bb')).toBe('Sib');
  });
});
