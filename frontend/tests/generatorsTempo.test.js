import { describe, it, expect } from 'vitest';
import {
  generateTechniqueLoop, generateScaleRun, generateLick, generateArpeggioPattern,
  generateExpectedEvents, getNoteDurationSec,
} from '../src/exercises/generators.js';
import { getMidiAt } from '../src/music/fretboard.js';

function createSequence(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

function midis(events) {
  return events.map((event) => event.midi[0]);
}

function strings(events) {
  return events.map((event) => event.string);
}

describe('getNoteDurationSec', () => {
  it('a 60 BPM una negra dura 1 s y una corchea 0,5 s', () => {
    expect(getNoteDurationSec(60, 'negras')).toBe(1);
    expect(getNoteDurationSec(60, 'corcheas')).toBe(0.5);
  });

  it('a 70 BPM en corcheas cada nota dura unos 0,43 s', () => {
    expect(getNoteDurationSec(70, 'corcheas')).toBeCloseTo(0.4286, 3);
  });

  it('una figura desconocida da error', () => {
    expect(() => getNoteDurationSec(60, 'semicorcheas')).toThrow();
  });
});

describe('technique_loop', () => {
  it('pulsación alterna: la misma nota en corcheas durante 4 compases', () => {
    const params = { patron: 'pulsacion_alterna', cuerda: 6, traste: 0, figura: 'corcheas', compases: 4 };
    const events = generateTechniqueLoop(params, 70);

    expect(events).toHaveLength(32);
    events.forEach((event, i) => {
      expect(event.midi).toEqual([40]);
      expect(event.string).toBe(6);
      expect(event.time).toBeCloseTo(i * 60 / 70 / 2, 6);
    });
  });

  it('sin patrón se toma la pulsación alterna (contenido de prueba)', () => {
    const events = generateTechniqueLoop({ cuerda: 6, traste: 0, figura: 'corcheas', compases: 4 }, 70);
    expect(events).toHaveLength(32);
    expect(new Set(midis(events))).toEqual(new Set([40]));
  });

  it('araña: 4 trastes en cada cuerda subiendo y luego bajando', () => {
    const events = generateTechniqueLoop({ patron: 'arana', traste_inicio: 1, figura: 'corcheas' }, 60);

    expect(events).toHaveLength(48);
    expect(events.slice(0, 4).map((event) => event.fret)).toEqual([1, 2, 3, 4]);
    expect(strings(events.slice(0, 24))).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1]);
    expect(events[24].string).toBe(1);
    expect(events[24].fret).toBe(4);
    expect(events[47].string).toBe(6);
    expect(events[47].fret).toBe(1);
  });

  it('apagado y cruce alternan las cuerdas pedidas', () => {
    const muting = generateTechniqueLoop({ patron: 'apagado', cuerdas: [5, 4], traste: 0, figura: 'negras', compases: 4 }, 60);
    expect(muting).toHaveLength(16);
    expect(strings(muting).slice(0, 4)).toEqual([5, 4, 5, 4]);
    expect(muting[1].time).toBe(1);

    const crossing = generateTechniqueLoop({ patron: 'cruce', cuerdas: [4, 3], traste: 0, figura: 'corcheas', compases: 4 }, 80);
    expect(crossing).toHaveLength(32);
    expect(midis(crossing).slice(0, 4)).toEqual([50, 55, 50, 55]);
  });

  it('hammer-on y pull-off: traste bajo y alto 4 veces en cada cuerda', () => {
    const params = { patron: 'legato', legato: true, cuerdas: [4, 3], trastes: [5, 7], figura: 'corcheas' };
    const events = generateTechniqueLoop(params, 70);

    expect(midis(events)).toEqual([55, 57, 55, 57, 60, 62, 60, 62]);
  });

  it('cromático en 3 cuerdas empezando en el traste 5', () => {
    const events = generateTechniqueLoop({ patron: 'cromatico', cuerdas: [3, 2, 1], traste_inicio: 5, figura: 'corcheas' }, 70);

    expect(events).toHaveLength(24);
    expect(events[0]).toMatchObject({ string: 3, fret: 5, midi: [60] });
    expect(events[11]).toMatchObject({ string: 1, fret: 8 });
  });

  it('un patrón desconocido da error', () => {
    expect(() => generateTechniqueLoop({ patron: 'tapping', figura: 'corcheas' }, 70)).toThrow();
  });
});

describe('scale_run', () => {
  const params = { escala: 'minor_pentatonic', tonicas: ['A'], posicion: 1, direccion: 'sube_y_baja', figura: 'corcheas' };

  it('pentatónica de La en posición 1: 12 notas subiendo y 11 bajando', () => {
    const events = generateScaleRun(params, 70);

    expect(events).toHaveLength(23);
    expect(midis(events).slice(0, 12)).toEqual([45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72]);
    expect(events[11].midi).toEqual([72]);
    expect(events[22].midi).toEqual([45]);
    expect(events[22].time).toBeCloseTo(22 * 60 / 70 / 2, 6);
  });

  it('marca las tónicas y todas las notas están entre los trastes 5 y 8', () => {
    const events = generateScaleRun(params, 70);

    // La2, La3 y La4 al subir y otra vez al bajar
    expect(events.filter((event) => event.isRoot).map((event) => event.midi[0])).toEqual([45, 57, 69, 69, 57, 45]);
    events.forEach((event) => {
      expect(event.fret).toBeGreaterThanOrEqual(5);
      expect(event.fret).toBeLessThanOrEqual(8);
      expect(getMidiAt(event.string, event.fret)).toBe(event.midi[0]);
    });
  });

  it('con varias tónicas elige una al azar', () => {
    const multi = { ...params, tonicas: ['A', 'E', 'G'] };

    expect(generateScaleRun(multi, 80, () => 0)[0].midi).toEqual([45]);    // La2
    expect(generateScaleRun(multi, 80, () => 0.5)[0].midi).toEqual([40]);  // Mi2, cuerda al aire
    expect(generateScaleRun(multi, 80, () => 0.99)[0].midi).toEqual([43]); // Sol2
  });

  it('solo subiendo', () => {
    const events = generateScaleRun({ ...params, direccion: 'sube' }, 70);
    expect(events).toHaveLength(12);
  });
});

describe('lick', () => {
  it('frases escritas: una por compás, con silencio al final', () => {
    const params = {
      notas: ['A3', 'C4', 'D4'],
      frases: [['A3', 'C4', 'D4'], ['D4', 'C4', 'A3'], ['C4', 'D4', 'A3']],
      figura: 'negras',
    };
    const events = generateLick(params, 60);

    expect(events.map((event) => event.time)).toEqual([0, 1, 2, 4, 5, 6, 8, 9, 10]);
    expect(midis(events)).toEqual([57, 60, 62, 62, 60, 57, 60, 62, 57]);
    // En la posición 1 de la pentatónica de La
    expect(events[0]).toMatchObject({ string: 4, fret: 7 });
    expect(events[1]).toMatchObject({ string: 3, fret: 5 });
  });

  it('frases que terminan en la tónica: 4 frases de 4 notas, la última es La', () => {
    const params = { escala: 'minor_pentatonic', tonica: 'A', terminar_en_tonica: true, figura: 'corcheas' };
    const events = generateLick(params, 80, createSequence([0.3, 0.7, 0.2, 0.9, 0.1, 0.6]));
    const duration = getNoteDurationSec(80, 'corcheas');

    expect(events).toHaveLength(16);
    for (let phrase = 0; phrase < 4; phrase++) {
      const notes = events.slice(phrase * 4, phrase * 4 + 4);
      expect(notes[0].time).toBeCloseTo(phrase * 8 * duration, 6);
      expect(notes[3].midi[0] % 12).toBe(9);
      // Se pasa siempre a la nota de al lado: como mucho 5 semitonos
      for (let i = 1; i < 3; i++) {
        expect(Math.abs(notes[i].midi[0] - notes[i - 1].midi[0])).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe('arpeggio_pattern', () => {
  it('cuerda a cuerda: un compás por acorde, subiendo y bajando', () => {
    const params = { acordes: ['Em', 'Am', 'E', 'A', 'D'], patron: 'cuerda_a_cuerda', figura: 'corcheas' };
    const events = generateArpeggioPattern(params, 60);

    expect(events).toHaveLength(40);
    expect(strings(events.slice(0, 8))).toEqual([6, 5, 4, 3, 2, 1, 2, 3]);
    expect(strings(events.slice(8, 16))).toEqual([5, 4, 3, 2, 1, 2, 3, 4]);
    expect(strings(events.slice(32, 40))).toEqual([4, 3, 2, 1, 2, 3, 4, 3]);
    expect(events[8].chord).toBe('Am');
    expect(events[8].time).toBe(4);
  });

  it('bajo y 3 cuerdas agudas: el bajo cambia según el acorde', () => {
    const params = { acordes: ['G', 'C', 'D', 'Am'], patron: 'bajo_y_agudas', figura: 'corcheas' };
    const events = generateArpeggioPattern(params, 70);

    expect(events).toHaveLength(32);
    expect(strings(events.slice(0, 8))).toEqual([6, 3, 2, 1, 2, 3, 2, 1]);
    expect(events[0].midi).toEqual([43]);  // Sol2
    expect(events[8].string).toBe(5);       // Do: bajo en la cuerda 5
    expect(events[16].string).toBe(4);      // Re: bajo en la cuerda 4
  });

  it('un patrón desconocido da error', () => {
    expect(() => generateArpeggioPattern({ acordes: ['Em'], patron: 'otro', figura: 'corcheas' }, 60)).toThrow();
  });
});

describe('generateExpectedEvents', () => {
  it('elige el generador según el tipo', () => {
    const events = generateExpectedEvents('technique_loop', { cuerda: 6, traste: 0, figura: 'corcheas', compases: 1 }, 70);
    expect(events).toHaveLength(8);
  });

  it('un tipo que no es a tempo da error', () => {
    expect(() => generateExpectedEvents('note_finding', {}, 70)).toThrow();
  });
});
