// Métricas de una toma. Todas devuelven un número entre 0 y 1 (menos el
// tiempo medio de respuesta, que va en milisegundos) y se calculan a partir
// del resultado de alignEvents.

// Dice si todas las notas esperadas están entre las detectadas.
function hasAllNotes(expectedMidi, detectedMidi) {
  return expectedMidi.every((note) => detectedMidi.includes(note));
}

// Número de eventos esperados de la toma (los emparejados más los que faltan).
function countExpected(alignment) {
  return alignment.pairs.length + alignment.missing.length;
}

// Proporción de notas esperadas que se han tocado con la altura correcta.
// Una nota que falta cuenta como fallo.
export function pitchAccuracy(alignment) {
  const total = countExpected(alignment);
  if (total === 0) {
    return 0;
  }
  const right = alignment.pairs.filter((pair) => hasAllNotes(pair.expected.midi, pair.detected.midi));
  return right.length / total;
}

// Proporción de notas esperadas que caen dentro de la tolerancia de tiempo.
export function timingAccuracy(alignment, toleranceMs) {
  const total = countExpected(alignment);
  if (total === 0) {
    return 0;
  }
  const onTime = alignment.pairs.filter((pair) => Math.abs(pair.offsetMs) <= toleranceMs);
  return onTime.length / total;
}

// Limpieza: 1 menos la proporción de cosas que sobran entre todo lo detectado.
// En los ejercicios de notas sueltas solo sobran los eventos de más. En los
// de acordes también cuenta como sucio un golpe que tiene alguna nota que
// no es del acorde (countWrongNotes).
export function cleanliness(alignment, { countWrongNotes = false } = {}) {
  const detectedCount = alignment.pairs.length + alignment.extra.length;
  if (detectedCount === 0) {
    return 0;
  }

  let dirty = alignment.extra.length;
  if (countWrongNotes) {
    dirty += alignment.pairs.filter((pair) =>
      pair.detected.midi.some((note) => !pair.expected.midi.includes(note))).length;
  }
  return 1 - dirty / detectedCount;
}

// Completitud de los acordes: cuerdas que han sonado entre cuerdas esperadas,
// sumando todos los golpes. Los golpes que faltan cuentan con 0 cuerdas.
// Los golpes con "checkNotes: false" (contratiempos) no se miran, porque
// el análisis de acordes necesita más tiempo de sonido.
export function chordCompleteness(alignment) {
  let expectedNotes = 0;
  let presentNotes = 0;

  for (const pair of alignment.pairs) {
    if (pair.expected.checkNotes === false) {
      continue;
    }
    expectedNotes += pair.expected.midi.length;
    presentNotes += pair.expected.midi.filter((note) => pair.detected.midi.includes(note)).length;
  }
  for (const event of alignment.missing) {
    if (event.checkNotes !== false) {
      expectedNotes += event.midi.length;
    }
  }

  return expectedNotes === 0 ? 1 : presentNotes / expectedNotes;
}

// Tiempo medio de las respuestas correctas de una ronda, en milisegundos.
// Recibe la lista de respuestas ({ result, elapsedMs }).
// Devuelve null si no hay ninguna correcta.
export function averageResponseMs(answers) {
  const correct = answers.filter((answer) => answer.result === 'correct');
  if (correct.length === 0) {
    return null;
  }
  const total = correct.reduce((sum, answer) => sum + answer.elapsedMs, 0);
  return Math.round(total / correct.length);
}

// Proporción de eventos con una confianza por debajo del mínimo. Si es muy
// alta la toma no se puede evaluar (veredicto "inconclusive").
export function lowConfidenceShare(events, minConfidence) {
  if (events.length === 0) {
    return 1;
  }
  const low = events.filter((event) => event.confidence < minConfidence);
  return low.length / events.length;
}
