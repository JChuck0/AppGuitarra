// Calibración de latencia.
//
// Desde que suena un clic hasta que la app "oye" la cuerda que se toca con él
// pasa un tiempo: el sonido tarda en salir por los altavoces, el micrófono y
// el navegador guardan el audio en buffers antes de dárnoslo, y cada persona
// tiene su propia tendencia a tocar un poco antes o después del clic.
// La calibración mide todo eso junto, y luego se resta a los tiempos de las
// tomas. Así no se marca como "tarde" una nota que se ha tocado a tiempo.

import { LATENCY_MAX_DISTANCE_SEC, LATENCY_MIN_PAIRS } from './constants.js';

// Empareja cada clic con el ataque más cercano, si está a menos de
// LATENCY_MAX_DISTANCE_SEC. Cada ataque solo se usa una vez.
// Recibe dos listas de tiempos en segundos.
// Devuelve las diferencias (ataque - clic) en milisegundos de los clics que
// se han podido emparejar. Una diferencia positiva es que el ataque llega
// después del clic.
export function pairClicksWithOnsets(clickTimes, onsetTimes) {
  const used = new Set();
  const differences = [];

  for (const click of clickTimes) {
    let bestIndex = -1;
    let bestDistance = Infinity;

    onsetTimes.forEach((onset, index) => {
      const distance = Math.abs(onset - click);
      if (!used.has(index) && distance <= LATENCY_MAX_DISTANCE_SEC && distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
    });

    if (bestIndex !== -1) {
      used.add(bestIndex);
      differences.push((onsetTimes[bestIndex] - click) * 1000);
    }
  }

  return differences;
}

// Mediana: el valor del medio después de ordenar. Se usa en vez de la media
// porque un golpe que se escapa (muy tarde o muy pronto) cambia mucho la
// media, pero casi no mueve la mediana.
export function median(values) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

// Calcula la latencia en milisegundos a partir de los tiempos de los clics y
// de los ataques detectados.
// Devuelve null si se han emparejado menos de LATENCY_MIN_PAIRS clics, porque
// con tan pocos datos el resultado no es fiable.
// Si sale negativa (la persona se adelanta más de lo que tarda el audio) se
// deja en 0, porque restar una latencia negativa no tiene sentido y el
// servidor no la acepta.
export function calculateLatency(clickTimes, onsetTimes) {
  const differences = pairClicksWithOnsets(clickTimes, onsetTimes);
  if (differences.length < LATENCY_MIN_PAIRS) {
    return null;
  }
  return Math.max(0, Math.round(median(differences)));
}
