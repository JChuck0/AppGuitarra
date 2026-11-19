// Simulador de tomas. A partir de lo que se esperaba que tocase el usuario,
// fabrica los eventos que "habría detectado" el micrófono en distintas
// situaciones (todo bien, una nota tarde, una nota equivocada...).
// Sirve para probar la evaluación sin coger la guitarra cada vez, y siempre
// da el mismo resultado, así que vale para los tests.

// Situaciones que se pueden simular.
export const MOCK_SCENARIOS = [
  'perfect',        // todo a tiempo y con las notas buenas
  'late',           // una nota llega tarde
  'early',          // una nota llega antes de tiempo
  'wrong_note',     // una nota cambiada por la de al lado (un semitono)
  'octave',         // una nota buena pero una octava más alta
  'missing',        // falta una nota
  'extra',          // sobra una nota entre dos
  'missing_string', // en un acorde no suena una cuerda
  'noisy',          // mucho ruido: las detecciones son poco fiables
];

// Desplazamiento de una nota tarde o adelantada. Es mayor que la tolerancia
// de las Cajas 1 y 2 (80 ms) para que la evaluación lo tenga que marcar.
const TIMING_ERROR_SEC = 0.15;

// Confianza de una detección normal y de una con mucho ruido.
const GOOD_CONFIDENCE = 0.95;
const NOISY_CONFIDENCE = 0.3;

// Pequeñas variaciones de tiempo (en segundos) para que la toma "perfecta"
// no sea exacta al milisegundo, como pasa al tocar de verdad. Siempre son
// las mismas para que los tests den el mismo resultado.
const HUMAN_JITTER_SEC = [0.01, -0.008, 0.005, -0.012, 0.007];

// Convierte un evento esperado en uno detectado.
function toDetected(expectedEvent, index) {
  return {
    time: expectedEvent.time + HUMAN_JITTER_SEC[index % HUMAN_JITTER_SEC.length],
    midi: [...expectedEvent.midi],
    confidence: GOOD_CONFIDENCE,
  };
}

// Crea los eventos detectados de un escenario.
// Recibe los eventos esperados ({ time, midi: [..] }), el escenario y, como
// opción, "index": qué evento lleva el error (por defecto, el del medio).
// En 'missing_string' se quita la segunda nota más aguda del acorde, que en
// los acordes abiertos suele ser la cuerda 2.
export function createMockEvents(expected, scenario, { index = Math.floor(expected.length / 2) } = {}) {
  const detected = expected.map(toDetected);
  const target = detected[index];

  switch (scenario) {
    case 'perfect':
      break;
    case 'late':
      target.time += TIMING_ERROR_SEC;
      break;
    case 'early':
      target.time -= TIMING_ERROR_SEC;
      break;
    case 'wrong_note':
      target.midi = target.midi.map((note) => note + 1);
      break;
    case 'octave':
      target.midi = target.midi.map((note) => note + 12);
      break;
    case 'missing':
      detected.splice(index, 1);
      break;
    case 'extra': {
      // Una nota de más a mitad de camino entre esta y la siguiente.
      const next = expected[index + 1];
      const time = next ? (target.time + next.time) / 2 : target.time + 0.3;
      detected.splice(index + 1, 0, { time, midi: target.midi.map((note) => note + 2), confidence: GOOD_CONFIDENCE });
      break;
    }
    case 'missing_string':
      if (target.midi.length >= 2) {
        target.midi.splice(target.midi.length - 2, 1);
      }
      break;
    case 'noisy':
      for (const event of detected) {
        event.confidence = NOISY_CONFIDENCE;
      }
      break;
    default:
      throw new Error(`Escenario desconocido: ${scenario}`);
  }

  return detected;
}
