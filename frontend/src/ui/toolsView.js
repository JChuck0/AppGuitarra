// Página de herramientas (pages/herramientas.html): afinador, analizador de
// acordes, metrónomo, calibración de latencia, toma de prueba y prueba de
// micrófono. Aquí
// solo se lee el micrófono y se pinta en pantalla; los cálculos están en
// src/audio/.

import { PitchDetector } from 'pitchy';
import { getMe, updateLatency } from '../api/client.js';
import { getToken } from '../api/session.js';
import { startAudio, stopAudio, describeMicrophoneError } from '../audio/microphone.js';
import { analyzeTuning, analyzeNote, isSilence, TUNING_STATUS } from '../audio/tuner.js';
import { analyzeChord } from '../audio/chordDetector.js';
import { measureFrame, analyzeLevels, describeLevels } from '../audio/micTest.js';
import { createMetronome, getBeatTimes, getBeatDuration, clampBpm } from '../audio/metronome.js';
import { detectOnsets, measureRecentRms } from '../audio/onsets.js';
import { calculateLatency, pairClicksWithOnsets } from '../audio/latency.js';
import { recordTake } from '../audio/recorder.js';
import { TAKE_MODE } from '../audio/events.js';
import {
  TUNER_MIN_CLARITY,
  MIC_TEST_SECONDS,
  LATENCY_BPM,
  LATENCY_COUNT_IN_BEATS,
  LATENCY_CLICKS,
  TEST_TAKE_SECONDS,
} from '../audio/constants.js';
import { OPEN_VOICINGS, getVoicingNotes } from '../music/chords.js';
import { toSpanishName, midiToNote } from '../music/notes.js';

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
const bpmInput = document.getElementById('bpm-input');
const metronomeButton = document.getElementById('metronome-button');
const beatLights = document.querySelectorAll('#beat-lights span');
const latencyButton = document.getElementById('latency-button');
const latencyStatus = document.getElementById('latency-status');
const latencySaved = document.getElementById('latency-saved');
const takeMode = document.getElementById('take-mode');
const takeButton = document.getElementById('take-button');
const takeStatus = document.getElementById('take-status');
const takeResults = document.getElementById('take-results');

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

// Metrónomo de la herramienta. Tiene su propio AudioContext para poder usarlo
// sin encender el micrófono. Se crean al pulsar "Empezar".
let metronomeContext = null;
let metronome = null;

// Mientras dura la calibración: null o { frames, clickTimes }.
let calibration = null;

// Latencia guardada del usuario (ms), para corregir la toma de prueba.
let savedLatencyMs = null;

// true mientras se graba la toma de prueba.
let recording = false;

// La prueba de micrófono, la calibración y la toma de prueba usan el
// micrófono a la vez, así que mientras dura una no se pueden lanzar las otras.
function setBusy(isBusy) {
  micTestButton.disabled = isBusy;
  latencyButton.disabled = isBusy;
  takeButton.disabled = isBusy;
}

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
  setBusy(false);
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

  setBusy(true);
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

// ---------- Metrónomo ----------

// Enciende la luz del tiempo que está sonando y apaga las demás. El primer
// tiempo del compás va en otro color, igual que su clic suena más agudo.
function showBeat(beatNumber) {
  const current = beatNumber % beatLights.length;
  beatLights.forEach((light, index) => {
    let color = 'bg-gray-300';
    if (index === current) {
      color = index === 0 ? 'bg-blue-600' : 'bg-blue-300';
    }
    light.className = `w-4 h-4 rounded-full ${color}`;
  });
}

function clearBeatLights() {
  beatLights.forEach((light) => {
    light.className = 'w-4 h-4 rounded-full bg-gray-300';
  });
}

function startMetronome() {
  const bpm = clampBpm(Number(bpmInput.value));
  if (bpm === null) {
    return;
  }
  bpmInput.value = bpm;

  if (metronome === null) {
    metronomeContext = new AudioContext();
    metronome = createMetronome(metronomeContext);
  }
  metronome.start({ bpm, onBeat: showBeat });
  metronomeButton.textContent = 'Parar';
}

function stopMetronome() {
  if (metronome !== null) {
    metronome.stop();
  }
  metronomeButton.textContent = 'Empezar';
  clearBeatLights();
}

// ---------- Calibración de latencia ----------

function showSavedLatency(latencyMs) {
  savedLatencyMs = latencyMs;
  latencySaved.textContent = latencyMs === null
    ? 'Todavía no has calibrado la latencia.'
    : `Latencia guardada: ${latencyMs} ms`;
}

// Mensaje que se ve en cada clic: primero la cuenta atrás y luego por qué
// clic va.
function showCalibrationBeat(beatNumber) {
  if (beatNumber < LATENCY_COUNT_IN_BEATS) {
    latencyStatus.textContent = `Prepárate... ${LATENCY_COUNT_IN_BEATS - beatNumber}`;
  } else {
    const click = beatNumber - LATENCY_COUNT_IN_BEATS + 1;
    latencyStatus.textContent = `¡Toca con el clic! (${click} de ${LATENCY_CLICKS})`;
  }
}

function recordCalibrationFrame() {
  audio.tunerAnalyser.getFloatTimeDomainData(timeData);
  calibration.frames.push({
    time: audio.audioContext.currentTime,
    rms: measureRecentRms(timeData),
  });
}

// Usa el mismo AudioContext que el micrófono para que los tiempos de los
// clics y los de los ataques se midan con el mismo reloj.
async function startCalibration() {
  if (audio === null) {
    await startListening();
    if (audio === null) {
      return;
    }
  }

  stopMetronome();
  setBusy(true);
  latencyStatus.className = 'font-semibold mt-4';

  const totalBeats = LATENCY_COUNT_IN_BEATS + LATENCY_CLICKS;
  const calibrationMetronome = createMetronome(audio.audioContext);
  const startTime = calibrationMetronome.start({
    bpm: LATENCY_BPM,
    beats: totalBeats,
    onBeat: showCalibrationBeat,
  });

  // Solo se miden los clics que van después de la cuenta atrás.
  const clickTimes = getBeatTimes(LATENCY_BPM, startTime, totalBeats).slice(LATENCY_COUNT_IN_BEATS);
  calibration = { frames: [], clickTimes };

  // Se espera medio segundo después del último clic por si el golpe llega tarde.
  const lastClick = clickTimes[clickTimes.length - 1];
  const waitMs = (lastClick - audio.audioContext.currentTime + 0.5) * 1000;
  setTimeout(finishCalibration, waitMs);
}

async function finishCalibration() {
  const onsetTimes = detectOnsets(calibration.frames).map((onset) => onset.time);
  const detected = pairClicksWithOnsets(calibration.clickTimes, onsetTimes).length;
  const latencyMs = calculateLatency(calibration.clickTimes, onsetTimes);
  calibration = null;
  setBusy(false);

  if (latencyMs === null) {
    latencyStatus.textContent =
      `Solo se han detectado ${detected} de ${LATENCY_CLICKS} golpes. ` +
      'Vuelve a intentarlo tocando un poco más fuerte y justo con el clic.';
    latencyStatus.className = 'font-semibold mt-4 text-amber-600';
    return;
  }

  latencyStatus.textContent = `Latencia medida: ${latencyMs} ms (${detected} de ${LATENCY_CLICKS} golpes)`;
  latencyStatus.className = 'font-semibold mt-4 text-green-700';

  try {
    const usuario = await updateLatency(latencyMs);
    showSavedLatency(usuario.latencia_ms);
  } catch (error) {
    latencySaved.textContent = 'No se ha podido guardar: ' + error.message;
  }
}

async function loadSavedLatency() {
  try {
    const usuario = await getMe();
    showSavedLatency(usuario.latencia_ms);
  } catch (error) {
    if (error.status === 401) {
      window.location.replace('/index.html');
    }
  }
}

// ---------- Toma de prueba ----------

// Distancia en ms del evento al clic más cercano. Positiva si llega tarde.
function getOffsetFromBeat(eventTime, beatTimes) {
  let closest = beatTimes[0];
  for (const beat of beatTimes) {
    if (Math.abs(eventTime - beat) < Math.abs(eventTime - closest)) {
      closest = beat;
    }
  }
  return Math.round((eventTime - closest) * 1000);
}

function formatNotes(midiNotes) {
  if (midiNotes.length === 0) {
    return '(no se reconoce)';
  }
  return midiNotes.map((midi) => toSpanishName(midiToNote(midi))).join(', ');
}

function addCell(row, text) {
  const cell = document.createElement('td');
  cell.className = 'py-1';
  cell.textContent = text;
  row.appendChild(cell);
}

function showTakeEvents(events, beatTimes) {
  takeResults.innerHTML = '';
  events.forEach((event, index) => {
    const row = document.createElement('tr');
    const offset = getOffsetFromBeat(event.time, beatTimes);
    addCell(row, index + 1);
    addCell(row, event.time.toFixed(2));
    addCell(row, formatNotes(event.midi));
    addCell(row, `${Math.round(event.confidence * 100)} %`);
    addCell(row, `${offset > 0 ? '+' : ''}${offset} ms`);
    takeResults.appendChild(row);
  });
}

function showTakeBeat(beatNumber) {
  if (beatNumber < LATENCY_COUNT_IN_BEATS) {
    takeStatus.textContent = `Prepárate... ${LATENCY_COUNT_IN_BEATS - beatNumber}`;
  } else {
    takeStatus.textContent = 'Grabando...';
  }
}

// Graba TEST_TAKE_SECONDS con el metrónomo y enseña los eventos detectados.
// La cuenta atrás es de un compás de 4 tiempos, como la de la calibración.
async function startTestTake() {
  const bpm = clampBpm(Number(bpmInput.value));
  if (bpm === null) {
    return;
  }
  if (audio === null) {
    await startListening();
    if (audio === null) {
      return;
    }
  }

  stopMetronome();
  setBusy(true);
  recording = true;
  takeResults.innerHTML = '';
  takeStatus.className = 'font-semibold mt-4';

  const takeBeats = Math.ceil(TEST_TAKE_SECONDS / getBeatDuration(bpm));
  const takeMetronome = createMetronome(audio.audioContext);
  const firstClick = takeMetronome.start({
    bpm,
    beats: LATENCY_COUNT_IN_BEATS + takeBeats,
    onBeat: showTakeBeat,
  });
  const startTime = firstClick + LATENCY_COUNT_IN_BEATS * getBeatDuration(bpm);

  const events = await recordTake({
    audio,
    mode: takeMode.value === 'chord' ? TAKE_MODE.CHORD : TAKE_MODE.MONO,
    startTime,
    durationSec: TEST_TAKE_SECONDS,
    latencyMs: savedLatencyMs,
  });

  // Los golpes de la cuenta atrás no son de la toma.
  const takeEvents = events.filter((event) => event.time > -getBeatDuration(bpm) / 2);
  showTakeEvents(takeEvents, getBeatTimes(bpm, 0, takeBeats));

  let summary = `${takeEvents.length} golpes detectados en ${takeBeats} clics.`;
  if (savedLatencyMs === null) {
    summary += ' Sin latencia calibrada: los tiempos no están corregidos.';
  }
  takeStatus.textContent = summary;
  recording = false;
  setBusy(false);
}

// ---------- Bucle y micrófono ----------

function analysisLoop() {
  if (micTest !== null) {
    recordMicTestFrame();
  } else if (calibration !== null) {
    recordCalibrationFrame();
  } else if (recording) {
    // La toma de prueba lee el micrófono por su cuenta (recordTake).
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
  // Durante la prueba de micrófono, la calibración o la toma no se deja
  // parar, para no cortarlas a medias.
  if (micTest !== null || calibration !== null || recording) {
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

metronomeButton.addEventListener('click', () => {
  if (metronome !== null && metronome.isRunning()) {
    stopMetronome();
  } else {
    startMetronome();
  }
});

// Si se cambia el tempo con el metrónomo en marcha, se vuelve a empezar con
// el tempo nuevo.
bpmInput.addEventListener('change', () => {
  if (metronome !== null && metronome.isRunning()) {
    startMetronome();
  }
});

latencyButton.addEventListener('click', startCalibration);

takeButton.addEventListener('click', startTestTake);

// ---------- Estado inicial ----------

if (!getToken()) {
  window.location.replace('/index.html');
} else {
  renderChordOptions();
  showModePanel();
  resetPanels();
  loadSavedLatency();
}
