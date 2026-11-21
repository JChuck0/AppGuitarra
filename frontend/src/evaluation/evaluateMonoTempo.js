// Evaluación de los ejercicios a tempo de notas sueltas (punteo y arpegios).
// Se compara lo que se esperaba (generators.js) con lo que ha detectado el
// micrófono durante la toma y se dice si la toma ha salido limpia y qué
// errores ha habido en cada nota.

import {
  MONO_TEMPO_PROFILE, MIN_CONFIDENCE, MAX_LOW_CONFIDENCE_SHARE, ALMOST_MARGIN,
} from './profiles.js';
import { alignEvents } from './align.js';
import { pitchAccuracy, timingAccuracy, cleanliness, lowConfidenceShare } from './metrics.js';

// Tipos de error de este perfil. Una nota en otra octava cuenta como
// wrong_note, porque la nota que hay que tocar se ve en el mástil.
export const TEMPO_ERROR = {
  LATE: 'late',
  EARLY: 'early',
  WRONG_NOTE: 'wrong_note',
  MISSING: 'missing',
  EXTRA: 'extra',
};

// Duración de una nota de la toma, en milisegundos. Se saca de la menor
// distancia entre dos notas esperadas seguidas, así no hace falta pasar
// el BPM ni la figura. Devuelve null si solo hay una nota.
function getNoteDurationMs(expected) {
  let shortest = null;
  for (let i = 1; i < expected.length; i++) {
    const gapMs = (expected[i].time - expected[i - 1].time) * 1000;
    if (gapMs > 0 && (shortest === null || gapMs < shortest)) {
      shortest = gapMs;
    }
  }
  return shortest;
}

// Tolerancia de tiempo de la toma: el mínimo entre la tolerancia máxima del
// perfil (80 ms) y un porcentaje de la duración de la nota. Así, a tempos
// rápidos, una nota a medio camino entre dos no se da por buena.
export function getToleranceMs(expected, profile = MONO_TEMPO_PROFILE) {
  const durationMs = getNoteDurationMs(expected);
  if (durationMs === null) {
    return profile.maxToleranceMs;
  }
  return Math.min(profile.maxToleranceMs, durationMs * profile.toleranceShare);
}

// Hasta dónde se busca la pareja de una nota esperada. Es la mitad de la
// duración de la nota: una detección más lejana está más cerca de la nota
// de al lado. Siempre es más amplia que la tolerancia, para que una nota un
// poco tarde salga como "tarde" y no como "falta una" más "sobra una".
// En legato se usa la duración entera, porque el tiempo de las notas ligadas
// se detecta peor (no hay ataque, solo cambio de altura).
function getMatchDistanceMs(expected, toleranceMs, legato) {
  const durationMs = getNoteDurationMs(expected);
  if (durationMs === null) {
    return toleranceMs * 2;
  }
  return legato ? durationMs : durationMs / 2;
}

// Error de una nota emparejada, o null si está bien. Si la nota es la
// equivocada no se mira el tiempo: es el fallo más importante.
function getPairError(pair, toleranceMs, legato) {
  const rightNote = pair.expected.midi.every((note) => pair.detected.midi.includes(note));
  if (!rightNote) {
    return TEMPO_ERROR.WRONG_NOTE;
  }
  if (legato) {
    return null;
  }
  if (pair.offsetMs > toleranceMs) {
    return TEMPO_ERROR.LATE;
  }
  if (pair.offsetMs < -toleranceMs) {
    return TEMPO_ERROR.EARLY;
  }
  return null;
}

// Lista de errores de la toma. Los de las notas esperadas llevan su
// posición en la lista de esperadas (index) para marcarlas en la línea de
// tiempo. Las notas de más no corresponden a ninguna esperada, así que
// llevan index null y su tiempo.
function collectErrors(expected, alignment, toleranceMs, legato) {
  const errors = [];

  for (const pair of alignment.pairs) {
    const type = getPairError(pair, toleranceMs, legato);
    if (type !== null) {
      errors.push({ index: expected.indexOf(pair.expected), type, offsetMs: pair.offsetMs });
    }
  }
  for (const event of alignment.missing) {
    errors.push({ index: expected.indexOf(event), type: TEMPO_ERROR.MISSING });
  }
  errors.sort((a, b) => a.index - b.index);

  for (const event of alignment.extra) {
    errors.push({ index: null, type: TEMPO_ERROR.EXTRA, time: event.time });
  }
  return errors;
}

// Veredicto a partir de las métricas y los umbrales del perfil:
// - clean: todas las métricas llegan a su umbral;
// - almost: falla solo una y por menos del margen;
// - not_clean: cualquier otro caso.
// Sirve también para el perfil de acordes, que usa otras métricas.
export function getTempoVerdict(metrics, thresholds) {
  const failing = Object.keys(thresholds).filter((name) => metrics[name] < thresholds[name]);

  if (failing.length === 0) {
    return 'clean';
  }
  if (failing.length === 1) {
    const name = failing[0];
    if (thresholds[name] - metrics[name] < ALMOST_MARGIN) {
      return 'almost';
    }
  }
  return 'not_clean';
}

// Si no se ha detectado nada o hay demasiadas detecciones poco fiables, la
// toma no se puede evaluar: es mejor pedir que se repita que dar un fallo
// que a lo mejor no es culpa del usuario.
function isInconclusive(detected) {
  return lowConfidenceShare(detected, MIN_CONFIDENCE) > MAX_LOW_CONFIDENCE_SHARE;
}

// Evalúa una toma de un ejercicio a tempo de notas sueltas.
// Recibe las notas esperadas, las detectadas (ya con la latencia restada),
// el perfil y, en las opciones, "legato" (hammer-on y pull-off): entonces no
// se exige que cada nota llegue a tiempo, solo que la secuencia de notas sea
// la correcta.
// Devuelve un TakeResult: { verdict, metrics, errors, toleranceMs }.
export function evaluateMonoTempo(expected, detected, profile = MONO_TEMPO_PROFILE, { legato = false } = {}) {
  const toleranceMs = getToleranceMs(expected, profile);
  const alignment = alignEvents(expected, detected, getMatchDistanceMs(expected, toleranceMs, legato));

  const metrics = {
    pitchAccuracy: pitchAccuracy(alignment),
    timingAccuracy: timingAccuracy(alignment, toleranceMs),
    cleanliness: cleanliness(alignment),
  };
  const errors = collectErrors(expected, alignment, toleranceMs, legato);

  if (isInconclusive(detected)) {
    return { verdict: 'inconclusive', metrics, errors, toleranceMs };
  }

  // En legato el tiempo no cuenta para el veredicto.
  const thresholds = { ...profile.thresholds };
  if (legato) {
    delete thresholds.timingAccuracy;
  }

  return { verdict: getTempoVerdict(metrics, thresholds), metrics, errors, toleranceMs };
}
