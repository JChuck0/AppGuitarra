// Captura de audio: pide el micrófono y lo conecta a la Web Audio API.
// Este módulo no interpreta el sonido, solo lo deja preparado para que lo
// lean el afinador y el analizador de acordes.

import { TUNER_FFT_SIZE, CHORD_FFT_SIZE } from './constants.js';

// Se desactivan los filtros que el navegador aplica pensando en llamadas de
// voz, porque la supresión de ruido trata una nota larga como ruido de fondo
// y la va bajando.
const MICROPHONE_OPTIONS = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
};

// Pide el micrófono y monta la cadena de nodos de audio.
// Se crean dos AnalyserNode porque el afinador quiere un buffer corto para
// responder rápido y el analizador de acordes uno muy grande para tener
// resolución en los graves. No se conecta nada a los altavoces.
// Hay que llamarla desde un clic, que es cuando el navegador deja crear el
// AudioContext.
// Devuelve { stream, audioContext, tunerAnalyser, chordAnalyser }.
export async function startAudio() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Este navegador no permite acceder al micrófono.');
  }

  const stream = await navigator.mediaDevices.getUserMedia(MICROPHONE_OPTIONS);

  const audioContext = new AudioContext();
  const microphoneSource = audioContext.createMediaStreamSource(stream);

  const tunerAnalyser = audioContext.createAnalyser();
  tunerAnalyser.fftSize = TUNER_FFT_SIZE;
  microphoneSource.connect(tunerAnalyser);

  const chordAnalyser = audioContext.createAnalyser();
  chordAnalyser.fftSize = CHORD_FFT_SIZE;
  microphoneSource.connect(chordAnalyser);

  return { stream, audioContext, tunerAnalyser, chordAnalyser };
}

// Apaga el micrófono y cierra el AudioContext. Si no se paran las pistas,
// el navegador sigue mostrando el aviso de "micrófono en uso".
export function stopAudio(audio) {
  for (const track of audio.stream.getTracks()) {
    track.stop();
  }
  audio.audioContext.close();
}

// Traduce un error del micrófono a un mensaje para el usuario.
export function describeMicrophoneError(error) {
  if (error.name === 'NotAllowedError') {
    return 'Has denegado el permiso del micrófono. Actívalo en el navegador y vuelve a intentarlo.';
  }
  if (error.name === 'NotFoundError') {
    return 'No se ha encontrado ningún micrófono conectado.';
  }
  return 'No se pudo acceder al micrófono: ' + error.message;
}
