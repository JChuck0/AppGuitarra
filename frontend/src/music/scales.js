// Escalas: qué notas tienen y dónde están en el mástil.

import { getNoteFromDegree } from './intervals.js';
import { getPitchClass } from './notes.js';
import { getMidiAt, STRINGS } from './fretboard.js';

// Fórmula de cada escala en grados. Solo están las que se usan en las
// primeras cajas; se irán añadiendo más según el contenido.
export const SCALES = {
  minor_pentatonic: { name: 'Pentatónica menor', degrees: ['1', 'b3', '4', '5', 'b7'] },
  major_pentatonic: { name: 'Pentatónica mayor', degrees: ['1', '2', '3', '5', '6'] },
  blues: { name: 'Escala de blues', degrees: ['1', 'b3', '4', 'b5', '5', 'b7'] },
  major: { name: 'Escala mayor', degrees: ['1', '2', '3', '4', '5', '6', '7'] },
  natural_minor: { name: 'Menor natural', degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] },
};

function getScale(scaleId) {
  const scale = SCALES[scaleId];
  if (scale === undefined) {
    throw new Error(`Escala no válida: ${scaleId}`);
  }
  return scale;
}

// Devuelve las notas de una escala en una tonalidad.
// Recibe la tónica sin octava ('A') e id de la escala.
// Devuelve un array de { note, degree }, p. ej. [{ note: 'A', degree: '1' }, ...].
export function getScaleNotes(root, scaleId) {
  return getScale(scaleId).degrees.map((degree) => ({
    note: getNoteFromDegree(root, degree),
    degree,
  }));
}

// Busca las notas de una escala dentro de una zona
// del mástil (entre dos trastes).
// Las "posiciones" o "cajas" de escala que se practican
// son las notas de la escala que caen en 4 o 5 trastes seguidos. Por
// ejemplo, la pentatónica menor de La en posición 1 va del traste 5 al 8.
// Recibe tónica, id de escala, primer y último traste de la zona.
// Devuelve un array de { string, fret, midi, degree, isRoot } ordenado de grave a agudo
// (cuerda a cuerda, y en cada cuerda de traste más bajo a más alto).
export function getScaleInFretRange(root, scaleId, minFret, maxFret) {
  const rootPitchClass = getPitchClass(root);
  const scaleNotes = getScaleNotes(root, scaleId);
  const positions = [];

  for (const string of STRINGS) {
    for (let fret = minFret; fret <= maxFret; fret++) {
      const midi = getMidiAt(string, fret);
      const found = scaleNotes.find((scaleNote) => getPitchClass(scaleNote.note) === midi % 12);

      if (found !== undefined) {
        positions.push({ string, fret, midi, degree: found.degree, isRoot: midi % 12 === rootPitchClass });
      }
    }
  }

  return positions;
}
