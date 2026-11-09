// Datos musicales de referencia: frecuencias de las notas, cuerdas de la
// guitarra en afinación estándar y notas de los acordes soportados.

// Frecuencia de referencia del La4 (afinación estándar de concierto).
export const A4_FREQUENCY = 440;

// Número MIDI del La4. Se usa como punto de partida para calcular el resto.
const A4_MIDI_NUMBER = 69;

// Posición de cada nota dentro de la octava, contando semitonos desde Do.
const SEMITONES_FROM_C = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
};

// Nombre de cada nota en notación latina, para mostrarla en la interfaz.
const SPANISH_NOTE_NAMES = {
  'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa', 'G': 'Sol', 'A': 'La', 'B': 'Si',
};

// Separa una nota escrita como 'G#3' en su nombre ('G#')
// y su octava (3).
// El nombre puede tener uno o dos caracteres, así que la
// octava es siempre el último carácter y el nombre todo lo anterior.
// Recibe un texto con la nota en notación anglosajona, p. ej. 'E2'.
// Devuelve un objeto { name, octave }.
function splitNote(note) {
  const name = note.slice(0, -1);
  const octave = Number(note.slice(-1));

  if (!(name in SEMITONES_FROM_C) || Number.isNaN(octave)) {
    throw new Error(`Nota no válida: ${note}`);
  }

  return { name, octave };
}

// Calcula la frecuencia en Hz de una nota.
// En el temperamento igual cada semitono multiplica la
// frecuencia por 2^(1/12). Basta con contar cuántos semitonos hay entre la
// nota y el La4 (440 Hz), en vez de escribir a mano una tabla de frecuencias.
// Recibe una nota en notación anglosajona, p. ej. 'E2' o 'G#3'.
// Devuelve la frecuencia en Hz (número).
export function noteToFrequency(note) {
  const { name, octave } = splitNote(note);

  // 1. Número MIDI de la nota (Do4 = 60, La4 = 69).
  const midiNumber = 12 * (octave + 1) + SEMITONES_FROM_C[name];

  // 2. Semitonos de distancia hasta el La4 (negativo si es más grave).
  const semitonesFromA4 = midiNumber - A4_MIDI_NUMBER;

  return A4_FREQUENCY * Math.pow(2, semitonesFromA4 / 12);
}

// Traduce una nota a notación latina ('G#3' -> 'Sol#3').
// Recibe una nota en notación anglosajona.
// Devuelve un texto con la nota en notación latina.
export function toSpanishName(note) {
  const { name, octave } = splitNote(note);
  const letter = name[0];
  const accidental = name.slice(1);

  return SPANISH_NOTE_NAMES[letter] + accidental + octave;
}

// Crea el objeto con el que se representa una nota tocada en una cuerda.
// string: número de cuerda (6 = la más grave, 1 = la más aguda).
function createStringNote(string, note) {
  return { string, note, frequency: noteToFrequency(note) };
}

// Las 6 cuerdas al aire en afinación estándar, de la más grave a la más aguda.
export const GUITAR_STRINGS = [
  createStringNote(6, 'E2'),
  createStringNote(5, 'A2'),
  createStringNote(4, 'D3'),
  createStringNote(3, 'G3'),
  createStringNote(2, 'B3'),
  createStringNote(1, 'E4'),
];

// Acordes soportados, en su posición abierta habitual. De cada acorde se
// guardan solo las cuerdas que suenan (las que no se tocan no aparecen).
export const CHORDS = [
  {
    id: 'E',
    name: 'Mi mayor',
    notes: [
      createStringNote(6, 'E2'),
      createStringNote(5, 'B2'),
      createStringNote(4, 'E3'),
      createStringNote(3, 'G#3'),
      createStringNote(2, 'B3'),
      createStringNote(1, 'E4'),
    ],
  },
  {
    id: 'Am',
    name: 'La menor',
    notes: [
      createStringNote(5, 'A2'),
      createStringNote(4, 'E3'),
      createStringNote(3, 'A3'),
      createStringNote(2, 'C4'),
      createStringNote(1, 'E4'),
    ],
  },
  {
    id: 'D',
    name: 'Re mayor',
    notes: [
      createStringNote(4, 'D3'),
      createStringNote(3, 'A3'),
      createStringNote(2, 'D4'),
      createStringNote(1, 'F#4'),
    ],
  },
  {
    id: 'G',
    name: 'Sol mayor',
    notes: [
      createStringNote(6, 'G2'),
      createStringNote(5, 'B2'),
      createStringNote(4, 'D3'),
      createStringNote(3, 'G3'),
      createStringNote(2, 'B3'),
      createStringNote(1, 'G4'),
    ],
  },
  {
    id: 'C',
    name: 'Do mayor',
    notes: [
      createStringNote(5, 'C3'),
      createStringNote(4, 'E3'),
      createStringNote(3, 'G3'),
      createStringNote(2, 'C4'),
      createStringNote(1, 'E4'),
    ],
  },
];
