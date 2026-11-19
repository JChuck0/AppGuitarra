// Convierte los fotogramas grabados en una toma en una lista de eventos
// detectados: cuándo empieza cada nota o acorde y qué notas suenan.
// Son funciones puras para poder probarlas sin micrófono.
//
// Cada evento tiene la forma { time, midi: [..], confidence }:
// - time: segundos desde el inicio de la toma;
// - midi: las notas detectadas (una en modo notas sueltas, varias en acordes);
// - confidence: de 0 a 1, cuánto nos fiamos de esas notas.

import { frequencyToMidi, midiToFrequency, getCentsDifference } from '../music/notes.js';
import { detectOnsets } from './onsets.js';
import {
  NOTE_MIN_FREQUENCY,
  NOTE_MAX_FREQUENCY,
  TUNER_MIN_CLARITY,
  CHORD_TOLERANCE_CENTS,
  MONO_PITCH_START_SEC,
  MONO_PITCH_END_SEC,
  CHORD_NOTES_START_SEC,
  CHORD_NOTES_END_SEC,
  CHORD_NOTE_MIN_SHARE,
} from './constants.js';

// Modos de grabación.
export const TAKE_MODE = {
  MONO: 'mono',   // notas sueltas: cada fotograma lleva frequency y clarity
  CHORD: 'chord', // acordes: cada fotograma lleva peaks (frecuencias en Hz)
};

// Fotogramas que se usan para saber qué suena después de un ataque: los que
// están entre "start" y "end" segundos después, sin pasar del ataque
// siguiente. Si el siguiente ataque llega tan pronto que no queda ninguno, se
// usan todos los que hay entre los dos ataques.
export function getFramesAfterOnset(frames, onset, nextOnset, startSec, endSec) {
  const limit = nextOnset ? Math.min(nextOnset.time, onset.time + endSec) : onset.time + endSec;
  const windowFrames = frames.filter((frame) => {
    return frame.time >= onset.time + startSec && frame.time < limit;
  });

  if (windowFrames.length > 0) {
    return windowFrames;
  }
  const lastIndex = nextOnset ? nextOnset.index : frames.length;
  return frames.slice(onset.index, lastIndex);
}

// Pasa una frecuencia a la nota MIDI más cercana. Devuelve null si la
// frecuencia está fuera del rango de la guitarra en los ejercicios.
function frequencyToNote(frequency) {
  if (!Number.isFinite(frequency) || frequency < NOTE_MIN_FREQUENCY || frequency > NOTE_MAX_FREQUENCY) {
    return null;
  }
  return Math.round(frequencyToMidi(frequency));
}

// Cuenta cuántas veces aparece cada valor. Devuelve un Map valor -> veces.
function countValues(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

// Nota de un ataque en modo notas sueltas.
// Se mira la nota de cada fotograma (solo de los que Pitchy da por fiables) y
// se queda la que más se repite. La confianza es la proporción de fotogramas
// que han dado esa misma nota: si la nota es estable, sale cerca de 1.
function readMonoNote(windowFrames) {
  const notes = windowFrames
    .filter((frame) => frame.clarity >= TUNER_MIN_CLARITY)
    .map((frame) => frequencyToNote(frame.frequency))
    .filter((note) => note !== null);

  if (notes.length === 0) {
    return { midi: [], confidence: 0 };
  }

  let bestNote = null;
  let bestCount = 0;
  for (const [note, count] of countValues(notes)) {
    if (count > bestCount) {
      bestNote = note;
      bestCount = count;
    }
  }
  return { midi: [bestNote], confidence: bestCount / windowFrames.length };
}

// Notas de un ataque en modo acordes.
// En cada fotograma, cada pico se convierte en su nota (si está lo bastante
// cerca de una nota exacta). Se quedan las notas que aparecen en al menos la
// mitad de los fotogramas. La confianza es la media de esas proporciones.
function readChordNotes(windowFrames) {
  const notesPerFrame = windowFrames.map((frame) => {
    const notes = frame.peaks
      .map((frequency) => {
        const note = frequencyToNote(frequency);
        if (note === null) {
          return null;
        }
        const cents = Math.abs(getCentsDifference(frequency, midiToFrequency(note)));
        return cents <= CHORD_TOLERANCE_CENTS ? note : null;
      })
      .filter((note) => note !== null);
    return new Set(notes); // cada nota cuenta una vez por fotograma
  });

  const counts = countValues(notesPerFrame.flatMap((notes) => [...notes]));
  const midi = [];
  const shares = [];
  for (const [note, count] of counts) {
    const share = count / windowFrames.length;
    if (share >= CHORD_NOTE_MIN_SHARE) {
      midi.push(note);
      shares.push(share);
    }
  }

  midi.sort((a, b) => a - b);
  const confidence = shares.length === 0 ? 0 : shares.reduce((sum, share) => sum + share, 0) / shares.length;
  return { midi, confidence };
}

// Construye los eventos de una toma a partir de sus fotogramas.
// El momento de cada evento sale de la detección de ataques (el volumen) y
// las notas, de los fotogramas que vienen justo después.
export function buildEvents(frames, mode) {
  const onsets = detectOnsets(frames);

  return onsets.map((onset, i) => {
    const nextOnset = onsets[i + 1];

    if (mode === TAKE_MODE.CHORD) {
      const windowFrames = getFramesAfterOnset(
        frames, onset, nextOnset, CHORD_NOTES_START_SEC, CHORD_NOTES_END_SEC
      );
      return { time: onset.time, ...readChordNotes(windowFrames) };
    }

    const windowFrames = getFramesAfterOnset(
      frames, onset, nextOnset, MONO_PITCH_START_SEC, MONO_PITCH_END_SEC
    );
    return { time: onset.time, ...readMonoNote(windowFrames) };
  });
}

// Resta la latencia calibrada a los tiempos de los eventos. La app oye cada
// golpe un poco después de que se toque de verdad, y así se compensa.
export function applyLatency(events, latencyMs) {
  const latencySec = (latencyMs ?? 0) / 1000;
  return events.map((event) => ({ ...event, time: event.time - latencySec }));
}
