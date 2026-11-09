// Interfaz: todo lo que lee o escribe en el DOM está en este módulo.
// No contiene lógica de audio, solo pinta los resultados que le pasan.

import { toSpanishName } from './notes.js';
import { TUNING_STATUS } from './pitch.js';

// Referencias a los elementos del HTML que se usan.
const toggleButton = document.getElementById('toggle-button');
const errorMessage = document.getElementById('error-message');
const tunerPanel = document.getElementById('tuner-panel');
const chordPanel = document.getElementById('chord-panel');
const tunerNote = document.getElementById('tuner-note');
const tunerStatus = document.getElementById('tuner-status');
const tunerDetail = document.getElementById('tuner-detail');
const chordSelect = document.getElementById('chord-select');
const chordStatus = document.getElementById('chord-status');
const chordResults = document.getElementById('chord-results');
const chordPeaks = document.getElementById('chord-peaks');

// Texto y clase CSS que se muestran para cada resultado del afinador.
const TUNER_MESSAGES = {
  [TUNING_STATUS.IN_TUNE]: { text: 'Afinada', className: 'ok' },
  [TUNING_STATUS.LOW]: { text: 'Baja: sube la cuerda (tensa)', className: 'warning' },
  [TUNING_STATUS.HIGH]: { text: 'Alta: baja la cuerda (destensa)', className: 'warning' },
};

// Muestra el panel del modo elegido ('tuner' o 'chords') y oculta el otro.
export function showModePanel(mode) {
  tunerPanel.hidden = mode !== 'tuner';
  chordPanel.hidden = mode !== 'chords';
}

// Cambia el texto del botón según se esté escuchando o no.
export function setListening(isListening) {
  toggleButton.textContent = isListening ? 'Parar' : 'Empezar a escuchar';
}

// Muestra un mensaje de error. Con un texto vacío, lo borra.
export function showError(message) {
  errorMessage.textContent = message;
}

// Rellena el desplegable con los acordes disponibles.
export function renderChordOptions(chords) {
  for (const chord of chords) {
    const option = document.createElement('option');
    option.value = chord.id;
    option.textContent = chord.name;
    chordSelect.appendChild(option);
  }
}

// Deja el afinador en estado de espera (sin lectura), con el texto indicado.
export function showTunerWaiting(message) {
  tunerNote.textContent = '—';
  tunerStatus.textContent = message;
  tunerStatus.className = '';
  tunerDetail.textContent = '';
}

// Pinta el resultado del afinador: cuerda detectada, estado y desviación.
// Recibe la frecuencia detectada y el objeto que devuelve analyzeTuning.
export function showTunerResult(frequency, result) {
  const message = TUNER_MESSAGES[result.status];
  const { string, note } = result.string;

  // Signo explícito para que se vea hacia dónde se desvía (+12 / -8).
  const sign = result.cents > 0 ? '+' : '';

  tunerNote.textContent = `${toSpanishName(note)} (cuerda ${string})`;
  tunerStatus.textContent = message.text;
  tunerStatus.className = message.className;
  tunerDetail.textContent =
    `${frequency.toFixed(1)} Hz · referencia ${result.string.frequency.toFixed(1)} Hz · ` +
    `${sign}${result.cents.toFixed(0)} cents`;
}

// Muestra un texto de estado en el modo acordes (p. ej. "Toca el acorde").
export function showChordStatus(message) {
  chordStatus.textContent = message;
}

// Pinta la lista de cuerdas de un acorde. Si se pasa el resultado del
// análisis, marca cada cuerda como detectada o no; si no, las deja sin marcar.
export function showChordResult(chord, result = null) {
  chordResults.innerHTML = '';

  for (const expectedNote of chord.notes) {
    const item = document.createElement('li');
    let label = `Cuerda ${expectedNote.string}: ${toSpanishName(expectedNote.note)}`;

    if (result !== null) {
      const isMissing = result.missing.includes(expectedNote);
      label += isMissing ? ': no detectada' : ': correcta';
      item.className = isMissing ? 'error' : 'ok';
    }

    item.textContent = label;
    chordResults.appendChild(item);
  }

  showChordPeaks(result);
}

// Muestra las frecuencias de los picos detectados. No hace falta para usar la
// app, pero ayuda a ajustar los umbrales de constants.js con la guitarra.
function showChordPeaks(result) {
  if (result === null || result.peaks.length === 0) {
    chordPeaks.textContent = '';
    return;
  }

  const frequencies = result.peaks.map((peak) => peak.frequency.toFixed(1) + ' Hz');
  chordPeaks.textContent = 'Picos detectados: ' + frequencies.join(', ');
}
