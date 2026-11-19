import { describe, it, expect, vi, afterEach } from 'vitest';
import { getBeatDuration, getBeatTimes, clampBpm, createMetronome } from '../src/audio/metronome.js';

describe('getBeatDuration', () => {
  it('a 60 BPM cada tiempo dura un segundo y a 120 medio', () => {
    expect(getBeatDuration(60)).toBe(1);
    expect(getBeatDuration(120)).toBe(0.5);
  });
});

describe('getBeatTimes', () => {
  it('reparte los tiempos de forma regular desde el inicio', () => {
    const times = getBeatTimes(80, 2, 4);

    expect(times).toHaveLength(4);
    expect(times[0]).toBe(2);
    expect(times[1]).toBeCloseTo(2.75, 5);
    expect(times[3]).toBeCloseTo(4.25, 5);
  });

  it('sin tiempos devuelve una lista vacía', () => {
    expect(getBeatTimes(80, 0, 0)).toEqual([]);
  });
});

describe('clampBpm', () => {
  it('deja el tempo dentro del rango permitido', () => {
    expect(clampBpm(10)).toBe(40);
    expect(clampBpm(500)).toBe(220);
    expect(clampBpm(80.4)).toBe(80);
  });

  it('devuelve null si no es un número', () => {
    expect(clampBpm(NaN)).toBeNull();
  });
});

// AudioContext falso: no suena nada, solo apunta cuándo se programa cada
// clic y con qué frecuencia. El reloj (currentTime) se avanza a mano.
function createFakeAudioContext() {
  const clicks = [];
  const fakeNode = () => ({ connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } });

  return {
    currentTime: 0,
    destination: {},
    clicks,
    createGain: fakeNode,
    createOscillator() {
      const oscillator = { ...fakeNode(), frequency: { value: 0 }, stop() {} };
      oscillator.start = (time) => clicks.push({ time, frequency: oscillator.frequency.value });
      return oscillator;
    },
  };
}

// Avanza el reloj del audio y los temporizadores a la vez.
function advance(context, seconds) {
  const steps = Math.round(seconds / 0.025);
  for (let i = 0; i < steps; i++) {
    context.currentTime += 0.025;
    vi.advanceTimersByTime(25);
  }
}

describe('createMetronome', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('programa los clics en los tiempos exactos y acentúa el primero del compás', () => {
    vi.useFakeTimers();
    const context = createFakeAudioContext();
    const metronome = createMetronome(context);

    const startTime = metronome.start({ bpm: 120 });
    advance(context, 2.1);
    metronome.stop();

    const times = context.clicks.map((click) => click.time);
    const expected = getBeatTimes(120, startTime, times.length);
    times.forEach((time, i) => expect(time).toBeCloseTo(expected[i], 5));
    expect(context.clicks[0].frequency).toBeGreaterThan(context.clicks[1].frequency);
    expect(context.clicks[4].frequency).toBe(context.clicks[0].frequency);
  });

  it('con beats se para solo después de ese número de clics', () => {
    vi.useFakeTimers();
    const context = createFakeAudioContext();
    const metronome = createMetronome(context);

    metronome.start({ bpm: 120, beats: 3 });
    advance(context, 3);

    expect(context.clicks).toHaveLength(3);
    expect(metronome.isRunning()).toBe(false);
  });
});
