// Evaluación de los ejercicios de respuesta (oído y teoría): cada pregunta
// se contesta tocando una nota o un acorde y al final se evalúa la ronda.

import { RESPONSE_PROFILE, MIN_CONFIDENCE, MAX_LOW_CONFIDENCE_SHARE } from './profiles.js';
import { averageResponseMs, lowConfidenceShare } from './metrics.js';

// Resultados posibles de una pregunta.
export const ANSWER_RESULT = {
  CORRECT: 'correct',
  OCTAVE: 'octave',   // la nota buena pero en otra octava
  WRONG: 'wrong',
  TIMEOUT: 'timeout', // no ha contestado a tiempo
};

// Evalúa la respuesta a una pregunta.
// Recibe la pregunta (de generators.js), el primer evento detectado después
// de mostrarla ({ midi: [..], confidence }) o null si no se ha detectado
// nada, y los milisegundos que han pasado hasta ese evento.
// Devuelve uno de los valores de ANSWER_RESULT.
export function evaluateAnswer(question, detectedEvent, elapsedMs) {
  if (detectedEvent === null || detectedEvent.midi.length === 0 || elapsedMs > RESPONSE_PROFILE.maxAnswerMs) {
    return ANSWER_RESULT.TIMEOUT;
  }
  if (question.mode === 'chord') {
    return evaluateChordAnswer(question, detectedEvent.midi);
  }

  const played = detectedEvent.midi[0];
  if (question.expectedMidi.includes(played)) {
    return ANSWER_RESULT.CORRECT;
  }
  // Mismo nombre de nota (misma posición dentro de la octava) pero otra altura.
  if (question.expectedMidi.some((midi) => midi % 12 === played % 12)) {
    return ANSWER_RESULT.OCTAVE;
  }
  return ANSWER_RESULT.WRONG;
}

// En "¿mayor o menor?" lo único que cambia entre los dos acordes es la
// tercera, así que es lo que se mira: tiene que sonar la tercera del acorde
// pedido y no la del otro.
function evaluateChordAnswer(question, detectedMidi) {
  const pitchClasses = detectedMidi.map((midi) => midi % 12);
  const hasThird = pitchClasses.includes(question.thirdPitchClass);
  const hasOtherThird = pitchClasses.includes(question.otherThirdPitchClass);

  return hasThird && !hasOtherThird ? ANSWER_RESULT.CORRECT : ANSWER_RESULT.WRONG;
}

// Evalúa una ronda completa.
// Recibe la lista de respuestas: { result, elapsedMs, confidence }.
// Devuelve { correctCount, averageResponseMs, verdict, errors }, donde
// errors cuenta cuántas veces ha salido cada tipo de fallo (sirve para
// elegir el consejo).
export function evaluateRound(answers) {
  const correctCount = answers.filter((answer) => answer.result === ANSWER_RESULT.CORRECT).length;

  return {
    correctCount,
    averageResponseMs: averageResponseMs(answers),
    verdict: getRoundVerdict(answers, correctCount),
    errors: countErrors(answers),
  };
}

function getRoundVerdict(answers, correctCount) {
  // Las preguntas sin respuesta no tienen confianza, así que no cuentan para
  // decidir si había mucho ruido. Si no se ha oído nada en toda la ronda lo
  // más probable es que falle el micrófono, y tampoco se puede evaluar.
  const answered = answers.filter((answer) => answer.result !== ANSWER_RESULT.TIMEOUT);
  if (lowConfidenceShare(answered, MIN_CONFIDENCE) > MAX_LOW_CONFIDENCE_SHARE) {
    return 'inconclusive';
  }
  if (correctCount >= RESPONSE_PROFILE.cleanMinCorrect) {
    return 'clean';
  }
  if (correctCount >= RESPONSE_PROFILE.almostMinCorrect) {
    return 'almost';
  }
  return 'not_clean';
}

function countErrors(answers) {
  const errors = { octave: 0, wrong: 0, timeout: 0 };
  for (const answer of answers) {
    if (answer.result in errors) {
      errors[answer.result]++;
    }
  }
  return errors;
}
