# Prueba 0: Afinador y analizador de acordes

Mini-app de prueba para validar el enfoque técnico del afinador y del analizador de acordes antes de integrarlos en la aplicación final.

## Cómo ejecutarla

Hace falta tener Node.js instalado.

```bash
npm install     # solo la primera vez
npm run dev     # levanta la app en http://localhost:5173
npm test        # ejecuta las pruebas unitarias
```

Hay que abrirla desde `localhost` (no con doble clic en `index.html`), porque el navegador solo deja usar el micrófono en `localhost` o HTTPS.

## Estructura

| Fichero | Responsabilidad |
| --- | --- |
| `index.html`, `css/styles.css` | Interfaz mínima |
| `src/main.js` | Punto de entrada: eventos y bucle de análisis |
| `src/audio.js` | Captura de audio (micrófono + Web Audio API) |
| `src/pitch.js` | Lógica del afinador (funciones puras) |
| `src/chords.js` | Lógica del analizador de acordes (funciones puras) |
| `src/notes.js` | Frecuencias de las notas, cuerdas y acordes |
| `src/constants.js` | Tolerancias y umbrales ajustables |
| `src/ui.js` | Todo lo que escribe en el DOM |
| `tests/` | Pruebas unitarias de `notes.js`, `pitch.js` y `chords.js` |

## Dependencias

- **Pitchy**: detección de la nota en el afinador. Es la única librería externa de la app. Se usa porque calcular la nota con precisión desde cero se sale del alcance de la prueba.
- **Vitest**: pruebas unitarias.
- **Vite**: solo como servidor local de desarrollo. Viene incluido con Vitest y hace falta para servir la app en `localhost` y para que el navegador pueda cargar Pitchy desde `node_modules`.

El analizador de acordes no usa ninguna librería: trabaja directamente sobre la FFT del `AnalyserNode`.

## Cómo funciona cada modo

**Afinador**: se lee la onda del micrófono y, si el nivel es muy bajo, se ignora (es silencio). Si no, Pitchy calcula la frecuencia fundamental, se busca la cuerda más cercana y se calcula la desviación en cents.

**Analizador de acordes**: se lee el espectro (FFT) y se buscan los picos que pasan del umbral. Se quitan los que son armónicos débiles de una nota más grave y, para cada nota del acorde elegido, se mira si hay algún pico dentro de la tolerancia.

## Valores a ajustar probando con la guitarra

Están todos en `src/constants.js`. Los más importantes:

- `TUNER_TOLERANCE_CENTS`: margen para dar una cuerda por afinada.
- `SILENCE_RMS_THRESHOLD`: nivel mínimo de señal para analizar.
- `PEAK_THRESHOLD`: fuerza mínima de un pico en el modo acordes. Si faltan cuerdas que sí suenan, bajarlo; si aparecen cuerdas que no suenan, subirlo.
- `CHORD_TOLERANCE_CENTS`: margen entre un pico y la nota esperada.
- `HARMONIC_MAX_DROP`: cuánto más débil tiene que ser un pico para tratarlo como armónico.

En el modo acordes se muestran en pantalla los picos detectados para facilitar este ajuste.

## Limitaciones conocidas

- **Notas que coinciden con armónicos de otras.** En Mi mayor, el Mi3 de la 4ª cuerda tiene la misma frecuencia que el segundo armónico del Mi2 de la 6ª. Si se apaga la 4ª cuerda pero la 6ª suena fuerte, la app puede dar la 4ª por correcta. Con la FFT sola no se puede distinguir del todo; es el punto a valorar para decidir si hace falta Essentia.js en la app final.
- **Latencia en el modo acordes.** La FFT de 32768 muestras abarca unos 0,7 segundos de sonido, así que el resultado tarda un momento en estabilizarse tras rasguear.
- **Micrófonos de portátil.** Suelen captar mal los graves, y las cuerdas 6ª y 5ª pueden salir más débiles de lo esperado.

## Pendiente

La prueba manual con una guitarra real (que el afinador sea estable y que el analizador detecte bien las cuerdas que no suenan) y el ajuste de los umbrales a partir de ella.
