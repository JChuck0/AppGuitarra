import { describe, it, expect } from 'vitest';
import { getChordNotes, getChordName, getVoicingNotes, OPEN_VOICINGS } from '../src/music/chords.js';
import { getPitchClass } from '../src/music/notes.js';

describe('getChordNotes', () => {
  it('Am tiene A, C y E', () => {
    const notes = getChordNotes('A', 'minor').map((n) => n.note);
    expect(notes).toEqual(['A', 'C', 'E']);
  });

  it('E7 tiene la b7 (D)', () => {
    const notes = getChordNotes('E', 'dominant7').map((n) => n.note);
    expect(notes).toEqual(['E', 'G#', 'B', 'D']);
  });

  it('lanza un error con un tipo que no existe', () => {
    expect(() => getChordNotes('A', 'raro')).toThrow();
  });
});

describe('getChordName', () => {
  it('forma el nombre corto', () => {
    expect(getChordName('A', 'minor')).toBe('Am');
    expect(getChordName('B', 'dominant7')).toBe('B7');
  });
});

describe('getVoicingNotes', () => {
  it('Mi mayor coincide con el de Prueba_0', () => {
    const notes = getVoicingNotes('E').map((n) => n.note);
    expect(notes).toEqual(['E2', 'B2', 'E3', 'G#3', 'B3', 'E4']);
  });

  it('en La menor no se toca la cuerda 6', () => {
    const strings = getVoicingNotes('Am').map((n) => n.string);
    expect(strings).toEqual([5, 4, 3, 2, 1]);
  });

  it('lanza un error con un acorde que no está definido', () => {
    expect(() => getVoicingNotes('F#m7b5')).toThrow();
  });

  // Comprobación de los datos: si un traste está mal escrito en OPEN_VOICINGS,
  // aparecería una nota que no pertenece al acorde.
  it('todos los voicings tienen solo notas de su acorde', () => {
    for (const [id, voicing] of Object.entries(OPEN_VOICINGS)) {
      const allowed = getChordNotes(voicing.root, voicing.type).map((n) => getPitchClass(n.note));
      const played = getVoicingNotes(id).map((n) => n.midi % 12);

      for (const pitchClass of played) {
        expect(allowed, `acorde ${id}`).toContain(pitchClass);
      }
    }
  });
});
