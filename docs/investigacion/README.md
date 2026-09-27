# Investigación: cómo sabemos lo que afirmamos

Cada dato del mapa dice de dónde sale, por qué lo asociamos y cuándo lo comprobamos. Esta carpeta explica el método. El registro completo, dato a dato, está en [`viajes-de-pablo.md`](viajes-de-pablo.md).

## Dónde vive cada cosa

- [`data/fuentes.yaml`](../../data/fuentes.yaml): todas las fuentes, una vez, con su identificador, título, obra, URL, nivel, año de publicación (`publicado`, solo si la página lo muestra) y fecha de consulta.
- `data/lugares/`, `data/personas/`, `data/viajes/`, `data/cartas/`, `data/eventos/`, `data/periodos/`: un YAML por entidad. El nombre del fichero es su identificador.
- [`viajes-de-pablo.md`](viajes-de-pablo.md): el registro. Lo genera [`scripts/build.py`](../../scripts/build.py) y nadie lo edita a mano.

## Qué lleva cada afirmación

Dentro de su YAML, cada hecho (un lugar, una persona, un viaje y cada una de sus paradas, una carta, un evento, un periodo) lleva:

| Campo | Qué es |
|---|---|
| `fuentes` | Lista de identificadores de `data/fuentes.yaml`. Nunca vacía. |
| `razon` | Por qué hacemos esta asociación: qué pasaje o qué parte de la fuente la sostiene, con palabras nuestras. Nunca vacía. |
| `consultado` | Día en que se leyó la fuente, `AAAA-MM-DD`. |
| `estado` | `verificado` solo si alguien abrió la fuente enlazada y dice eso. Si no, `pendiente`. |
| `historial` | Opcional. Los cambios de entendimiento, explicados más abajo. |

Las fechas siguen el objeto `fecha` de [`docs/ideas/mockups/data/README.md`](../ideas/mockups/data/README.md): años astronómicos con signo (1 a.e.c. = 0), `precision`, `aprox`, `tipo` (`anclada` o `narrativa`), `cronologia` y `texto`.

Las fuentes son de dos niveles. Nivel 1: la Traducción del Nuevo Mundo y las publicaciones de wol.jw.org y jw.org. Nivel 2: arqueología o investigación, y solo cuando jw.org las ha usado. De OpenBible tomamos únicamente coordenadas. Nunca copiamos texto de jw.org: los resúmenes son nuestros, de 40 palabras como mucho por hecho (`scripts/validate.py` lo comprueba), y siempre con enlace.

## Cuando cambia el entendimiento

Si una publicación explica algo de otra forma, lo anterior no se borra. Se hace así:

1. Se añade una entrada a `historial` del hecho:

   ```yaml
   historial:
     - fecha: "2027-10-02"
       cambio: "La fecha de la carta pasa de c. 50 a c. 51 según la nueva edición."
       fuente: it-tesalonicenses-2027
   ```

2. Se actualiza el `resumen` (y la `fecha` o lo que haya cambiado).
3. La fuente nueva entra en `fuentes`. La antigua se queda en `data/fuentes.yaml` con `nota: sustituida`, para que el historial siga teniendo enlace.

`validate.py` exige que cada entrada de `historial` tenga `fecha`, `cambio` y `fuente`, y que la fuente exista.

## Lo más reciente de jw.org gana

Cuando dos fuentes de nivel 1 no coinciden, manda la publicación más reciente. El desacuerdo se anota en `historial` con las dos fuentes, para que se vea qué cambió y cuándo. Una fuente de nivel 2 nunca corrige a una de nivel 1.

## Revisión anual

Una vez al año (el flujo `validar` también lo hace cada lunes):

1. [`scripts/revisar.py`](../../scripts/revisar.py) lista lo que lleva 365 días o más sin releer, con una búsqueda en wol.jw.org para cada entidad. Con `--fallar` sale con código 1 si la lista no está vacía. La misma lista de búsquedas está al final de [`viajes-de-pablo.md`](viajes-de-pablo.md).
2. Se abre cada búsqueda. Si hay material más reciente, se lee y, si cambia algo, se sigue el procedimiento de arriba.
3. Se actualiza `consultado` de lo que se ha releído, aunque no haya cambiado nada.
4. `python3 scripts/validate.py --links` comprueba que todas las URL siguen respondiendo.
5. `python3 scripts/build.py` regenera el registro, y se sube el cambio.
