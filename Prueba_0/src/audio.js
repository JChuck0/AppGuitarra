// Captura de audio: pide el micrófono y lo conecta a la Web Audio API.
// Este módulo no interpreta el sonido, solo lo deja preparado para que lo lean pitch.js y chords.js.

import { TUNER_FFT_SIZE, CHORD_FFT_SIZE } from './constants.js';

// Opciones del micrófono. Se desactivan los filtros que el navegador aplica
// pensando en llamadas de voz, porque la supresión de ruido trata una nota
// sostenida como si fuera ruido de fondo y la atenúa.
const MICROPHONE_OPTIONS = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
};

// Pide el micrófono y monta la cadena de nodos de audio.
// Se crean dos AnalyserNode porque cada modo necesita un
// tamaño distinto. El afinador quiere un buffer corto para responder rápido
// y el analizador de acordes uno muy grande para tener resolución en graves.
// Ninguno se conecta a los altavoces: solo queremos analizar, no escuchar.
// Hay que llamarla desde un clic del usuario, que
// es cuando el navegador permite crear el AudioContext.
// Devuelve una promesa con el objeto { stream, audioContext, tunerAnalyser,
// chordAnalyser }. Lanza un error si no se consigue el micrófono.
export async function startAudio() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Este navegador no permite acceder al micrófono.');
  }

  // 1. Pedimos permiso al usuario.
  const stream = await navigator.mediaDevices.getUserMedia(MICROPHONE_OPTIONS);

  // 2. Creamos el AudioContext y convertimos el micrófono en un nodo de audio.
  const audioContext = new AudioContext();
  const microphoneSource = audioContext.createMediaStreamSource(stream);

  // 3. Creamos los dos analizadores y les conectamos el micrófono.
  const tunerAnalyser = audioContext.createAnalyser();
  tunerAnalyser.fftSize = TUNER_FFT_SIZE;
  microphoneSource.connect(tunerAnalyser);

  const chordAnalyser = audioContext.createAnalyser();
  chordAnalyser.fftSize = CHORD_FFT_SIZE;
  microphoneSource.connect(chordAnalyser);

  return { stream, audioContext, tunerAnalyser, chordAnalyser };
}

// Apaga el micrófono y libera el AudioContext.
// Si no se paran las pistas del stream, el navegador
// sigue mostrando el indicador de "micrófono en uso".
// Recibe el objeto que devolvió startAudio.
export function stopAudio(audio) {
  for (const track of audio.stream.getTracks()) {
    track.stop();
  }
  audio.audioContext.close();
}

// Traduce un error del micrófono a un mensaje claro.
// Recibe el error capturado al llamar a startAudio.
// Devuelve un texto en español para mostrar al usuario.
export function describeMicrophoneError(error) {
  if (error.name === 'NotAllowedError') {
    return 'Has denegado el permiso del micrófono. Actívalo en el navegador y vuelve a intentarlo.';
  }
  if (error.name === 'NotFoundError') {
    return 'No se ha encontrado ningún micrófono conectado.';
  }
  return 'No se pudo acceder al micrófono: ' + error.message;
}
