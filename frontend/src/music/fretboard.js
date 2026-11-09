// El mástil de la guitarra: qué nota suena en cada cuerda y traste, y dónde
// se puede tocar una nota concreta.

import { noteToMidi, midiToNote, getPitchClass } from './notes.js';

// Número de trastes que se tienen en cuenta en los ejercicios.
export const MAX_FRET = 12;

// Afinación estándar. La clave es el número de cuerda (6 = la más grave).
export const STANDARD_TUNING = {
  6: noteToMidi('E2'),
  5: noteToMidi('A2'),
  4: noteToMidi('D3'),
  3: noteToMidi('G3'),
  2: noteToMidi('B3'),
  1: noteToMidi('E4'),
};

// Cuerdas ordenadas de la más grave a la más aguda.
export const STRINGS = [6, 5, 4, 3, 2, 1];

// Dice qué nota suena al pisar una cuerda en un traste.
// Cada traste sube un semitono, así que es la nota de la
// cuerda al aire más el número de traste.
// Recibe un número de cuerda (1-6) y traste (0 = al aire).
// Devuelve el número MIDI de la nota.
export function getMidiAt(string, fret) {
  if (!(string in STANDARD_TUNING)) {
    throw new Error(`Cuerda no válida: ${string}`);
  }
  if (fret < 0 || fret > MAX_FRET) {
    throw new Error(`Traste fuera de rango: ${fret}`);
  }
  return STANDARD_TUNING[string] + fret;
}

// Lo mismo que getMidiAt pero devolviendo el nombre ('A2', 'C#3'...).
export function getNoteAt(string, fret) {
  return midiToNote(getMidiAt(string, fret));
}

// Busca todas las posiciones del mástil donde suena
// una nota (sin importar la octava).
// Es lo que necesitan los ejercicios de "encuentra el Do
// en la cuerda 5": se recorren las cuerdas y trastes pedidos y se guardan
// los que coinciden con la nota.
// Recibe:
// - name: nombre de la nota sin octava ('C', 'F#').
// - strings: cuerdas en las que buscar (por defecto todas).
// - maxFret: último traste a mirar.
// Devuelve un array de posiciones { string, fret, midi }.
export function findPositions(name, strings = STRINGS, maxFret = MAX_FRET) {
  const pitchClass = getPitchClass(name);
  const positions = [];

  for (const string of strings) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const midi = getMidiAt(string, fret);
      if (midi % 12 === pitchClass) {
        positions.push({ string, fret, midi });
      }
    }
  }

  return positions;
}
