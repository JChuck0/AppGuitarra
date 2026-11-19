import { describe, it, expect } from 'vitest';
import { detectOnsets, measureRecentRms } from '../src/audio/onsets.js';

// Fotogramas cada 16 ms (unos 60 por segundo, como requestAnimationFrame).
const FRAME_SEC = 0.016;

// Señal simulada: silencio con un poco de ruido y, en cada golpe, el volumen
// sube de golpe y va bajando mientras la cuerda se apaga.
function simulateSignal(durationSec, hitTimes, { noise = 0.002, peak = 0.2 } = {}) {
  const frames = [];
  for (let time = 0; time < durationSec; time += FRAME_SEC) {
    let rms = noise;
    for (const hit of hitTimes) {
      if (time >= hit) {
        rms = Math.max(rms, peak * Math.exp(-(time - hit) * 3));
      }
    }
    frames.push({ time, rms });
  }
  return frames;
}

describe('detectOnsets', () => {
  it('encuentra un ataque por cada golpe, cerca de su momento', () => {
    const hits = [0.5, 1.25, 2.0];
    const onsets = detectOnsets(simulateSignal(3, hits));

    expect(onsets).toHaveLength(3);
    onsets.forEach((onset, i) => {
      expect(Math.abs(onset.time - hits[i])).toBeLessThan(FRAME_SEC * 2);
    });
  });

  it('no cuenta como ataque una cuerda que se va apagando', () => {
    const onsets = detectOnsets(simulateSignal(3, [0.5]));
    expect(onsets).toHaveLength(1);
  });

  it('no detecta nada en silencio con ruido de fondo', () => {
    expect(detectOnsets(simulateSignal(2, []))).toEqual([]);
  });

  it('un golpe que llega mientras suena el anterior también se detecta', () => {
    const onsets = detectOnsets(simulateSignal(2, [0.5, 0.9]));
    expect(onsets).toHaveLength(2);
  });

  // Limitación conocida: si el segundo golpe es mucho más flojo que lo que
  // todavía suena, el volumen apenas sube y no se detecta.
  it('un golpe muy flojo encima de una nota fuerte no se detecta', () => {
    const frames = simulateSignal(2, [0.5]);
    for (const frame of frames) {
      if (frame.time >= 0.6) {
        frame.rms *= 1.3;
      }
    }
    expect(detectOnsets(frames)).toHaveLength(1);
  });

  it('devuelve la posición del fotograma del ataque', () => {
    const frames = simulateSignal(1, [0.5]);
    const [onset] = detectOnsets(frames);
    expect(frames[onset.index].time).toBe(onset.time);
  });
});

describe('measureRecentRms', () => {
  it('mide solo las últimas muestras del buffer', () => {
    const samples = new Float32Array(2048);
    samples.fill(0.5, 1024); // la segunda mitad suena, la primera es silencio

    expect(measureRecentRms(samples, 1024)).toBeCloseTo(0.5, 5);
    expect(measureRecentRms(samples, 2048)).toBeLessThan(0.5);
  });
});
