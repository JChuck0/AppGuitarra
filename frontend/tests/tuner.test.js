import { describe, it, expect } from 'vitest';
import {
  TUNING_STATUS,
  findClosestString,
  getTuningStatus,
  calculateRms,
  isSilence,
  analyzeTuning,
  analyzeNote,
} from '../src/audio/tuner.js';

// Frecuencias de referencia usadas en los tests.
const E2 = 82.41;
const A2 = 110.0;
const E4 = 329.63;

// Devuelve la frecuencia que queda a "cents" de distancia de otra.
// Sirve para simular cuerdas desafinadas una cantidad concreta.
function detune(frequency, cents) {
  return frequency * Math.pow(2, cents / 1200);
}

describe('findClosestString', () => {
  it('encuentra cada cuerda con su frecuencia exacta', () => {
    expect(findClosestString(E2).note).toBe('E2');
    expect(findClosestString(A2).note).toBe('A2');
    expect(findClosestString(146.83).note).toBe('D3');
    expect(findClosestString(196.0).note).toBe('G3');
    expect(findClosestString(246.94).note).toBe('B3');
    expect(findClosestString(E4).note).toBe('E4');
  });

  it('encuentra la cuerda aunque esté algo desafinada por arriba o por abajo', () => {
    expect(findClosestString(detune(A2, 30)).note).toBe('A2');
    expect(findClosestString(detune(A2, -30)).note).toBe('A2');
  });

  it('devuelve también el número de cuerda y su frecuencia', () => {
    expect(findClosestString(E2).string).toBe(6);
    expect(findClosestString(E4).string).toBe(1);
    expect(findClosestString(A2).frequency).toBeCloseTo(110, 5);
  });

  it('devuelve null si la nota está fuera del rango de las cuerdas al aire', () => {
    expect(findClosestString(30)).toBeNull();
    expect(findClosestString(2000)).toBeNull();
  });

  it('devuelve null si la frecuencia no es válida', () => {
    expect(findClosestString(0)).toBeNull();
    expect(findClosestString(-110)).toBeNull();
    expect(findClosestString(NaN)).toBeNull();
  });
});

describe('getTuningStatus', () => {
  it('indica "afinada" con la frecuencia exacta', () => {
    expect(getTuningStatus(A2, A2)).toBe(TUNING_STATUS.IN_TUNE);
  });

  it('indica "afinada" si la desviación está dentro de la tolerancia', () => {
    expect(getTuningStatus(detune(A2, 3), A2)).toBe(TUNING_STATUS.IN_TUNE);
    expect(getTuningStatus(detune(A2, -3), A2)).toBe(TUNING_STATUS.IN_TUNE);
  });

  it('indica "baja" si suena por debajo de la referencia', () => {
    expect(getTuningStatus(detune(A2, -20), A2)).toBe(TUNING_STATUS.LOW);
  });

  it('indica "alta" si suena por encima de la referencia', () => {
    expect(getTuningStatus(detune(A2, 20), A2)).toBe(TUNING_STATUS.HIGH);
  });

  it('permite cambiar la tolerancia', () => {
    const slightlyHigh = detune(A2, 20);
    expect(getTuningStatus(slightlyHigh, A2, 25)).toBe(TUNING_STATUS.IN_TUNE);
    expect(getTuningStatus(slightlyHigh, A2, 10)).toBe(TUNING_STATUS.HIGH);
  });
});

describe('calculateRms e isSilence', () => {
  it('devuelve 0 con un array vacío', () => {
    expect(calculateRms([])).toBe(0);
  });

  it('calcula el nivel de una señal constante', () => {
    expect(calculateRms([0.5, -0.5, 0.5, -0.5])).toBeCloseTo(0.5, 5);
  });

  it('considera silencio un array vacío', () => {
    expect(isSilence(new Float32Array(0))).toBe(true);
  });

  it('considera silencio una señal por debajo del umbral', () => {
    const backgroundNoise = new Float32Array([0.001, -0.002, 0.001, -0.001]);
    expect(isSilence(backgroundNoise)).toBe(true);
  });

  it('no considera silencio una señal con nivel suficiente', () => {
    const loudSignal = new Float32Array([0.3, -0.3, 0.2, -0.2]);
    expect(isSilence(loudSignal)).toBe(false);
  });
});

describe('analyzeTuning', () => {
  it('devuelve cuerda, cents y estado para una cuerda afinada', () => {
    const result = analyzeTuning(E2);
    expect(result.string.note).toBe('E2');
    expect(result.cents).toBeCloseTo(0, 0);
    expect(result.status).toBe(TUNING_STATUS.IN_TUNE);
  });

  it('indica la dirección de corrección en una cuerda desafinada', () => {
    const result = analyzeTuning(detune(E4, -25));
    expect(result.string.note).toBe('E4');
    expect(result.cents).toBeCloseTo(-25, 0);
    expect(result.status).toBe(TUNING_STATUS.LOW);
  });

  it('devuelve null con una nota fuera del rango de la guitarra', () => {
    expect(analyzeTuning(1500)).toBeNull();
  });
});

describe('analyzeNote', () => {
  it('reconoce una nota pisada que no es una cuerda al aire', () => {
    // Traste 3 de la cuerda 6: Sol2 (98 Hz).
    const result = analyzeNote(98.0);
    expect(result.note).toBe('G2');
    expect(result.midi).toBe(43);
    expect(result.cents).toBeCloseTo(0, 0);
  });

  it('reconoce las notas agudas que el afinador no acepta', () => {
    // Traste 8 de la cuerda 1: Do5 (523 Hz), la nota más aguda de la
    // pentatónica de La en posición 1.
    expect(findClosestString(523.25)).toBeNull();
    expect(analyzeNote(523.25).note).toBe('C5');
  });

  it('redondea a la nota más cercana y devuelve la desviación', () => {
    const result = analyzeNote(detune(A2, 30));
    expect(result.note).toBe('A2');
    expect(result.cents).toBeCloseTo(30, 0);
  });

  it('devuelve null fuera del rango de los ejercicios', () => {
    expect(analyzeNote(40)).toBeNull();
    expect(analyzeNote(1500)).toBeNull();
    expect(analyzeNote(NaN)).toBeNull();
  });
});
