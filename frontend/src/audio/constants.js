// Umbrales y tamaños del análisis de audio. Vienen de la prueba técnica
// (Prueba_0) y están todos juntos porque son los valores que hay que ir
// ajustando al probar con la guitarra.

// ---------- Captura de audio ----------

// Tamaño del buffer del afinador. 4096 muestras a 48 kHz son unos 85 ms,
// suficiente para que entren varios ciclos de la cuerda más grave (Mi2, 82 Hz).
export const TUNER_FFT_SIZE = 4096;

// Tamaño de la FFT del analizador de acordes. Es el máximo que permite la
// Web Audio API: a 48 kHz cada posición mide 1,46 Hz. Con menos resolución no
// se distingue Mi2 (82 Hz) de Fa2 (87 Hz).
export const CHORD_FFT_SIZE = 32768;

// Nivel mínimo de señal (RMS, entre 0 y 1) para intentar detectar algo.
// Por debajo se considera silencio o ruido de fondo.
export const SILENCE_RMS_THRESHOLD = 0.01;

// ---------- Afinador ----------

// Desviación máxima, en cents, para dar una cuerda por afinada.
export const TUNER_TOLERANCE_CENTS = 5;

// Rango de frecuencias de las cuerdas al aire (con margen). Fuera de él la
// lectura no puede ser una cuerda al aire y el afinador la descarta.
export const TUNER_MIN_FREQUENCY = 60;
export const TUNER_MAX_FREQUENCY = 420;

// Rango de frecuencias de cualquier nota de los ejercicios. Llega hasta el
// traste 12 de la cuerda 1 (Mi5, 659 Hz). En la prueba técnica solo se
// llegaba a 420 Hz porque bastaba con las cuerdas al aire.
export const NOTE_MIN_FREQUENCY = 70;
export const NOTE_MAX_FREQUENCY = 700;

// Claridad mínima (entre 0 y 1) que tiene que devolver Pitchy para fiarnos
// de la nota detectada. Con valores bajos la lectura suele ser ruido.
export const TUNER_MIN_CLARITY = 0.9;

// ---------- Analizador de acordes ----------

// Rango donde se buscan picos. Cubre las fundamentales de los acordes
// abiertos de las Cajas 1 y 2 (de Mi2 = 82 Hz a Sol4 = 392 Hz) con margen.
export const PEAK_MIN_FREQUENCY = 70;
export const PEAK_MAX_FREQUENCY = 450;

// Valor mínimo (0-255, el de getByteFrequencyData) para que un máximo del
// espectro cuente como pico y no como ruido.
export const PEAK_THRESHOLD = 130;

// Un pico tiene que ser el valor más alto entre sus vecinos a esta distancia
// (en posiciones) por cada lado. Evita contar varias veces el mismo pico.
export const PEAK_NEIGHBORHOOD_BINS = 3;

// Desviación máxima, en cents, entre un pico y la nota esperada del acorde.
export const CHORD_TOLERANCE_CENTS = 35;

// Hasta qué múltiplo de una fundamental se comprueba si un pico es un armónico.
export const MAX_HARMONIC_NUMBER = 5;

// Desviación máxima, en cents, para considerar que un pico coincide con el
// múltiplo exacto de otro pico más grave.
export const HARMONIC_TOLERANCE_CENTS = 30;

// Si un pico que coincide con un armónico es más débil que su fundamental en
// más de este valor (0-255), se descarta como armónico. Si tiene una fuerza
// parecida se conserva, porque puede ser otra cuerda sonando de verdad.
export const HARMONIC_MAX_DROP = 60;

// ---------- Prueba de micrófono ----------

// Segundos que dura cada parte de la prueba (en silencio y tocando).
export const MIC_TEST_SECONDS = 3;

// Nivel medio mínimo al tocar. Es el triple del umbral de silencio para que
// las notas se separen bien del ruido. Valor provisional.
export const MIC_MIN_LEVEL = 0.03;

// Una muestra a este valor (o más) está en el límite de lo que puede
// grabar el micrófono: el sonido sale distorsionado (satura).
export const CLIPPING_LEVEL = 0.99;

// ---------- Metrónomo ----------

// Tempos mínimo y máximo que se pueden poner en el metrónomo.
export const METRONOME_MIN_BPM = 40;
export const METRONOME_MAX_BPM = 220;

// ---------- Detección de ataques ----------

// Para detectar ataques se mide el volumen solo de las últimas 1024 muestras
// del buffer (unos 21 ms). Con el buffer entero del afinador (85 ms) la subida
// de volumen se suaviza y el ataque se detecta más tarde.
export const ONSET_WINDOW_SIZE = 1024;

// Número de fotogramas anteriores con los que se compara el volumen actual.
export const ONSET_HISTORY_FRAMES = 3;

// El volumen tiene que multiplicarse al menos por este valor respecto a la
// media de los fotogramas anteriores para contar como ataque. Valor provisional.
export const ONSET_RISE_RATIO = 2;

// Tiempo mínimo entre dos ataques (segundos). Evita contar dos veces el mismo
// golpe. A 80 BPM una semicorchea dura 0,19 s, así que cabe con margen.
export const ONSET_MIN_GAP_SEC = 0.12;
