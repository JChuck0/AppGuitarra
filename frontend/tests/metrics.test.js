import { describe, it, expect } from 'vitest';
import { alignEvents } from '../src/evaluation/align.js';
import {
  pitchAccuracy, timingAccuracy, cleanliness, chordCompleteness, averageResponseMs, lowConfidenceShare,
} from '../src/evaluation/metrics.js';
import { createMockEvents } from '../src/audio/mockAnalyzer.js';

const MAX_DISTANCE_MS = 500;
const TOLERANCE_MS = 80;

const NOTES = [
  { time: 0, midi: [45] },
  { time: 1, midi: [48] },
  { time: 2, midi: [50] },
  { time: 3, midi: [52] },
];

const EM = [40, 47, 52, 55, 59, 64];
const CHORDS = [
  { time: 0, midi: EM },
  { time: 1, midi: EM },
];

function alignScenario(expected, scenario, index = 1) {
  return alignEvents(expected, createMockEvents(expected, scenario, { index }), MAX_DISTANCE_MS);
}

describe('métricas de notas sueltas', () => {
  it('una toma perfecta tiene todas las métricas a 1', () => {
    const alignment = alignScenario(NOTES, 'perfect');

    expect(pitchAccuracy(alignment)).toBe(1);
    expect(timingAccuracy(alignment, TOLERANCE_MS)).toBe(1);
    expect(cleanliness(alignment)).toBe(1);
  });

  it('una nota cambiada solo baja la precisión de altura', () => {
    const alignment = alignScenario(NOTES, 'wrong_note');

    expect(pitchAccuracy(alignment)).toBe(0.75);
    expect(timingAccuracy(alignment, TOLERANCE_MS)).toBe(1);
  });

  it('una nota en otra octava también cuenta como altura incorrecta', () => {
    expect(pitchAccuracy(alignScenario(NOTES, 'octave'))).toBe(0.75);
  });

  it('una nota tarde solo baja la precisión de tiempo', () => {
    const alignment = alignScenario(NOTES, 'late');

    expect(timingAccuracy(alignment, TOLERANCE_MS)).toBe(0.75);
    expect(pitchAccuracy(alignment)).toBe(1);
  });

  it('una nota que falta baja la altura y el tiempo pero no la limpieza', () => {
    const alignment = alignScenario(NOTES, 'missing');

    expect(pitchAccuracy(alignment)).toBe(0.75);
    expect(timingAccuracy(alignment, TOLERANCE_MS)).toBe(0.75);
    expect(cleanliness(alignment)).toBe(1);
  });

  it('una nota de más baja la limpieza', () => {
    // 5 detectadas y 1 sobra: 1 - 1/5.
    expect(cleanliness(alignScenario(NOTES, 'extra'))).toBeCloseTo(0.8, 5);
  });

  it('sin nada detectado las métricas valen 0', () => {
    const alignment = alignEvents(NOTES, [], MAX_DISTANCE_MS);

    expect(pitchAccuracy(alignment)).toBe(0);
    expect(timingAccuracy(alignment, TOLERANCE_MS)).toBe(0);
    expect(cleanliness(alignment)).toBe(0);
  });
});

describe('métricas de acordes', () => {
  it('un acorde completo tiene completitud 1', () => {
    expect(chordCompleteness(alignScenario(CHORDS, 'perfect'))).toBe(1);
  });

  it('si falta una cuerda en un golpe, la completitud baja en 1 de 12', () => {
    const alignment = alignScenario(CHORDS, 'missing_string', 0);
    expect(chordCompleteness(alignment)).toBeCloseTo(11 / 12, 5);
  });

  it('un golpe que falta cuenta con todas sus cuerdas sin sonar', () => {
    const alignment = alignScenario(CHORDS, 'missing', 0);
    expect(chordCompleteness(alignment)).toBe(0.5);
  });

  it('los golpes con checkNotes: false no cuentan para la completitud', () => {
    const expected = [{ time: 0, midi: EM }, { time: 0.5, midi: EM, checkNotes: false }];
    const detected = [
      { time: 0, midi: EM, confidence: 1 },
      { time: 0.5, midi: [59, 64], confidence: 1 }, // golpe hacia arriba, solo cuerdas agudas
    ];
    expect(chordCompleteness(alignEvents(expected, detected, 200))).toBe(1);
  });

  it('con countWrongNotes un golpe con una nota que no es del acorde es sucio', () => {
    const alignment = alignScenario(CHORDS, 'wrong_note', 0);

    expect(cleanliness(alignment)).toBe(1);
    expect(cleanliness(alignment, { countWrongNotes: true })).toBe(0.5);
  });
});

describe('averageResponseMs', () => {
  it('hace la media solo con las respuestas correctas', () => {
    const answers = [
      { result: 'correct', elapsedMs: 2000 },
      { result: 'correct', elapsedMs: 3000 },
      { result: 'wrong', elapsedMs: 500 },
    ];
    expect(averageResponseMs(answers)).toBe(2500);
  });

  it('sin respuestas correctas devuelve null', () => {
    expect(averageResponseMs([{ result: 'timeout', elapsedMs: 15000 }])).toBeNull();
  });
});

describe('lowConfidenceShare', () => {
  it('cuenta la proporción de eventos con confianza baja', () => {
    expect(lowConfidenceShare(createMockEvents(NOTES, 'noisy'), 0.6)).toBe(1);
    expect(lowConfidenceShare(createMockEvents(NOTES, 'perfect'), 0.6)).toBe(0);
  });

  it('sin eventos devuelve 1, porque no se puede evaluar nada', () => {
    expect(lowConfidenceShare([], 0.6)).toBe(1);
  });
});
