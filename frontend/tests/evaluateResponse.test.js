import { describe, it, expect } from 'vitest';
import { evaluateAnswer, evaluateRound, ANSWER_RESULT } from '../src/evaluation/evaluateResponse.js';
import { generateNoteFinding, generateEarIdentify } from '../src/exercises/generators.js';
import { createMockEvents } from '../src/audio/mockAnalyzer.js';

const SOL_CUERDA_6 = { mode: 'note', expectedMidi: [43] }; // Sol2, traste 3

function detected(midi, confidence = 0.95) {
  return { time: 0, midi, confidence };
}

describe('evaluateAnswer', () => {
  it('la nota pedida es correcta', () => {
    expect(evaluateAnswer(SOL_CUERDA_6, detected([43]), 2000)).toBe(ANSWER_RESULT.CORRECT);
  });

  it('la misma nota en otra octava es un fallo de tipo octave', () => {
    expect(evaluateAnswer(SOL_CUERDA_6, detected([55]), 2000)).toBe(ANSWER_RESULT.OCTAVE);
    expect(evaluateAnswer(SOL_CUERDA_6, detected([31]), 2000)).toBe(ANSWER_RESULT.OCTAVE);
  });

  it('otra nota es wrong', () => {
    expect(evaluateAnswer(SOL_CUERDA_6, detected([44]), 2000)).toBe(ANSWER_RESULT.WRONG);
  });

  it('sin respuesta o pasado el tiempo máximo es timeout', () => {
    expect(evaluateAnswer(SOL_CUERDA_6, null, 15000)).toBe(ANSWER_RESULT.TIMEOUT);
    expect(evaluateAnswer(SOL_CUERDA_6, detected([43]), 15001)).toBe(ANSWER_RESULT.TIMEOUT);
    expect(evaluateAnswer(SOL_CUERDA_6, detected([]), 3000)).toBe(ANSWER_RESULT.TIMEOUT);
  });

  it('si valen dos alturas (al aire y traste 12), las dos son correctas', () => {
    const question = { mode: 'note', expectedMidi: [40, 52] };
    expect(evaluateAnswer(question, detected([40]), 1000)).toBe(ANSWER_RESULT.CORRECT);
    expect(evaluateAnswer(question, detected([52]), 1000)).toBe(ANSWER_RESULT.CORRECT);
  });

  describe('¿mayor o menor?', () => {
    // Siempre sale el primer acorde del par: Am.
    const [question] = generateEarIdentify({ pares: [['Am', 'A']] }, () => 0);

    it('tocar el acorde pedido es correcto', () => {
      expect(question.chord).toBe('Am');
      expect(evaluateAnswer(question, detected([45, 52, 57, 60, 64]), 3000)).toBe(ANSWER_RESULT.CORRECT);
    });

    it('tocar el otro acorde del par (con la otra tercera) es wrong', () => {
      expect(evaluateAnswer(question, detected([45, 52, 57, 61, 64]), 3000)).toBe(ANSWER_RESULT.WRONG);
    });

    it('si no suena la tercera tampoco vale', () => {
      expect(evaluateAnswer(question, detected([45, 52, 57, 64]), 3000)).toBe(ANSWER_RESULT.WRONG);
    });
  });
});

// Simula una ronda: el usuario contesta cada pregunta con lo que diga el
// simulador y tarda "elapsedMs" en cada respuesta.
function playRound(questions, scenario, { index, elapsedMs = 2500 } = {}) {
  const expected = questions.map((question, i) => ({ time: i, midi: [question.expectedMidi[0]] }));
  const events = createMockEvents(expected, scenario, { index });

  return questions.map((question, i) => {
    const event = events.find((item) => Math.round(item.time) === i) ?? null;
    return {
      result: evaluateAnswer(question, event, elapsedMs),
      elapsedMs,
      confidence: event?.confidence ?? 0,
    };
  });
}

describe('evaluateRound', () => {
  // Las 8 notas de la cuerda 6 sin el Mi (que vale al aire y en el traste
  // 12, y así una respuesta en otra octava daría acierto).
  const questions = [41, 43, 45, 47, 48, 50, 41, 43].map((midi) => ({ mode: 'note', expectedMidi: [midi] }));

  it('las preguntas del generador tienen la forma que espera la evaluación', () => {
    const generated = generateNoteFinding({ cuerdas: [6], trastes: [0, 12], naturales: true });
    expect(generated).toHaveLength(8);
    expect(evaluateAnswer(generated[0], detected([generated[0].expectedMidi[0]]), 1000)).toBe(ANSWER_RESULT.CORRECT);
  });

  it('una ronda de 8 aciertos es clean', () => {
    const round = evaluateRound(playRound(questions, 'perfect'));

    expect(round.correctCount).toBe(8);
    expect(round.verdict).toBe('clean');
    expect(round.averageResponseMs).toBe(2500);
  });

  it('una nota en otra octava da el error octave y la ronda sigue siendo clean con 7', () => {
    const answers = playRound(questions, 'octave', { index: 3 });
    const round = evaluateRound(answers);

    expect(answers[3].result).toBe(ANSWER_RESULT.OCTAVE);
    expect(round.errors.octave).toBe(1);
    expect(round.correctCount).toBe(7);
    expect(round.verdict).toBe('clean');
  });

  it('con 6 aciertos es almost y con menos not_clean', () => {
    const six = playRound(questions, 'perfect');
    six[0].result = ANSWER_RESULT.WRONG;
    six[1].result = ANSWER_RESULT.TIMEOUT;
    expect(evaluateRound(six).verdict).toBe('almost');

    six[2].result = ANSWER_RESULT.WRONG;
    expect(evaluateRound(six).verdict).toBe('not_clean');
  });

  it('con mucho ruido la ronda es inconclusive', () => {
    expect(evaluateRound(playRound(questions, 'noisy')).verdict).toBe('inconclusive');
  });

  it('si no se ha oído nada en toda la ronda es inconclusive', () => {
    const answers = questions.map(() => ({ result: ANSWER_RESULT.TIMEOUT, elapsedMs: 15000, confidence: 0 }));
    const round = evaluateRound(answers);

    expect(round.verdict).toBe('inconclusive');
    expect(round.averageResponseMs).toBeNull();
    expect(round.errors.timeout).toBe(8);
  });
});
