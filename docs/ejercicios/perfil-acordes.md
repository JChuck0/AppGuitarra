# Perfil de acordes a tempo: acordes con metrónomo

Es el perfil de los ejercicios del módulo de Acordes (menos los arpegios, que son notas sueltas) y del acompañamiento de los Jams. El usuario rasguea acordes siguiendo el metrónomo y se comprueba que cada golpe llega a tiempo y que el acorde suena completo.

Tipos que usan este perfil: `chord_strike`, `chord_change`, `strum_pattern` y `progression_by_degrees`.

## Qué se le pide al usuario

- `chord_strike`: tocar un acorde limpio, con todas sus cuerdas sonando.
- `chord_change`: cambiar entre 2 o 3 acordes sin perder el tempo.
- `strum_pattern`: seguir un patrón de rasgueo.
- `progression_by_degrees`: tocar una progresión dada por grados (I-IV-V) en una tonalidad. La app no dice los acordes, el usuario tiene que saber cuáles son.

## Parámetros

| Parámetro | Ejemplo | Para qué sirve |
|---|---|---|
| `bpm_objetivo` | `60` | Tempo para ★★ |
| `acordes` | `["Em", "Am"]` | Acordes que se tocan, en orden |
| `pares` | `[["Em", "Am"], ["E", "A"]]` | En los cambios: cada toma usa el siguiente par |
| `golpes_por_acorde` | `4` | Cuántos golpes se dan antes de cambiar |
| `patron` / `patrones` | `"D DU UDU"` | Patrón de rasgueo (D = abajo, U = arriba, espacio = no se toca) |
| `grados`, `tonalidad` / `tonalidades` | `["I", "IV", "V"]`, `"G"` | Progresiones por grados |
| `compases` | `4` | Duración de la toma |

## Cómo se genera lo esperado

Una lista de `ExpectedEvent` con todas las notas del acorde en cada golpe:

```js
{ time: 1.0, midi: [40, 47, 52, 55, 59, 64] }   // Em
```

Las notas salen de `getVoicingNotes` (voicings abiertos) y en las progresiones de `buildProgression`. El tiempo de cada golpe se calcula igual que en el perfil monofónico, con el BPM y la posición del golpe en el compás.

En `chord_strike` cada acorde ocupa 2 compases: el primero es para colocar los dedos y no se evalúa, y en el segundo se dan 4 golpes en negras.

## Flujo de la toma

1. Se muestran los diagramas de los acordes (o los grados) y el patrón.
2. Cuenta atrás de un compás.
3. Se graba, se resta la latencia y se evalúa.
4. El resultado marca en el diagrama las cuerdas que no han sonado.

## Qué detectamos y con qué función

- **Ataques:** igual que en el perfil monofónico (subida del volumen). En un rasgueo las cuerdas no suenan exactamente a la vez, así que el tiempo del golpe es el del primer ataque.
- **Notas del acorde:** con el analizador de acordes de Prueba_0 (`findPeaks`, `removeHarmonics` y `compareChord`). Como ya sabemos qué acorde se espera, no hace falta adivinarlo: solo se comprueba si cada nota esperada está o no.
- **Sentido del rasgueo:** el micrófono **no distingue** un golpe hacia abajo de uno hacia arriba. Solo se comprueba que los golpes caen donde dice el patrón.

## Métricas y umbrales

La tolerancia de tiempo es la misma que en el perfil monofónico (80 ms como máximo en las Cajas 1 y 2).

| Métrica | Qué mide | Umbral provisional (Cajas 1 y 2) |
|---|---|---|
| `timingAccuracy` | Golpes dentro de la tolerancia / golpes esperados | 0,85 |
| `chordCompleteness` | Cuerdas esperadas que suenan / cuerdas esperadas (sumando todos los golpes que se comprueban) | 0,85 |
| `cleanliness` | 1 - (golpes de más + notas que no son del acorde) / golpes detectados | 0,85 |

Aquí no se usa `pitchAccuracy` como métrica aparte. Si el usuario pone un dedo en un traste equivocado, falta una nota del acorde (baja `chordCompleteness`) y aparece otra que no es (baja `cleanliness`).

**Qué golpes se usan para mirar si el acorde está completo:** el análisis de acordes necesita unos 0,7 s de sonido para que el espectro sea estable (lo vimos en Prueba_0). Por eso:

- Se comprueba en el **primer golpe de cada acorde** y en los golpes que caen en tiempo (negras).
- En los contratiempos de un patrón solo se mira el tiempo. Además, un golpe hacia arriba suele tocar solo las cuerdas agudas, así que no se le puede exigir el acorde completo.

El veredicto (`clean`, `almost`, `not_clean`, `inconclusive`) y las estrellas siguen las mismas reglas que el perfil monofónico.

## Resultado y feedback que ve el usuario

- El diagrama del acorde con las cuerdas que no han sonado marcadas en rojo.
- La línea de tiempo de los golpes, igual que en el perfil monofónico.
- Un solo consejo, por ejemplo: "La cuerda 2 no sonó en el Am, ¿la revisas?".

## Errores típicos y cómo se diagnostican

| Error | Cómo se detecta | Consejo |
|---|---|---|
| `missing_strings` | Una cuerda esperada no aparece en el espectro | "La cuerda 2 no ha sonado. Seguramente un dedo la está tapando" |
| `late` en el primer golpe tras un cambio | Golpe fuera de tolerancia justo después de cambiar de acorde | "El cambio llega tarde. Prueba a levantar los dedos antes del último golpe" |
| `late` / `early` en general | Golpes fuera de tolerancia | Igual que en el perfil monofónico |
| `missing` | No hay golpe cerca del tiempo esperado | "Se ha perdido un golpe" |
| `extra` | Golpe donde no tocaba | "Te ha sobrado un golpe en el compás 3" |
| `wrong_note` | Suena una nota que no es del acorde | "Suena una nota que no es del acorde. Revisa en qué traste está cada dedo" |

## Casos límite

- **Una nota que coincide con un armónico de otra** (por ejemplo el Mi3 de la cuerda 4 y el segundo armónico del Mi2 de la cuerda 6): si la cuerda 4 está apagada, la app puede darla por buena. Es una limitación conocida de usar solo la FFT y se explica en la memoria.
- **Cuerdas que no se tocan en el acorde** (la 6 en Am, la 6 y la 5 en D): si suenan aparece una nota de más y baja la limpieza.
- **Acordes que suenan mucho tiempo:** el final del acorde anterior se mezcla con el siguiente. Por eso la completitud se mira un poco después del golpe y no justo en el ataque.
- **Ruido o poca señal:** `inconclusive`, igual que en el resto de perfiles.

## Viabilidad técnica

- [x] Se detecta con fiabilidad suficiente con el micrófono del portátil: el tiempo de los golpes sí. Las notas del acorde, con los acordes abiertos de Prueba_0 y a tempos lentos
- [x] Problemas con armónicos u octavas: sí, es el punto más débil (ver casos límite)
- [x] Necesita metrónomo / latencia calibrada: sí
- [x] Cuándo la toma es `inconclusive` en vez de fallo: igual que en el perfil monofónico
- [x] Se puede simular con el analizador simulado para las pruebas (incluido el escenario de una cuerda que falta)

**Decisión:** viable con las simplificaciones de arriba (no se detecta el sentido del rasgueo y el acorde completo solo se mira en algunos golpes). Por eso los umbrales de este perfil son los primeros que habrá que ajustar con la guitarra. Los ejercicios "nota a nota" del módulo de Oído y teoría, que son monofónicos y más fiables, ayudan a preparar cada acorde antes.

## Ejemplos de las Cajas 1 y 2

- Caja 1: Em, Am, E, A y D limpios, cambios Em-Am, E-A y A-D, rasgueo en negras.
- Caja 2: G, C y Dm, dominantes (E7, A7, D7, B7), rasgueo en corcheas y patrón, cambios G-C-D, familia I-IV-V en Sol y en La.
- Acompañamiento de los Jams 1 y 2.
