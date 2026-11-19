import { describe, it, expect } from 'vitest';
import { createMockEvents, MOCK_SCENARIOS } from '../src/audio/mockAnalyzer.js';

// 4 notas en negras a 60 BPM (una por segundo).
const NOTES = [
  { time: 0, midi: [45] },
  { time: 1, midi: [48] },
  { time: 2, midi: [50] },
  { time: 3, midi: [52] },
];

// 2 golpes de Mi menor.
const CHORDS = [
  { time: 0, midi: [40, 47, 52, 55, 59, 64] },
  { time: 1, midi: [40, 47, 52, 55, 59, 64] },
];

describe('createMockEvents', () => {
  it('perfect: las mismas notas, casi a tiempo y con confianza alta', () => {
    const detected = createMockEvents(NOTES, 'perfect');

    expect(detected).toHaveLength(4);
    detected.forEach((event, i) => {
      expect(event.midi).toEqual(NOTES[i].midi);
      expect(Math.abs(event.time - NOTES[i].time)).toBeLessThan(0.02);
      expect(event.confidence).toBeGreaterThan(0.9);
    });
  });

  it('late y early: solo cambia el tiempo de la nota elegida', () => {
    const late = createMockEvents(NOTES, 'late', { index: 1 });
    const early = createMockEvents(NOTES, 'early', { index: 1 });

    expect(late[1].time - NOTES[1].time).toBeGreaterThan(0.08);
    expect(NOTES[1].time - early[1].time).toBeGreaterThan(0.08);
    expect(late[0].time).toBeCloseTo(early[0].time, 5);
  });

  it('wrong_note: la nota cambia un semitono', () => {
    expect(createMockEvents(NOTES, 'wrong_note', { index: 2 })[2].midi).toEqual([51]);
  });

  it('octave: la nota sube 12 semitonos', () => {
    expect(createMockEvents(NOTES, 'octave', { index: 0 })[0].midi).toEqual([57]);
  });

  it('missing: falta una nota', () => {
    const detected = createMockEvents(NOTES, 'missing', { index: 1 });
    expect(detected).toHaveLength(3);
    expect(detected.map((event) => event.midi[0])).toEqual([45, 50, 52]);
  });

  it('extra: sobra una nota entre dos', () => {
    const detected = createMockEvents(NOTES, 'extra', { index: 1 });
    expect(detected).toHaveLength(5);
    expect(detected[2].time).toBeGreaterThan(detected[1].time);
    expect(detected[2].time).toBeLessThan(detected[3].time);
  });

  it('missing_string: al acorde le falta la cuerda 2', () => {
    const detected = createMockEvents(CHORDS, 'missing_string', { index: 0 });
    expect(detected[0].midi).toEqual([40, 47, 52, 55, 64]);
    expect(detected[1].midi).toHaveLength(6);
  });

  it('noisy: todas las detecciones tienen poca confianza', () => {
    createMockEvents(NOTES, 'noisy').forEach((event) => {
      expect(event.confidence).toBeLessThan(0.5);
    });
  });

  it('no modifica los eventos esperados', () => {
    const copy = JSON.parse(JSON.stringify(CHORDS));
    for (const scenario of MOCK_SCENARIOS) {
      createMockEvents(CHORDS, scenario);
    }
    expect(CHORDS).toEqual(copy);
  });

  it('un escenario que no existe da error', () => {
    expect(() => createMockEvents(NOTES, 'inventado')).toThrow();
  });
});
