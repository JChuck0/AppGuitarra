import { describe, it, expect } from 'vitest';
import { findPeaks, removeHarmonics, compareChord, analyzeChord } from '../src/audio/chordDetector.js';
import { getVoicingNotes } from '../src/music/chords.js';
import { midiToFrequency, noteToMidi } from '../src/music/notes.js';

// En los tests cada posición del array equivale a 1 Hz, así la posición 110
// es directamente 110 Hz y los espectros simulados son fáciles de leer.
const BIN_WIDTH = 1;
const SPECTRUM_SIZE = 1024;

const E_MAJOR = getVoicingNotes('E');

// Crea un espectro "falso" con un pico en cada frecuencia indicada.
// Cada pico tiene forma de triángulo (baja 40 por cada posición que se
// aleja), parecido a como se ve una nota real en la FFT.
function createSpectrum(peaks) {
  const spectrum = new Uint8Array(SPECTRUM_SIZE);

  for (const peak of peaks) {
    const centerBin = Math.round(peak.frequency / BIN_WIDTH);
    for (let offset = -2; offset <= 2; offset++) {
      const value = peak.magnitude - 40 * Math.abs(offset);
      spectrum[centerBin + offset] = Math.max(spectrum[centerBin + offset], value);
    }
  }

  return spectrum;
}

describe('findPeaks', () => {
  it('encuentra los picos que superan el umbral', () => {
    const spectrum = createSpectrum([
      { frequency: 110, magnitude: 200 },
      { frequency: 165, magnitude: 180 },
      { frequency: 220, magnitude: 220 },
    ]);

    const peaks = findPeaks(spectrum, BIN_WIDTH);

    expect(peaks).toHaveLength(3);
    expect(peaks[0].frequency).toBeCloseTo(110, 1);
    expect(peaks[1].frequency).toBeCloseTo(165, 1);
    expect(peaks[2].frequency).toBeCloseTo(220, 1);
    expect(peaks[2].magnitude).toBe(220);
  });

  it('ignora los picos por debajo del umbral', () => {
    const spectrum = createSpectrum([
      { frequency: 110, magnitude: 200 },
      { frequency: 165, magnitude: 80 },
    ]);

    const peaks = findPeaks(spectrum, BIN_WIDTH);

    expect(peaks).toHaveLength(1);
    expect(peaks[0].frequency).toBeCloseTo(110, 1);
  });

  it('permite indicar otro umbral', () => {
    const spectrum = createSpectrum([{ frequency: 165, magnitude: 80 }]);
    expect(findPeaks(spectrum, BIN_WIDTH, 50)).toHaveLength(1);
  });

  it('ignora los picos fuera del rango de la guitarra', () => {
    const spectrum = createSpectrum([
      { frequency: 40, magnitude: 250 },
      { frequency: 800, magnitude: 250 },
    ]);
    expect(findPeaks(spectrum, BIN_WIDTH)).toEqual([]);
  });

  it('cuenta una meseta de valores iguales como un solo pico', () => {
    const spectrum = new Uint8Array(SPECTRUM_SIZE);
    spectrum[110] = 200;
    spectrum[111] = 200;

    expect(findPeaks(spectrum, BIN_WIDTH)).toHaveLength(1);
  });

  it('afina la frecuencia cuando el pico real cae entre dos posiciones', () => {
    // El vecino derecho es más alto que el izquierdo, así que la frecuencia
    // real tiene que estar entre 110 y 111 Hz.
    const spectrum = new Uint8Array(SPECTRUM_SIZE);
    spectrum[109] = 150;
    spectrum[110] = 200;
    spectrum[111] = 190;

    const peaks = findPeaks(spectrum, BIN_WIDTH);

    expect(peaks).toHaveLength(1);
    expect(peaks[0].frequency).toBeGreaterThan(110);
    expect(peaks[0].frequency).toBeLessThan(111);
  });

  it('devuelve un array vacío si no hay datos o hay silencio', () => {
    expect(findPeaks(new Uint8Array(0), BIN_WIDTH)).toEqual([]);
    expect(findPeaks(new Uint8Array(SPECTRUM_SIZE), BIN_WIDTH)).toEqual([]);
  });
});

describe('removeHarmonics', () => {
  it('descarta un armónico mucho más débil que su fundamental', () => {
    const peaks = [
      { frequency: 110, magnitude: 220 },
      { frequency: 220, magnitude: 140 },
    ];

    expect(removeHarmonics(peaks)).toEqual([{ frequency: 110, magnitude: 220 }]);
  });

  it('conserva un pico con fuerza parecida aunque coincida con un armónico', () => {
    // Puede ser otra cuerda sonando una octava por encima.
    const peaks = [
      { frequency: 110, magnitude: 220 },
      { frequency: 220, magnitude: 200 },
    ];

    expect(removeHarmonics(peaks)).toHaveLength(2);
  });

  it('conserva los picos que no son múltiplos de otro', () => {
    const peaks = [
      { frequency: 110, magnitude: 220 },
      { frequency: 147, magnitude: 140 },
    ];

    expect(removeHarmonics(peaks)).toHaveLength(2);
  });

  it('devuelve un array vacío si no hay picos', () => {
    expect(removeHarmonics([])).toEqual([]);
  });
});

describe('compareChord', () => {
  // Frecuencias exactas de todas las notas de Mi mayor.
  const allFrequencies = E_MAJOR.map((note) => midiToFrequency(note.midi));

  it('marca todas las notas como presentes con el acorde bien tocado', () => {
    const result = compareChord(E_MAJOR, allFrequencies);

    expect(result.present).toHaveLength(6);
    expect(result.missing).toEqual([]);
  });

  it('detecta la nota que falta si se omite una cuerda', () => {
    const gSharp = E_MAJOR.find((note) => note.note === 'G#3');
    const gSharpFrequency = midiToFrequency(gSharp.midi);
    const withoutGSharp = allFrequencies.filter((frequency) => frequency !== gSharpFrequency);

    const result = compareChord(E_MAJOR, withoutGSharp);

    expect(result.present).toHaveLength(5);
    expect(result.missing).toEqual([gSharp]);
  });

  it('acepta notas ligeramente desviadas dentro de la tolerancia', () => {
    const slightlyDetuned = allFrequencies.map((frequency) => frequency * 1.005);
    expect(compareChord(E_MAJOR, slightlyDetuned).missing).toEqual([]);
  });

  it('no acepta una nota que está a un semitono de la esperada', () => {
    const f2 = midiToFrequency(noteToMidi('F2'));
    expect(compareChord(E_MAJOR, [f2]).present).toEqual([]);
  });

  it('ignora las frecuencias detectadas que no son del acorde', () => {
    const result = compareChord(E_MAJOR, [...allFrequencies, 100, 300]);
    expect(result.present).toHaveLength(6);
  });

  it('marca todas las notas como ausentes si no se detecta nada', () => {
    const result = compareChord(E_MAJOR, []);

    expect(result.present).toEqual([]);
    expect(result.missing).toHaveLength(6);
  });
});

describe('analyzeChord', () => {
  // Las notas de Am: La2, Mi3, La3, Do4 y Mi4. Se redondean porque en el
  // espectro simulado cada posición es 1 Hz.
  const amFrequencies = getVoicingNotes('Am').map((note) => Math.round(midiToFrequency(note.midi)));

  it('encuentra todas las notas de un acorde bien tocado', () => {
    const spectrum = createSpectrum(
      amFrequencies.map((frequency) => ({ frequency, magnitude: 220 }))
    );

    const result = analyzeChord(spectrum, BIN_WIDTH, 'Am');

    expect(result.missing).toEqual([]);
    expect(result.present).toHaveLength(5);
  });

  it('detecta la cuerda que falta', () => {
    // Se quita el Do4 (cuerda 2), que es la que suele quedar tapada en el Am.
    const withoutC4 = amFrequencies.filter((frequency) => frequency !== 262);
    const spectrum = createSpectrum(
      withoutC4.map((frequency) => ({ frequency, magnitude: 220 }))
    );

    const result = analyzeChord(spectrum, BIN_WIDTH, 'Am');

    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].string).toBe(2);
  });

  it('marca todo como ausente con un espectro en silencio', () => {
    const result = analyzeChord(new Uint8Array(SPECTRUM_SIZE), BIN_WIDTH, 'Am');

    expect(result.present).toEqual([]);
    expect(result.missing).toHaveLength(5);
    expect(result.peaks).toEqual([]);
  });

  it('da error con un acorde que no existe', () => {
    expect(() => analyzeChord(new Uint8Array(SPECTRUM_SIZE), BIN_WIDTH, 'X9')).toThrow();
  });
});
