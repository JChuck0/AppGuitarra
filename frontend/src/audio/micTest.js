// Prueba de micrófono. Se graba unos segundos en silencio y unos segundos
// tocando, y con eso se comprueba si el micrófono sirve para los ejercicios:
// que no haya mucho ruido de fondo, que la guitarra se oiga lo bastante y
// que no sature.

import { SILENCE_RMS_THRESHOLD, MIC_MIN_LEVEL, CLIPPING_LEVEL } from './constants.js';
import { calculateRms } from './tuner.js';

// Valor más alto (sin signo) de un trozo de señal. Sirve para saber si
// alguna muestra ha llegado al límite del micrófono.
export function calculatePeak(samples) {
  let peak = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }
  return peak;
}

// Resume un fotograma de audio en lo que necesita la prueba.
export function measureFrame(samples) {
  return { rms: calculateRms(samples), peak: calculatePeak(samples) };
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Analiza las dos partes de la prueba.
// Recibe los fotogramas ({ rms, peak }) de la parte en silencio y de la
// parte tocando.
// Al tocar solo se cuentan los fotogramas que no son silencio, porque entre
// golpe y golpe la cuerda se apaga y bajaría la media sin motivo.
// Devuelve { noiseLevel, averageLevel, isTooNoisy, isTooLow, isClipping }.
export function analyzeLevels(silenceFrames, playingFrames) {
  const noiseLevel = average(silenceFrames.map((frame) => frame.rms));

  const soundFrames = playingFrames.filter((frame) => frame.rms >= SILENCE_RMS_THRESHOLD);
  const averageLevel = average(soundFrames.map((frame) => frame.rms));

  return {
    noiseLevel,
    averageLevel,
    isTooNoisy: noiseLevel >= SILENCE_RMS_THRESHOLD,
    isTooLow: averageLevel < MIC_MIN_LEVEL,
    isClipping: playingFrames.some((frame) => frame.peak >= CLIPPING_LEVEL),
  };
}

// Convierte el resultado de la prueba en mensajes para el usuario.
// Devuelve un array de textos; si todo está bien, un solo mensaje positivo.
export function describeLevels(result) {
  const messages = [];

  if (result.isTooNoisy) {
    messages.push('Hay bastante ruido de fondo. Busca un sitio más tranquilo o aleja el micro del ventilador.');
  }
  if (result.isTooLow) {
    messages.push('La guitarra se oye muy baja. Acércala al micrófono o sube su volumen en el sistema.');
  }
  if (result.isClipping) {
    messages.push('El micrófono satura (el sonido llega distorsionado). Aléjate un poco o baja su volumen.');
  }

  if (messages.length === 0) {
    messages.push('El micrófono está bien. Ya puedes hacer los ejercicios.');
  }
  return messages;
}
