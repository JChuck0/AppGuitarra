// Punto de entrada de la app. Une las piezas: recoge los eventos de la
// interfaz, lee el audio en bucle y pasa los datos a la lógica de análisis.

import { PitchDetector } from 'pitchy';
import { startAudio, stopAudio, describeMicrophoneError } from './audio.js';
import { analyzeTuning, isSilence } from './pitch.js';
import { analyzeChord } from './chords.js';
import { CHORDS } from './notes.js';
import { TUNER_MIN_CLARITY } from './constants.js';
import * as ui from './ui.js';

const toggleButton = document.getElementById('toggle-button');
const chordSelect = document.getElementById('chord-select');
const modeInputs = document.querySelectorAll('input[name="mode"]');

// Estado de la aplicación.
let audio = null;          // objeto devuelto por startAudio (null si está parado)
let animationId = null;    // identificador del requestAnimationFrame en curso
let currentMode = 'tuner'; // 'tuner' o 'chords'

// Buffers donde se vuelcan los datos de audio en cada lectura. Se crean una
// sola vez al empezar a escuchar para no reservar memoria en cada fotograma.
let timeData = null;
let frequencyData = null;
let pitchDetector = null;

// Devuelve el acorde seleccionado en el desplegable.
function getSelectedChord() {
  return CHORDS.find((chord) => chord.id === chordSelect.value);
}

// Lee el micrófono y actualiza el afinador.
function updateTuner() {
  // 1. Volcamos la onda de sonido actual en el buffer.
  audio.tunerAnalyser.getFloatTimeDomainData(timeData);

  // 2. Si no hay señal suficiente, no intentamos detectar nada.
  if (isSilence(timeData)) {
    ui.showTunerWaiting('Toca una cuerda...');
    return;
  }

  // 3. Pitchy calcula la frecuencia fundamental y lo "clara" que es la nota.
  const sampleRate = audio.audioContext.sampleRate;
  const [frequency, clarity] = pitchDetector.findPitch(timeData, sampleRate);
  if (clarity < TUNER_MIN_CLARITY) {
    return; // lectura poco fiable: dejamos en pantalla la anterior
  }

  // 4. Comparamos con las cuerdas de la guitarra y mostramos el resultado.
  const result = analyzeTuning(frequency);
  if (result === null) {
    ui.showTunerWaiting('Nota fuera del rango de la guitarra');
    return;
  }
  ui.showTunerResult(frequency, result);
}

// Lee el micrófono y actualiza el analizador de acordes.
function updateChords() {
  // 1. Si no hay señal, dejamos en pantalla el último resultado para que dé
  //  tiempo a leerlo cuando el acorde se apaga.
  audio.tunerAnalyser.getFloatTimeDomainData(timeData);
  if (isSilence(timeData)) {
    ui.showChordStatus('Toca el acorde...');
    return;
  }

  // 2. Volcamos el espectro de frecuencias (FFT) en el buffer.
  audio.chordAnalyser.getByteFrequencyData(frequencyData);

  // 3. Cada posición del array cubre este ancho de frecuencias en Hz.
  const binWidth = audio.audioContext.sampleRate / audio.chordAnalyser.fftSize;

  // 4. Analizamos y mostramos qué cuerdas suenan y cuáles faltan.
  const chord = getSelectedChord();
  const result = analyzeChord(frequencyData, binWidth, chord.notes);
  ui.showChordStatus('Analizando...');
  ui.showChordResult(chord, result);
}

// Bucle principal: se ejecuta una vez por fotograma mientras se escucha.
function analysisLoop() {
  if (currentMode === 'tuner') {
    updateTuner();
  } else {
    updateChords();
  }
  animationId = requestAnimationFrame(analysisLoop);
}

// Pide el micrófono y arranca el bucle de análisis.
async function startListening() {
  ui.showError('');

  try {
    audio = await startAudio();
  } catch (error) {
    console.error('Error al acceder al micrófono:', error);
    ui.showError(describeMicrophoneError(error));
    return;
  }

  timeData = new Float32Array(audio.tunerAnalyser.fftSize);
  frequencyData = new Uint8Array(audio.chordAnalyser.frequencyBinCount);
  pitchDetector = PitchDetector.forFloat32Array(audio.tunerAnalyser.fftSize);

  ui.setListening(true);
  analysisLoop();
}

// Para el bucle y apaga el micrófono.
function stopListening() {
  cancelAnimationFrame(animationId);
  stopAudio(audio);
  audio = null;

  ui.setListening(false);
  resetPanels();
}

// Deja los dos paneles en su estado inicial, sin lecturas.
function resetPanels() {
  ui.showTunerWaiting('Pulsa "Empezar a escuchar"');
  ui.showChordStatus('');
  ui.showChordResult(getSelectedChord());
}

// ---------- Eventos de la interfaz ----------

toggleButton.addEventListener('click', () => {
  if (audio === null) {
    startListening();
  } else {
    stopListening();
  }
});

for (const input of modeInputs) {
  input.addEventListener('change', () => {
    currentMode = input.value;
    ui.showModePanel(currentMode);
  });
}

// Al cambiar de acorde se borra el resultado anterior, que ya no vale.
chordSelect.addEventListener('change', () => {
  ui.showChordResult(getSelectedChord());
});

// ---------- Estado inicial ----------

ui.renderChordOptions(CHORDS);
ui.showModePanel(currentMode);
resetPanels();
