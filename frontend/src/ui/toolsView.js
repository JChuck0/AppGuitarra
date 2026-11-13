// Página de herramientas (pages/herramientas.html): afinador, analizador de
// acordes y prueba de micrófono. Aquí solo se lee el micrófono y se pinta en
// pantalla; los cálculos están en src/audio/.

import { PitchDetector } from 'pitchy';
import { getToken } from '../api/session.js';
import { startAudio, stopAudio, describeMicrophoneError } from '../audio/microphone.js';
import { analyzeTuning, analyzeNote, isSilence, TUNING_STATUS } from '../audio/tuner.js';
import { analyzeChord } from '../audio/chordDetector.js';
import { measureFrame, analyzeLevels, describeLevels } from '../audio/micTest.js';
import { TUNER_MIN_CLARITY, MIC_TEST_SECONDS } from '../audio/constants.js';
import { OPEN_VOICINGS, getVoicingNotes } from '../music/chords.js';
import { toSpanishName } from '../music/notes.js';

const toggleButton = document.getElementById('toggle-button');
const errorMessage = document.getElementById('error-message');
const modeInputs = document.querySelectorAll('input[name="mode"]');
const tunerPanel = document.getElementById('tuner-panel');
const chordPanel = document.getElementById('chord-panel');
const tunerNote = document.getElementById('tuner-note');
const tunerStatus = document.getElementById('tuner-status');
const tunerDetail = document.getElementById('tuner-detail');
const noteDetail = document.getElementById('note-detail');
const chordSelect = document.getElementById('chord-select');
const chordStatus = document.getElementById('chord-status');
const chordResults = document.getElementById('chord-results');
const chordPeaks = document.getElementById('chord-peaks');
const micTestButton = document.getElementById('mic-test-button');
const micTestStatus = document.getElementById('mic-test-status');
const micTestResults = document.getElementById('mic-test-results');

// Texto y color de cada resultado del afinador.
const TUNER_MESSAGES = {
  [TUNING_STATUS.IN_TUNE]: { text: 'Afinada', className: 'text-green-700' },
  [TUNING_STATUS.LOW]: { text: 'Baja: tensa la cuerda', className: 'text-amber-600' },
  [TUNING_STATUS.HIGH]: { text: 'Alta: destensa la cuerda', className: 'text-amber-600' },
};

// Estado de la página.
let audio = null;          // lo que devuelve startAudio (null si está parado)
let animationId = null;
let currentMode = 'tuner'; // 'tuner' o 'chords'
let timeData = null;
let frequencyData = null;
let pitchDetector = null;

// Mientras dura la prueba de micrófono: null o { phase, silenceFrames, playingFrames }.
let micTest = null;

// ---------- Afinador ----------

function showTunerWaiting(message) {
  tunerNote.textContent = '-';
  tunerStatus.textContent = message;
  tunerStatus.className = 'mt-2';
  tunerDetail.textContent = '';
}

function showTunerResult(frequency, result) {
  const message = TUNER_MESSAGES[result.status];
  const sign = result.cents > 0 ? '+' : '';

  tunerNote.textContent = `${toSpanishName(result.string.note)} (cuerda ${result.string.string})`;
  tunerStatus.textContent = message.text;
  tunerStatus.className = `mt-2 font-semibold ${message.className}`;
  tunerDetail.textContent =
    `${frequency.toFixed(1)} Hz, referencia ${result.string.frequency.toFixed(1)} Hz, ` +
    `${sign}${result.cents.toFixed(0)} cents`;
}

// Nota detectada en cualquier traste. Sirve para comprobar con la guitarra
// que se reconocen las notas que piden los ejercicios.
function showDetectedNote(frequency) {
  const note = analyzeNote(frequency);
  noteDetail.textContent = note === null ? '' : `Nota detectada: ${toSpanishName(note.note)}`;
}

function updateTuner() {
  audio.tunerAnalyser.getFloatTimeDomainData(timeData);
  if (isSilence(timeData)) {
    showTunerWaiting('Toca una cuerda...');
    return;
  }

  const [frequency, clarity] = pitchDetector.findPitch(timeData, audio.audioContext.sampleRate);
  if (clarity < TUNER_MIN_CLARITY) {
    return; // lectura poco fiable: se deja la anterior en pantalla
  }

  showDetectedNote(frequency);
  const result = analyzeTuning(frequency);
  if (result === null) {
    showTunerWaiting('No es una cuerda al aire');
    return;
  }
  showTunerResult(frequency, result);
}

// ---------- Analizador de acordes ----------

function renderChordOptions() {
  for (const voicingId of Object.keys(OPEN_VOICINGS)) {
    const option = document.createElement('option');
    option.value = voicingId;
    option.textContent = voicingId;
    chordSelect.appendChild(option);
  }
}

// Pinta las cuerdas del acorde elegido. Con el resultado del análisis marca
// cada una como detectada o no; sin él, las deja sin marcar.
function showChordResult(result = null) {
  chordResults.innerHTML = '';

  for (const expectedNote of getVoicingNotes(chordSelect.value)) {
    const item = document.createElement('li');
    let label = `Cuerda ${expectedNote.string}: ${toSpanishName(expectedNote.note)}`;

    if (result !== null) {
      const isMissing = result.missing.some((note) => note.string === expectedNote.string);
      label += isMissing ? ' (no suena)' : ' (bien)';
      item.className = isMissing ? 'text-red-700' : 'text-green-700';
    }

    item.textContent = label;
    chordResults.appendChild(item);
  }

  // Los picos no hacen falta para usar la herramienta, pero ayudan a ajustar
  // los umbrales con la guitarra.
  const hasPeaks = result !== null && result.peaks.length > 0;
  chordPeaks.textContent = hasPeaks
    ? 'Picos: ' + result.peaks.map((peak) => peak.frequency.toFixed(1) + ' Hz').join(', ')
    : '';
}

function updateChords() {
  // Si no hay señal se deja el último resultado, para que dé tiempo a leerlo
  // cuando el acorde se apaga.
  audio.tunerAnalyser.getFloatTimeDomainData(timeData);
  if (isSilence(timeData)) {
    chordStatus.textContent = 'Toca el acorde...';
    return;
  }

  audio.chordAnalyser.getByteFrequencyData(frequencyData);
  const binWidth = audio.audioContext.sampleRate / audio.chordAnalyser.fftSize;

  chordStatus.textContent = 'Analizando...';
  showChordResult(analyzeChord(frequencyData, binWidth, chordSelect.value));
}

// ---------- Prueba de micrófono ----------

function recordMicTestFrame() {
  audio.tunerAnalyser.getFloatTimeDomainData(timeData);
  const frame = measureFrame(timeData);

  if (micTest.phase === 'silence') {
    micTest.silenceFrames.push(frame);
  } else {
    micTest.playingFrames.push(frame);
  }
}

function showMicTestResult() {
  const result = analyzeLevels(micTest.silenceFrames, micTest.playingFrames);
  const isOk = !result.isTooNoisy && !result.isTooLow && !result.isClipping;

  micTestStatus.textContent = isOk ? 'Todo bien' : 'Hay que revisar algo';
  micTestStatus.className = `font-semibold mt-4 ${isOk ? 'text-green-700' : 'text-amber-600'}`;

  micTestResults.innerHTML = '';
  for (const message of describeLevels(result)) {
    const item = document.createElement('li');
    item.textContent = message;
    micTestResults.appendChild(item);
  }

  const detail = document.createElement('li');
  detail.className = 'text-xs text-gray-500';
  detail.textContent =
    `Ruido de fondo: ${result.noiseLevel.toFixed(3)}, nivel tocando: ${result.averageLevel.toFixed(3)}`;
  micTestResults.appendChild(detail);
}

function finishMicTest() {
  showMicTestResult();
  micTest = null;
  micTestButton.disabled = false;
}

// La prueba tiene dos partes seguidas de MIC_TEST_SECONDS cada una. Mientras
// dura, el bucle principal guarda un fotograma en cada vuelta.
async function startMicTest() {
  if (audio === null) {
    await startListening();
    if (audio === null) {
      return; // no se ha conseguido el micrófono
    }
  }

  micTestButton.disabled = true;
  micTestResults.innerHTML = '';
  micTestStatus.className = 'font-semibold mt-4';
  micTestStatus.textContent = `Silencio, no toques nada (${MIC_TEST_SECONDS} s)...`;
  micTest = { phase: 'silence', silenceFrames: [], playingFrames: [] };

  setTimeout(() => {
    micTest.phase = 'playing';
    micTestStatus.textContent = `Ahora toca unos acordes con fuerza normal (${MIC_TEST_SECONDS} s)...`;
    setTimeout(finishMicTest, MIC_TEST_SECONDS * 1000);
  }, MIC_TEST_SECONDS * 1000);
}

// ---------- Bucle y micrófono ----------

function analysisLoop() {
  if (micTest !== null) {
    recordMicTestFrame();
  } else if (currentMode === 'tuner') {
    updateTuner();
  } else {
    updateChords();
  }
  animationId = requestAnimationFrame(analysisLoop);
}

async function startListening() {
  errorMessage.textContent = '';

  try {
    audio = await startAudio();
  } catch (error) {
    console.error('Error al acceder al micrófono:', error);
    errorMessage.textContent = describeMicrophoneError(error);
    return;
  }

  timeData = new Float32Array(audio.tunerAnalyser.fftSize);
  frequencyData = new Uint8Array(audio.chordAnalyser.frequencyBinCount);
  pitchDetector = PitchDetector.forFloat32Array(audio.tunerAnalyser.fftSize);

  toggleButton.textContent = 'Parar';
  analysisLoop();
}

function stopListening() {
  cancelAnimationFrame(animationId);
  stopAudio(audio);
  audio = null;

  toggleButton.textContent = 'Empezar a escuchar';
  resetPanels();
}

function resetPanels() {
  showTunerWaiting('Pulsa "Empezar a escuchar"');
  noteDetail.textContent = '';
  chordStatus.textContent = '';
  showChordResult();
}

function showModePanel() {
  tunerPanel.hidden = currentMode !== 'tuner';
  chordPanel.hidden = currentMode !== 'chords';
}

// ---------- Eventos ----------

toggleButton.addEventListener('click', () => {
  // Durante la prueba de micrófono no se deja parar, para no cortarla a medias.
  if (micTest !== null) {
    return;
  }
  if (audio === null) {
    startListening();
  } else {
    stopListening();
  }
});

for (const input of modeInputs) {
  input.addEventListener('change', () => {
    currentMode = input.value;
    showModePanel();
  });
}

// Al cambiar de acorde se borra el resultado anterior, que ya no vale.
chordSelect.addEventListener('change', () => showChordResult());

micTestButton.addEventListener('click', startMicTest);

// ---------- Estado inicial ----------

if (!getToken()) {
  window.location.replace('/index.html');
} else {
  renderChordOptions();
  showModePanel();
  resetPanels();
}
