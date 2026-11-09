import { describe, it, expect } from 'vitest';
import { getDiatonicChord, buildProgression } from '../src/music/harmony.js';

describe('getDiatonicChord', () => {
  it('en Sol, el IV es Do y el vi es Mi menor', () => {
    expect(getDiatonicChord('G', 'IV').name).toBe('C');
    expect(getDiatonicChord('G', 'vi').name).toBe('Em');
  });

  it('lanza un error con un grado romano que no existe', () => {
    expect(() => getDiatonicChord('G', 'VIII')).toThrow();
  });
});

describe('buildProgression', () => {
  it('I-IV-V en La es A, D, E', () => {
    const names = buildProgression('A', ['I', 'IV', 'V']).map((c) => c.name);
    expect(names).toEqual(['A', 'D', 'E']);
  });

  it('I-vi-IV-V en Do es C, Am, F, G', () => {
    const names = buildProgression('C', ['I', 'vi', 'IV', 'V']).map((c) => c.name);
    expect(names).toEqual(['C', 'Am', 'F', 'G']);
  });
});
