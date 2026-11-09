import { describe, it, expect } from 'vitest';
import {
  TUNING_STATUS,
  getCentsDifference,
  findClosestString,
  getTuningStatus,
  calculateRms,
  isSilence,
  analyzeTuning,
} from '../src/pitch.js';

// Frecuencias de referencia usadas en los tests.
const E2 = 82.41;
const A2 = 110.0;
const E4 = 329.63;

// Devuelve la frecuencia que queda a "cents" de distancia de otra.
// Sirve para simular cuerdas desafinadas una cantidad concreta.
function detune(frequency, cents) {
  return frequency * Math.pow(2, cents / 1200);
}

describe('getCentsDifference', () => {
  it('devuelve 0 cuando las dos frecuencias son iguales', () => {
    expect(getCentsDifference(110, 110)).toBe(0);
  });

  it('devuelve 1200 cents para una octava hacia arriba', () => {
    expect(getCentsDifference(220, 110)).toBeCloseTo(1200, 5);
  });

  it('devuelve un valor negativo si la frecuencia detectada es más grave', () => {
    expect(getCentsDifference(detune(A2, -20), A2)).toBeCloseTo(-20, 5);
  });
});

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

  it('devuelve también el número de cuerda', () => {
    expect(findClosestString(E2).string).toBe(6);
    expect(findClosestString(E4).string).toBe(1);
  });

  it('devuelve null si la nota está fuera del rango de la guitarra', () => {
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
