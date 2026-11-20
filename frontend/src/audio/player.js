// Reproductor de notas y acordes para los ejercicios de oído ("repite la nota
// que suena", "¿mayor o menor?"). No usa samples de guitarra: cada nota es
// un oscilador con un volumen que sube rápido y se apaga poco a poco, que
// recuerda a una cuerda pulsada y basta para reconocer la altura.

import { midiToFrequency } from '../music/notes.js';

// Forma de onda. La triangular tiene pocos armónicos y suena más suave que
// la cuadrada o la de sierra.
const WAVE_TYPE = 'triangle';
const NOTE_VOLUME = 0.4;
const NOTE_DURATION_SEC = 1.5;
const ATTACK_SEC = 0.01;

// En un acorde las cuerdas no suenan a la vez: se separan un poco, como en
// un rasgueo lento hacia abajo.
const STRUM_GAP_SEC = 0.03;

// Pequeño margen para que la primera nota no se corte al empezar.
const START_DELAY_SEC = 0.05;

// La rampa exponencial no puede llegar a 0, así que se usa un valor muy bajo.
const SILENT_VOLUME = 0.0001;

// Crea un reproductor que suena en el AudioContext que recibe.
export function createPlayer(audioContext) {
  // Programa una nota en un momento concreto del reloj del audio.
  function scheduleNote(midi, time, volume, duration) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = WAVE_TYPE;
    oscillator.frequency.value = midiToFrequency(midi);

    gain.gain.setValueAtTime(SILENT_VOLUME, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + ATTACK_SEC);
    gain.gain.exponentialRampToValueAtTime(SILENT_VOLUME, time + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(time);
    oscillator.stop(time + duration);
  }

  // Toca una nota. Devuelve el momento (en el reloj del audio) en que acaba.
  function playNote(midi, duration = NOTE_DURATION_SEC) {
    const start = audioContext.currentTime + START_DELAY_SEC;
    scheduleNote(midi, start, NOTE_VOLUME, duration);
    return start + duration;
  }

  // Toca un acorde de grave a agudo. El volumen de cada nota se reparte
  // para que el acorde no suene mucho más fuerte que una nota sola.
  function playChord(midis, duration = NOTE_DURATION_SEC) {
    const start = audioContext.currentTime + START_DELAY_SEC;
    const volume = NOTE_VOLUME / Math.sqrt(midis.length);
    const sorted = [...midis].sort((a, b) => a - b);

    sorted.forEach((midi, index) => {
      scheduleNote(midi, start + index * STRUM_GAP_SEC, volume, duration);
    });
    return start + (sorted.length - 1) * STRUM_GAP_SEC + duration;
  }

  return { playNote, playChord };
}
