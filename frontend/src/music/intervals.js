// Intervalos expresados como grados (1, b3, 5, b7...), que es como se
// nombran las notas de escalas y acordes en la app (sin partitura).

import { getPitchClass, NOTE_NAMES } from './notes.js';

// Semitonos que hay desde la raíz hasta cada grado.
export const DEGREE_SEMITONES = {
  '1': 0,
  'b2': 1,
  '2': 2,
  'b3': 3,
  '3': 4,
  '4': 5,
  'b5': 6,
  '5': 7,
  'b6': 8,
  '#5': 8, // misma nota que b6, se usa en acordes aumentados
  '6': 9,
  'b7': 10,
  '7': 11,
};

// Calcula la nota que está a un grado de una raíz.
// Recibe la raíz sin octava ('A') y grado ('b3').
// Devuelve el nombre de la nota sin octava ('C').
export function getNoteFromDegree(root, degree) {
  if (!(degree in DEGREE_SEMITONES)) {
    throw new Error(`Grado no válido: ${degree}`);
  }

  const pitchClass = (getPitchClass(root) + DEGREE_SEMITONES[degree]) % 12;
  return NOTE_NAMES[pitchClass];
}

// Dice qué grado es una nota respecto a una raíz.
// Sirve para preguntas como "toca la 3ª de este acorde"
// o para avisar de que el usuario ha tocado la b3 en vez de la 3.
// Recibe la raíz y nota, ambas sin octava.
// Devuelve el grado como texto ('5', 'b7'...). Si dos grados son la misma nota
// (b6 y #5) devuelve el primero de la tabla.
export function getDegree(root, note) {
  const semitones = (getPitchClass(note) - getPitchClass(root) + 12) % 12;
  return Object.keys(DEGREE_SEMITONES).find(
    (degree) => DEGREE_SEMITONES[degree] === semitones
  );
}
