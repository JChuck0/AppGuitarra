# Perfil de respuesta: preguntas de oído y teoría

Es el perfil de los ejercicios del módulo de Oído y teoría. No hay metrónomo: la app hace una pregunta, el usuario la contesta tocando en la guitarra y se mide si ha acertado y cuánto ha tardado.

Tipos que usan este perfil: `note_finding`, `chord_note_by_note`, `scale_map`, `ear_identify` y `ear_echo`.

## Qué se le pide al usuario

Contestar una ronda de **8 preguntas**, una detrás de otra. Ejemplos:

- `note_finding`: "Toca el Sol en la cuerda 6".
- `chord_note_by_note`: "Toca la nota de la cuerda 3 del Am" (las notas del acorde se piden por separado, de la cuerda más grave a la más aguda).
- `scale_map`: "Toca la tónica de la pentatónica de La en la cuerda 4".
- `ear_identify`: la app toca un acorde mayor o menor y el usuario contesta tocando ese mismo acorde.
- `ear_echo`: la app toca una nota y el usuario la repite.

## Parámetros

| Parámetro | Ejemplo | Para qué sirve |
|---|---|---|
| `cuerdas` | `[6]` | En qué cuerdas se pueden pedir notas |
| `trastes` | `[0, 12]` | Zona del mástil |
| `naturales` | `true` | Solo notas naturales o también sostenidos y bemoles |
| `acordes` | `["Em", "Am"]` | Acordes de los que se piden las notas |
| `grados` | `["1"]` | Solo algunas notas del acorde (por ejemplo, la raíz) |
| `escala`, `tonica` / `tonicas`, `posicion` | `"minor_pentatonic"`, `"A"`, `1` | Escala que se mapea |

El número de preguntas (8) y el tiempo máximo por pregunta son iguales en todos los ejercicios, así que van como constantes en el código y no en el JSON.

## Cómo se genera lo esperado

En lugar de una lista de notas con tiempos, el generador devuelve una lista de 8 preguntas:

```js
{ text: 'Toca el Sol en la cuerda 6', expectedMidi: [43], hintPositions: [{ string: 6, fret: 3 }] }
```

- `expectedMidi` son las alturas que valen como acierto. Normalmente es una sola, pero si la misma nota (misma altura) está en otra cuerda también vale.
- `hintPositions` son las posiciones que se pintan en el mástil si el usuario falla.
- Para buscar las posiciones se usan las funciones del núcleo musical: `findPositions` (notas), `getVoicingNotes` (notas de un acorde) y `getScaleInFretRange` (escalas).
- No se repite la misma pregunta dos veces seguidas.

## Flujo de la toma

1. Se muestra el mástil con la **pista de la zona** (los trastes y cuerdas donde está la respuesta, sin decir cuál es).
2. Aparece la pregunta y empieza a contar el tiempo.
3. La app escucha hasta que detecta la primera nota con confianza suficiente o hasta que pasan 15 segundos.
4. Se muestra si ha acertado. Si ha fallado, el mástil marca dónde estaba la nota pedida y dónde ha tocado.
5. El usuario pulsa **"Siguiente"** para pasar a la próxima pregunta. No se avanza solo, para que dé tiempo a mirar el mástil.
6. Al terminar las 8 preguntas se muestra el resultado de la ronda.

## Qué detectamos y con qué función

- Notas sueltas: detección monofónica con Pitchy (la misma que el afinador).
- `ear_identify`: hay que reconocer un acorde, así que se usa el analizador de acordes (`compareChord`).
- Se mira el primer ataque de la nota (subida del volumen) y la altura de los fotogramas siguientes, cuando ya es estable.

## Métricas y umbrales

Cada pregunta se evalúa con uno de estos resultados:

| Resultado | Cuándo |
|---|---|
| `correct` | La altura detectada coincide con una de `expectedMidi` (±30 cents) |
| `octave` | El nombre de la nota es correcto pero está en otra octava |
| `wrong` | Es otra nota |
| `timeout` | Han pasado 15 s sin respuesta |

La respuesta que cuenta es la **primera nota clara** que se toca. Si se permitiera ir probando hasta acertar, todas las preguntas acabarían saliendo bien y la ronda no diría nada.

El **tiempo de respuesta** va desde que aparece la pregunta hasta ese primer ataque.

| Estrellas | Condición de la ronda |
|---|---|
| ★ | 7 u 8 respuestas `correct` |
| ★★ | 7 u 8 `correct` y tiempo medio de respuesta de 4 s o menos |

Para el veredicto de la ronda: con 7 u 8 aciertos es `clean`, con 6 es `almost` y con menos es `not_clean`. El tiempo medio se calcula solo con las respuestas correctas.

## Resultado y feedback que ve el usuario

- Aciertos de la ronda (por ejemplo "7 de 8") y el tiempo medio.
- Un único consejo, el del error que más se ha repetido. Por ejemplo: "Has acertado las notas pero en otra octava en 2 preguntas. Fíjate en la marca del traste 12".
- Si se queda en ★ por el tiempo: "Las tienes todas, ahora toca encontrarlas un poco más rápido".

## Errores típicos y cómo se diagnostican

| Error | Cómo se detecta | Qué se le enseña |
|---|---|---|
| Otra octava | Mismo nombre de nota, distinta altura | El mástil marca las dos posiciones: la pedida y la tocada. Cuenta como fallo, pero el mensaje dice que la nota era la buena |
| Confundir sostenido y natural | La nota está a un semitono de la pedida | "Te has quedado a un traste" |
| Contar mal los trastes | La nota está a 2 semitonos o más | Se marca la posición correcta |
| Cuerda que no suena limpia (nota a nota) | No llega a detectarse una nota clara antes del tiempo máximo | "Esta cuerda no ha sonado clara, revisa el dedo" |

## Casos límite

- **Misma nota en otra cuerda:** si suena a la misma altura, el micrófono no puede saber en qué cuerda se ha tocado, así que se da como acierto. Es correcto musicalmente.
- **Silencio o nota muy débil:** no se cuenta como respuesta, se sigue esperando.
- **Cuerda al aire que suena sin querer al poner el dedo:** suele ser más débil y muy corta. Se exige que la nota se mantenga unos 100 ms para tomarla como respuesta.
- **Ruido de fondo:** si en la ronda hay muchas detecciones con poca confianza, la ronda es `inconclusive` y no cuenta.
- **`ear_identify`:** lo que distingue un acorde mayor de uno menor es la tercera. Se comprueba sobre todo que suena la tercera correcta y no la otra.

## Viabilidad técnica

- [x] Se detecta con fiabilidad suficiente con el micrófono del portátil (en Prueba_0 el afinador funciona con notas sueltas)
- [x] Problemas con armónicos u octavas: Pitchy a veces da la octava de arriba. Por eso el error `octave` hay que probarlo bien con la guitarra antes de fiarse de él
- [ ] Necesita metrónomo / latencia calibrada: no, porque el tiempo de respuesta se mide en segundos y unos milisegundos de latencia no cambian nada
- [x] Cuándo la toma es `inconclusive` en vez de fallo: cuando más de un 30 % de las detecciones tienen confianza baja (menos de 0,6)
- [x] Se puede simular con el analizador simulado para las pruebas

**Decisión:** viable. Hay que subir el rango de frecuencias del afinador de Prueba_0 (ahora llega a 420 Hz) para las notas agudas de las escalas.

## Ejemplos de las Cajas 1 y 2

- Caja 1: notas naturales de la cuerda 6, tono y semitono, notas de Em, Am, E, A y D por separado, raíz de cada acorde, mapa de la pentatónica de La, repetir la nota que suena.
- Caja 2: notas de la cuerda 5, sostenidos y bemoles en las cuerdas 6 y 5, tercera mayor y menor, mayor o menor de oído, tónica de la pentatónica en 3 tonalidades.

La lista completa con sus parámetros está en `ejercicios-cajas-1-2.md`.
