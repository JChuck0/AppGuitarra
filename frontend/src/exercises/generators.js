// Generadores de ejercicios. A partir del tipo de ejercicio y sus parámetros
// (los del JSON de contenido) crean lo que el usuario tiene que tocar.
//
// Esta primera parte es la de los ejercicios de respuesta (oído y teoría):
// cada generador devuelve las 8 preguntas de una ronda. Cada pregunta es:
// { type, mode, text, expectedMidi, hintPositions, zone, playMidi }
// - mode: 'note' si se contesta con una nota y 'chord' si con un acorde;
// - expectedMidi: alturas que valen como acierto;
// - hintPositions: posiciones que se marcan en el mástil al corregir;
// - zone: cuerdas y trastes de la pista que se ve antes de contestar;
// - playMidi: notas que toca la app antes de la pregunta (ejercicios de oído).
//
// Todos reciben "random" (por defecto Math.random) para poder pasarles en
// los tests una función que siempre dé los mismos números.

import { findPositions, MAX_FRET, STRINGS } from '../music/fretboard.js';
import { getVoicingNotes, OPEN_VOICINGS, getChordName } from '../music/chords.js';
import { getScaleInFretRange, SCALES } from '../music/scales.js';
import { getDegree, DEGREE_SEMITONES } from '../music/intervals.js';
import { NOTE_NAMES, getPitchClass, toSpanishName } from '../music/notes.js';
import { RESPONSE_PROFILE } from '../evaluation/profiles.js';

const NATURAL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ALTERED_NOTES = ['C#', 'D#', 'F#', 'G#', 'A#'];

// Con "naturales: false" la mayoría de preguntas son de notas con alteración.
const ALTERED_SHARE = 0.75;

// Intentos máximos para completar una ronda sin repetir pregunta seguida.
// Evita un bucle infinito si los parámetros solo permiten una pregunta.
const MAX_ATTEMPTS = 100;

// La posición 1 de una escala empieza en la tónica de la cuerda 6 y ocupa
// 4 trastes (la pentatónica menor de La va del 5 al 8).
const SCALE_POSITION_WIDTH = 3;

// Cómo se llama cada grado en las preguntas.
const DEGREE_LABELS = {
  '1': 'raíz',
  '3': 'tercera mayor',
  'b3': 'tercera menor',
  '5': 'quinta',
  'b7': 'séptima menor',
};

// ---------- Utilidades ----------

function pickRandom(list, random) {
  return list[Math.floor(random() * list.length)];
}

// Elige un elemento distinto del anterior (si se puede).
function pickDifferent(list, previous, random) {
  const options = list.length > 1 ? list.filter((item) => item !== previous) : list;
  return pickRandom(options, random);
}

function isSameQuestion(a, b) {
  return a.text === b.text && a.expectedMidi.join() === b.expectedMidi.join();
}

// Crea las preguntas de una ronda llamando a createQuestion hasta tener 8,
// sin repetir la misma pregunta dos veces seguidas. createQuestion puede
// devolver null si con lo que ha elegido al azar no sale una pregunta válida.
function buildRound(createQuestion) {
  const questions = [];
  let attempts = 0;

  while (questions.length < RESPONSE_PROFILE.questionsPerRound && attempts < MAX_ATTEMPTS) {
    attempts++;
    const question = createQuestion();
    const previous = questions[questions.length - 1];
    if (question === null || (previous !== undefined && isSameQuestion(previous, question))) {
      continue;
    }
    questions.push(question);
  }

  return questions;
}

// Nombre de una nota para mostrarlo: 'C#' se muestra como 'Do# / Reb'.
function formatNoteName(name) {
  if (!name.includes('#')) {
    return toSpanishName(name);
  }
  const nextNatural = NOTE_NAMES[(getPitchClass(name) + 1) % 12];
  return `${toSpanishName(name)} / ${toSpanishName(nextNatural)}b`;
}

function pickNoteName(onlyNaturals, random) {
  if (onlyNaturals || random() >= ALTERED_SHARE) {
    return pickRandom(NATURAL_NOTES, random);
  }
  return pickRandom(ALTERED_NOTES, random);
}

function getFretRange(params) {
  return params.trastes ?? [0, MAX_FRET];
}

function toHint({ string, fret }) {
  return { string, fret };
}

// ---------- note_finding ----------

// "Toca el Sol en la cuerda 6". Si la nota está dos veces en la zona
// (al aire y en el traste 12) valen las dos.
function createNoteFindingQuestion(params, random) {
  const string = pickRandom(params.cuerdas, random);
  const [minFret, maxFret] = getFretRange(params);
  const name = pickNoteName(params.naturales !== false, random);
  const positions = findPositions(name, [string], maxFret).filter((position) => position.fret >= minFret);

  if (positions.length === 0) {
    return null;
  }

  return {
    type: 'note_finding',
    mode: 'note',
    text: `Toca el ${formatNoteName(name)} en la cuerda ${string}`,
    expectedMidi: positions.map((position) => position.midi),
    hintPositions: positions.map(toHint),
    zone: { strings: [string], minFret, maxFret },
    playMidi: null,
  };
}

export function generateNoteFinding(params, random = Math.random) {
  return buildRound(() => createNoteFindingQuestion(params, random));
}

// ---------- ear_echo ----------

// La app toca una nota de la zona y el usuario la repite. Aquí sí importa la
// octava, porque la ha oído, así que solo vale esa altura.
function createEarEchoQuestion(params, random) {
  const [minFret, maxFret] = getFretRange(params);
  const name = pickNoteName(params.naturales !== false, random);
  const positions = findPositions(name, params.cuerdas, maxFret).filter((position) => position.fret >= minFret);

  if (positions.length === 0) {
    return null;
  }

  const position = pickRandom(positions, random);
  return {
    type: 'ear_echo',
    mode: 'note',
    text: 'Escucha la nota y repítela en la guitarra',
    expectedMidi: [position.midi],
    hintPositions: [toHint(position)],
    zone: { strings: params.cuerdas, minFret, maxFret },
    playMidi: [position.midi],
  };
}

export function generateEarEcho(params, random = Math.random) {
  return buildRound(() => createEarEchoQuestion(params, random));
}

// ---------- chord_note_by_note ----------

// Notas del voicing de un acorde con su grado, de grave a agudo.
function getChordNotesWithDegree(chordId) {
  const root = OPEN_VOICINGS[chordId].root;
  return getVoicingNotes(chordId).map((note) => ({
    ...note,
    degree: getDegree(root, NOTE_NAMES[note.midi % 12]),
  }));
}

function createChordNoteQuestion(chordId, note, text) {
  return {
    type: 'chord_note_by_note',
    mode: 'note',
    text,
    expectedMidi: [note.midi],
    hintPositions: [toHint(note)],
    zone: { strings: [note.string], minFret: note.fret, maxFret: note.fret },
    playMidi: null,
    chord: chordId,
  };
}

// Sin "grados" se piden todas las notas de un acorde, de la cuerda más grave
// a la más aguda, y después las del siguiente acorde hasta llegar a 8.
// Con "grados" cada pregunta es un acorde al azar y una nota de ese grado
// ("Toca la raíz del Am en la cuerda 5").
export function generateChordNoteByNote(params, random = Math.random) {
  if (params.grados !== undefined) {
    return generateChordDegrees(params, random);
  }

  const questions = [];
  let previousChord = null;

  while (questions.length < RESPONSE_PROFILE.questionsPerRound) {
    const chordId = pickDifferent(params.acordes, previousChord, random);
    previousChord = chordId;

    for (const note of getChordNotesWithDegree(chordId)) {
      if (questions.length === RESPONSE_PROFILE.questionsPerRound) {
        break;
      }
      questions.push(createChordNoteQuestion(chordId, note, `Toca la nota de la cuerda ${note.string} del ${chordId}`));
    }
  }

  return questions;
}

function generateChordDegrees(params, random) {
  let previousChord = null;

  return buildRound(() => {
    const chordId = pickDifferent(params.acordes, previousChord, random);
    const notes = getChordNotesWithDegree(chordId).filter((note) => params.grados.includes(note.degree));
    if (notes.length === 0) {
      return null;
    }

    previousChord = chordId;
    const note = pickRandom(notes, random);
    const label = DEGREE_LABELS[note.degree] ?? `nota de grado ${note.degree}`;
    return createChordNoteQuestion(chordId, note, `Toca la ${label} del ${chordId} en la cuerda ${note.string}`);
  });
}

// ---------- scale_map ----------

// Trastes de una posición de la escala. De momento solo hace falta la
// posición 1.
export function getScalePositionFrets(tonic, position) {
  if (position !== 1) {
    throw new Error(`Posición de escala no disponible: ${position}`);
  }
  const rootFret = findPositions(tonic, [6])[0].fret;
  return [rootFret, rootFret + SCALE_POSITION_WIDTH];
}

// Se ve el mapa de la escala (con la tónica marcada) y se pide una nota en
// una cuerda. Con "solo_tonica" siempre se pide la tónica.
function createScaleMapQuestion(params, random) {
  const tonic = pickRandom(params.tonicas ?? [params.tonica], random);
  const [minFret, maxFret] = getScalePositionFrets(tonic, params.posicion ?? 1);
  const map = getScaleInFretRange(tonic, params.escala, minFret, maxFret);
  const candidates = params.solo_tonica ? map.filter((position) => position.isRoot) : map;
  const target = pickRandom(candidates, random);

  const scaleName = `${SCALES[params.escala].name.toLowerCase()} de ${toSpanishName(tonic)}`;
  const what = target.isRoot ? 'la tónica' : `el ${toSpanishName(NOTE_NAMES[target.midi % 12])}`;

  return {
    type: 'scale_map',
    mode: 'note',
    text: `Toca ${what} de la ${scaleName} en la cuerda ${target.string}`,
    expectedMidi: [target.midi],
    hintPositions: map.map((position) => ({ ...toHint(position), isRoot: position.isRoot })),
    zone: { strings: STRINGS, minFret, maxFret },
    playMidi: null,
  };
}

export function generateScaleMap(params, random = Math.random) {
  return buildRound(() => createScaleMapQuestion(params, random));
}

// ---------- ear_identify ----------

// La app toca uno de los dos acordes de un par (por ejemplo La o Lam) y el
// usuario contesta tocando el que ha oído. Se guarda la tercera de los dos
// acordes, que es la nota que los diferencia.
function createEarIdentifyQuestion(params, random) {
  const pair = pickRandom(params.pares, random);
  const chordId = pickRandom(pair, random);
  const { root, type } = OPEN_VOICINGS[chordId];
  const third = type === 'minor' ? 'b3' : '3';
  const otherThird = third === 'b3' ? '3' : 'b3';
  const notes = getVoicingNotes(chordId);
  const midis = notes.map((note) => note.midi);

  return {
    type: 'ear_identify',
    mode: 'chord',
    text: `Escucha el acorde: ¿es ${pair[0]} o ${pair[1]}? Tócalo en la guitarra`,
    expectedMidi: midis,
    hintPositions: notes.map(toHint),
    zone: null,
    playMidi: midis,
    chord: getChordName(root, type),
    thirdPitchClass: (getPitchClass(root) + DEGREE_SEMITONES[third]) % 12,
    otherThirdPitchClass: (getPitchClass(root) + DEGREE_SEMITONES[otherThird]) % 12,
  };
}

export function generateEarIdentify(params, random = Math.random) {
  return buildRound(() => createEarIdentifyQuestion(params, random));
}

// ---------- Todos los tipos ----------

const RESPONSE_GENERATORS = {
  note_finding: generateNoteFinding,
  chord_note_by_note: generateChordNoteByNote,
  scale_map: generateScaleMap,
  ear_identify: generateEarIdentify,
  ear_echo: generateEarEcho,
};

// Genera las preguntas de un ejercicio de respuesta.
// Recibe el tipo ('note_finding'...) y los parámetros del ejercicio.
export function generateQuestions(type, params, random = Math.random) {
  const generator = RESPONSE_GENERATORS[type];
  if (generator === undefined) {
    throw new Error(`Tipo de ejercicio sin generador de preguntas: ${type}`);
  }
  return generator(params, random);
}
