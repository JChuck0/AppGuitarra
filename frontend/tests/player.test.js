import { describe, it, expect } from 'vitest';
import { createPlayer } from '../src/audio/player.js';
import { midiToFrequency } from '../src/music/notes.js';

// AudioContext falso: apunta cada nota que se programa (cuándo empieza,
// cuándo acaba y con qué frecuencia).
function createFakeAudioContext() {
  const notes = [];
  const gainParam = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };

  return {
    currentTime: 10,
    destination: {},
    notes,
    createGain: () => ({ connect() {}, gain: gainParam }),
    createOscillator() {
      const note = {};
      return {
        type: '',
        frequency: { value: 0 },
        connect() {},
        start(time) {
          note.start = time;
          note.frequency = this.frequency.value;
          notes.push(note);
        },
        stop(time) {
          note.stop = time;
        },
      };
    },
  };
}

describe('createPlayer', () => {
  it('playNote toca la frecuencia de la nota y dice cuándo acaba', () => {
    const context = createFakeAudioContext();
    const end = createPlayer(context).playNote(45, 1);

    expect(context.notes).toHaveLength(1);
    expect(context.notes[0].frequency).toBeCloseTo(110, 5);
    expect(context.notes[0].start).toBeGreaterThan(10);
    expect(end).toBeCloseTo(context.notes[0].stop, 5);
  });

  it('playChord toca todas las notas de grave a agudo, un poco separadas', () => {
    const context = createFakeAudioContext();
    createPlayer(context).playChord([64, 40, 52]);

    const frequencies = context.notes.map((note) => note.frequency);
    expect(frequencies).toEqual([40, 52, 64].map(midiToFrequency));
    expect(context.notes[1].start).toBeGreaterThan(context.notes[0].start);
    expect(context.notes[2].start).toBeGreaterThan(context.notes[1].start);
  });
});
