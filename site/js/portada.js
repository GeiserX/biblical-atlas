/* biblical-earth · portada (pantalla 15, #vista-portada): «Entra por una pregunta». La primera pantalla (título, caja,
   ejemplos, tres preguntas) está escrita en index.html y pinta antes que los datos; aquí vive lo que se mueve: la caja
   que contesta con la búsqueda del sitio, entrar en cada destino con una sola entrada de historial, «Seguir donde lo
   dejaste», las épocas, los recorridos y las cifras (con los datos), la luna y la letra grande.
   Sale al abrir el sitio sin dirección (o con #portada=1) y desde el logo o el menú «Estudio».
   Las reglas puras van en BE.portada.reglas y se prueban sin navegador (tests/site/portada-reglas.test.mjs). */
'use strict';
(() => {
const BE = window.BE;

// ---------------------------------------------------------------------------
// Reglas puras: sin DOM, para poder probarlas en Node
// ---------------------------------------------------------------------------
const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** La lista de la portada es plana: primero lo que se llama exactamente así (el título, o el título hasta la primera
    coma: «Juan, el apóstol» es «Juan»), y entre ellos el que más hechos tiene (peso); después por puntos y, a igualdad,
    en el orden de grupos del sitio (el que trae BE.buscar). Así «Corin» da primero el lugar Corinto (empieza así) y no
    una persona con una palabra que empieza así, y «Juan» da el apóstol y el libro antes que el gobernante de Hch 4:6. */
function ordenPortada(resultados, nq, peso = () => 0) {
  const exacta = (r) => (r.sel && (normal(r.titulo) === nq || normal(r.titulo.split(',')[0]).trim() === nq) ? 0 : 1);
  return resultados.map((r, i) => ({ r, i, e: exacta(r) }))
    .sort((a, b) => a.e - b.e || (a.e ? (b.r.puntos || 0) - (a.r.puntos || 0) : peso(b.r) - peso(a.r)) || a.i - b.i)
    .map((x) => x.r);
}
const t4 = (t) => t.toFixed(4);
const v4 = (v) => String(+v.toPrecision(4));
/** Una época: la selección, el cursor en su principio y la línea con toda la época a la vista. El cursor va en la
    dirección, así que el mapa se encuadra en la fecha de la época y no en la de antes. */
function dirPeriodo(p, tMin, tMax) {
  const a = p.fecha.desde ?? p.fecha.hasta, b = (p.fecha.hasta ?? p.fecha.desde) + 1;
  return `sel=periodo:${p.id}&t=${t4(a + 0.01)}&v=${v4(Math.min(tMax - tMin, (b - a) / 0.6))}`;
}
const dirRecorrido = (r) => `sel=recorrido:${r.id}&paso=1`;
const dirLineaCompleta = (tMin, tMax) => `t=50.3000&v=${v4(tMax - tMin)}`;
/** Lo guardado en «Seguir donde lo dejaste» solo vale si es una dirección del sitio que no sea la propia portada. */
function vueltaValida(u) {
  return !!u && typeof u === 'object' && typeof u.hash === 'string' && u.hash.startsWith('#') && u.hash.length > 1
    && !/[#&]portada=1(&|$)/.test(u.hash);
}
/** Se guarda la vista cuando hay algo elegido o el modo lectura abierto, y la portada no está puesta. */
const debeGuardar = ({ abierta, sel, lectura }) => !abierta && (!!sel || !!lectura);
/** La línea de una época: la última frase de su resumen que nombra un libro de la Biblia («Lo cuentan Josué, Jueces y
    Rut.»); si ninguna lo nombra, la primera («Cuatro siglos sin libro bíblico.»). */
function lineaEpoca(resumen, libros) {
  const frases = String(resumen || '').match(/[^.!?]+[.!?]*/g)?.map((f) => f.trim()).filter(Boolean) || [];
  const nombres = libros.map((l) => normal(l)).filter(Boolean);
  const nombra = (f) => { const n = ` ${normal(f).replace(/[^a-z0-9ñ ]+/g, ' ')} `; return nombres.some((l) => n.includes(` ${l} `)); };
  return [...frases].reverse().find(nombra) || frases[0] || '';
}
const reglas = { ordenPortada, dirPeriodo, dirRecorrido, dirLineaCompleta, vueltaValida, debeGuardar, lineaEpoca };

if (typeof document === 'undefined') { BE.portada = { reglas }; return; }

// ---------------------------------------------------------------------------
// La hoja
// ---------------------------------------------------------------------------
const { E, esc, $, fechaCorta, tramo } = BE;
const CLAVE_ULTIMA = 'biblical-earth:ultima';
const raiz = document.documentElement;
const hoja = $('#vista-portada');
const input = $('#portada-q'), lista = $('#portada-lista'), estado = $('#portada-estado'), aviso = $('#portada-aviso');
const estrecha = () => matchMedia('(max-width: 760px)').matches;
const tactil = () => matchMedia('(pointer: coarse)').matches;
let abierta = raiz.classList.contains('be-con-portada');
let vuelta = { p: null, scroll: 0 };   // lo que se pulsó para entrar y dónde estaba la hoja, para volver igual
let esperando = null;                  // el control pulsado antes de que lleguen los datos

function ultima() { try { return JSON.parse(localStorage.getItem(CLAVE_ULTIMA) || 'null'); } catch { return null; } }

/** Pone o quita la hoja. Nunca la vacía: al volver está igual, con lo escrito en la caja. Lo de detrás queda inert. */
function mostrar(on) {
  if (!on) vuelta.scroll = hoja.scrollTop;
  raiz.classList.toggle('be-con-portada', on);
  for (const el of document.querySelectorAll('#app > *:not(#vista-portada)')) el.inert = on;
  if (on) hoja.scrollTop = vuelta.scroll;
}
function abrir({ desdeHash = false } = {}) {
  if (abierta) return;
  abierta = true;
  mostrar(true);
  pintarDatos();
  if (!desdeHash) BE.guardarHash();
  cerrarLista();
  let f = vuelta.p && hoja.querySelector(`[data-p="${CSS.escape(vuelta.p)}"]`);
  // En el teléfono, volver a la caja sacaría el teclado: el foco va a su botón.
  if (vuelta.p === 'q') f = tactil() ? hoja.querySelector('[data-p="ir"]') : input;
  (f && !f.closest('[hidden]') ? f : $('#portada-titulo')).focus({ preventScroll: true });
  anunciar('Portada.');
}
/** Quita la hoja sin cambiar la vista de detrás. El foco pasa al primer control del sitio (nunca a la caja de arriba,
    que en el teléfono abriría el teclado). */
function cerrarHoja({ foco = true } = {}) {
  if (!abierta) return;
  abierta = false;
  cerrarLista();
  mostrar(false);
  soltarEspera();
  if (foco) $('#inicio')?.focus({ preventScroll: true });
}
/** «Explorar» de siempre (menú, llamadas de otros módulos): la vista de detrás tal como está. */
function cerrar() {
  if (!abierta) return;
  BE.historia.entrar(() => { cerrarHoja(); BE.guardarHash(); });
}

const anunciar = (texto) => { estado.textContent = ''; setTimeout(() => { estado.textContent = texto; }, 30); };
function clave(el) { return el?.closest?.('[data-p]')?.dataset.p || null; }

// ---------------------------------------------------------------------------
// Entrar: cada control es un enlace a una dirección que el sitio ya entiende
// ---------------------------------------------------------------------------
/** Aplica la dirección como la aplica un enlace compartido, con una sola entrada nueva en el historial. */
function entrarEn(href, desde) {
  vuelta.p = clave(desde);
  if (BE.D) {
    BE.historia.entrar(() => { cerrarHoja(); history.replaceState(null, '', href); BE.aplicarHash(false); });
    return;
  }
  if (BE.fallo) { avisarFallo(); return; }
  // Antes de los datos: la portada se queda con «Abriendo el mapa…» y el arranque lee la dirección como si fuera un
  // enlace compartido (la portada se quita al leerla). La entrada de la portada se guarda una sola vez.
  if (!esperando) history.pushState(null, '', location.href);
  history.replaceState(null, '', href);
  esperando?.removeAttribute('aria-busy');
  esperando = desde?.closest?.('a, button') || null;
  esperando?.setAttribute('aria-busy', 'true');
  aviso.textContent = 'Abriendo el mapa…';
}
/** El control pulsado antes de los datos deja de esperar: al llegar los datos, al quitar la hoja o con Atrás. */
function soltarEspera() {
  esperando?.removeAttribute('aria-busy');
  esperando = null;
  aviso.textContent = '';
}
// Atrás antes de los datos: la dirección vuelve a la portada y el arranque la leerá; aquí solo se quita la espera.
window.addEventListener('popstate', () => { if (!BE.D && esperando) soltarEspera(); });
function avisarFallo() {
  esperando?.removeAttribute('aria-busy');
  aviso.innerHTML = '<span>No se ha podido abrir el mapa.</span><button type="button" class="be-btn" data-p="reintentar">Volver a intentarlo</button>';
}
BE.alFallar = () => { if (abierta) avisarFallo(); };

hoja.addEventListener('click', (e) => {
  if (e.target.closest('[data-p="reintentar"]')) { location.reload(); return; }
  const a = e.target.closest('a[href^="#"]');
  // Con Ctrl, Cmd, Mayúsculas o el botón central se abre aparte, como cualquier enlace.
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  entrarEn(a.getAttribute('href'), a);
});

// ---------------------------------------------------------------------------
// La caja: contesta mientras se escribe, con la búsqueda del sitio
// ---------------------------------------------------------------------------
let filas = [], activa = 0, todas = 0;
const maxFilas = () => (estrecha() ? 4 : 6);
function filasDe(q) {
  todas = 0;
  if (!BE.D) {
    const y = BE.anioPregunta(q);   // la misma regla que la búsqueda del sitio: «607» es a.e.c.
    return y == null ? [] : [{ anio: y, titulo: `Ir a ${BE.fmtAnio(y)}`, forma: 'anio', tipo: 'fecha', meta: 'mueve el cursor de tiempo y enseña quién había' }];
  }
  const rs = ordenPortada(BE.buscar(q), normal(q).trim().replace(/\s+/g, ' '), BE.pesador());
  todas = rs.length;
  return rs.slice(0, maxFilas()).map((r) => ({ r, ...BE.filaResultado(r) }));
}
function pintarLista() {
  const q = input.value;
  if (!q.trim()) { cerrarLista(); return; }
  let html;
  if (filas.length) {
    html = filas.map((f, i) => {
      // La fecha va en su píldora y no se repite en la línea (BE.filaResultado ya la quita de ahí).
      const fecha = f.fecha || '';
      const meta = [f.meta && normal(f.meta).startsWith(normal(f.tipo)) ? '' : f.tipo, f.etiqueta, f.meta].filter(Boolean).join(' · ');
      return `<li role="option" id="portada-op-${i}" class="portada-op${i === activa ? ' portada-op--activa' : ''}" aria-selected="${i === activa}" data-i="${i}">
        <svg class="forma" aria-hidden="true"><use href="#f-${f.forma}"/></svg><span class="portada-op__texto"><span class="portada-op__tit">${BE.marcar(f.titulo, q)}</span><span class="portada-op__meta">${esc(meta)}</span></span>${fecha ? `<span class="portada-fecha">${esc(fecha)}</span>` : ''}</li>`;
    }).join('');
    if (BE.D && todas > filas.length && !estrecha()) {
      html += `<li role="option" id="portada-op-todo" class="portada-op portada-op--todo${activa === filas.length ? ' portada-op--activa' : ''}" aria-selected="${activa === filas.length}" data-todo="1"><span class="portada-op__texto"><span class="portada-op__tit">Ver los ${todas} resultados en el mapa</span></span></li>`;
    }
  } else if (!BE.D) {
    html = `<li class="portada-op portada-op--vacia" role="presentation">${BE.fallo ? 'No se ha podido abrir el mapa.' : 'Cargando los nombres…'}</li>`;
  } else {
    const sug = BE.sugerencias(q);
    html = `<li class="portada-op portada-op--vacia" role="presentation"><span>No encontramos «${esc(q.trim())}».</span>${sug.length ? `<span>¿Querías decir ${sug.map((s) => `<button type="button" class="portada-sugerencia" data-sugerencia="${esc(s.n)}">${esc(s.n)}</button>`).join(', ')}?</span>` : ''}<span>Prueba con una persona, un lugar, un capítulo o un año.</span></li>`;
  }
  lista.innerHTML = html;
  lista.hidden = false;
  // Sin opciones la caja no ofrece lista: el aviso (y sus botones de «¿Querías decir…?») se ve igual, pero no es un
  // listbox, y la caja no apunta a ninguna opción.
  const n = lista.querySelectorAll('[role="option"]').length;
  lista.setAttribute('role', n ? 'listbox' : 'none');
  input.setAttribute('aria-expanded', String(n > 0));
  if (n) input.setAttribute('aria-activedescendant', activa === filas.length ? 'portada-op-todo' : `portada-op-${activa}`);
  else input.removeAttribute('aria-activedescendant');
  // Lo que se anuncia es lo que se ofrece: en el teléfono, sin la fila «Ver los…», «4 de 14 sugerencias».
  const total = todas || filas.length, sinTodo = filas.length < total && n === filas.length;
  const texto = filas.length ? `${sinTodo ? `${filas.length} de ${total}` : total} ${total === 1 ? 'sugerencia' : 'sugerencias'}` : (BE.D ? `No encontramos «${q.trim()}».` : 'Cargando los nombres…');
  if (texto !== estado.textContent) estado.textContent = texto;
}
function cerrarLista() {
  lista.hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
}
function actualizar() { filas = filasDe(input.value); activa = 0; pintarLista(); }
function ultimaFila() { return filas.length - 1 + (BE.D && todas > filas.length && !estrecha() ? 1 : 0); }
function elegir(i) {
  const q = input.value;
  vuelta.p = 'q';
  if (i === filas.length && todas > filas.length) {   // la lista entera, en la caja del sitio
    BE.historia.entrar(() => { cerrarHoja({ foco: false }); BE.guardarHash(); BE.buscarTexto(q); });
    return;
  }
  const f = filas[i];
  if (!f) return;
  cerrarLista();
  if (f.anio != null) { entrarEn(`#t=${t4(f.anio + 0.5)}`, input); return; }
  BE.historia.entrar(() => { cerrarHoja(); BE.elegirResultado(f.r); BE.guardarHash(); });
}
input.addEventListener('input', actualizar);
input.addEventListener('focus', () => { if (input.value.trim()) actualizar(); });
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' && !lista.hidden) { e.preventDefault(); activa = Math.min(activa + 1, ultimaFila()); pintarLista(); }
  else if (e.key === 'ArrowUp' && !lista.hidden) { e.preventDefault(); activa = Math.max(activa - 1, 0); pintarLista(); }
  else if (e.key === 'Escape') {
    // La portada es una página, no un diálogo: Esc cierra la lista y, la segunda vez, borra lo escrito.
    e.stopPropagation();
    if (!lista.hidden) { e.preventDefault(); cerrarLista(); }
    else if (input.value) { e.preventDefault(); input.value = ''; }
  }
});
input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input && !lista.contains(document.activeElement)) cerrarLista(); }, 150));
let tragarClic = false;
document.addEventListener('click', (e) => { if (tragarClic) { tragarClic = false; e.preventDefault(); e.stopPropagation(); } }, true);
const probarSugerencia = (s) => { input.value = s.dataset.sugerencia; actualizar(); input.focus(); };
// «¿Querías decir…?» también con el teclado (Tab hasta el botón e Intro).
lista.addEventListener('click', (e) => { const s = e.target.closest('[data-sugerencia]'); if (s && !e.detail) probarSugerencia(s); });
lista.addEventListener('pointerdown', (e) => {
  const s = e.target.closest('[data-sugerencia]');
  if (s) { e.preventDefault(); probarSugerencia(s); return; }
  const o = e.target.closest('[data-i], [data-todo]');
  if (!o) return;
  e.preventDefault();
  // Al elegir se cierra la lista; el clic que sigue al toque caería en la tarjeta de debajo.
  tragarClic = true;
  setTimeout(() => { tragarClic = false; }, 600);
  elegir(o.dataset.todo ? filas.length : +o.dataset.i);
});
$('#portada-busca').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!input.value.trim()) { entrarEn($('.portada-abrir').getAttribute('href'), e.submitter || input); return; }
  if (!filas.length) actualizar();
  if (filas.length) elegir(Math.max(0, activa));
  else { pintarLista(); input.focus(); }
});
BE.ajustarAyuda(input, 'Pedro, Hechos 16, 607 a.e.c.', 'Pedro, Hechos 16…', 'Pregunta aquí');
// «/» busca en la caja de la portada mientras está puesta (la de arriba está detrás).
document.addEventListener('keydown', (e) => {
  if (!abierta || e.key !== '/' || e.target.matches?.('input, textarea, select')) return;
  e.preventDefault(); e.stopImmediatePropagation();
  input.focus();
}, true);

// En el teléfono la barra de la caja va sobre el teclado: iOS y Chrome para Android solo encogen la parte visible.
const vv = window.visualViewport;
if (vv) {
  const sobreTeclado = () => {
    hoja.style.setProperty('--teclado', `${Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop))}px`);
    hoja.style.setProperty('--alto-visible', `${Math.round(vv.height)}px`);
  };
  vv.addEventListener('resize', sobreTeclado);
  vv.addEventListener('scroll', sobreTeclado);
  sobreTeclado();
}

// ---------------------------------------------------------------------------
// Letra grande y modo reunión: las mismas preferencias que el menú y la luna del sitio
// ---------------------------------------------------------------------------
const letra = $('#portada-letra'), luna = $('#portada-reunion');
function pintarAjustes() {
  letra.setAttribute('aria-pressed', String(raiz.classList.contains('be-letra-grande')));
  luna.setAttribute('aria-pressed', String(raiz.classList.contains('be-reunion')));
}
letra.addEventListener('click', () => BE.ponerPreferencia('letra-grande', !raiz.classList.contains('be-letra-grande')));
luna.addEventListener('click', () => BE.ponerPreferencia('reunion', !raiz.classList.contains('be-reunion')));
new MutationObserver(pintarAjustes).observe(raiz, { attributes: true, attributeFilter: ['class'] });
pintarAjustes();

// ---------------------------------------------------------------------------
// «Seguir donde lo dejaste»: la última vista con algo elegido, solo en este navegador
// ---------------------------------------------------------------------------
function pintarSeguir() {
  const u = ultima(), caja = $('#portada-seguir');
  if (!vueltaValida(u)) { caja.hidden = true; caja.innerHTML = ''; raiz.classList.remove('be-vuelve'); return; }
  caja.innerHTML = `<a class="portada-seguir__ir" href="${esc(u.hash)}" data-p="seguir"><span>Seguir donde lo dejaste</span><b>${esc(u.texto || 'tu última vista')}</b></a><button type="button" class="portada-seguir__olvidar" data-p="olvidar">Olvidar</button>`;
  caja.hidden = false;
}
$('#portada-seguir').addEventListener('click', (e) => {
  if (!e.target.closest('[data-p="olvidar"]')) return;
  try { localStorage.removeItem(CLAVE_ULTIMA); } catch { /* sin almacenamiento */ }
  pintarSeguir();
  (tactil() ? $('#portada-titulo') : input).focus();
  anunciar('Olvidado.');
});
pintarSeguir();
// La vista se guarda un poco después de pintarla, con la dirección de ese momento (no con la que base.js escribe
// 250 ms más tarde, que era la de antes).
let guardarTimer = 0;
BE.pintores.push(() => {
  if (!debeGuardar({ abierta, sel: E.sel, lectura: BE.lectura?.abierta })) return;
  clearTimeout(guardarTimer);
  guardarTimer = setTimeout(() => {
    if (!debeGuardar({ abierta, sel: E.sel, lectura: BE.lectura?.abierta })) return;
    const hash = `#${BE.textoHash()}`;
    const leer = !E.sel && new URLSearchParams(hash.slice(1)).get('leer');
    const p = leer && BE.pasajeDeId?.(leer);
    const que = E.sel ? BE.nombreSel(E.sel) : (p ? `${p.libro.nombre} ${p.cap}` : '');
    const texto = [que, BE.fmtCursor(E.t)].filter(Boolean).join(' · ');
    try { localStorage.setItem(CLAVE_ULTIMA, JSON.stringify({ hash, texto })); } catch { /* sin almacenamiento */ }
  }, 400);
});

// ---------------------------------------------------------------------------
// Con los datos: épocas, recorridos, cifras, la fecha de los datos y los destinos que existen
// ---------------------------------------------------------------------------
let pintados = false;
function destinoExiste(href) {
  const p = new URLSearchParams(href.slice(1));
  if (p.has('sel') && !BE.parseSel(p.get('sel'))) return false;
  if (p.has('leer') && !BE.pasajeDeId(p.get('leer'))) return false;
  if (p.has('conexion') && !p.get('conexion').split('~').every((x) => BE.parseSel(x))) return false;
  return true;
}
/** Las primeras frases de un texto, hasta unos 60 caracteres (en un recorrido sin resumen, su primera parada). */
function primeras(texto) {
  const fr = String(texto || '').match(/[^.!?]+[.!?]+/g) || [String(texto || '')];
  let out = '';
  for (const f of fr) { out += f; if (out.trim().length >= 60) break; }
  return out.trim();
}
function pintarDatos() {
  if (pintados || !BE.D) return;
  pintados = true;
  const D = BE.D;
  const libros = (D.libros?.length ? D.libros : BE.LIBROS || []).map((l) => l.nombre);   // los 66, aunque libro.js aún no los haya puesto
  const eras = (D.periodos || []).filter((p) => p.tipo === 'era' && tramo(p.fecha)).sort((a, b) => tramo(a.fecha)[0] - tramo(b.fecha)[0]);
  $('#portada-epocas').innerHTML = eras.map((p, i) => `<li><a class="portada-epoca${/sin libro/i.test(p.resumen || '') ? ' portada-epoca--sin-libro' : ''}" href="#${dirPeriodo(p, BE.T_MIN, BE.T_MAX)}" data-p="era-${esc(p.id)}">
    <span class="portada-epoca__n">${i + 1}</span><span class="portada-epoca__texto"><span class="portada-epoca__nombre">${esc(p.nombre)}</span><span class="portada-epoca__fecha">${esc(p.fecha.texto || fechaCorta(p.fecha))}</span>${p.resumen ? `<span class="portada-epoca__resumen">${esc(lineaEpoca(p.resumen, libros))}</span>` : ''}</span></a></li>`).join('');
  $('#portada-linea-completa').setAttribute('href', `#${dirLineaCompleta(BE.T_MIN, BE.T_MAX)}`);
  $('#portada-recorridos').innerHTML = (D.recorridos || []).filter((r) => r.paradas?.length).map((r) => {
    const fecha = BE.fechaSel({ tipo: 'recorrido', id: r.id });
    return `<li><a class="portada-recorrido" href="#${dirRecorrido(r)}" data-p="rec-${esc(r.id)}">
      <span class="portada-recorrido__caps"><svg class="forma" aria-hidden="true"><use href="#f-ruta"/></svg>Recorrido · ${r.paradas.length} paradas</span>
      <span class="portada-recorrido__tit">${esc(r.titulo)}</span>${fecha ? `<span class="portada-fecha">${esc(fecha)}</span>` : ''}
      <span class="portada-recorrido__linea">${esc(r.resumen || primeras(r.paradas[0].texto))}</span>
      <span class="portada-recorrido__ir" aria-hidden="true">Empezar</span></a></li>`;
  }).join('');
  const n = (x) => (Array.isArray(x) ? x.length : Object.keys(x || {}).length);
  const partes = [[n(D.eventos), 'sucesos'], [n(D.lugares), 'lugares'], [n(D.personas), 'personas']].filter(([k]) => k > 0).map(([k, w]) => `${k.toLocaleString('es')} ${w}`);
  const fuentes = n(D.fuentes);
  $('#portada-cifras').textContent = partes.length
    ? `${partes.length > 1 ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}` : partes[0]}.${fuentes ? ` ${fuentes.toLocaleString('es')} fuentes citadas.` : ''}` : '';
  if (D.generado) $('#portada-generado').textContent = ` · Datos del ${BE.fmtDia(D.generado)}`;
  // Un destino escrito a mano que ya no está en los datos no se ofrece.
  for (const a of hoja.querySelectorAll('.portada-ejemplos a, .portada-tarjetas a, .portada-mas a')) {
    if (!destinoExiste(a.getAttribute('href'))) a.closest('li').hidden = true;
  }
  if (document.activeElement === input && input.value.trim()) actualizar();   // lo escrito antes de los datos
}
// Con los datos, nada sigue «Abriendo el mapa…»: si la dirección es un destino, el arranque quita la hoja al leerla.
BE.inicios.push(() => { soltarEspera(); if (abierta) pintarDatos(); });

// ---------------------------------------------------------------------------
// La dirección: #portada=1 es la portada, con su propia entrada de historial
// ---------------------------------------------------------------------------
BE.parametros.push({ nombre: 'portada', historia: true, escribir: () => (abierta ? '1' : null),
  leer(v) { if (v === '1') { if (!abierta) abrir({ desdeHash: true }); } else if (abierta) cerrarHoja(); } });
// El logo lleva a la portada, y base.js vuelve al inicio del mapa detrás (su escucha va después de esta): las dos
// cosas son un solo paso, con una sola entrada nueva, y Atrás vuelve a la vista de antes.
$('#inicio').addEventListener('click', () => { if (BE.D && !abierta) BE.historia.entrar(() => abrir()); });

// Al abrir sin dirección, la entrada de la portada lleva #portada=1: Atrás desde el mapa vuelve a ella.
// El foco va a la hoja (sin mover la página ni sacar el teclado del teléfono): Av Pág, las flechas y el espacio la
// desplazan a ella, y las teclas del sitio de detrás no se disparan.
if (abierta) {
  if (!location.hash || location.hash === '#') history.replaceState(null, '', '#portada=1');
  mostrar(true);
  hoja.focus({ preventScroll: true });
}

BE.portada = { abrir, cerrar, get abierta() { return abierta; }, reglas };
})();
