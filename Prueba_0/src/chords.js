// Lógica del analizador de acordes. Igual que pitch.js, son funciones puras:
// trabajan sobre un array de datos de frecuencia, venga del micrófono o de un test.

import { getCentsDifference } from './pitch.js';
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
// A la izquierda se exige que sea estrictamente mayor y a la derecha mayor o
// igual, para que una "meseta" de valores iguales cuente como un solo pico.
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

// Afina la posición de un pico usando sus dos vecinos.
// La FFT solo da valores en posiciones enteras (bins) y
// la frecuencia real casi nunca cae justo en una. Se traza una parábola por
// el pico y sus dos vecinos y se toma su punto más alto ("interpolación
// parabólica", técnica habitual en detección de picos de FFT). Sin esto, en
// las cuerdas graves el error de un bin serían unos 30 cents.
// Recibe un array de datos de frecuencia y posición (bin) del pico.
// Devuelve la posición del pico con decimales (p. ej. 56,3).
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

// Busca los picos del espectro de frecuencias.
// Cada cuerda que suena aparece en la FFT como un pico
// en su frecuencia. Se buscan solo en el rango de la guitarra y por encima
// de un umbral, para ignorar el ruido de fondo.
// Recibe:
// - frequencyData: array de valores 0-255 (el de getByteFrequencyData).
// - binWidth: Hz que mide cada posición del array (sampleRate / fftSize).
// - threshold: valor mínimo para que un máximo cuente como pico.
// Devuelve un array de picos { frequency, magnitude } ordenado de grave a agudo.
export function findPeaks(frequencyData, binWidth, threshold = PEAK_THRESHOLD) {
  const peaks = [];

  // 1. Calculamos entre qué posiciones del array hay que buscar.
  const firstBin = Math.max(1, Math.floor(PEAK_MIN_FREQUENCY / binWidth));
  const lastBin = Math.min(
    frequencyData.length - 1,
    Math.ceil(PEAK_MAX_FREQUENCY / binWidth)
  );

  // 2. Nos quedamos con los máximos locales que superan el umbral.
  for (let bin = firstBin; bin <= lastBin; bin++) {
    const magnitude = frequencyData[bin];

    if (magnitude >= threshold && isLocalMaximum(frequencyData, bin)) {
      // 3. Convertimos la posición (ya afinada) a frecuencia en Hz.
      const exactBin = interpolatePeakPosition(frequencyData, bin);
      peaks.push({ frequency: exactBin * binWidth, magnitude });
    }
  }

  return peaks;
}

// Comprueba si un pico es un armónico de otro pico más grave: su frecuencia
// tiene que ser un múltiplo entero (x2, x3...) de la del otro y, además,
// tiene que sonar bastante más débil.
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

// Separa las fundamentales de los armónicos.
// Una cuerda no produce solo su nota, también suenan sus
// múltiplos (armónicos). El problema es que en un acorde hay notas que
// coinciden con armónicos de otras (en Mi mayor, el Mi3 de la 4ª cuerda es
// justo el doble del Mi2 de la 6ª). Por eso no se pueden borrar todos los
// múltiplos: solo se descartan los que suenan mucho más débiles que su
// fundamental, que es lo esperable de un armónico y no de otra cuerda.
// Recibe un array de picos { frequency, magnitude }.
// Devuelve un array con solo los picos considerados fundamentales.
export function removeHarmonics(peaks) {
  return peaks.filter((peak) => {
    const lowerPeaks = peaks.filter((other) => other.frequency < peak.frequency);
    const isHarmonic = lowerPeaks.some((lowerPeak) => isHarmonicOf(peak, lowerPeak));
    return !isHarmonic;
  });
}

// Compara las notas que debería tener un acorde con
// las frecuencias que se han detectado.
// No se intenta adivinar qué acorde suena. Como el
// usuario ya ha elegido el acorde, basta con comprobar, nota a nota, si hay
// alguna frecuencia detectada lo bastante cerca (dentro de la tolerancia).
// Las frecuencias detectadas que no coinciden con ninguna nota se ignoran.
// Recibe:
// - expectedNotes: notas del acorde ({ string, note, frequency }).
// - detectedFrequencies: array de frecuencias detectadas en Hz.
// - toleranceCents: desviación máxima admitida.
// Devuelve un objeto { present, missing } con las notas esperadas repartidas
// entre las que suenan y las que faltan.
export function compareChord(
  expectedNotes,
  detectedFrequencies,
  toleranceCents = CHORD_TOLERANCE_CENTS
) {
  const present = [];
  const missing = [];

  for (const expectedNote of expectedNotes) {
    const isSounding = detectedFrequencies.some((frequency) => {
      const distance = Math.abs(getCentsDifference(frequency, expectedNote.frequency));
      return distance <= toleranceCents;
    });

    if (isSounding) {
      present.push(expectedNote);
    } else {
      missing.push(expectedNote);
    }
  }

  return { present, missing };
}

// Ejecuta el análisis completo de un acorde.
// Recibe los datos de frecuencia, ancho de cada bin en Hz y las notas
// del acorde elegido.
// Devuelve un objeto { present, missing, peaks }. Los picos se devuelven también
// para poder mostrarlos en pantalla mientras se ajustan los umbrales.
export function analyzeChord(frequencyData, binWidth, expectedNotes) {
  // 1. Buscamos los picos del espectro.
  const allPeaks = findPeaks(frequencyData, binWidth);

  // 2. Quitamos los que son armónicos de otra nota más grave.
  const peaks = removeHarmonics(allPeaks);

  // 3. Comparamos lo que queda con las notas del acorde.
  const frequencies = peaks.map((peak) => peak.frequency);
  const { present, missing } = compareChord(expectedNotes, frequencies);

  return { present, missing, peaks };
}
