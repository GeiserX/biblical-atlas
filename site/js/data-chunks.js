/* biblical-atlas · los datos en dos trozos (docs/development.md, «Los trozos de los datos»). El sitio abre con
   data.core.json, lo que pintan el mapa, la línea de tiempo y la portada, y pide data.detail.json (los textos de las
   fichas, las relaciones y las fuentes) la primera vez que una ficha, el grafo, la conexión o la búsqueda lo necesitan,
   al entrar en una caja de búsqueda o cuando el mapa queda quieto por primera vez. Cada trozo se pide una sola vez: se
   guarda su promesa. Desde file:// carga data.js, que trae los datos enteros, como siempre. Si no hay data.core.json
   (una carpeta de ?datos= compilada antes de los trozos), carga data.json entero. */
'use strict';
(() => {
const BE = window.BE;
const FILE = location.protocol === 'file:';

/** ?datos=_local/<carril>/data.json carga otro data.json para probar. Solo vale una ruta dentro de _local/
    (ignorada en git) que acabe en .json. Cualquier otra cosa es un error, para no enseñar en silencio los datos de siempre. */
function dataPath() {
  const r = new URLSearchParams(location.search).get('datos');
  if (r == null) return 'data.json';
  if (/^_local\/[\w./-]+\.json$/.test(r) && !r.split('/').includes('..')) return r;
  throw new Error(`?datos=${r} no vale: solo se aceptan rutas dentro de _local/ que acaben en .json.`);
}
/** data.json → data.core.json, data.detail.json: los trozos viven junto a su data.json. */
const chunkPath = (name) => dataPath().replace(/\.json$/, `.${name}.json`);

async function fetchJson(path) {
  const r = await fetch(path, { cache: 'no-cache' });
  if (!r.ok) throw Object.assign(new Error(`${path} respondió ${r.status}`), { status: r.status });
  return r.json();
}
function loadScript(src) {
  return new Promise((ok) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = ok;
    document.head.appendChild(s);
  });
}

let whole = false;          // BE.D trae los datos enteros (file:// o data.json): no hay nada más que pedir
let core = null;            // promesa del núcleo
const loads = new Map();    // nombre del trozo → promesa de ese trozo ya unido al núcleo
const merged = new Set();   // trozos ya unidos
const waiting = new Set();  // repintados que esperan al detalle
let failure = null, failedAt = 0;   // el error de la última descarga fallida y cuándo
const RETRY_MS = 5000;      // tras un fallo, un repintado no vuelve a pedirlo antes: nada de bucles sin red

/** El núcleo, o los datos enteros si no hay núcleo. base.js lo pone en BE.D al arrancar. */
function loadCore() {
  if (!core) {
    core = (async () => {
      const path = dataPath();
      if (FILE) {
        const js = path.replace(/\.json$/, '.js');
        if (!window.BIBLICAL_ATLAS_DATA) await loadScript(js);
        if (!window.BIBLICAL_ATLAS_DATA) throw new Error(`No encuentro ${js} junto a index.html.`);
        whole = true;
        return window.BIBLICAL_ATLAS_DATA;
      }
      try { return await fetchJson(chunkPath('core')); } catch (err) { if (err.status !== 404) throw err; }
      whole = true;
      return fetchJson(path);
    })();
  }
  return core;
}

/** Une `detail` a `target` como scripts/build.py (merge_chunks): un objeto clave a clave, una lista posición a
    posición (null no aporta nada) y cualquier otro valor se pone. Los objetos del núcleo se conservan: quien ya
    guardaba un lugar o una persona ve sus textos al llegar. */
function mergeInto(target, detail) {
  if (Array.isArray(target) && Array.isArray(detail)) {
    detail.forEach((d, i) => { if (d != null) target[i] = mergeInto(target[i], d); });
    return target;
  }
  if (target && detail && typeof target === 'object' && typeof detail === 'object' && !Array.isArray(target) && !Array.isArray(detail)) {
    for (const [k, v] of Object.entries(detail)) target[k] = k in target ? mergeInto(target[k], v) : v;
    return target;
  }
  return detail;
}

/** Pide un trozo (hoy solo hay uno, «detail») y lo une al núcleo, que es BE.D. La promesa se guarda: pedirlo otra
    vez no lo descarga otra vez. Si la descarga falla, la siguiente petición lo intenta de nuevo. */
function load(name = 'detail') {
  if (whole || merged.has(name)) return Promise.resolve();
  if (!loads.has(name)) {
    failure = null;
    // Pedido antes de que llegue el núcleo (una dirección que abre una ficha), baja a la vez que él.
    const pending = FILE ? null : fetchJson(chunkPath(name));
    pending?.catch(() => {});   // si el núcleo resulta ser data.json entero, el detalle sobra
    const p = loadCore().then(async (D) => {
      if (!whole) {
        mergeInto(D, await pending);
        // language.js: lo recién llegado pasa al idioma de quien lee. Antes de que base.js ponga BE.D no: los scripts
        // que vienen detrás aún no han corrido, y el apply de base.js al arrancar ya cubre lo unido.
        if (BE.D) await BE.idioma?.apply(D);
      }
      merged.add(name);
    });
    loads.set(name, p);
    p.catch((err) => { loads.delete(name); failure = err; failedAt = Date.now(); }).finally(() => {
      const fs = [...waiting];
      waiting.clear();
      fs.forEach((f) => f());
    });
  }
  return loads.get(name);
}
/** ¿Está el detalle? Si no, lo pide y llama a `repaint` cuando llegue, o cuando falle, para que lo diga: una ficha,
    el grafo, la conexión o la búsqueda pintan un aviso mientras tanto. Tras un fallo, un repintado no lo vuelve a
    pedir antes de RETRY_MS; la acción siguiente (otra ficha, otra búsqueda) sí. */
function ready(repaint, name = 'detail') {
  if (whole || merged.has(name)) return true;
  if (repaint) waiting.add(repaint);
  if (!failure || Date.now() - failedAt > RETRY_MS) load(name).catch(() => {});   // el fallo lo dice waitingHtml
  return false;
}
/** ¿Está el detalle? Si no, llama a `repaint` cuando llegue, sin pedirlo antes de tiempo: «Ahora mismo» se pinta con
    el núcleo y otra vez con los textos de la parada en curso cuando el detalle llega por su cuenta. */
function whenReady(repaint, name = 'detail') {
  if (whole || merged.has(name)) return true;
  waiting.add(repaint);
  return false;
}
/** El aviso mientras llega el detalle, o el error si no llegó. */
function waitingHtml(what = 'la ficha') {
  return failure
    ? `<div class="be-card__pad"><p class="be-muted" role="status">No se pudo cargar ${what}: ${BE.esc(failure.message)}. Vuelve a intentarlo en unos segundos o recarga la página.</p></div>`
    : `<div class="be-card__pad"><p class="be-muted" role="status" aria-busy="true">Cargando ${what}…</p></div>`;
}

// El detalle se pide antes de que haga falta. Si la dirección ya abre una ficha (también un enlace a un pasaje, #p=),
// el grafo o la conexión, a la vez que el núcleo: si esperara al mapa, en el teléfono llegaría detrás de su relieve. Si no, al entrar en una caja de
// búsqueda y cuando el mapa queda quieto por primera vez (después del primer pintado, sin quitarle red a sus teselas).
// La primera regla va al final del fichero, cuando BE.chunks ya existe.
document.addEventListener('focusin', (e) => { if (e.target.matches?.('#q, #portada-q')) load().catch(() => {}); });
BE.inicios.push(() => {
  const gl = BE.mapa?.gl;
  const pedir = () => load().catch(() => {});
  if (gl?.once) gl.once('idle', pedir);
  else pedir();
});

BE.chunks = {
  loadCore, load, ready, whenReady, waitingHtml, mergeInto,
  get loaded() { return whole ? ['whole'] : [...merged]; },
  get failed() { return !!failure; },
};
try { if (/(^#|&)(sel|grafo|conexion|p)=/.test(location.hash)) load().catch(() => {}); } catch { /* ?datos= no vale: lo dice el arranque */ }
})();
