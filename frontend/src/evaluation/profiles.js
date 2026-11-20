// Umbrales de los tres perfiles de evaluación. Son los valores provisionales
// de las fichas de los perfiles (docs/ejercicios) y se ajustarán al probar
// los ejercicios con la guitarra.

// Por debajo de esta confianza una detección se considera poco fiable.
export const MIN_CONFIDENCE = 0.6;

// Si hay más de esta proporción de detecciones poco fiables (o no se ha
// detectado nada), la toma es "inconclusive": no cuenta y se pide repetirla.
export const MAX_LOW_CONFIDENCE_SHARE = 0.3;

// Para dar "almost" solo puede fallar una métrica y por menos de esto.
export const ALMOST_MARGIN = 0.05;

// Perfil de respuesta: preguntas de oído y teoría.
export const RESPONSE_PROFILE = {
  questionsPerRound: 8,
  maxAnswerMs: 15000,  // tiempo máximo para contestar una pregunta
  minNoteMs: 100,      // lo que tiene que durar una nota para tomarla como respuesta
  cleanMinCorrect: 7,  // 7 u 8 aciertos = clean
  almostMinCorrect: 6, // 6 aciertos = almost
  fastAverageMs: 4000, // tiempo medio para la segunda estrella
};

// Perfil monofónico a tempo: notas sueltas con metrónomo.
export const MONO_TEMPO_PROFILE = {
  maxToleranceMs: 80,    // tolerancia de tiempo en las Cajas 1 y 2
  toleranceShare: 0.25,  // o el 25 % de la duración de la figura, lo que sea menor
  thresholds: {
    pitchAccuracy: 0.9,
    timingAccuracy: 0.85,
    cleanliness: 0.85,
  },
};

// Perfil de acordes a tempo: rasgueos con metrónomo.
export const CHORD_TEMPO_PROFILE = {
  maxToleranceMs: 80,
  toleranceShare: 0.25,
  thresholds: {
    timingAccuracy: 0.85,
    chordCompleteness: 0.85,
    cleanliness: 0.85,
  },
};

// Perfil de cada tipo de ejercicio.
export const PROFILE_BY_TYPE = {
  note_finding: 'response',
  chord_note_by_note: 'response',
  scale_map: 'response',
  ear_identify: 'response',
  ear_echo: 'response',
  technique_loop: 'mono_tempo',
  scale_run: 'mono_tempo',
  lick: 'mono_tempo',
  arpeggio_pattern: 'mono_tempo',
  chord_strike: 'chord_tempo',
  chord_change: 'chord_tempo',
  strum_pattern: 'chord_tempo',
  progression_by_degrees: 'chord_tempo',
};
