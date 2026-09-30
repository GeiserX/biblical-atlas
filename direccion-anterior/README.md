# La dirección anterior

El sitio vivía en `https://biblical-earth.geiser.cloud/` y ahora vive en `https://biblical-atlas.geiser.cloud/`. Esta carpeta es lo que sirve la dirección anterior después del cambio. No se publica con el sitio: GitHub Pages solo sube `site/`.

## Qué hace

[`worker.js`](worker.js) es un Cloudflare Worker con dos trabajos:

- **Redirigir.** Cualquier ruta contesta con una redirección HTTP a la misma ruta y la misma consulta en la dirección nueva. El navegador conserva el `#fragmento`, así que un enlace compartido abre la misma vista. Un programa que descarga `/data.json` o `/stats.json` sigue la redirección; una redirección hecha con JavaScript no le serviría.
- **Hacer de puente.** `/puente.html` y `/puente.js` entregan al sitio nuevo lo que el navegador guardó en la dirección anterior: notas, marcadores, capítulos leídos, preferencias. El navegador guarda cada cosa por origen, así que sin el puente todo eso se quedaría atrás.

## El puente

[`site/js/traer.js`](../site/js/traer.js), en el sitio nuevo, abre `puente.html` en un iframe oculto la primera vez que alguien entra, y [`puente.js`](puente.js) le contesta con una copia de sus claves. Son tres mensajes:

| Paso | De, a | Mensaje |
|---|---|---|
| 1 | puente, sitio | `{ puente: 1, tipo: 'listo' }` |
| 2 | sitio, puente | `{ puente: 1, tipo: 'pide', n }`, con `n` al azar |
| 3 | puente, sitio | `{ puente: 1, tipo: 'datos', n, claves }` |

- Cada lado envía con el origen exacto del otro, nunca con `'*'`, y descarta un mensaje que no venga de ese origen y de esa ventana.
- `puente.html` sale con `frame-ancestors https://biblical-atlas.geiser.cloud`: ningún otro sitio puede meterlo en un iframe.
- El puente solo lee. Nunca escribe ni borra en la dirección anterior.
- En el sitio nuevo manda lo que ya hay: una clave que existe no se pisa, y una nota distinta para la misma ficha deja la copia que llega aparte, en «Mis notas», para descargarla.
- `traer.js` no hace nada fuera de `https://biblical-atlas.geiser.cloud`, después de su fecha final (`HASTA`) ni una segunda vez (`biblical-atlas:traido`).

## Publicarlo

1. `npx wrangler deploy` desde esta carpeta, con una sesión de `wrangler login` que pueda publicar Workers en la zona `geiser.cloud`. La ruta de `wrangler.toml` ya es `biblical-earth.geiser.cloud/*`: la dirección nueva sirve el sitio desde el 30 de septiembre de 2026 y el registro DNS anterior ya pasa por el proxy de Cloudflare, así que hasta que el Worker se publique la dirección anterior contesta 404.
2. Comprobar que `/data.json` acaba en 200 en la dirección nueva, que `/acerca.html?x=1` conserva ruta y consulta y que `/puente.html` contesta 200 con su cabecera `content-security-policy`.
3. Con el puente probado en los dos dominios, `REDIRECCION` pasa de 302 a 301. Un 301 equivocado se queda en la caché del navegador, por eso va al final.

## Apagarlo

Después de `HASTA`, `traer.js` ya no pide nada. Entonces se borran `site/js/traer.js`, `site/js/migrar-claves.js`, `site/js/fundir-claves.js`, sus etiquetas en `index.html` y sus pruebas, y el Worker se queda solo con la redirección.
