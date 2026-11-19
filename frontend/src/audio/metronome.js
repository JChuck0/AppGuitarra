// Metrónomo con la Web Audio API.
//
// No se usa setTimeout/setInterval para que suene cada clic, porque esos
// temporizadores se retrasan varios milisegundos cuando el navegador está
// ocupado (pintando la página, analizando el micrófono...) y el pulso se oiría
// irregular. En su lugar, cada clic se programa por adelantado en el reloj del
// audio (audioContext.currentTime), que es exacto. setInterval solo se usa
// para ir revisando cada poco qué clics toca programar.

import { METRONOME_MIN_BPM, METRONOME_MAX_BPM } from './constants.js';

// Cada cuánto se revisa si hay clics que programar (ms).
const SCHEDULER_INTERVAL_MS = 25;

// Se programan los clics que caen en los próximos 100 ms. Tiene que ser
// mayor que el intervalo de revisión para que no se escape ningún clic aunque
// una revisión llegue tarde.
const SCHEDULE_AHEAD_SEC = 0.1;

// Margen antes del primer clic, para que dé tiempo a programarlo.
const START_DELAY_SEC = 0.1;

// Sonido del clic: un pitido corto. El primer tiempo del compás es más agudo.
const ACCENT_FREQUENCY = 1500;
const BEAT_FREQUENCY = 1000;
const CLICK_DURATION_SEC = 0.05;
const CLICK_VOLUME = 0.5;

// Segundos que dura un tiempo (una negra) a un tempo dado.
export function getBeatDuration(bpm) {
  return 60 / bpm;
}

// Momentos (en segundos del reloj del audio) en los que suena cada tiempo.
// Es una función pura, así que se puede testear y la usan también la
// calibración y las tomas para saber cuándo sonó cada clic.
export function getBeatTimes(bpm, startTime, beats) {
  const beatDuration = getBeatDuration(bpm);
  const times = [];
  for (let i = 0; i < beats; i++) {
    times.push(startTime + i * beatDuration);
  }
  return times;
}

// Ajusta el tempo al rango permitido. Si no es un número, devuelve null.
export function clampBpm(bpm) {
  if (!Number.isFinite(bpm)) {
    return null;
  }
  return Math.min(METRONOME_MAX_BPM, Math.max(METRONOME_MIN_BPM, Math.round(bpm)));
}

// Programa un clic para que suene exactamente en "time".
// Se hace con un oscilador y una envolvente de volumen que baja rápido, para
// que suene seco y no como un pitido largo.
function playClick(audioContext, time, isAccent) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.frequency.value = isAccent ? ACCENT_FREQUENCY : BEAT_FREQUENCY;
  gain.gain.setValueAtTime(CLICK_VOLUME, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + CLICK_DURATION_SEC);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(time);
  oscillator.stop(time + CLICK_DURATION_SEC);
}

// Crea un metrónomo que suena en el AudioContext que se le pasa.
// Devuelve un objeto con start, stop e isRunning.
export function createMetronome(audioContext) {
  let intervalId = null;
  let nextBeatTime = 0;
  let beatNumber = 0;
  let settings = null;

  // Mira qué clics caen dentro de la ventana de los próximos 100 ms y los
  // deja programados.
  function scheduleBeats() {
    while (nextBeatTime < audioContext.currentTime + SCHEDULE_AHEAD_SEC) {
      if (settings.beats !== null && beatNumber >= settings.beats) {
        stop();
        return;
      }

      const isAccent = beatNumber % settings.beatsPerBar === 0;
      playClick(audioContext, nextBeatTime, isAccent);
      notifyBeat(nextBeatTime, beatNumber);

      nextBeatTime += getBeatDuration(settings.bpm);
      beatNumber++;
    }
  }

  // Avisa a la pantalla cuando el clic suene de verdad (no cuando se
  // programa, que es un poco antes). Aquí sí vale setTimeout: si la luz se
  // enciende unos milisegundos tarde no pasa nada.
  function notifyBeat(time, number) {
    if (settings.onBeat) {
      const delayMs = (time - audioContext.currentTime) * 1000;
      setTimeout(() => settings.onBeat(number), Math.max(0, delayMs));
    }
  }

  // Empieza a sonar. Opciones:
  // - bpm: tempo.
  // - beats: número de clics antes de pararse solo (null = sin fin).
  // - beatsPerBar: tiempos por compás, para acentuar el primero.
  // - onBeat(number): función opcional que se llama en cada clic.
  // Devuelve el momento del primer clic en el reloj del audio.
  function start({ bpm, beats = null, beatsPerBar = 4, onBeat = null }) {
    stop();
    settings = { bpm, beats, beatsPerBar, onBeat };
    beatNumber = 0;
    nextBeatTime = audioContext.currentTime + START_DELAY_SEC;
    const startTime = nextBeatTime;

    scheduleBeats();
    intervalId = setInterval(scheduleBeats, SCHEDULER_INTERVAL_MS);
    return startTime;
  }

  // Deja de programar clics. Los que ya estaban programados (como mucho
  // 100 ms) todavía suenan.
  function stop() {
    clearInterval(intervalId);
    intervalId = null;
  }

  function isRunning() {
    return intervalId !== null;
  }

  return { start, stop, isRunning };
}
