// Generadores de ejercicios. A partir del tipo de ejercicio y sus parámetros
// (los del JSON de contenido) crean lo que el usuario tiene que tocar.
//
// Hay dos grupos:
// - Ejercicios de respuesta (oído y teoría): cada generador devuelve las 8
//   preguntas de una ronda.
// - Ejercicios a tempo de notas sueltas (punteo y arpegios): cada generador
//   devuelve la lista de notas que hay que tocar con el metrónomo, cada una
//   con su tiempo. Están más abajo.
//
// Cada pregunta de los ejercicios de respuesta es:
// { type, mode, text, expectedMidi, hintPositions, zone, playMidi }
// - mode: 'note' si se contesta con una nota y 'chord' si con un acorde;
// - expectedMidi: alturas que valen como acierto;
// - hintPositions: posiciones que se marcan en el mástil al corregir;
// - zone: cuerdas y trastes de la pista que se ve antes de contestar;
// - playMidi: notas que toca la app antes de la pregunta (ejercicios de oído).
//
// Todos reciben "random" (por defecto Math.random) para poder pasarles en
// los tests una función que siempre dé los mismos números.

import { findPositions, getMidiAt, MAX_FRET, STRINGS, STANDARD_TUNING } from '../music/fretboard.js';
import { getVoicingNotes, OPEN_VOICINGS, getChordName } from '../music/chords.js';
import { getScaleInFretRange, SCALES } from '../music/scales.js';
import { getDegree, DEGREE_SEMITONES } from '../music/intervals.js';
import { NOTE_NAMES, getPitchClass, toSpanishName, noteToMidi } from '../music/notes.js';
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

// ======================================================================
// Ejercicios a tempo de notas sueltas (punteo y arpegios)
// ======================================================================
//
// Cada generador recibe los parámetros del ejercicio y el BPM de la toma, y
// devuelve la lista de notas que hay que tocar (ExpectedEvent):
// { time, midi: [nota], string, fret }
// El tiempo está en segundos y el 0 es el primer tiempo después de la
// cuenta atrás. Algunas notas llevan datos de más para pintarlas en el
// mástil (isRoot en las escalas, chord en los arpegios).
//
// Todos funcionan igual: primero se crea la secuencia de "huecos" de la
// figura (una corchea, una negra...) con la posición que se toca en cada
// uno, o null si en ese hueco no se toca nada. Después toExpectedEvents
// convierte cada hueco en un tiempo.

const BEATS_PER_BAR = 4;

// Notas que caben en un pulso según la figura.
const NOTES_PER_BEAT = {
  negras: 1,
  corcheas: 2,
};

// Variante de technique_loop si el ejercicio no dice ninguna (el contenido
// de prueba de la Caja 1 no la lleva).
const DEFAULT_TECHNIQUE_PATTERN = 'pulsacion_alterna';

// En los ejercicios cromáticos (araña) cada dedo pisa un traste: 4 trastes.
const CHROMATIC_FRETS = 4;

// En hammer-on y pull-off cada cuerda se toca 4 veces (traste bajo, alto,
// bajo, alto): 2 hammer-on y 1 pull-off entre medias.
const LEGATO_NOTES_PER_STRING = 4;

// Zona del mástil de las frases si el ejercicio no dice ninguna: la
// posición 1 de la pentatónica de La, que es la que se usa en la Caja 1.
const DEFAULT_LICK_FRETS = [5, 8];

// Frases de "frases que terminan en la tónica" y notas de cada frase antes
// de llegar a la tónica.
const LICK_PHRASES_PER_TAKE = 4;
const LICK_NOTES_BEFORE_TONIC = 3;

// Orden de las cuerdas en el arpegio "bajo y 3 cuerdas agudas". 'bass' es
// la cuerda más grave del acorde, que cambia de un acorde a otro.
const BASS_AND_TREBLE_ORDER = ['bass', 3, 2, 1, 2, 3, 2, 1];

// ---------- Tiempos ----------

function getNotesPerBeat(figure = 'negras') {
  const notesPerBeat = NOTES_PER_BEAT[figure];
  if (notesPerBeat === undefined) {
    throw new Error(`Figura no válida: ${figure}`);
  }
  return notesPerBeat;
}

// Huecos que hay en un compás de 4/4 (4 en negras y 8 en corcheas).
function getSlotsPerBar(params) {
  return BEATS_PER_BAR * getNotesPerBeat(params.figura);
}

// Duración de una nota de la figura en segundos.
// A 70 BPM en corcheas: 60 / 70 / 2 = 0,43 s.
export function getNoteDurationSec(bpm, figure) {
  return 60 / bpm / getNotesPerBeat(figure);
}

// Convierte la secuencia de huecos en ExpectedEvent. Si el ejercicio indica
// "compases", la secuencia se repite (o se corta) hasta llenarlos; si no,
// se toca una sola vez. Los huecos null son silencios: no generan evento
// pero el tiempo sigue avanzando.
function toExpectedEvents(slots, params, bpm) {
  const duration = getNoteDurationSec(bpm, params.figura);
  const totalSlots = params.compases !== undefined ? params.compases * getSlotsPerBar(params) : slots.length;
  const events = [];

  for (let i = 0; i < totalSlots; i++) {
    const slot = slots[i % slots.length];
    if (slot !== null) {
      const { midi, ...extra } = slot;
      events.push({ ...extra, time: i * duration, midi: [midi] });
    }
  }

  return events;
}

// Repite una secuencia hasta tener "length" elementos (o la corta).
function repeatToLength(list, length) {
  return Array.from({ length }, (_, i) => list[i % list.length]);
}

// Sube y vuelve a bajar sin repetir la nota de arriba: [1, 2, 3] da [1, 2, 3, 2, 1].
function upAndDown(list) {
  return [...list, ...list.slice(0, -1).reverse()];
}

function createPosition(string, fret) {
  return { string, fret, midi: getMidiAt(string, fret) };
}

// Busca dónde tocar una altura concreta: primero dentro de la zona del
// ejercicio y, si no está, en el traste más bajo donde se pueda.
function findPlayablePosition(midi, [minFret, maxFret]) {
  let fallback = null;

  for (const string of STRINGS) {
    const fret = midi - STANDARD_TUNING[string];
    if (fret < 0 || fret > MAX_FRET) {
      continue;
    }
    if (fret >= minFret && fret <= maxFret) {
      return createPosition(string, fret);
    }
    if (fallback === null || fret < fallback.fret) {
      fallback = createPosition(string, fret);
    }
  }

  if (fallback === null) {
    throw new Error(`Nota fuera del mástil: ${midi}`);
  }
  return fallback;
}

// ---------- technique_loop ----------

// La misma nota una y otra vez (pulsación alterna).
function createRepeatedNote(params) {
  return [createPosition(params.cuerda, params.traste ?? 0)];
}

// Una nota en cada cuerda, alternando (cruce de cuerdas y apagado: al pasar
// a la otra cuerda hay que apagar la anterior).
function createStringAlternation(params) {
  return params.cuerdas.map((string) => createPosition(string, params.traste ?? 0));
}

// Un dedo por traste en cada cuerda, de la cuerda más grave a la más aguda
// y vuelta atrás (araña y ejercicios cromáticos).
function createChromatic(strings, startFret) {
  const frets = Array.from({ length: CHROMATIC_FRETS }, (_, i) => startFret + i);
  const up = strings.flatMap((string) => frets.map((fret) => createPosition(string, fret)));
  return [...up, ...up.slice().reverse()];
}

// Hammer-on y pull-off entre dos trastes en cada cuerda.
function createLegato(params) {
  const [lowFret, highFret] = params.trastes;
  return params.cuerdas.flatMap((string) =>
    repeatToLength([createPosition(string, lowFret), createPosition(string, highFret)], LEGATO_NOTES_PER_STRING));
}

export function generateTechniqueLoop(params, bpm) {
  const pattern = params.patron ?? DEFAULT_TECHNIQUE_PATTERN;
  let slots;

  switch (pattern) {
    case 'pulsacion_alterna':
      slots = createRepeatedNote(params);
      break;
    case 'apagado':
    case 'cruce':
      slots = createStringAlternation(params);
      break;
    case 'arana':
      slots = createChromatic(STRINGS, params.traste_inicio);
      break;
    case 'cromatico':
      slots = createChromatic(params.cuerdas, params.traste_inicio);
      break;
    case 'legato':
      slots = createLegato(params);
      break;
    default:
      throw new Error(`Patrón de técnica no válido: ${pattern}`);
  }

  return toExpectedEvents(slots, params, bpm);
}

// ---------- scale_run ----------

// Notas de la escala en una posición, de grave a agudo, con su grado y si
// son la tónica (para marcarla en el mástil).
function getScaleBox(tonic, params) {
  const [minFret, maxFret] = getScalePositionFrets(tonic, params.posicion ?? 1);
  return getScaleInFretRange(tonic, params.escala, minFret, maxFret)
    .sort((a, b) => a.midi - b.midi);
}

function orderByDirection(notes, direction = 'sube_y_baja') {
  switch (direction) {
    case 'sube':
      return notes;
    case 'baja':
      return notes.slice().reverse();
    case 'sube_y_baja':
      return upAndDown(notes);
    default:
      throw new Error(`Dirección no válida: ${direction}`);
  }
}

// Con varias tónicas ("pentatónica en 3 tonalidades") cada toma es de una
// tonalidad al azar.
export function generateScaleRun(params, bpm, random = Math.random) {
  const tonic = pickRandom(params.tonicas ?? [params.tonica], random);
  const slots = orderByDirection(getScaleBox(tonic, params), params.direccion);
  return toExpectedEvents(slots, params, bpm);
}

// ---------- lick ----------

// Cada frase empieza al principio de un compás y el resto del compás es
// silencio, para que dé tiempo a respirar entre una frase y la siguiente.
function phrasesToSlots(phrases, params) {
  const slotsPerBar = getSlotsPerBar(params);
  return phrases.flatMap((phrase) => {
    const rests = Array(Math.max(slotsPerBar - phrase.length, 0)).fill(null);
    return [...phrase, ...rests];
  });
}

// Frases escritas en el ejercicio, con notas como 'A3' o 'C4'.
function createWrittenPhrases(params) {
  const fretRange = params.trastes ?? DEFAULT_LICK_FRETS;
  return params.frases.map((phrase) =>
    phrase.map((note) => findPlayablePosition(noteToMidi(note), fretRange)));
}

// Frase al azar dentro de la posición de la escala: se pasa siempre a la
// nota de al lado (como se suele tocar) y se termina en la tónica más
// cercana a la última nota.
function createPhraseEndingOnTonic(box, random) {
  let index = Math.floor(random() * box.length);
  const phrase = [box[index]];

  while (phrase.length < LICK_NOTES_BEFORE_TONIC) {
    const goUp = index === 0 || (index < box.length - 1 && random() < 0.5);
    index += goUp ? 1 : -1;
    phrase.push(box[index]);
  }

  const last = box[index];
  const roots = box.filter((note) => note.isRoot);
  const closestRoot = roots.reduce((best, note) =>
    Math.abs(note.midi - last.midi) < Math.abs(best.midi - last.midi) ? note : best);
  phrase.push(closestRoot);
  return phrase;
}

function createPhrasesEndingOnTonic(params, random) {
  const box = getScaleBox(params.tonica, params);
  return Array.from({ length: LICK_PHRASES_PER_TAKE }, () => createPhraseEndingOnTonic(box, random));
}

export function generateLick(params, bpm, random = Math.random) {
  const phrases = params.frases !== undefined
    ? createWrittenPhrases(params)
    : createPhrasesEndingOnTonic(params, random);
  return toExpectedEvents(phrasesToSlots(phrases, params), params, bpm);
}

// ---------- arpeggio_pattern ----------

// Cuerda a cuerda: de la más grave del acorde a la más aguda y vuelta.
// Se quita la última nota para que al repetirse no suene dos veces el bajo.
function createStringByStringOrder(notes) {
  return upAndDown(notes).slice(0, -1);
}

// El bajo del acorde y después las cuerdas 3, 2 y 1.
function createBassAndTrebleOrder(notes) {
  return BASS_AND_TREBLE_ORDER.map((step) =>
    step === 'bass' ? notes[0] : notes.find((note) => note.string === step));
}

function getArpeggioOrder(chordId, pattern) {
  const notes = getVoicingNotes(chordId);
  if (pattern === 'cuerda_a_cuerda') {
    return createStringByStringOrder(notes);
  }
  if (pattern === 'bajo_y_agudas') {
    return createBassAndTrebleOrder(notes);
  }
  throw new Error(`Patrón de arpegio no válido: ${pattern}`);
}

// Cada acorde ocupa un compás. Si el patrón es más corto que el compás se
// repite, y si es más largo se corta.
export function generateArpeggioPattern(params, bpm) {
  const slotsPerBar = getSlotsPerBar(params);
  const slots = params.acordes.flatMap((chordId) =>
    repeatToLength(getArpeggioOrder(chordId, params.patron), slotsPerBar)
      .map((note) => ({ string: note.string, fret: note.fret, midi: note.midi, chord: chordId })));
  return toExpectedEvents(slots, params, bpm);
}

// ---------- Todos los tipos a tempo ----------

const TEMPO_GENERATORS = {
  technique_loop: generateTechniqueLoop,
  scale_run: generateScaleRun,
  lick: generateLick,
  arpeggio_pattern: generateArpeggioPattern,
};

// Genera las notas de una toma de un ejercicio a tempo.
// Recibe el tipo, los parámetros del ejercicio y el BPM de la toma (puede
// ser menor que el objetivo si el usuario practica más despacio).
export function generateExpectedEvents(type, params, bpm, random = Math.random) {
  const generator = TEMPO_GENERATORS[type];
  if (generator === undefined) {
    throw new Error(`Tipo de ejercicio sin generador a tempo: ${type}`);
  }
  return generator(params, bpm, random);
}
