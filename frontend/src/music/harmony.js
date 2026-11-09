// Armonía básica: los acordes que salen de una escala mayor y las
// progresiones por grados (I–IV–V, I–vi–IV–V...). Es lo que la app llama
// "familia de acordes".

import { getNoteFromDegree } from './intervals.js';
import { getChordName } from './chords.js';

// Acordes de la escala mayor. Cada número romano dice sobre qué grado de la
// escala se construye el acorde y de qué tipo es (mayúsculas = mayor,
// minúsculas = menor, ° = disminuido).
const DIATONIC_CHORDS = {
  'I': { degree: '1', type: 'major' },
  'ii': { degree: '2', type: 'minor' },
  'iii': { degree: '3', type: 'minor' },
  'IV': { degree: '4', type: 'major' },
  'V': { degree: '5', type: 'major' },
  'vi': { degree: '6', type: 'minor' },
  'vii°': { degree: '7', type: 'dim' },
};

// Dice qué acorde corresponde a un grado romano en
// una tonalidad mayor.
// Recibe la tónica de la tonalidad ('G') y número romano ('IV').
// Devuelve { root, type, name }, p. ej. en Sol el IV es { 'C', 'major', 'C' }.
export function getDiatonicChord(key, roman) {
  const chord = DIATONIC_CHORDS[roman];
  if (chord === undefined) {
    throw new Error(`Grado romano no válido: ${roman}`);
  }

  const root = getNoteFromDegree(key, chord.degree);
  return { root, type: chord.type, name: getChordName(root, chord.type) };
}

// Convierte una progresión escrita por grados en
// acordes concretos de una tonalidad.
// El contenido guarda las progresiones como plantillas
// ('I-IV-V') y así se pueden pedir en cualquier tonalidad.
// Recibe la tónica y lista de grados romanos (['I', 'IV', 'V']).
// Devuelve un array de acordes { root, type, name }.
export function buildProgression(key, romans) {
  return romans.map((roman) => getDiatonicChord(key, roman));
}
