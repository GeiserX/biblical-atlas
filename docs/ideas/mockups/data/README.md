# Datos de ejemplo para las maquetas

Estos JSON alimentan las maquetas de `docs/ideas/`. No son todavía el formato del producto: el formato definitivo está en [`../../modelo-de-datos.md`](../../modelo-de-datos.md) (un YAML por entidad). Aquí probamos si los datos alcanzan para dibujar lo que queremos.

Revisados el 26 de septiembre de 2026. Todas las URL de estos ficheros respondían en esa fecha.

## Ficheros

| Fichero | Pregunta que responde | Contenido |
|---|---|---|
| `cartas-de-pablo.json` | ¿Desde dónde escribió Pablo cada carta, a quién y qué pasaba en los dos extremos? | 14 cartas con lugar de escritura, fecha TNM, destinatarios, lugar destino y un contexto breve de origen y de destino. |
| `viajes-de-pablo.json` | ¿Dónde estaba Pablo en tal año? | Tres viajes misionales, la visita a Jerusalén de 49, la custodia en Cesarea y el viaje a Roma. Paradas en orden con referencia de Hechos. |
| `pedro.json` | ¿Qué hizo Pedro, dónde y cuándo? | 18 sucesos, destinatarios de 1 Pedro y lo que no afirmamos. |
| `babilonia-en-tiempos-de-jesus.json` | ¿Qué pasaba en Babilonia en tiempos de Jesús? | Hechos de nivel 1 y de nivel 2 separados, de 2 a.e.c. a 64 e.c. |
| `israel-medos-y-persas.json` | ¿Quién había en Israel en la época de los medos y persas? | Reyes como periodos, diez personas de Judá y del imperio, once hechos, de 539 a.e.c. a después de 443 a.e.c. |
| `lugares-inciertos.json` | ¿Dónde estaba el Edén? ¿Y el Sinaí? | Edén, montañas de Ararat, monte Sinaí y cruce del mar Rojo: qué dice Perspicacia y qué candidatos hay. |

## Años: numeración astronómica con signo

Guardamos cada año como un entero. Los años de la era común (e.c.) son positivos. Los años antes de la era común (a.e.c.) usan la numeración astronómica: hay un año 0.

| Se lee | Se guarda |
|---|---|
| 33 e.c. | `33` |
| 1 e.c. | `1` |
| 1 a.e.c. | `0` |
| 2 a.e.c. | `-1` |
| 537 a.e.c. | `-536` |
| 607 a.e.c. | `-606` |

Fórmula: `año_guardado = 1 − año_aec`. Para mostrarlo: si el valor es ≤ 0, se escribe `(1 − valor) a.e.c.`.

Así la resta da siempre la duración real. Entre 2 a.e.c. y 29 e.c. hay `29 − (−1) = 30` años, que es la edad de Jesús al bautizarse según Lucas 3:23. Con números "históricos" (−2 y 29) saldrían 31.

Nunca guardamos el texto "a.e.c." en un número. El texto legible va en `fecha.texto`.

## El objeto `fecha`

```json
{
  "desde": 50,
  "hasta": 52,
  "precision": "rango",
  "aprox": true,
  "tipo": "anclada",
  "cronologia": "tnm",
  "texto": "c. 50-52 e.c."
}
```

| Campo | Valores | Significado |
|---|---|---|
| `desde`, `hasta` | entero o `null` | Año astronómico. `null` en `hasta` = final abierto o desconocido. `null` en `desde` = inicio desconocido. |
| `precision` | `día`, `mes`, `estación`, `año`, `rango` | Lo más fino que dice la fuente. `día` para "14 de nisán de 33". |
| `aprox` | `true` / `false` | `true` si la fuente dice "c.", "alrededor de", "probablemente". |
| `tipo` | `anclada` / `narrativa` | `anclada`: la fuente da esa fecha a ese suceso. `narrativa`: sabemos el orden y el tramo, pero no el año del suceso; la interfaz lo marca como aproximado. |
| `cronologia` | `tnm` / `secular` | `tnm` es la principal. `secular` sólo aparece en `fecha_secular` o en hechos de nivel 2. |
| `texto` | cadena | Cómo lo mostramos. |

Cuando la cronología secular difiere, el hecho lleva además `fecha_secular` con sus propias `fuentes`. Ejemplos en `israel-medos-y-persas.json`: destrucción de Jerusalén (607 frente a 587/586 a.e.c.), Jerjes I y Artajerjes I (ascenso en 475 frente a 465 a.e.c.).

## El objeto `lugar`

```json
{
  "nombre": "Derbe",
  "tipo": "ciudad",
  "lat": 37.34857,
  "lon": 33.36145,
  "coord_fuente": "openbible:aa401a9",
  "coord_url": "https://www.openbible.info/geo/ancient/aa401a9/derbe",
  "coord_nota": "OpenBible registra 3 identificaciones; se usa la de mayor puntuación (860/1000)."
}
```

- `nombre`: nombre de la TNM en español (por ejemplo "Bellos Puertos", "Asón", "Plaza del Mercado de Apio").
- `tipo`: `ciudad`, `región`, `isla`, `monte`, `agua`, `río`. Una región nunca se dibuja como una ciudad: lleva un punto representativo, no su frontera.
- Coordenadas de [OpenBible.info Bible Geocoding Data](https://github.com/openbibleinfo/Bible-Geocoding-Data), licencia CC BY 4.0. Hay que acreditarlo en el sitio. Sólo tomamos la coordenada, nunca la interpretación: por ejemplo, OpenBible identifica la "Babilonia" de 1 Pedro 5:13 con Roma (917/1000), y nosotros seguimos a Perspicacia, que la identifica con la ciudad del Éufrates.
- `coord_calculada_por_nosotros: true` marca un punto que hemos calculado (por ejemplo, el centro de la zona del Edén). Nunca es un sitio real.

## Fuentes y verificación

Cada fichero trae un mapa `fuentes` con identificador, título, obra, URL y `nivel`:

- **Nivel 1**: Traducción del Nuevo Mundo (edición de estudio) y publicaciones de wol.jw.org. Aquí: la Tabla de los libros de la Biblia, el apéndice A7, "Perspicacia para comprender las Escrituras" y el estudio 3 de "Toda Escritura es inspirada de Dios y provechosa".
- **Nivel 2**: datos e investigación externos (OpenBible, Wikipedia). Nunca corrigen al nivel 1.
- `referencia`: la fuente se cita sólo para comparar (por ejemplo, otros proyectos).

Cada hecho lleva `fuentes` (lista de identificadores) y `verificado`:

- `true`: lo leímos en la fuente enlazada el día de la revisión.
- `false`: no lo dice ninguna fuente literalmente. Casos: fechas que acotamos nosotros entre dos anclas (Pedro en Samaria, en Lida y Jope, en Antioquía) y años que calculamos (Ester elegida reina en el año 7.º de Asuero → 489 a.e.c.). El campo `nota` explica el cálculo.

## Lo que no hay en estos ficheros

- Texto de la TNM ni de ninguna publicación de jw.org. Los resúmenes son nuestros; la referencia ("Hch 16:8-10") y la URL llevan al texto.
- Imágenes. Las maquetas enlazan a wol.jw.org con un botón "Leer en wol.jw.org ↗".
- Datos copiados en bloque de otros proyectos. De OpenBible sólo usamos coordenadas.

## Huecos conocidos

- Seleucia del Tigris, Ctesifonte y Nehardea no tienen coordenada verificada. La "Seleucia" de OpenBible es Seleucia de Pieria, el puerto de Antioquía (Hch 13:4).
- "Betania del otro lado del Jordán" (Jn 1:28) no tiene coordenada.
- 2 Timoteo: la fuente no dice dónde estaba Timoteo. No dibujamos destino.
- Las montañas de Ararat y el monte Ararat comparten punto en OpenBible. Hay que separar región y pico con datos de relieve.
- Las distancias entre paradas no siguen calzadas todavía. El siguiente paso es trazarlas sobre [Itiner-e](https://itiner-e.org/).
