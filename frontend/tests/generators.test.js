import { describe, it, expect } from 'vitest';
import {
  generateNoteFinding, generateEarEcho, generateChordNoteByNote, generateScaleMap,
  generateEarIdentify, generateQuestions, getScalePositionFrets,
} from '../src/exercises/generators.js';
import { getMidiAt } from '../src/music/fretboard.js';

// Función "aleatoria" que siempre devuelve la misma serie de números, para
// que los tests den siempre el mismo resultado.
function createSequence(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

const NATURAL_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];

function expectNoConsecutiveRepeats(questions) {
  for (let i = 1; i < questions.length; i++) {
    const same = questions[i].text === questions[i - 1].text
      && questions[i].expectedMidi.join() === questions[i - 1].expectedMidi.join();
    expect(same).toBe(false);
  }
}

describe('note_finding', () => {
  const params = { cuerdas: [6], trastes: [0, 12], naturales: true };

  it('devuelve 8 preguntas de notas naturales de la cuerda pedida', () => {
    const questions = generateNoteFinding(params);

    expect(questions).toHaveLength(8);
    for (const question of questions) {
      expect(question.mode).toBe('note');
      expect(question.text).toContain('cuerda 6');
      question.hintPositions.forEach((position) => {
        expect(position.string).toBe(6);
        expect(getMidiAt(6, position.fret)).toBe(question.expectedMidi[question.hintPositions.indexOf(position)]);
      });
      question.expectedMidi.forEach((midi) => expect(NATURAL_PITCH_CLASSES).toContain(midi % 12));
    }
  });

  it('no repite la misma pregunta dos veces seguidas', () => {
    // Una serie que haría salir siempre la misma nota si no se controlara.
    expectNoConsecutiveRepeats(generateNoteFinding(params, createSequence([0.1, 0.1, 0.5])));
  });

  it('el Mi de la cuerda 6 vale al aire y en el traste 12', () => {
    const [question] = generateNoteFinding(params, createSequence([0, 0.3]));

    expect(question.text).toBe('Toca el Mi en la cuerda 6');
    expect(question.expectedMidi).toEqual([40, 52]);
  });

  it('con naturales: false también salen notas con alteración, con los dos nombres', () => {
    const questions = generateNoteFinding({ cuerdas: [6, 5], trastes: [0, 12], naturales: false }, createSequence([0.2, 0.1, 0.4, 0.6]));
    const altered = questions.filter((question) => question.text.includes('#'));

    expect(altered.length).toBeGreaterThan(0);
    expect(altered[0].text).toMatch(/Toca el \w+# \/ \w+b en la cuerda/);
  });

  it('respeta la zona de trastes', () => {
    const questions = generateNoteFinding({ cuerdas: [5], trastes: [5, 9], naturales: true });
    for (const question of questions) {
      question.hintPositions.forEach((position) => {
        expect(position.fret).toBeGreaterThanOrEqual(5);
        expect(position.fret).toBeLessThanOrEqual(9);
      });
      expect(question.zone).toEqual({ strings: [5], minFret: 5, maxFret: 9 });
    }
  });
});

describe('ear_echo', () => {
  it('cada pregunta trae la nota que tiene que sonar y solo vale esa altura', () => {
    const questions = generateEarEcho({ cuerdas: [6], trastes: [0, 12], naturales: true });

    expect(questions).toHaveLength(8);
    for (const question of questions) {
      expect(question.playMidi).toHaveLength(1);
      expect(question.expectedMidi).toEqual(question.playMidi);
    }
    expectNoConsecutiveRepeats(questions);
  });
});

describe('chord_note_by_note', () => {
  it('pide las notas del acorde de la cuerda más grave a la más aguda', () => {
    const questions = generateChordNoteByNote({ acordes: ['Em', 'Am'] }, createSequence([0]));

    // Em tiene 6 cuerdas y después empiezan las de Am.
    expect(questions).toHaveLength(8);
    expect(questions.slice(0, 6).map((question) => question.expectedMidi[0])).toEqual([40, 47, 52, 55, 59, 64]);
    expect(questions[0].text).toBe('Toca la nota de la cuerda 6 del Em');
    expect(questions[6].chord).toBe('Am');
    expect(questions[6].text).toBe('Toca la nota de la cuerda 5 del Am');
  });

  it('con grados solo pide notas de ese grado', () => {
    const questions = generateChordNoteByNote({ acordes: ['Em', 'Am', 'E', 'A', 'D'], grados: ['1'] });

    expect(questions).toHaveLength(8);
    for (const question of questions) {
      expect(question.text).toMatch(/^Toca la raíz del/);
    }
    // La raíz del D en la cuerda 4 es el Re3.
    const d = questions.find((question) => question.chord === 'D' && question.text.endsWith('cuerda 4'));
    if (d !== undefined) {
      expect(d.expectedMidi).toEqual([50]);
    }
  });

  it('tercera mayor y menor: en E se pide la 3 y en Em la b3', () => {
    const params = { acordes: ['E', 'Em'], grados: ['3', 'b3'] };
    const questions = generateChordNoteByNote(params);

    for (const question of questions) {
      const expectedText = question.chord === 'E' ? 'tercera mayor' : 'tercera menor';
      expect(question.text).toContain(expectedText);
    }
    // Sol# (8) en E y Sol (7) en Em.
    questions.forEach((question) => expect(question.expectedMidi[0] % 12).toBe(question.chord === 'E' ? 8 : 7));
  });
});

describe('scale_map', () => {
  it('la posición 1 empieza en la tónica de la cuerda 6', () => {
    expect(getScalePositionFrets('A', 1)).toEqual([5, 8]);
    expect(getScalePositionFrets('E', 1)).toEqual([0, 3]);
    expect(getScalePositionFrets('G', 1)).toEqual([3, 6]);
  });

  it('con solo_tonica todas las preguntas son de la tónica y el mapa la marca', () => {
    const questions = generateScaleMap({ escala: 'minor_pentatonic', tonicas: ['A', 'E', 'G'], posicion: 1, solo_tonica: true });

    expect(questions).toHaveLength(8);
    for (const question of questions) {
      expect(question.text).toMatch(/^Toca la tónica de la pentatónica menor de (La|Mi|Sol) en la cuerda \d$/);
      expect(question.hintPositions.some((position) => position.isRoot)).toBe(true);
    }
  });

  it('el mapa de la pentatónica de La tiene 12 notas entre los trastes 5 y 8', () => {
    const [question] = generateScaleMap({ escala: 'minor_pentatonic', tonica: 'A', posicion: 1 });

    expect(question.hintPositions).toHaveLength(12);
    expect(question.zone).toMatchObject({ minFret: 5, maxFret: 8 });
  });

  it('una posición que no existe da error', () => {
    expect(() => getScalePositionFrets('A', 4)).toThrow();
  });
});

describe('ear_identify', () => {
  it('cada pregunta toca un acorde del par y guarda las dos terceras', () => {
    const questions = generateEarIdentify({ pares: [['A', 'Am'], ['E', 'Em'], ['D', 'Dm']] });

    expect(questions).toHaveLength(8);
    for (const question of questions) {
      expect(question.mode).toBe('chord');
      expect(question.playMidi.length).toBeGreaterThanOrEqual(4);
      expect(question.thirdPitchClass).not.toBe(question.otherThirdPitchClass);
    }
  });

  it('en A la tercera es Do# y la del otro acorde Do', () => {
    const [question] = generateEarIdentify({ pares: [['A', 'Am']] }, () => 0);

    expect(question.chord).toBe('A');
    expect(question.thirdPitchClass).toBe(1);
    expect(question.otherThirdPitchClass).toBe(0);
  });
});

describe('generateQuestions', () => {
  it('elige el generador según el tipo del ejercicio', () => {
    const questions = generateQuestions('note_finding', { cuerdas: [5], trastes: [0, 12], naturales: true });
    expect(questions[0].type).toBe('note_finding');
  });

  it('un tipo sin generador de preguntas da error', () => {
    expect(() => generateQuestions('chord_strike', {})).toThrow();
  });
});
