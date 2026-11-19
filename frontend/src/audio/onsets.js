// Detección de ataques: los momentos en que empieza a sonar una nota o un
// acorde. Se basa en el volumen (RMS): al pulsar una cuerda el volumen sube
// de golpe y luego va bajando poco a poco mientras la cuerda se apaga.

import {
  SILENCE_RMS_THRESHOLD,
  ONSET_WINDOW_SIZE,
  ONSET_HISTORY_FRAMES,
  ONSET_RISE_RATIO,
  ONSET_MIN_GAP_SEC,
} from './constants.js';
import { calculateRms } from './tuner.js';

// Volumen de las últimas muestras del buffer, que son las más recientes.
// Recibe el buffer del micrófono (Float32Array) y devuelve el RMS.
export function measureRecentRms(samples, windowSize = ONSET_WINDOW_SIZE) {
  const start = Math.max(0, samples.length - windowSize);
  return calculateRms(samples.subarray(start));
}

function averageRms(frames) {
  return frames.reduce((sum, frame) => sum + frame.rms, 0) / frames.length;
}

// Busca los ataques en una lista de fotogramas [{ time, rms }] ordenada por
// tiempo. Un fotograma es un ataque cuando:
// - no es silencio,
// - su volumen es al menos ONSET_RISE_RATIO veces la media de los
//   fotogramas anteriores,
// - y ha pasado un mínimo de tiempo desde el ataque anterior.
// Se compara con la media de varios fotogramas, y no solo con el anterior,
// para que una pequeña subida suelta por ruido no cuente como golpe.
// Devuelve [{ time, index }], donde index es la posición del fotograma
// (la grabación de tomas lo usa para mirar la nota justo después del ataque).
export function detectOnsets(frames) {
  const onsets = [];
  let lastOnsetTime = -Infinity;

  for (let i = ONSET_HISTORY_FRAMES; i < frames.length; i++) {
    const frame = frames[i];
    if (frame.rms < SILENCE_RMS_THRESHOLD) {
      continue;
    }

    const previousLevel = averageRms(frames.slice(i - ONSET_HISTORY_FRAMES, i));
    const isRise = frame.rms >= previousLevel * ONSET_RISE_RATIO;
    const isFarFromLast = frame.time - lastOnsetTime >= ONSET_MIN_GAP_SEC;

    if (isRise && isFarFromLast) {
      onsets.push({ time: frame.time, index: i });
      lastOnsetTime = frame.time;
    }
  }

  return onsets;
}
