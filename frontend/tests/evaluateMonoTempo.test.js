import { describe, it, expect } from 'vitest';
import {
  evaluateMonoTempo, getToleranceMs, getTempoVerdict, TEMPO_ERROR,
} from '../src/evaluation/evaluateMonoTempo.js';
import { generateTechniqueLoop, generateScaleRun, generateArpeggioPattern } from '../src/exercises/generators.js';
import { createMockEvents } from '../src/audio/mockAnalyzer.js';
import { MONO_TEMPO_PROFILE } from '../src/evaluation/profiles.js';

// Pulsación alterna de la Caja 1: 32 corcheas a 70 BPM (0,43 s cada una).
const ALTERNATE_PICKING = generateTechniqueLoop(
  { patron: 'pulsacion_alterna', cuerda: 6, traste: 0, figura: 'corcheas', compases: 4 }, 70);

// Pentatónica de La en posición 1, subiendo y bajando (23 notas).
const PENTATONIC = generateScaleRun(
  { escala: 'minor_pentatonic', tonicas: ['A'], posicion: 1, direccion: 'sube_y_baja', figura: 'corcheas' }, 70);

// Retrasa varias notas de una toma perfecta.
function delayNotes(expected, indexes, seconds = 0.15) {
  const detected = createMockEvents(expected, 'perfect');
  indexes.forEach((index) => { detected[index].time += seconds; });
  return detected;
}

function errorTypes(result) {
  return result.errors.map((error) => error.type);
}

describe('getToleranceMs', () => {
  it('a 70 BPM en corcheas la tolerancia es la máxima, 80 ms', () => {
    expect(getToleranceMs(ALTERNATE_PICKING)).toBe(80);
  });

  it('a 120 BPM en corcheas es el 25 % de 250 ms', () => {
    const fast = generateTechniqueLoop({ cuerda: 6, traste: 0, figura: 'corcheas', compases: 1 }, 120);
    expect(getToleranceMs(fast)).toBeCloseTo(62.5, 6);
  });

  it('con una sola nota es la máxima', () => {
    expect(getToleranceMs([{ time: 0, midi: [40] }])).toBe(MONO_TEMPO_PROFILE.maxToleranceMs);
  });
});

describe('getTempoVerdict', () => {
  const thresholds = { pitchAccuracy: 0.9, timingAccuracy: 0.85 };

  it('todas las métricas en su umbral es clean', () => {
    expect(getTempoVerdict({ pitchAccuracy: 0.9, timingAccuracy: 1 }, thresholds)).toBe('clean');
  });

  it('una sola métrica por debajo y por poco es almost', () => {
    expect(getTempoVerdict({ pitchAccuracy: 1, timingAccuracy: 0.82 }, thresholds)).toBe('almost');
  });

  it('una métrica muy por debajo o dos por debajo es not_clean', () => {
    expect(getTempoVerdict({ pitchAccuracy: 1, timingAccuracy: 0.7 }, thresholds)).toBe('not_clean');
    expect(getTempoVerdict({ pitchAccuracy: 0.88, timingAccuracy: 0.84 }, thresholds)).toBe('not_clean');
  });
});

describe('evaluateMonoTempo con el simulador', () => {
  it('toma perfecta: clean y sin errores', () => {
    const result = evaluateMonoTempo(ALTERNATE_PICKING, createMockEvents(ALTERNATE_PICKING, 'perfect'));

    expect(result.verdict).toBe('clean');
    expect(result.errors).toEqual([]);
    expect(result.metrics).toEqual({ pitchAccuracy: 1, timingAccuracy: 1, cleanliness: 1 });
  });

  it('una nota tarde: error late en su posición', () => {
    const result = evaluateMonoTempo(ALTERNATE_PICKING, createMockEvents(ALTERNATE_PICKING, 'late', { index: 5 }));

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ index: 5, type: TEMPO_ERROR.LATE });
    expect(result.errors[0].offsetMs).toBeGreaterThan(80);
    // Una sola nota de 32 no baja la precisión de tiempo del umbral
    expect(result.verdict).toBe('clean');
  });

  it('una nota adelantada: error early', () => {
    const result = evaluateMonoTempo(ALTERNATE_PICKING, createMockEvents(ALTERNATE_PICKING, 'early', { index: 10 }));
    expect(result.errors).toEqual([expect.objectContaining({ index: 10, type: TEMPO_ERROR.EARLY })]);
  });

  it('nota cambiada: wrong_note', () => {
    const result = evaluateMonoTempo(PENTATONIC, createMockEvents(PENTATONIC, 'wrong_note', { index: 7 }));

    expect(result.errors).toEqual([expect.objectContaining({ index: 7, type: TEMPO_ERROR.WRONG_NOTE })]);
    expect(result.metrics.pitchAccuracy).toBeCloseTo(22 / 23, 6);
  });

  it('nota en otra octava: también es wrong_note', () => {
    const result = evaluateMonoTempo(PENTATONIC, createMockEvents(PENTATONIC, 'octave'));
    expect(errorTypes(result)).toEqual([TEMPO_ERROR.WRONG_NOTE]);
  });

  it('falta una nota: missing en su posición', () => {
    const result = evaluateMonoTempo(PENTATONIC, createMockEvents(PENTATONIC, 'missing', { index: 3 }));
    expect(result.errors).toEqual([{ index: 3, type: TEMPO_ERROR.MISSING }]);
  });

  it('sobra una nota: extra con su tiempo y sin posición', () => {
    const result = evaluateMonoTempo(ALTERNATE_PICKING, createMockEvents(ALTERNATE_PICKING, 'extra', { index: 4 }));

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe(TEMPO_ERROR.EXTRA);
    expect(result.errors[0].index).toBeNull();
    expect(result.errors[0].time).toBeGreaterThan(ALTERNATE_PICKING[4].time);
    expect(result.errors[0].time).toBeLessThan(ALTERNATE_PICKING[5].time);
    expect(result.metrics.cleanliness).toBeCloseTo(32 / 33, 6);
  });

  it('mucho ruido: inconclusive', () => {
    const result = evaluateMonoTempo(ALTERNATE_PICKING, createMockEvents(ALTERNATE_PICKING, 'noisy'));
    expect(result.verdict).toBe('inconclusive');
  });

  it('sin nada detectado: inconclusive', () => {
    expect(evaluateMonoTempo(ALTERNATE_PICKING, []).verdict).toBe('inconclusive');
  });

  it('también funciona con los arpegios', () => {
    const arpeggio = generateArpeggioPattern({ acordes: ['Em', 'Am'], patron: 'cuerda_a_cuerda', figura: 'corcheas' }, 60);

    expect(evaluateMonoTempo(arpeggio, createMockEvents(arpeggio, 'perfect')).verdict).toBe('clean');
    expect(errorTypes(evaluateMonoTempo(arpeggio, createMockEvents(arpeggio, 'wrong_note')))).toEqual([TEMPO_ERROR.WRONG_NOTE]);
  });
});

describe('evaluateMonoTempo: veredictos', () => {
  it('5 notas tarde de 32: almost (tiempo al 84 %)', () => {
    const result = evaluateMonoTempo(ALTERNATE_PICKING, delayNotes(ALTERNATE_PICKING, [2, 8, 14, 20, 26]));

    expect(result.metrics.timingAccuracy).toBeCloseTo(27 / 32, 6);
    expect(result.verdict).toBe('almost');
  });

  it('8 notas tarde de 32: not_clean', () => {
    const result = evaluateMonoTempo(ALTERNATE_PICKING, delayNotes(ALTERNATE_PICKING, [1, 5, 9, 13, 17, 21, 25, 29]));

    expect(result.verdict).toBe('not_clean');
    expect(errorTypes(result).every((type) => type === TEMPO_ERROR.LATE)).toBe(true);
  });

  it('una nota un poco tarde pero dentro de la tolerancia no es error', () => {
    const result = evaluateMonoTempo(ALTERNATE_PICKING, delayNotes(ALTERNATE_PICKING, [3], 0.05));
    expect(result.errors).toEqual([]);
  });
});

describe('evaluateMonoTempo en legato', () => {
  const legato = generateTechniqueLoop(
    { patron: 'legato', legato: true, cuerdas: [4, 3], trastes: [5, 7], figura: 'corcheas' }, 70);

  it('las notas fuera de tiempo no son error si la secuencia es correcta', () => {
    const detected = delayNotes(legato, [1, 2, 3, 5, 6], 0.15);
    const result = evaluateMonoTempo(legato, detected, MONO_TEMPO_PROFILE, { legato: true });

    expect(result.errors).toEqual([]);
    expect(result.verdict).toBe('clean');
  });

  it('sin legato la misma toma sí tiene notas tarde', () => {
    const detected = delayNotes(legato, [1, 2, 3, 5, 6], 0.15);
    const result = evaluateMonoTempo(legato, detected);

    expect(result.verdict).toBe('not_clean');
  });

  it('una nota equivocada sigue siendo error', () => {
    const result = evaluateMonoTempo(legato, createMockEvents(legato, 'wrong_note'), MONO_TEMPO_PROFILE, { legato: true });
    expect(errorTypes(result)).toEqual([TEMPO_ERROR.WRONG_NOTE]);
  });
});
