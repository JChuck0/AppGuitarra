import { describe, it, expect } from 'vitest';
import { calculatePeak, measureFrame, analyzeLevels, describeLevels } from '../src/audio/micTest.js';

// Crea n fotogramas iguales, ya medidos.
function frames(n, rms, peak = rms * 2) {
  return Array.from({ length: n }, () => ({ rms, peak }));
}

const QUIET_ROOM = frames(10, 0.002);
const GOOD_PLAYING = frames(10, 0.08);

describe('calculatePeak y measureFrame', () => {
  it('devuelve el valor más alto sin tener en cuenta el signo', () => {
    expect(calculatePeak([0.1, -0.7, 0.4])).toBeCloseTo(0.7, 5);
  });

  it('devuelve 0 sin muestras', () => {
    expect(calculatePeak([])).toBe(0);
  });

  it('mide el volumen y el pico de un fotograma', () => {
    const frame = measureFrame([0.5, -0.5, 0.5, -0.5]);
    expect(frame.rms).toBeCloseTo(0.5, 5);
    expect(frame.peak).toBeCloseTo(0.5, 5);
  });
});

describe('analyzeLevels', () => {
  it('da el micrófono por bueno con poco ruido y buen nivel', () => {
    const result = analyzeLevels(QUIET_ROOM, GOOD_PLAYING);

    expect(result.noiseLevel).toBeCloseTo(0.002, 5);
    expect(result.averageLevel).toBeCloseTo(0.08, 5);
    expect(result.isTooNoisy).toBe(false);
    expect(result.isTooLow).toBe(false);
    expect(result.isClipping).toBe(false);
  });

  it('avisa si hay mucho ruido de fondo', () => {
    const noisyRoom = frames(10, 0.02);
    expect(analyzeLevels(noisyRoom, GOOD_PLAYING).isTooNoisy).toBe(true);
  });

  it('avisa si la guitarra se oye muy baja', () => {
    const quietPlaying = frames(10, 0.015);
    expect(analyzeLevels(QUIET_ROOM, quietPlaying).isTooLow).toBe(true);
  });

  it('avisa si alguna muestra satura', () => {
    const playing = [...GOOD_PLAYING, { rms: 0.4, peak: 1 }];
    expect(analyzeLevels(QUIET_ROOM, playing).isClipping).toBe(true);
  });

  it('no cuenta los silencios entre golpes al calcular el nivel', () => {
    // Mitad de fotogramas sonando y mitad con la cuerda ya apagada.
    const playing = [...frames(5, 0.08), ...frames(5, 0.001)];
    const result = analyzeLevels(QUIET_ROOM, playing);

    expect(result.averageLevel).toBeCloseTo(0.08, 5);
    expect(result.isTooLow).toBe(false);
  });

  it('da el nivel por bajo si no se ha tocado nada', () => {
    const result = analyzeLevels(QUIET_ROOM, QUIET_ROOM);

    expect(result.averageLevel).toBe(0);
    expect(result.isTooLow).toBe(true);
  });
});

describe('describeLevels', () => {
  it('da un solo mensaje positivo si todo está bien', () => {
    const messages = describeLevels(analyzeLevels(QUIET_ROOM, GOOD_PLAYING));

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('bien');
  });

  it('da un mensaje por cada problema', () => {
    const result = { isTooNoisy: true, isTooLow: true, isClipping: false };
    expect(describeLevels(result)).toHaveLength(2);
  });
});
