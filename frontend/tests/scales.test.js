import { describe, it, expect } from 'vitest';
import { getScaleNotes, getScaleInFretRange } from '../src/music/scales.js';

describe('getScaleNotes', () => {
  it('la pentatónica menor de La es A C D E G', () => {
    const notes = getScaleNotes('A', 'minor_pentatonic').map((n) => n.note);
    expect(notes).toEqual(['A', 'C', 'D', 'E', 'G']);
  });

  it('la escala de blues añade la b5', () => {
    const blues = getScaleNotes('A', 'blues');
    expect(blues.find((n) => n.degree === 'b5').note).toBe('D#');
  });

  it('la escala mayor de Do no tiene alteraciones', () => {
    const notes = getScaleNotes('C', 'major').map((n) => n.note);
    expect(notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  it('lanza un error con una escala que no existe', () => {
    expect(() => getScaleNotes('A', 'lidia_inventada')).toThrow();
  });
});

describe('getScaleInFretRange', () => {
  // Pentatónica menor de La en posición 1: trastes 5 a 8, dos notas por cuerda.
  const position1 = getScaleInFretRange('A', 'minor_pentatonic', 5, 8);

  it('tiene 12 notas, dos por cuerda', () => {
    expect(position1).toHaveLength(12);
  });

  it('en la cuerda 6 están los trastes 5 y 8', () => {
    const frets = position1.filter((p) => p.string === 6).map((p) => p.fret);
    expect(frets).toEqual([5, 8]);
  });

  it('marca la tónica', () => {
    const roots = position1.filter((p) => p.isRoot);
    expect(roots.map((p) => `${p.string}-${p.fret}`)).toEqual(['6-5', '4-7', '1-5']);
  });
});
