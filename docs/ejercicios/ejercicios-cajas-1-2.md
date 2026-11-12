# Ejercicios de las Cajas 1 y 2

Lista cerrada de los ejercicios de la primera versión. Cada ejercicio es un tipo con unos parámetros y se evalúa con uno de los 3 perfiles:

- **R:** respuesta (`perfil-respuesta.md`)
- **M:** monofónico a tempo (`perfil-monofonico.md`)
- **A:** acordes a tempo (`perfil-acordes.md`)

La columna **Clave** marca los ejercicios obligatorios para la medalla del módulo. Los BPM son provisionales y se ajustarán al probar con la guitarra. Esta tabla es la que se pasa a `content/caja-1.json` y `content/caja-2.json`.

## Caja 1: Primeros sonidos

*Al cerrarla podrás tocar dos acordes a tempo e improvisar con tres notas.*

### Oído y teoría

| id | Título | Tipo | Perfil | Clave | BPM | Parámetros |
|---|---|---|---|---|---|---|
| `c1-oido-notas-cuerda6` | Notas naturales de la cuerda 6 | `note_finding` | R | Sí | - | `{ "cuerdas": [6], "trastes": [0, 12], "naturales": true }` |
| `c1-oido-tono-semitono` | Tono y semitono | `note_finding` | R | No | - | `{ "cuerdas": [6], "trastes": [0, 12], "modo": "intervalo", "intervalos": [1, 2] }` |
| `c1-oido-acordes-nota-a-nota` | Em, Am, E, A y D nota a nota | `chord_note_by_note` | R | Sí | - | `{ "acordes": ["Em", "Am", "E", "A", "D"] }` |
| `c1-oido-raiz-acordes` | La raíz de cada acorde | `chord_note_by_note` | R | No | - | `{ "acordes": ["Em", "Am", "E", "A", "D"], "grados": ["1"] }` |
| `c1-oido-mapa-pentatonica-la` | Pentatónica menor de La: mapa y tónica | `scale_map` | R | No | - | `{ "escala": "minor_pentatonic", "tonica": "A", "posicion": 1 }` |
| `c1-oido-repite-nota` | Repite la nota que suena | `ear_echo` | R | No | - | `{ "cuerdas": [6], "trastes": [0, 12], "naturales": true }` |

En **tono y semitono** la app marca una nota de la cuerda 6 y pide la que está un tono (2 trastes) o un semitono (1 traste) por encima o por debajo.

### Acordes

| id | Título | Tipo | Perfil | Clave | BPM | Parámetros |
|---|---|---|---|---|---|---|
| `c1-acordes-abiertos` | Em, Am, E, A y D limpios | `chord_strike` | A | Sí | 60 | `{ "acordes": ["Em", "Am", "E", "A", "D"], "golpes_por_acorde": 4 }` |
| `c1-acordes-cambios` | Cambios Em-Am, E-A y A-D | `chord_change` | A | Sí | 60 | `{ "pares": [["Em", "Am"], ["E", "A"], ["A", "D"]], "golpes_por_acorde": 4, "compases": 4 }` |
| `c1-acordes-rasgueo-negras` | Rasgueo en negras hacia abajo | `strum_pattern` | A | No | 70 | `{ "acordes": ["Em", "Am"], "patron": "D D D D", "compases": 4 }` |
| `c1-acordes-arpegio` | Arpegio lento cuerda a cuerda | `arpeggio_pattern` | M | No | 60 | `{ "acordes": ["Em", "Am", "E", "A", "D"], "patron": "cuerda_a_cuerda", "figura": "corcheas" }` |

En los **cambios**, cada toma usa el siguiente par (Em-Am, luego E-A, luego A-D y vuelta a empezar). Así, para tener 3 tomas limpias seguidas hay que hacer bien los tres cambios.

### Punteo

| id | Título | Tipo | Perfil | Clave | BPM | Parámetros |
|---|---|---|---|---|---|---|
| `c1-punteo-pulsacion-alterna` | Pulsación alterna en una cuerda | `technique_loop` | M | Sí | 70 | `{ "patron": "pulsacion_alterna", "cuerda": 6, "traste": 0, "figura": "corcheas", "compases": 4 }` |
| `c1-punteo-arana` | Araña 1-2-3-4 en las 6 cuerdas | `technique_loop` | M | Sí | 60 | `{ "patron": "arana", "traste_inicio": 1, "figura": "corcheas" }` |
| `c1-punteo-apagado` | Apagado de cuerdas no tocadas | `technique_loop` | M | No | 60 | `{ "patron": "apagado", "cuerdas": [5, 4], "traste": 0, "figura": "negras", "compases": 4 }` |
| `c1-punteo-pentatonica-la` | Pentatónica menor de La, subir y bajar | `scale_run` | M | Sí | 70 | `{ "escala": "minor_pentatonic", "tonicas": ["A"], "posicion": 1, "direccion": "sube_y_baja", "figura": "corcheas" }` |
| `c1-punteo-frases-3-notas` | Frases de 3 notas | `lick` | M | No | 70 | `{ "notas": ["A3", "C4", "D4"], "frases": [["A3", "C4", "D4"], ["D4", "C4", "A3"], ["C4", "D4", "A3"]], "figura": "negras" }` |

### Jam 1

| id | Acompañamiento (perfil A) | Solo (improvisación) | BPM |
|---|---|---|---|
| `c1-jam` | Em-Am en negras, 8 compases | 4 compases improvisando solo con La, Do y Re | 70 |

## Caja 2: Moverse

*Al cerrarla podrás tocar canciones de tres acordes y hacer frases que acaban bien.*

### Oído y teoría

| id | Título | Tipo | Perfil | Clave | BPM | Parámetros |
|---|---|---|---|---|---|---|
| `c2-oido-notas-cuerda5` | Notas naturales de la cuerda 5 | `note_finding` | R | Sí | - | `{ "cuerdas": [5], "trastes": [0, 12], "naturales": true }` |
| `c2-oido-alteraciones` | Sostenidos y bemoles en las cuerdas 6 y 5 | `note_finding` | R | Sí | - | `{ "cuerdas": [6, 5], "trastes": [0, 12], "naturales": false }` |
| `c2-oido-tercera-mayor-menor` | Mayor y menor: la 3ª y la b3 | `chord_note_by_note` | R | Sí | - | `{ "acordes": ["E", "Em", "A", "Am", "D", "Dm"], "grados": ["3", "b3"] }` |
| `c2-oido-acordes-nota-a-nota` | G, C, Dm y dominantes nota a nota | `chord_note_by_note` | R | No | - | `{ "acordes": ["G", "C", "Dm", "E7", "A7", "D7", "B7"] }` |
| `c2-oido-mayor-o-menor` | ¿Mayor o menor? | `ear_identify` | R | No | - | `{ "pares": [["A", "Am"], ["E", "Em"], ["D", "Dm"]] }` |
| `c2-oido-tonica-pentatonica` | La tónica de la pentatónica en 3 tonalidades | `scale_map` | R | No | - | `{ "escala": "minor_pentatonic", "tonicas": ["A", "E", "G"], "posicion": 1, "solo_tonica": true }` |

Con `"naturales": false` también se piden notas naturales, pero la mayoría de las preguntas son de notas con alteración.

### Acordes

| id | Título | Tipo | Perfil | Clave | BPM | Parámetros |
|---|---|---|---|---|---|---|
| `c2-acordes-g-c-dm` | G, C y Dm limpios | `chord_strike` | A | Sí | 70 | `{ "acordes": ["G", "C", "Dm"], "golpes_por_acorde": 4 }` |
| `c2-acordes-dominantes` | E7, A7, D7 y B7 | `chord_strike` | A | Sí | 70 | `{ "acordes": ["E7", "A7", "D7", "B7"], "golpes_por_acorde": 4 }` |
| `c2-acordes-rasgueo` | Rasgueo en corcheas y patrón | `strum_pattern` | A | Sí | 80 | `{ "acordes": ["G", "C"], "patrones": ["DUDUDUDU", "D DU UDU"], "compases": 4 }` |
| `c2-acordes-cambios-g-c-d` | Cambios G-C-D a tempo | `chord_change` | A | No | 80 | `{ "acordes": ["G", "C", "D"], "golpes_por_acorde": 4, "compases": 6 }` |
| `c2-acordes-familia-i-iv-v` | Familia de acordes: I-IV-V en Sol y en La | `progression_by_degrees` | A | No | 80 | `{ "grados": ["I", "IV", "V"], "tonalidades": ["G", "A"], "golpes_por_acorde": 4 }` |
| `c2-acordes-arpegio-bajo-agudas` | Arpegio: bajo y 3 cuerdas agudas | `arpeggio_pattern` | M | No | 70 | `{ "acordes": ["G", "C", "D", "Am"], "patron": "bajo_y_agudas", "figura": "corcheas" }` |

En el **rasgueo**, el patrón `D DU UDU` cae en los tiempos 1, 2, 2y, 3y, 4 y 4y. Como no se detecta si el golpe es hacia arriba o hacia abajo, se comprueba que haya golpe en esas posiciones y que no lo haya en las demás.

### Punteo

| id | Título | Tipo | Perfil | Clave | BPM | Parámetros |
|---|---|---|---|---|---|---|
| `c2-punteo-hammer-pull` | Hammer-on y pull-off | `technique_loop` | M | Sí | 70 | `{ "patron": "legato", "legato": true, "cuerdas": [4, 3], "trastes": [5, 7], "figura": "corcheas" }` |
| `c2-punteo-cruce-cuerdas` | Pulsación alterna cruzando cuerdas | `technique_loop` | M | No | 80 | `{ "patron": "cruce", "cuerdas": [4, 3], "traste": 0, "figura": "corcheas", "compases": 4 }` |
| `c2-punteo-sincronizacion` | Sincronización de manos | `technique_loop` | M | Sí | 70 | `{ "patron": "cromatico", "cuerdas": [3, 2, 1], "traste_inicio": 5, "figura": "corcheas" }` |
| `c2-punteo-pentatonica-3-tonos` | Pentatónica en 3 tonalidades | `scale_run` | M | Sí | 80 | `{ "escala": "minor_pentatonic", "tonicas": ["A", "E", "G"], "posicion": 1, "direccion": "sube_y_baja", "figura": "corcheas" }` |
| `c2-punteo-frases-tonica` | Frases que terminan en la tónica | `lick` | M | No | 80 | `{ "escala": "minor_pentatonic", "tonica": "A", "terminar_en_tonica": true, "figura": "corcheas" }` |

### Jam 2

| id | Acompañamiento (perfil A) | Solo (improvisación) | BPM |
|---|---|---|---|
| `c2-jam` | I-IV-V en Sol con el patrón `D DU UDU`, 8 compases | 8 compases con la pentatónica mayor de Sol, terminando en la tónica | 80 |

## Cómo se evalúan los Jams

El Jam tiene dos partes y hay que pasar las dos para conseguir ★ y abrir la caja siguiente.

1. **Acompañamiento:** es un ejercicio normal del perfil de acordes.
2. **Solo:** versión simplificada de la improvisación. Solo se miden 3 cosas:

| Métrica | Qué mide | Umbral provisional |
|---|---|---|
| `scaleAdherence` | Notas dentro de las permitidas (las 3 notas en el Jam 1, la escala en el Jam 2) / notas tocadas | 0,90 |
| `gridAlignment` | Notas que caen en la subdivisión (negras o corcheas, con la tolerancia normal) / notas tocadas | 0,85 |
| `formCompliance` | Se toca algo en todos los compases del solo | 1 |

En el Jam 2, además, la **última nota del solo** tiene que ser la tónica. Es la forma más sencilla de comprobar "terminar las frases en la tónica" sin tener que detectar dónde empieza y acaba cada frase.

Lo que no se mide (fraseo, notas del acorde en los tiempos fuertes y tonalidad aleatoria) queda como trabajo futuro.

## Resumen y medallas

| Caja | Módulo | Ejercicios | Clave | Para la medalla |
|---|---|---|---|---|
| 1 | Oído y teoría | 6 | 2 | 5 de 6 a ★★ (con los 2 clave) |
| 1 | Acordes | 4 | 2 | 4 de 4 a ★★ |
| 1 | Punteo | 5 | 3 | 4 de 5 a ★★ (con los 3 clave) |
| 2 | Oído y teoría | 6 | 3 | 5 de 6 a ★★ (con los 3 clave) |
| 2 | Acordes | 6 | 3 | 5 de 6 a ★★ (con los 3 clave) |
| 2 | Punteo | 5 | 3 | 4 de 5 a ★★ (con los 3 clave) |

En total son **32 ejercicios y 2 Jams**. La medalla pide todos los ejercicios clave a ★★ y al menos el 80 % del módulo a ★★. En un módulo de 4 ejercicios, 3 son el 75 %, así que en Acordes de la Caja 1 hay que hacerlos todos.

## Cambios respecto al contenido de prueba

En los JSON de prueba hay dos cosas que cambian al pasar esta lista:

- `c1-acordes-cambio-em-am` pasa a ser `c1-acordes-cambios`, con los 3 pares.
- La pulsación alterna lleva ahora `"patron": "pulsacion_alterna"`, para que el generador de `technique_loop` sepa qué variante tiene que crear.

Como el cargador de contenido crea o actualiza los ejercicios por su `id`, el ejercicio con el id antiguo se queda en la base de datos. Habrá que borrarlo a mano o hacer que el cargador quite los que ya no están en el JSON.
