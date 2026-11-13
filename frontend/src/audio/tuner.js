// Lógica del afinador. Son funciones puras: no tocan el micrófono ni el DOM,
// solo reciben números y devuelven resultados, por eso se pueden testear.

import { getCentsDifference, midiToFrequency, frequencyToMidi, midiToNote } from '../music/notes.js';
import { STANDARD_TUNING, STRINGS } from '../music/fretboard.js';
import {
  SILENCE_RMS_THRESHOLD,
  TUNER_TOLERANCE_CENTS,
  TUNER_MIN_FREQUENCY,
  TUNER_MAX_FREQUENCY,
  NOTE_MIN_FREQUENCY,
  NOTE_MAX_FREQUENCY,
} from './constants.js';

// Posibles resultados del afinador para una cuerda.
export const TUNING_STATUS = {
  IN_TUNE: 'in_tune',
  LOW: 'low',   // suena por debajo: hay que tensar la cuerda
  HIGH: 'high', // suena por encima: hay que destensar la cuerda
};

// Las 6 cuerdas al aire con su nota y su frecuencia. Se calculan a partir de
// la afinación del núcleo musical para no repetir los datos.
const OPEN_STRINGS = STRINGS.map((string) => {
  const midi = STANDARD_TUNING[string];
  return { string, note: midiToNote(midi), frequency: midiToFrequency(midi) };
});

function isValidFrequency(frequency, min, max) {
  return Number.isFinite(frequency) && frequency >= min && frequency <= max;
}

// Busca la cuerda al aire más cercana a una frecuencia. Se compara en cents
// y no en Hz porque 2 Hz de error se notan mucho en Mi2 y casi nada en Mi4.
// Devuelve { string, note, frequency } o null si la frecuencia no puede ser
// una cuerda al aire.
export function findClosestString(frequency) {
  if (!isValidFrequency(frequency, TUNER_MIN_FREQUENCY, TUNER_MAX_FREQUENCY)) {
    return null;
  }

  let closestString = null;
  let smallestDistance = Infinity;

  for (const openString of OPEN_STRINGS) {
    const distance = Math.abs(getCentsDifference(frequency, openString.frequency));
    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestString = openString;
    }
  }

  return closestString;
}

// Decide si una cuerda está afinada, baja o alta.
export function getTuningStatus(
  detectedFrequency,
  referenceFrequency,
  toleranceCents = TUNER_TOLERANCE_CENTS
) {
  const cents = getCentsDifference(detectedFrequency, referenceFrequency);

  if (Math.abs(cents) <= toleranceCents) {
    return TUNING_STATUS.IN_TUNE;
  }
  return cents < 0 ? TUNING_STATUS.LOW : TUNING_STATUS.HIGH;
}

// Mide el volumen de la señal (valor RMS). La onda oscila entre positivo y
// negativo y su media normal daría casi 0; elevando al cuadrado antes de
// promediar se obtiene una medida real del volumen.
// Recibe muestras entre -1 y 1 y devuelve un nivel entre 0 y 1.
export function calculateRms(samples) {
  if (samples.length === 0) {
    return 0;
  }

  let sumOfSquares = 0;
  for (const sample of samples) {
    sumOfSquares += sample * sample;
  }

  return Math.sqrt(sumOfSquares / samples.length);
}

// Indica si la señal es tan débil que no merece la pena analizarla. Sin este
// filtro el afinador intentaría leer notas en el ruido de fondo.
export function isSilence(samples, threshold = SILENCE_RMS_THRESHOLD) {
  return calculateRms(samples) < threshold;
}

// Reúne todo el análisis del afinador para una frecuencia.
// Devuelve { string, cents, status } o null si no es una cuerda al aire.
export function analyzeTuning(frequency) {
  const closestString = findClosestString(frequency);
  if (closestString === null) {
    return null;
  }

  return {
    string: closestString,
    cents: getCentsDifference(frequency, closestString.frequency),
    status: getTuningStatus(frequency, closestString.frequency),
  };
}

// Dice qué nota es una frecuencia, en cualquier cuerda y traste. No sirve
// para afinar, pero sí para comprobar que se detectan bien las notas que
// piden los ejercicios.
// Devuelve { midi, note, cents } o null si está fuera del rango de los
// ejercicios.
export function analyzeNote(frequency) {
  if (!isValidFrequency(frequency, NOTE_MIN_FREQUENCY, NOTE_MAX_FREQUENCY)) {
    return null;
  }

  const midi = Math.round(frequencyToMidi(frequency));
  return {
    midi,
    note: midiToNote(midi),
    cents: getCentsDifference(frequency, midiToFrequency(midi)),
  };
}
