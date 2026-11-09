// Lógica del afinador. Son funciones puras: no tocan ni el micrófono ni el DOM,
// solo reciben números y devuelven resultados, por eso se pueden testear.

import { GUITAR_STRINGS } from './notes.js';
import {
  SILENCE_RMS_THRESHOLD,
  TUNER_TOLERANCE_CENTS,
  TUNER_MIN_FREQUENCY,
  TUNER_MAX_FREQUENCY,
} from './constants.js';

// Posibles resultados del afinador para una cuerda.
export const TUNING_STATUS = {
  IN_TUNE: 'in_tune',
  LOW: 'low',   // suena por debajo: hay que subir (tensar) la cuerda
  HIGH: 'high', // suena por encima: hay que bajar (destensar) la cuerda
};

// Calcula la distancia en cents entre dos frecuencias.
// El oído percibe las notas de forma logarítmica. 2 Hz de
// error se notan mucho en Mi2 (82 Hz) y casi nada en Mi4 (330 Hz), así que
// comparar en Hz no sirve. Los cents miden lo mismo en todas las cuerdas
// (100 cents = 1 semitono).
// Recibe la frecuencia detectada y frecuencia de referencia, en Hz.
// Devuelve los cents de diferencia. Negativo si la detectada es más grave.
export function getCentsDifference(detectedFrequency, referenceFrequency) {
  return 1200 * Math.log2(detectedFrequency / referenceFrequency);
}

// Busca la cuerda de la guitarra más cercana a una frecuencia.
// Se compara en cents (no en Hz) por el motivo explicado
// arriba, y se descartan las frecuencias que no pueden ser una cuerda al aire.
// Recibe la frecuencia en Hz.
// Devuelve la cuerda { string, note, frequency } o null si la
// frecuencia no es válida o está fuera del rango de la guitarra.
export function findClosestString(frequency) {
  // 1. Descartamos lecturas no válidas o fuera de rango.
  const isValid = Number.isFinite(frequency) && frequency > 0;
  if (!isValid || frequency < TUNER_MIN_FREQUENCY || frequency > TUNER_MAX_FREQUENCY) {
    return null;
  }

  // 2. Recorremos las 6 cuerdas y nos quedamos con la de menor distancia.
  let closestString = null;
  let smallestDistance = Infinity;

  for (const guitarString of GUITAR_STRINGS) {
    const distance = Math.abs(getCentsDifference(frequency, guitarString.frequency));
    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestString = guitarString;
    }
  }

  return closestString;
}

// Decide si una cuerda está afinada, baja o alta.
// Recibe la frecuencia detectada y de referencia en Hz, y la
// tolerancia en cents (por defecto la definida en constants.js).
// Devuelve uno de los valores de TUNING_STATUS.
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

// Mide el nivel medio de la señal (valor RMS).
// La onda oscila entre positivo y negativo, así que la
// media normal daría casi 0. Elevando al cuadrado antes de promediar se
// obtiene una medida real del volumen.
// Recibe un array de muestras de audio con valores entre -1 y 1.
// Devuelve un nivel entre 0 y 1 (0 si el array está vacío).
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

// Indica si la señal es demasiado débil para analizarla.
// Sin este filtro, el afinador intentaría leer una nota
// en el ruido de fondo y daría lecturas erráticas todo el rato.
// Recibe un array de muestras de audio y umbral de nivel (RMS).
// Devuelve true si es silencio o ruido de fondo.
export function isSilence(samples, threshold = SILENCE_RMS_THRESHOLD) {
  return calculateRms(samples) < threshold;
}

// Reúne todo el análisis del afinador para una frecuencia.
// Recibe la frecuencia detectada en Hz.
// Devuelve un objeto { string, cents, status } o null si la frecuencia no
// corresponde a ninguna cuerda de la guitarra.
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
