# Perfil monofónico a tempo: notas sueltas con metrónomo

Es el perfil de los ejercicios de Punteo y de los arpegios. El usuario toca una secuencia de notas sueltas siguiendo el metrónomo y se comprueba que cada nota es la buena y que llega a tiempo.

Tipos que usan este perfil: `technique_loop`, `scale_run`, `lick` y `arpeggio_pattern`.

## Qué se le pide al usuario

Tocar una secuencia que se ve en pantalla (en el mástil y como lista de notas) al tempo del metrónomo. Ejemplos:

- Pulsación alterna en la cuerda 6 al aire, en corcheas a 70.
- Araña 1-2-3-4 en las 6 cuerdas.
- Pentatónica menor de La en posición 1, subiendo y bajando.
- Una frase de 3 notas.
- El arpegio de un acorde cuerda a cuerda.

## Parámetros

| Parámetro | Ejemplo | Para qué sirve |
|---|---|---|
| `bpm_objetivo` | `70` | Tempo para ★★ (va en el ejercicio, no en los parámetros) |
| `figura` | `"corcheas"` | Subdivisión: `negras` (1 nota por pulso) o `corcheas` (2 por pulso) |
| `compases` | `4` | Duración de la toma, en compases de 4/4 |
| `cuerda`, `cuerdas`, `traste`, `trastes` | `6`, `0` | Dónde se toca |
| `patron` | `"arana"` | Variante del ejercicio técnico |
| `escala`, `tonica` / `tonicas`, `posicion`, `direccion` | `"minor_pentatonic"`, `"A"`, `1`, `"sube_y_baja"` | Escalas |
| `acordes` | `["Am"]` | Arpegios |
| `legato` | `true` | Hammer-on y pull-off: no se exige ataque en cada nota |

## Cómo se genera lo esperado

El generador devuelve una lista de `ExpectedEvent`:

```js
{ time: 0.857, midi: [45], string: 5 }
```

El tiempo de cada nota se calcula con el BPM y la figura:

```
duración de la figura (s) = 60 / bpm / notas por pulso
time de la nota i = i * duración de la figura
```

A 70 BPM en corcheas cada nota dura 60 / 70 / 2 = 0,43 s. El tiempo 0 es el primer tiempo después de la cuenta atrás.

Si la secuencia es más corta que los compases de la toma, se repite (los ejercicios técnicos son bucles).

## Flujo de la toma

1. Se muestra qué hay que tocar y el BPM.
2. **Cuenta atrás de un compás** (4 clics, el primero acentuado). No se evalúa.
3. Se graba la duración de la toma más un tiempo de margen, para no cortar la última nota.
4. A los tiempos detectados se les resta la latencia calibrada del usuario.
5. Se alinea lo detectado con lo esperado, se calculan las métricas y se da el veredicto.

Sin latencia calibrada no se puede evaluar el tempo, así que la app pide calibrarla antes de la primera toma.

## Qué detectamos y con qué función

- **Ataques:** subida brusca del volumen (RMS) respecto a los fotogramas anteriores.
- **Altura:** Pitchy en los fotogramas que siguen a cada ataque (unos 100 ms, cuando la nota ya es estable).
- **Legato:** en un hammer-on o un pull-off casi no hay subida de volumen, así que también hay que crear un evento cuando la altura cambia de una nota a otra aunque no haya ataque.

## Métricas y umbrales

**Tolerancia de tiempo** de cada nota:

```
tolerancia = mínimo entre 80 ms y el 25 % de la duración de la figura
```

A 70 en corcheas, el 25 % de 430 ms son 107 ms, así que la tolerancia es 80 ms.

| Métrica | Qué mide | Umbral provisional (Cajas 1 y 2) |
|---|---|---|
| `pitchAccuracy` | Notas esperadas que se han tocado con la altura correcta (±30 cents) / notas esperadas | 0,90 |
| `timingAccuracy` | Notas que caen dentro de la tolerancia / notas esperadas | 0,85 |
| `cleanliness` | 1 - notas que sobran / notas detectadas | 0,85 |

En los ejercicios `legato` no se usa `timingAccuracy`, solo la altura y el orden de las notas.

**Veredicto de la toma:**

| Veredicto | Cuándo |
|---|---|
| `clean` | Todas las métricas llegan a su umbral |
| `almost` | Falla una sola métrica y por menos de 0,05 |
| `not_clean` | Cualquier otro caso |
| `inconclusive` | Más del 30 % de las detecciones tienen confianza baja (menos de 0,6), o no se ha detectado nada. No cuenta y se pide repetir |

**Estrellas** (las calcula el servidor):

| Estrellas | Condición |
|---|---|
| ★ | 2 tomas `clean` seguidas a 70 % o más del BPM objetivo |
| ★★ | 3 tomas `clean` seguidas al BPM objetivo |

Una toma `inconclusive` no cuenta ni rompe la racha. Las estrellas nunca bajan.

## Resultado y feedback que ve el usuario

- Una línea de tiempo con una marca por nota esperada: bien, adelantada, retrasada, nota equivocada o falta.
- El veredicto con un tono cercano ("¡Limpia!", "¡Casi!", "Esta no ha salido redonda").
- **Un solo consejo**, el del error que más se repite. Los números (ms, porcentajes) se pueden ver, pero no son el mensaje principal.

## Errores típicos y cómo se diagnostican

| Error | Cómo se detecta | Consejo |
|---|---|---|
| `late` | La nota llega después de la tolerancia | "Vas un poco por detrás del clic" |
| `early` | La nota llega antes de la tolerancia | "Te estás adelantando, espera al clic" |
| `wrong_note` | Hay nota a tiempo pero con otra altura | "La nota 5 no era esa", y se marca en el mástil |
| `missing` | No hay ninguna nota cerca del tiempo esperado | "Se ha perdido una nota en el compás 2" |
| `extra` | Nota detectada que no corresponde a ninguna esperada | "Se escapa alguna cuerda al aire, apaga con la otra mano" |

## Casos límite

- **Cuerda al aire que suena sin querer:** aparece como `extra` y baja la limpieza. Es justo lo que tiene que medir el ejercicio de apagado de cuerdas.
- **El clic del metrónomo entra por el micrófono:** puede detectarse como ataque. Se recomienda usar auriculares. Si se usa altavoz, se descartan los ataques que coinciden con un clic y no tienen una altura clara.
- **Nota en otra octava:** cuenta como `wrong_note`. En este perfil no merece un error propio porque las notas se ven en el mástil.
- **El usuario empieza tarde y toca todo desplazado:** saldrán muchas `late`. No se intenta corregir, el consejo será esperar a la cuenta atrás.
- **Silencio total:** `inconclusive`, con el mensaje "No te he oído, ¿está bien el micro?".

## Viabilidad técnica

- [x] Se detecta con fiabilidad suficiente con el micrófono del portátil: las notas sueltas son lo más fiable de detectar
- [x] Problemas con armónicos u octavas: algún salto de octava de Pitchy. Se reduce mirando varios fotogramas seguidos y no uno solo
- [x] Necesita metrónomo / latencia calibrada: sí, las dos cosas
- [x] Cuándo la toma es `inconclusive` en vez de fallo: más del 30 % de las detecciones con confianza baja
- [x] Se puede simular con el analizador simulado para las pruebas

**Decisión:** viable. La tolerancia de 80 ms es más amplia de lo que sería ideal, pero el micrófono del portátil y la latencia del navegador no dan para más precisión. Se ajustará con la guitarra en las pruebas finales. Lo menos seguro es el legato, porque depende de detectar bien los cambios de altura.

## Ejemplos de las Cajas 1 y 2

- Caja 1: pulsación alterna, araña, apagado de cuerdas, pentatónica de La, frases de 3 notas y arpegio cuerda a cuerda.
- Caja 2: hammer-on y pull-off, pulsación alterna cruzando cuerdas, sincronización de manos, pentatónica en 3 tonalidades, frases que terminan en la tónica y arpegio de bajo y 3 cuerdas agudas.
