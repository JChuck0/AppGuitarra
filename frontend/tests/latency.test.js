import { describe, it, expect } from 'vitest';
import { calculateLatency, pairClicksWithOnsets, median } from '../src/audio/latency.js';
import { getBeatTimes } from '../src/audio/metronome.js';

// 8 clics a 80 BPM empezando en el segundo 1.
const CLICKS = getBeatTimes(80, 1, 8);

// Ataques con un retraso fijo (en ms) respecto a cada clic.
function delayed(clicks, delayMs) {
  return clicks.map((click) => click + delayMs / 1000);
}

describe('median', () => {
  it('con un número impar de valores devuelve el del medio', () => {
    expect(median([30, 10, 20])).toBe(20);
  });

  it('con un número par devuelve la media de los dos del medio', () => {
    expect(median([10, 40, 20, 30])).toBe(25);
  });

  it('sin valores devuelve null', () => {
    expect(median([])).toBeNull();
  });
});

describe('pairClicksWithOnsets', () => {
  it('empareja cada clic con su ataque y devuelve la diferencia en ms', () => {
    const differences = pairClicksWithOnsets(CLICKS, delayed(CLICKS, 120));

    expect(differences).toHaveLength(8);
    differences.forEach((difference) => expect(difference).toBeCloseTo(120, 5));
  });

  it('no empareja ataques que están demasiado lejos del clic', () => {
    expect(pairClicksWithOnsets([1], [1.4])).toEqual([]);
  });

  it('no usa el mismo ataque para dos clics', () => {
    expect(pairClicksWithOnsets([1, 1.2], [1.1])).toHaveLength(1);
  });
});

describe('calculateLatency', () => {
  it('caso normal: devuelve el retraso de los golpes', () => {
    expect(calculateLatency(CLICKS, delayed(CLICKS, 120))).toBe(120);
  });

  it('un golpe que se escapa casi no cambia el resultado', () => {
    const onsets = delayed(CLICKS, 100);
    onsets[3] += 0.13; // un golpe muy tarde (230 ms)

    expect(calculateLatency(CLICKS, onsets)).toBe(100);
  });

  it('con menos de 5 golpes detectados devuelve null', () => {
    const onsets = delayed(CLICKS, 100).slice(0, 4);
    expect(calculateLatency(CLICKS, onsets)).toBeNull();
  });

  it('sin datos devuelve null', () => {
    expect(calculateLatency(CLICKS, [])).toBeNull();
  });

  it('si la persona se adelanta mucho, la latencia se deja en 0', () => {
    expect(calculateLatency(CLICKS, delayed(CLICKS, -50))).toBe(0);
  });
});
