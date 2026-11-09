// Acordes: de qué notas están hechos (fórmula) y cómo se tocan en la
// guitarra (voicing = qué traste se pisa en cada cuerda).

import { getNoteFromDegree } from './intervals.js';
import { getMidiAt, STRINGS } from './fretboard.js';
import { midiToNote } from './notes.js';

// Fórmula de cada tipo de acorde en grados.
export const CHORD_TYPES = {
  major: { suffix: '', degrees: ['1', '3', '5'] },
  minor: { suffix: 'm', degrees: ['1', 'b3', '5'] },
  dim: { suffix: 'dim', degrees: ['1', 'b3', 'b5'] },
  power: { suffix: '5', degrees: ['1', '5'] },
  dominant7: { suffix: '7', degrees: ['1', '3', '5', 'b7'] },
  major7: { suffix: 'maj7', degrees: ['1', '3', '5', '7'] },
  minor7: { suffix: 'm7', degrees: ['1', 'b3', '5', 'b7'] },
  half_diminished: { suffix: 'm7b5', degrees: ['1', 'b3', 'b5', 'b7'] },
};

// Devuelve las notas de un acorde a partir de su raíz
// y su tipo.
// Recibe la raíz sin octava ('A') e id del tipo ('minor').
// Devuelve un array de { note, degree }, p. ej. Am -> A (1), C (b3), E (5).
export function getChordNotes(root, typeId) {
  const type = CHORD_TYPES[typeId];
  if (type === undefined) {
    throw new Error(`Tipo de acorde no válido: ${typeId}`);
  }

  return type.degrees.map((degree) => ({
    note: getNoteFromDegree(root, degree),
    degree,
  }));
}

// Nombre corto del acorde ('A' + 'm' = 'Am').
export function getChordName(root, typeId) {
  return root + CHORD_TYPES[typeId].suffix;
}

// Voicings de los acordes abiertos de las Cajas 1 y 2.
// frets va de la cuerda 6 a la 1; null significa que esa cuerda no se toca.
export const OPEN_VOICINGS = {
  Em: { root: 'E', type: 'minor', frets: [0, 2, 2, 0, 0, 0] },
  Am: { root: 'A', type: 'minor', frets: [null, 0, 2, 2, 1, 0] },
  E: { root: 'E', type: 'major', frets: [0, 2, 2, 1, 0, 0] },
  A: { root: 'A', type: 'major', frets: [null, 0, 2, 2, 2, 0] },
  D: { root: 'D', type: 'major', frets: [null, null, 0, 2, 3, 2] },
  G: { root: 'G', type: 'major', frets: [3, 2, 0, 0, 0, 3] },
  C: { root: 'C', type: 'major', frets: [null, 3, 2, 0, 1, 0] },
  Dm: { root: 'D', type: 'minor', frets: [null, null, 0, 2, 3, 1] },
  E7: { root: 'E', type: 'dominant7', frets: [0, 2, 0, 1, 0, 0] },
  A7: { root: 'A', type: 'dominant7', frets: [null, 0, 2, 0, 2, 0] },
  D7: { root: 'D', type: 'dominant7', frets: [null, null, 0, 2, 1, 2] },
  B7: { root: 'B', type: 'dominant7', frets: [null, 2, 1, 2, 0, 2] },
};

// Convierte un voicing en la lista de notas que
// suenan, cuerda a cuerda.
// El analizador de audio necesita saber qué frecuencia
// esperar en cada cuerda, y los ejercicios "nota a nota" piden las notas
// del acorde por separado y en este orden.
// Recibe el id del voicing ('Am').
// Devuelve un array de { string, fret, midi, note } de la cuerda más grave a la
// más aguda, solo con las cuerdas que se tocan.
export function getVoicingNotes(voicingId) {
  const voicing = OPEN_VOICINGS[voicingId];
  if (voicing === undefined) {
    throw new Error(`Acorde no disponible: ${voicingId}`);
  }

  const notes = [];
  voicing.frets.forEach((fret, index) => {
    if (fret === null) {
      return;
    }
    const string = STRINGS[index];
    const midi = getMidiAt(string, fret);
    notes.push({ string, fret, midi, note: midiToNote(midi) });
  });

  return notes;
}
