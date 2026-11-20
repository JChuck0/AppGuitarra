// Alineamiento: decide qué evento detectado corresponde a cada evento
// esperado. Es el primer paso para evaluar una toma, porque antes de saber
// si una nota llega tarde o es la equivocada hay que saber con cuál de las
// notas tocadas se compara.

// Empareja los eventos esperados con los detectados.
// Recorre los esperados en orden de tiempo y a cada uno le asigna el
// detectado más cercano que no se haya usado ya, siempre que esté a
// "maxDistanceMs" o menos.
// Recibe dos listas de { time, midi } (tiempos en segundos) y la distancia
// máxima en milisegundos.
// Devuelve { pairs, missing, extra }:
// - pairs: { expected, detected, offsetMs } (offsetMs positivo = tarde);
// - missing: esperados que se han quedado sin pareja;
// - extra: detectados que no se han usado.
//
// La distancia máxima tiene que ser más amplia que la tolerancia de tiempo
// del ejercicio. Si fuera la misma, una nota que llega un poco tarde saldría
// como "falta una nota" más "sobra una nota" en vez de como "tarde".
export function alignEvents(expected, detected, maxDistanceMs) {
  const sortedExpected = [...expected].sort((a, b) => a.time - b.time);
  const used = new Set();
  const pairs = [];
  const missing = [];

  for (const expectedEvent of sortedExpected) {
    const index = findClosest(expectedEvent, detected, used, maxDistanceMs);

    if (index === -1) {
      missing.push(expectedEvent);
    } else {
      used.add(index);
      pairs.push({
        expected: expectedEvent,
        detected: detected[index],
        offsetMs: Math.round((detected[index].time - expectedEvent.time) * 1000),
      });
    }
  }

  const extra = detected.filter((_, index) => !used.has(index));
  return { pairs, missing, extra };
}

// Busca la posición del detectado libre más cercano a un esperado.
// Devuelve -1 si no hay ninguno dentro de la distancia máxima.
function findClosest(expectedEvent, detected, used, maxDistanceMs) {
  let bestIndex = -1;
  let bestDistance = Infinity;

  detected.forEach((detectedEvent, index) => {
    if (used.has(index)) {
      return;
    }
    const distanceMs = Math.abs(detectedEvent.time - expectedEvent.time) * 1000;
    if (distanceMs <= maxDistanceMs && distanceMs < bestDistance) {
      bestIndex = index;
      bestDistance = distanceMs;
    }
  });

  return bestIndex;
}
