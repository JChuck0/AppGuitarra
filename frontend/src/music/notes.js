// Conversiones básicas entre nombres de nota, números MIDI y frecuencias.
// Basado en Prueba_0/src/notes.js. Aquí se trabaja sobre todo con números
// MIDI porque así sumar intervalos o transponer es solo sumar semitonos.

// Frecuencia y número MIDI del La4, la referencia de afinación.
export const A4_FREQUENCY = 440;
const A4_MIDI = 69;

// Nombres de las 12 notas de la octava, empezando en Do. Internamente se
// usan siempre sostenidos.
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Equivalencia de los bemoles con su sostenido, para poder leer 'Bb' o 'Eb'.
const FLAT_TO_SHARP = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
};

// Nombres en notación latina para mostrarlos en pantalla.
const SPANISH_NAMES = {
  'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa', 'G': 'Sol', 'A': 'La', 'B': 'Si',
};

// Devuelve la posición de una nota dentro de la
// octava (0 = Do, 1 = Do#, ..., 11 = Si). Es lo que se llama "pitch class".
// Para saber si una nota pertenece a una escala o a un
// acorde da igual la octava; solo importa cuál de las 12 notas es.
// Recibe el nombre de nota sin octava ('C', 'F#', 'Bb').
// Devuelve un número de 0 a 11.
export function getPitchClass(name) {
  const sharpName = FLAT_TO_SHARP[name] ?? name;
  const index = NOTE_NAMES.indexOf(sharpName);

  if (index === -1) {
    throw new Error(`Nota no válida: ${name}`);
  }
  return index;
}

// Convierte una nota con octava ('E2', 'Bb3') a número MIDI.
// En MIDI cada semitono es +1 y Do4 vale 60, así que la
// fórmula es 12 * (octava + 1) + posición dentro de la octava.
// Recibe una nota en notación anglosajona con octava.
// Devuelve un número MIDI (entero).
export function noteToMidi(note) {
  // La octava son los últimos caracteres numéricos (puede ser -1 en teoría,
  // pero en guitarra siempre es de 2 a 6).
  const match = /^([A-G][#b]?)(\d)$/.exec(note);
  if (match === null) {
    throw new Error(`Nota no válida: ${note}`);
  }

  const name = match[1];
  const octave = Number(match[2]);
  return 12 * (octave + 1) + getPitchClass(name);
}

// Convierte un número MIDI en nombre de nota con octava.
// Recibe un número MIDI (entero).
// Devuelve un texto como 'E2' o 'G#3'.
export function midiToNote(midi) {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return name + octave;
}

// Calcula la frecuencia en Hz de un número MIDI.
// Cada semitono multiplica la frecuencia por 2^(1/12),
// así que basta con contar los semitonos de distancia al La4 (440 Hz).
// Recibe un número MIDI (puede tener decimales).
// Devuelve la frecuencia en Hz.
export function midiToFrequency(midi) {
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

// Lo contrario de midiToFrequency.
// Recibe la frecuencia en Hz (mayor que 0).
// Devuelve un número MIDI con decimales (69.1 = La4 un poco alto).
export function frequencyToMidi(frequency) {
  return A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
}

// Atajo para obtener la frecuencia directamente a partir del nombre.
export function noteToFrequency(note) {
  return midiToFrequency(noteToMidi(note));
}

// Calcula la distancia en cents entre dos frecuencias.
// El oído percibe las alturas de forma logarítmica, por
// eso se compara en cents (100 cents = 1 semitono) y no en Hz.
// Recibe la frecuencia detectada y de referencia, en Hz.
// Devuelve los cents de diferencia (negativo si la detectada es más grave).
export function getCentsDifference(detectedFrequency, referenceFrequency) {
  return 1200 * Math.log2(detectedFrequency / referenceFrequency);
}

// Sube o baja una nota un número de semitonos.
// Recibe una nota con octava y semitonos (negativo para bajar).
// Devuelve la nota resultante con octava.
export function transposeNote(note, semitones) {
  return midiToNote(noteToMidi(note) + semitones);
}

// Traduce una nota a notación latina ('G#3' -> 'Sol#3').
// Funciona con y sin octava ('A' -> 'La').
export function toSpanishName(note) {
  const match = /^([A-G])([#b]?)(\d?)$/.exec(note);
  if (match === null) {
    throw new Error(`Nota no válida: ${note}`);
  }

  const [, letter, accidental, octave] = match;
  return SPANISH_NAMES[letter] + accidental + octave;
}
