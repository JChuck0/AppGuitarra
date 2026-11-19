import { describe, it, expect } from 'vitest';
import { buildEvents, applyLatency, getFramesAfterOnset, TAKE_MODE } from '../src/audio/events.js';
import { midiToFrequency } from '../src/music/notes.js';

const FRAME_SEC = 0.016;

// Fotogramas de una toma de notas sueltas. Cada golpe tiene un tiempo y una
// nota MIDI. Durante los primeros "lagSec" después del golpe se sigue leyendo
// la nota anterior, como pasa de verdad porque el buffer del afinador todavía
// tiene el final de la nota de antes.
function simulateMono(durationSec, hits, { lagSec = 0.04, clarity = 0.97 } = {}) {
  const frames = [];
  for (let time = 0; time < durationSec; time += FRAME_SEC) {
    let rms = 0.002;
    let frequency = 0;
    let frameClarity = 0.2;
    hits.forEach((hit, i) => {
      if (time >= hit.time) {
        rms = Math.max(rms, 0.2 * Math.exp(-(time - hit.time) * 3));
        const lagging = time < hit.time + lagSec && i > 0;
        frequency = midiToFrequency(lagging ? hits[i - 1].midi : hit.midi);
        frameClarity = clarity;
      }
    });
    frames.push({ time, rms, frequency, clarity: frameClarity });
  }
  return frames;
}

// Fotogramas de una toma de acordes. "hits" lleva el tiempo y las notas que
// deberían aparecer como picos después del golpe.
function simulateChords(durationSec, hits) {
  const frames = [];
  for (let time = 0; time < durationSec; time += FRAME_SEC) {
    let rms = 0.002;
    let peaks = [];
    for (const hit of hits) {
      if (time >= hit.time) {
        rms = Math.max(rms, 0.2 * Math.exp(-(time - hit.time) * 2));
        peaks = hit.midi.map(midiToFrequency);
      }
    }
    frames.push({ time, rms, peaks });
  }
  return frames;
}

describe('buildEvents en modo notas sueltas', () => {
  const hits = [
    { time: 0.5, midi: 45 },  // La2
    { time: 1.25, midi: 48 }, // Do3
    { time: 2.0, midi: 50 },  // Re3
  ];

  it('da un evento por golpe, con su momento y su nota', () => {
    const events = buildEvents(simulateMono(3, hits), TAKE_MODE.MONO);

    expect(events).toHaveLength(3);
    events.forEach((event, i) => {
      expect(Math.abs(event.time - hits[i].time)).toBeLessThan(FRAME_SEC * 2);
      expect(event.midi).toEqual([hits[i].midi]);
    });
  });

  it('no se confunde con la nota anterior que queda en el buffer', () => {
    const events = buildEvents(simulateMono(3, hits, { lagSec: 0.06 }), TAKE_MODE.MONO);
    expect(events.map((event) => event.midi[0])).toEqual([45, 48, 50]);
  });

  it('con una nota estable la confianza es alta', () => {
    const events = buildEvents(simulateMono(3, hits, { lagSec: 0 }), TAKE_MODE.MONO);
    events.forEach((event) => expect(event.confidence).toBeGreaterThan(0.9));
  });

  it('si Pitchy no da lecturas fiables, el evento no tiene nota y la confianza es 0', () => {
    const events = buildEvents(simulateMono(2, [hits[0]], { clarity: 0.4 }), TAKE_MODE.MONO);

    expect(events).toHaveLength(1);
    expect(events[0].midi).toEqual([]);
    expect(events[0].confidence).toBe(0);
  });
});

describe('buildEvents en modo acordes', () => {
  const EM = [40, 47, 52, 55, 59, 64];
  const AM = [45, 52, 57, 60, 64];

  it('da un evento por golpe con todas las notas del acorde', () => {
    const frames = simulateChords(3, [{ time: 0.5, midi: EM }, { time: 1.8, midi: AM }]);
    const events = buildEvents(frames, TAKE_MODE.CHORD);

    expect(events).toHaveLength(2);
    expect(events[0].midi).toEqual(EM);
    expect(events[1].midi).toEqual(AM);
    expect(events[0].confidence).toBeGreaterThan(0.9);
  });

  it('una nota que solo aparece en algún fotograma suelto no cuenta', () => {
    const frames = simulateChords(2, [{ time: 0.5, midi: EM }]);
    // Un pico de ruido (Fa3) en un solo fotograma después del golpe.
    const noisyFrame = frames.find((frame) => frame.time > 0.7);
    noisyFrame.peaks = [...noisyFrame.peaks, midiToFrequency(53)];

    const [event] = buildEvents(frames, TAKE_MODE.CHORD);
    expect(event.midi).toEqual(EM);
  });

  it('si falta una cuerda, su nota no aparece', () => {
    const withoutString2 = EM.filter((note) => note !== 59);
    const [event] = buildEvents(simulateChords(2, [{ time: 0.5, midi: withoutString2 }]), TAKE_MODE.CHORD);
    expect(event.midi).toEqual(withoutString2);
  });
});

describe('getFramesAfterOnset', () => {
  const frames = Array.from({ length: 20 }, (_, i) => ({ time: i * 0.05 }));
  const onset = { time: frames[4].time, index: 4 };

  it('devuelve los fotogramas de la ventana después del ataque', () => {
    const window = getFramesAfterOnset(frames, onset, null, 0.04, 0.19);
    expect(window).toEqual([frames[5], frames[6], frames[7]]);
  });

  it('no pasa del siguiente ataque', () => {
    const next = { time: frames[6].time, index: 6 };
    const window = getFramesAfterOnset(frames, onset, next, 0.04, 0.5);
    expect(window).toEqual([frames[5]]);
  });

  it('si la ventana queda vacía usa los fotogramas entre los dos ataques', () => {
    const next = { time: frames[5].time, index: 5 };
    const window = getFramesAfterOnset(frames, onset, next, 0.1, 0.3);
    expect(window).toEqual([frames[4]]);
  });
});

describe('applyLatency', () => {
  it('resta la latencia a todos los tiempos sin cambiar lo demás', () => {
    const events = [{ time: 1, midi: [40], confidence: 1 }];
    const [event] = applyLatency(events, 120);

    expect(event.time).toBeCloseTo(0.88, 5);
    expect(event.midi).toEqual([40]);
    expect(events[0].time).toBe(1); // no cambia la lista original
  });

  it('sin latencia calibrada deja los tiempos igual', () => {
    expect(applyLatency([{ time: 1, midi: [], confidence: 0 }], null)[0].time).toBe(1);
  });
});
