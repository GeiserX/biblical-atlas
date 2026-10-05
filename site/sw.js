/* biblical-atlas · el sitio sin conexión (docs/development.md, «Sin conexión»). Un service worker que guarda cada
   versión del sitio entera en su caché y la sirve desde allí, con red o sin ella.

   - La versión y la huella SHA-256 de cada fichero publicado vienen de sw-manifest.js, que escribe scripts/build.py.
     Un fichero cambiado cambia la versión, y la versión da el nombre de la caché.
   - Al instalarse guarda PRECACHE (lo que hace falta para abrir las tres páginas) y LIBS (MapLibre, en la versión
     exacta que carga index.html). Lo que ya estaba en la caché anterior con la misma huella se copia, no se descarga.
   - El resto de lo nuestro (el detalle, el inglés, las listas de vídeos, los mapas de fondo, data.json) se guarda la
     primera vez que el sitio lo pide. Las teselas de OpenFreeMap también, en otra caché con tope: se sirven de la red
     y, sin red, de lo ya visto. Nunca se descarga nada que el sitio no haya pedido.
   - Un fichero cuya huella no es la de esta versión no se sirve ni se guarda: el servidor ya tiene otra versión, y
     mezclar un detalle nuevo con un núcleo viejo uniría datos que no casan. Responde 503 y busca la versión nueva.
   - Una versión nueva espera: js/offline.js avisa y la activa solo cuando quien lee pulsa «Recargar».
   - Lo que no está en el manifiesto (docs/, _local/, otros sitios) va a la red como si no hubiera worker. */
'use strict';
importScripts('sw-manifest.js');

const { version: VERSION, files: FILES } = self.SW_MANIFEST;
const PREFIX = 'biblical-atlas-v-';
const CACHE = PREFIX + VERSION;
const TILES = 'biblical-atlas-teselas';
const TILE_LIMIT = 600;          // teselas guardadas como mucho; al pasar, se borran las más antiguas
const TILE_HOST = /(^|\.)openfreemap\.org$/;
const SHA = 'x-sha256';          // cabecera con la huella de lo que se guarda: copiarlo a la versión siguiente no lo relee
const BASE = new URL('./', self.location).href;

// Lo que hace falta para abrir index.html, acerca.html y calendario.html. Un fichero nuevo que una de las tres pide
// al abrir entra aquí (docs/development.md); tests/site/offline.test.mjs falla si falta alguno.
const PRECACHE = [
  'index.html', 'acerca.html', 'calendario.html',
  'favicon.svg', 'apple-touch-icon.png', 'logo.svg',
  'kit/tokens.css', 'kit/fonts.css', 'kit/components.css',
  'kit/fonts/EBGaramond-italic-latin-ext.woff2', 'kit/fonts/EBGaramond-italic-latin.woff2',
  'kit/fonts/EBGaramond-normal-latin-ext.woff2', 'kit/fonts/EBGaramond-normal-latin.woff2',
  'kit/fonts/Inter-italic-latin.woff2', 'kit/fonts/Inter-normal-latin-ext.woff2', 'kit/fonts/Inter-normal-latin.woff2',
  'css/base.css', 'css/mapa.css', 'css/linea.css', 'css/estudio.css', 'css/notes.css', 'css/datepicker.css',
  'css/tactil.css', 'css/language.css', 'css/acerca.css', 'css/calendario.css', 'css/offline.css',
  'js/fundir-claves.js', 'js/migrar-claves.js', 'js/base.js', 'js/data-chunks.js', 'js/language.js', 'js/ficha.js',
  'js/mapa.js', 'js/trayectorias.js', 'js/linea-filas.js', 'js/linea.js', 'js/datepicker.js', 'js/ahora.js',
  'js/visit-history.js', 'js/buscar.js', 'js/grafo.js', 'js/lectura.js', 'js/recorridos.js', 'js/notes.js',
  'js/portada.js', 'js/tipos/lugar.js', 'js/tipos/carta.js', 'js/tipos/hallazgo.js', 'js/tipos/viaje.js',
  'js/tipos/parada.js', 'js/tipos/evento.js', 'js/tipos/periodo.js', 'js/tipos/persona.js', 'js/tipos/pasaje.js',
  'js/tipos/libro.js', 'js/tipos/recorrido.js', 'js/passage-link.js', 'js/volver.js', 'js/offline.js',
  'data.core.json',
];
const MAPLIBRE = 'https://unpkg.com/maplibre-gl@6.11.2/dist/';
const LIBS = ['maplibre-gl.css', 'maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs'].map((f) => MAPLIBRE + f);

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
/** «js/base.js» de una URL nuestra, sin la consulta; «index.html» para la raíz; null si no es de este sitio. */
function relPath(url) {
  if (!url.startsWith(BASE)) return null;
  const rel = decodeURIComponent(new URL(url).pathname.slice(new URL(BASE).pathname.length));
  return rel === '' ? 'index.html' : rel;
}
const stale = () => new Response('', { status: 503, statusText: 'Hay otra version del sitio' });

/** Un fichero nuestro de la red, guardado en `cache` solo si su huella es la de esta versión. Devuelve lo guardado,
    o null si la huella no casa. */
async function fetchOwn(cache, rel, mode = 'no-cache') {
  const res = await fetch(BASE + rel, { cache: mode });
  if (!res.ok) throw new Error(`${rel} respondió ${res.status}`);
  const buf = await res.arrayBuffer();
  const sha = hex(await crypto.subtle.digest('SHA-256', buf));
  if (sha !== FILES[rel]) return null;
  // Dos respuestas del mismo búfer, no un clone(): una rama sin leer de un clone puede frenar a la otra.
  const make = () => new Response(buf, { headers: { 'content-type': res.headers.get('content-type') || '', [SHA]: sha } });
  await cache.put(BASE + rel, make());
  return make();
}

async function install() {
  const missing = PRECACHE.filter((rel) => !FILES[rel]);
  if (missing.length) throw new Error(`PRECACHE nombra ficheros que no se publican: ${missing.join(', ')}`);
  const cache = await caches.open(CACHE);
  // Lo de las versiones anteriores que sigue igual pasa a esta: los mapas ya vistos, el detalle si no cambió, MapLibre.
  for (const name of (await caches.keys()).filter((k) => k.startsWith(PREFIX) && k !== CACHE)) {
    const old = await caches.open(name);
    for (const req of await old.keys()) {
      const rel = relPath(req.url);
      const res = await old.match(req);
      if (rel ? res.headers.get(SHA) === FILES[rel] : LIBS.includes(req.url)) await cache.put(req, res);
    }
  }
  for (const rel of PRECACHE) {
    if (await cache.match(BASE + rel)) continue;
    if (!(await fetchOwn(cache, rel))) throw new Error(`${rel} no es el de la versión ${VERSION}`);
  }
  for (const url of LIBS) {
    if (await cache.match(url)) continue;
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
    await cache.put(url, res);
  }
}

self.addEventListener('install', (e) => e.waitUntil(install()));
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('message', (e) => {
  if (e.data?.type === 'skip-waiting') self.skipWaiting();
  // La primera visita: lo que la página pidió antes de que el worker la controlara se guarda ya, desde la caché HTTP.
  if (e.data?.type === 'seen') e.waitUntil(remember(e.data.urls || []));
});
async function remember(urls) {
  const cache = await caches.open(CACHE);
  const tiles = await caches.open(TILES);
  for (const url of urls) {
    try {
      const rel = relPath(url);
      if (rel && FILES[rel] && !(await cache.match(BASE + rel))) await fetchOwn(cache, rel, 'force-cache');
      else if (!rel && TILE_HOST.test(new URL(url).hostname) && !(await tiles.match(url))) {
        const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
        if (res.ok) await keepTile(tiles, url, res);
      }
    } catch { /* lo que no esté ya en la caché HTTP se guardará cuando se vuelva a pedir */ }
  }
}

let puts = 0;
async function keepTile(tiles, url, res) {
  await tiles.put(url, res);
  if (++puts % 50) return;
  const keys = await tiles.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - TILE_LIMIT))) await tiles.delete(k);
}
/** OpenFreeMap: de la red, y sin red de lo ya visto. Cada respuesta buena se guarda mientras la página ya la lee, y al
    pasar de TILE_LIMIT se borran las más antiguas. */
async function tile(e) {
  const tiles = await caches.open(TILES);
  try {
    const res = await fetch(e.request);
    if (res.ok) e.waitUntil(keepTile(tiles, e.request.url, res.clone()));
    return res;
  } catch (err) {
    const hit = await tiles.match(e.request.url);
    if (hit) return hit;
    throw err;
  }
}

/** Lo nuestro: de la caché de esta versión; si no está, de la red, comprobado y guardado. */
async function own(rel) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(BASE + rel);
  if (hit) return hit;
  const res = await fetchOwn(cache, rel);
  if (res) return res;
  self.registration.update().catch(() => {});
  return stale();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (LIBS.includes(url.href)) { e.respondWith(caches.match(url.href, { cacheName: CACHE }).then((hit) => hit || fetch(req))); return; }
  if (TILE_HOST.test(url.hostname)) { e.respondWith(tile(e)); return; }
  const rel = relPath(url.href);
  if (rel && FILES[rel]) e.respondWith(own(rel));
});
