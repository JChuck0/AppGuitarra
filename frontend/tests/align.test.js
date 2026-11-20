import { describe, it, expect } from 'vitest';
import { alignEvents } from '../src/evaluation/align.js';
import { createMockEvents } from '../src/audio/mockAnalyzer.js';

// 4 notas a 60 BPM.
const EXPECTED = [
  { time: 0, midi: [45] },
  { time: 1, midi: [48] },
  { time: 2, midi: [50] },
  { time: 3, midi: [52] },
];

// Ventana para emparejar: la mitad de un tiempo a 60 BPM.
const MAX_DISTANCE_MS = 500;

describe('alignEvents', () => {
  it('en una toma perfecta empareja todo y no falta ni sobra nada', () => {
    const result = alignEvents(EXPECTED, createMockEvents(EXPECTED, 'perfect'), MAX_DISTANCE_MS);

    expect(result.pairs).toHaveLength(4);
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    result.pairs.forEach((pair, i) => expect(pair.expected).toBe(EXPECTED[i]));
  });

  it('una nota tarde sigue emparejada, con su desfase en ms', () => {
    const result = alignEvents(EXPECTED, createMockEvents(EXPECTED, 'late', { index: 1 }), MAX_DISTANCE_MS);

    expect(result.pairs).toHaveLength(4);
    expect(result.pairs[1].offsetMs).toBeGreaterThan(140);
  });

  it('una nota que falta sale en missing', () => {
    const result = alignEvents(EXPECTED, createMockEvents(EXPECTED, 'missing', { index: 2 }), MAX_DISTANCE_MS);

    expect(result.missing).toEqual([EXPECTED[2]]);
    expect(result.pairs).toHaveLength(3);
  });

  it('una nota de más sale en extra', () => {
    const detected = createMockEvents(EXPECTED, 'extra', { index: 1 });
    const result = alignEvents(EXPECTED, detected, MAX_DISTANCE_MS);

    expect(result.extra).toEqual([detected[2]]);
    expect(result.missing).toEqual([]);
  });

  it('cada detectado se usa una sola vez', () => {
    // Dos esperados muy juntos y un solo detectado entre los dos.
    const expected = [{ time: 1, midi: [45] }, { time: 1.2, midi: [47] }];
    const detected = [{ time: 1.15, midi: [47], confidence: 1 }];
    const result = alignEvents(expected, detected, MAX_DISTANCE_MS);

    expect(result.pairs).toHaveLength(1);
    expect(result.missing).toHaveLength(1);
  });

  it('un detectado fuera de la distancia máxima no se empareja', () => {
    const detected = [{ time: 0.7, midi: [45], confidence: 1 }];
    const result = alignEvents([EXPECTED[0]], detected, MAX_DISTANCE_MS);

    expect(result.missing).toHaveLength(1);
    expect(result.extra).toHaveLength(1);
  });

  it('funciona aunque los esperados no vengan ordenados', () => {
    const shuffled = [EXPECTED[2], EXPECTED[0], EXPECTED[3], EXPECTED[1]];
    const result = alignEvents(shuffled, createMockEvents(EXPECTED, 'perfect'), MAX_DISTANCE_MS);

    expect(result.pairs.map((pair) => pair.expected.time)).toEqual([0, 1, 2, 3]);
  });
});
