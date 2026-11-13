// Analizador de acordes. Como el afinador, son funciones puras: trabajan
// sobre un array con el espectro, venga del micrófono o de un test.

import { getCentsDifference, midiToFrequency } from '../music/notes.js';
import { getVoicingNotes } from '../music/chords.js';
import {
  PEAK_MIN_FREQUENCY,
  PEAK_MAX_FREQUENCY,
  PEAK_THRESHOLD,
  PEAK_NEIGHBORHOOD_BINS,
  CHORD_TOLERANCE_CENTS,
  MAX_HARMONIC_NUMBER,
  HARMONIC_TOLERANCE_CENTS,
  HARMONIC_MAX_DROP,
} from './constants.js';

// Comprueba si el valor de una posición es el más alto de su vecindario.
// A la izquierda se exige que sea mayor y a la derecha mayor o igual, para
// que una "meseta" de valores iguales cuente como un solo pico.
function isLocalMaximum(frequencyData, bin) {
  for (let offset = 1; offset <= PEAK_NEIGHBORHOOD_BINS; offset++) {
    const left = frequencyData[bin - offset] ?? 0;
    const right = frequencyData[bin + offset] ?? 0;

    if (frequencyData[bin] <= left || frequencyData[bin] < right) {
      return false;
    }
  }
  return true;
}

// Afina la posición de un pico usando sus dos vecinos. La FFT solo da
// valores en posiciones enteras y la frecuencia real casi nunca cae justo en
// una, así que se traza una parábola por los tres puntos y se toma su punto
// más alto (interpolación parabólica). Sin esto, en las cuerdas graves el
// error serían unos 30 cents.
function interpolatePeakPosition(frequencyData, bin) {
  const left = frequencyData[bin - 1] ?? 0;
  const center = frequencyData[bin];
  const right = frequencyData[bin + 1] ?? 0;

  const curvature = left - 2 * center + right;
  if (curvature === 0) {
    return bin;
  }

  return bin + (0.5 * (left - right)) / curvature;
}

// Busca los picos del espectro. Cada cuerda que suena aparece como un pico
// en su frecuencia; se buscan solo en el rango de la guitarra y por encima
// de un umbral para ignorar el ruido.
// Recibe el array de getByteFrequencyData (0-255) y lo que mide cada
// posición en Hz (sampleRate / fftSize).
// Devuelve picos { frequency, magnitude } ordenados de grave a agudo.
export function findPeaks(frequencyData, binWidth, threshold = PEAK_THRESHOLD) {
  const peaks = [];

  const firstBin = Math.max(1, Math.floor(PEAK_MIN_FREQUENCY / binWidth));
  const lastBin = Math.min(
    frequencyData.length - 1,
    Math.ceil(PEAK_MAX_FREQUENCY / binWidth)
  );

  for (let bin = firstBin; bin <= lastBin; bin++) {
    const magnitude = frequencyData[bin];

    if (magnitude >= threshold && isLocalMaximum(frequencyData, bin)) {
      const exactBin = interpolatePeakPosition(frequencyData, bin);
      peaks.push({ frequency: exactBin * binWidth, magnitude });
    }
  }

  return peaks;
}

// Un pico es armónico de otro más grave si su frecuencia es un múltiplo
// entero (x2, x3...) de la del otro y además suena bastante más débil.
function isHarmonicOf(peak, lowerPeak) {
  const harmonicNumber = Math.round(peak.frequency / lowerPeak.frequency);
  if (harmonicNumber < 2 || harmonicNumber > MAX_HARMONIC_NUMBER) {
    return false;
  }

  const harmonicFrequency = lowerPeak.frequency * harmonicNumber;
  const distance = Math.abs(getCentsDifference(peak.frequency, harmonicFrequency));
  const isMuchWeaker = lowerPeak.magnitude - peak.magnitude > HARMONIC_MAX_DROP;

  return distance <= HARMONIC_TOLERANCE_CENTS && isMuchWeaker;
}

// Quita los armónicos y deja las fundamentales. No se pueden borrar todos
// los múltiplos porque en un acorde hay notas que coinciden con armónicos de
// otras (en Mi mayor, el Mi3 de la cuerda 4 es el doble del Mi2 de la 6).
// Solo se descartan los que suenan mucho más débiles que su fundamental.
export function removeHarmonics(peaks) {
  return peaks.filter((peak) => {
    const lowerPeaks = peaks.filter((other) => other.frequency < peak.frequency);
    return !lowerPeaks.some((lowerPeak) => isHarmonicOf(peak, lowerPeak));
  });
}

// Compara las notas que debería tener el acorde con las frecuencias
// detectadas. No se intenta adivinar qué acorde suena: como ya se sabe cuál
// se espera, basta con mirar nota a nota si hay alguna frecuencia cerca.
// Recibe las notas esperadas ({ string, midi, ... }, como las devuelve
// getVoicingNotes) y las frecuencias detectadas en Hz.
// Devuelve { present, missing } con las notas esperadas repartidas.
export function compareChord(
  expectedNotes,
  detectedFrequencies,
  toleranceCents = CHORD_TOLERANCE_CENTS
) {
  const present = [];
  const missing = [];

  for (const expectedNote of expectedNotes) {
    const expectedFrequency = midiToFrequency(expectedNote.midi);
    const isSounding = detectedFrequencies.some((frequency) => {
      return Math.abs(getCentsDifference(frequency, expectedFrequency)) <= toleranceCents;
    });

    if (isSounding) {
      present.push(expectedNote);
    } else {
      missing.push(expectedNote);
    }
  }

  return { present, missing };
}

// Análisis completo de un acorde abierto ('Am', 'G7'...).
// Devuelve { present, missing, peaks }. Los picos se devuelven también para
// enseñarlos en pantalla mientras se ajustan los umbrales.
export function analyzeChord(frequencyData, binWidth, voicingId) {
  const expectedNotes = getVoicingNotes(voicingId);

  const peaks = removeHarmonics(findPeaks(frequencyData, binWidth));
  const frequencies = peaks.map((peak) => peak.frequency);
  const { present, missing } = compareChord(expectedNotes, frequencies);

  return { present, missing, peaks };
}
