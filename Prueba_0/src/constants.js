// Constantes de configuración de la mini-app.
// Están todas juntas aquí porque son los valores que hay que ir ajustando
// de forma empírica al probar con una guitarra real (tolerancias y umbrales).

// ---------- Captura de audio ----------

// Tamaño del buffer que usa el afinador. 4096 muestras a 48 kHz son unos 85 ms,
// suficiente para que entren varios ciclos de la cuerda más grave (Mi2, 82 Hz).
export const TUNER_FFT_SIZE = 4096;

// Tamaño de la FFT del analizador de acordes. Se usa el máximo que permite la
// Web Audio API porque hace falta mucha resolución: a 48 kHz cada "bin" mide
// 48000 / 32768 = 1,46 Hz. Con 2048 cada bin mediría 23 Hz y no se podría
// distinguir Mi2 (82 Hz) de Fa2 (87 Hz).
export const CHORD_FFT_SIZE = 32768;

// Nivel mínimo de señal (RMS, entre 0 y 1) para intentar detectar algo.
// Por debajo se considera silencio o ruido de fondo y no se analiza.
export const SILENCE_RMS_THRESHOLD = 0.01;

// ---------- Afinador ----------

// Desviación máxima, en cents, para dar una cuerda por afinada.
// (100 cents = 1 semitono).
export const TUNER_TOLERANCE_CENTS = 5;

// Rango de frecuencias que acepta el afinador. Fuera de este rango la lectura
// se descarta porque no puede ser una cuerda de guitarra al aire.
export const TUNER_MIN_FREQUENCY = 60;
export const TUNER_MAX_FREQUENCY = 420;

// "Claridad" mínima (entre 0 y 1) que tiene que devolver Pitchy para fiarnos
// de la nota detectada. Con valores bajos la lectura suele ser ruido.
export const TUNER_MIN_CLARITY = 0.9;

// ---------- Analizador de acordes ----------

// Rango de frecuencias donde se buscan picos. Cubre las fundamentales de los
// acordes abiertos soportados (de Mi2 = 82 Hz a Sol4 = 392 Hz) con algo de margen.
export const PEAK_MIN_FREQUENCY = 70;
export const PEAK_MAX_FREQUENCY = 450;

// Valor mínimo (0-255, tal como lo devuelve getByteFrequencyData) para que un
// máximo del espectro cuente como pico y no como ruido.
export const PEAK_THRESHOLD = 130;

// Un pico tiene que ser el valor más alto entre sus vecinos a esta distancia
// (en bins) por cada lado. Evita contar varias veces el mismo pico.
export const PEAK_NEIGHBORHOOD_BINS = 3;

// Desviación máxima, en cents, entre un pico y la nota esperada del acorde
// para considerar que esa nota está sonando.
export const CHORD_TOLERANCE_CENTS = 35;

// Hasta qué múltiplo de una fundamental se comprueba si un pico es un armónico.
export const MAX_HARMONIC_NUMBER = 5;

// Desviación máxima, en cents, para considerar que un pico coincide con el
// múltiplo exacto de otro pico más grave.
export const HARMONIC_TOLERANCE_CENTS = 30;

// Si un pico que coincide con un armónico es más débil que su fundamental en
// más de este valor (unidades 0-255), se descarta como armónico. Si tiene una
// fuerza parecida se conserva, porque puede ser otra cuerda sonando de verdad.
export const HARMONIC_MAX_DROP = 60;
