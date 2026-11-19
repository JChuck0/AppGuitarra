// Grabación de una toma. Lee el micrófono en cada fotograma de pantalla
// (requestAnimationFrame), guarda lo justo de cada lectura y al terminar lo
// convierte en eventos con buildEvents.
//
// No se guarda el audio ni el espectro completo: el espectro del analizador
// de acordes tiene 16384 valores y a 60 fotogramas por segundo serían
// millones de números. Se guarda solo el resultado de cada lectura (volumen,
// nota o picos), que es lo que necesita buildEvents.

import { PitchDetector } from 'pitchy';
import { measureRecentRms } from './onsets.js';
import { findPeaks, removeHarmonics } from './chordDetector.js';
import { buildEvents, applyLatency, TAKE_MODE } from './events.js';

// Lee un fotograma del micrófono. "time" son los segundos desde el inicio de
// la toma (negativo durante la cuenta atrás).
function readFrame(reader, startTime) {
  const { audio, mode, timeData, frequencyData, pitchDetector, binWidth } = reader;

  audio.tunerAnalyser.getFloatTimeDomainData(timeData);
  const frame = {
    time: audio.audioContext.currentTime - startTime,
    rms: measureRecentRms(timeData),
  };

  if (mode === TAKE_MODE.CHORD) {
    audio.chordAnalyser.getByteFrequencyData(frequencyData);
    frame.peaks = removeHarmonics(findPeaks(frequencyData, binWidth)).map((peak) => peak.frequency);
  } else {
    const [frequency, clarity] = pitchDetector.findPitch(timeData, audio.audioContext.sampleRate);
    frame.frequency = frequency;
    frame.clarity = clarity;
  }
  return frame;
}

// Graba una toma y devuelve (en una promesa) la lista de eventos detectados.
// Opciones:
// - audio: lo que devuelve startAudio;
// - mode: TAKE_MODE.MONO o TAKE_MODE.CHORD;
// - startTime: momento del reloj del audio que cuenta como segundo 0 (el
//   primer tiempo después de la cuenta atrás). Se empieza a grabar en cuanto
//   se llama a la función, para que la detección de ataques tenga fotogramas
//   anteriores con los que comparar;
// - durationSec: cuánto dura la toma desde startTime;
// - latencyMs: latencia calibrada del usuario, que se resta a los tiempos.
export function recordTake({ audio, mode, startTime, durationSec, latencyMs = 0 }) {
  const reader = {
    audio,
    mode,
    timeData: new Float32Array(audio.tunerAnalyser.fftSize),
    frequencyData: new Uint8Array(audio.chordAnalyser.frequencyBinCount),
    pitchDetector: PitchDetector.forFloat32Array(audio.tunerAnalyser.fftSize),
    binWidth: audio.audioContext.sampleRate / audio.chordAnalyser.fftSize,
  };
  const endTime = startTime + durationSec;
  const frames = [];

  return new Promise((resolve) => {
    function loop() {
      if (audio.audioContext.currentTime >= endTime) {
        resolve(applyLatency(buildEvents(frames, mode), latencyMs));
        return;
      }
      frames.push(readFrame(reader, startTime));
      requestAnimationFrame(loop);
    }
    loop();
  });
}
