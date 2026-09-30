/* biblical-earth · lo que comparten los seis prototipos de la portada:
   - Dónde está el sitio de detrás. Servidos desde la raíz del repositorio, los prototipos viven en
     docs/ideas/mockups/portada/<diseño>/ y el sitio en site/, cinco carpetas más arriba. Si la ruta no es esa (la carpeta
     de los prototipos servida sola, por ejemplo), no hay sitio al lado y se usa el publicado. ?site=<dirección> manda.
   - Qué pasa si el sitio no carga: el marco se vigila y, si su documento no es el sitio, le falta MapLibre o no llegan
     los datos, la portada se queda puesta y lo dice, con un botón para volver a intentarlo. Mientras tanto, quien pulsa
     antes de tiempo ve «Abriendo el mapa…».
   - La letra grande del sitio, con su misma clave (site/js/recorridos.js): se pone antes de pintar y vale también para
     el marco.
   - Los enlaces del HTML a site/ (acerca, créditos) se rehacen hacia el sitio que se usa.
   El tema (tokens, componentes y las dos fuentes) va copiado en ./kit, así que la página se ve igual sin site/ al lado.
   Sin dependencias; se carga en el <head>, antes del guion de cada diseño. */
(function () {
  'use strict';
  const PUBLICO = 'https://biblical-earth.geiser.cloud/';
  const raiz = document.documentElement;
  const pedido = new URLSearchParams(location.search).get('site');
  const enRepo = /^https?:$/.test(location.protocol) && /\/docs\/ideas\/mockups\/portada\/[^/]+\/(index\.html)?$/.test(location.pathname);
  const base = pedido ? new URL(pedido.replace(/index\.html$/, '').replace(/\/?$/, '/'), location.href).href
    : enRepo ? new URL('../../../../../site/', location.href).href : PUBLICO;
  const mismoOrigen = new URL(base).origin === location.origin;
  /** Una página del sitio, con su ancla: url('acerca.html', 'gracias'). */
  const url = (pagina = 'index.html', ancla = '') => new URL(pagina + (ancla ? `#${String(ancla).replace(/^#/, '')}` : ''), base).href;
  // Los enlaces escritos en el HTML hacia site/ (acerca, créditos) apuntan al sitio que se usa, esté donde esté.
  const LOCAL = '../../../../../site/';
  function reescribir(r = document) {
    r.querySelectorAll(`a[href^="${LOCAL}"]`).forEach((a) => { a.href = base + a.getAttribute('href').slice(LOCAL.length); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => reescribir()); else reescribir();

  // -------------------------------------------------------------------------------------------------------------
  // Letra grande: antes de pintar, como el modo reunión
  // -------------------------------------------------------------------------------------------------------------
  const CLAVE_LETRA = 'biblical-earth:pref:letra-grande';
  try { if (localStorage.getItem(CLAVE_LETRA) === '1') raiz.classList.add('be-letra-grande'); } catch { /* sin almacenamiento */ }
  /** Un botón «Letra grande» con aria-pressed; ventana() da la del marco (mismo origen) o null. */
  function letraGrande(boton, ventana = () => null) {
    const pintar = () => boton.setAttribute('aria-pressed', String(raiz.classList.contains('be-letra-grande')));
    pintar();
    boton.addEventListener('click', () => {
      const on = !raiz.classList.contains('be-letra-grande');
      raiz.classList.toggle('be-letra-grande', on);
      try { localStorage.setItem(CLAVE_LETRA, on ? '1' : '0'); } catch { /* sin almacenamiento */ }
      pintar();
      let w = null;
      try { w = ventana(); void w?.document; } catch { w = null; }
      if (w?.document) {
        w.document.documentElement.classList.toggle('be-letra-grande', on);
        const B = w.BE;
        if (B?.sucio) { const s = B.sucio; s.etiquetas = s.panel = s.linea = s.mapa = true; B.programar?.(); }
      }
      window.dispatchEvent(new Event('resize'));   // lo que se coloca midiendo (líneas de fechas, nombres) se recoloca
    });
  }

  // -------------------------------------------------------------------------------------------------------------
  // La ayuda de una caja de búsqueda: la más larga de las opciones que cabe entera (como BE.ajustarAyuda en el sitio).
  // Se mide con un texto de verdad en la misma letra, y otra vez cuando llegan las fuentes o cambia el ancho.
  // -------------------------------------------------------------------------------------------------------------
  function ajustarAyuda(input, opciones) {
    const medir = document.createElement('span');
    medir.setAttribute('aria-hidden', 'true');
    medir.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre';
    const poner = () => {
      if (!medir.isConnected) document.body.append(medir);
      const cs = getComputedStyle(input);
      medir.style.font = cs.font; medir.style.letterSpacing = cs.letterSpacing;
      const libre = input.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4;
      input.placeholder = opciones.find((t) => { medir.textContent = t; return medir.offsetWidth <= libre; }) || opciones[opciones.length - 1];
    };
    poner();
    addEventListener('resize', poner);
    document.fonts?.addEventListener?.('loadingdone', poner);
    document.fonts?.ready.then(poner);
    return poner;
  }

  // -------------------------------------------------------------------------------------------------------------
  // El aviso: «Abriendo el mapa…» mientras se espera, y el fallo con «Volver a intentarlo»
  // -------------------------------------------------------------------------------------------------------------
  const ESTILO = `
.be-letra-grande { --fs-2xs: 12.5px; --fs-xs: 13.5px; --fs-sm: 15px; --fs-md: 16.5px; --fs-lg: 18.5px; --fs-xl: 22px; --fs-2xl: 27px; --fs-3xl: 33px; }
.ps-aviso { position: fixed; z-index: 2147483000; top: max(12px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%);
  width: min(30rem, calc(100vw - 24px)); box-sizing: border-box; display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 16px;
  border: 1px solid var(--line-2, #c1ccc2); border-radius: var(--r-lg, 14px); background: var(--surface, #fbfcfa); color: var(--ink, #18221c);
  box-shadow: var(--shadow-3, 0 18px 48px rgba(20, 40, 25, .18)); font: 500 var(--fs-md, 14px)/1.4 var(--font-sans, system-ui, sans-serif); }
.ps-aviso[hidden] { display: none; }
.ps-aviso__texto { flex: 1; margin: 0; }
.ps-aviso__giro { flex: none; width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--line-2, #c1ccc2); border-top-color: var(--accent, #4a6f57); animation: ps-giro 0.9s linear infinite; }
.ps-aviso--fallo .ps-aviso__giro { display: none; }
.ps-aviso__boton { flex: none; min-height: 44px; padding: 0 14px; border: 1px solid var(--accent, #4a6f57); border-radius: var(--r-md, 10px);
  background: var(--accent, #4a6f57); color: var(--surface, #fbfcfa); font: 600 var(--fs-md, 14px)/1 var(--font-sans, system-ui, sans-serif); cursor: pointer; }
.ps-aviso__cerrar { flex: none; width: 44px; height: 44px; border: 0; border-radius: var(--r-md, 10px); background: none; color: var(--ink-2, #3c4a41); font-size: 22px; line-height: 1; cursor: pointer; }
.ps-aviso__boton:focus-visible, .ps-aviso__cerrar:focus-visible { outline: 3px solid var(--focus, #2c6a78); outline-offset: 2px; }
.ps-aviso__boton[hidden], .ps-aviso__cerrar[hidden] { display: none; }
@keyframes ps-giro { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ps-aviso__giro { animation: none; border-top-color: var(--line-2, #c1ccc2); } }
.be-reunion .ps-aviso__giro { animation: none; }`;
  let caja = null;
  function aviso() {
    if (caja) return caja;
    caja = document.createElement('div');
    caja.className = 'ps-aviso'; caja.hidden = true;
    caja.innerHTML = '<span class="ps-aviso__giro" aria-hidden="true"></span><p class="ps-aviso__texto" role="status"></p>'
      + '<button type="button" class="ps-aviso__boton" hidden>Volver a intentarlo</button>'
      + '<button type="button" class="ps-aviso__cerrar" aria-label="Cerrar el aviso" hidden>×</button>';
    caja.querySelector('.ps-aviso__boton').addEventListener('click', () => location.reload());
    caja.querySelector('.ps-aviso__cerrar').addEventListener('click', () => { caja.hidden = true; });
    document.body.append(caja);
    return caja;
  }
  // El estilo va ya en el <head>, para que la letra grande valga desde el primer pintado.
  { const st = document.createElement('style'); st.id = 'ps-estilo'; st.textContent = ESTILO; (document.head || raiz).append(st); }

  let esperas = 0, lento = 0;
  /** Alguien pulsó antes de que el sitio esté listo. Devuelve una promesa que dice si se puede entrar.
      preparado(): lo que además espera el diseño (su mapa, sus datos); el aviso sigue puesto hasta que lo cumple. */
  function esperar(preparado = null) {
    const hecho = () => !preparado || !!preparado();
    if (estado === 'listo' && hecho()) return Promise.resolve(true);
    if (estado === 'fallo') { avisar(); return Promise.resolve(false); }
    esperas += 1;
    const c = aviso();
    c.classList.remove('ps-aviso--fallo');
    c.querySelector('.ps-aviso__texto').setAttribute('role', 'status');
    c.querySelector('.ps-aviso__texto').textContent = 'Abriendo el mapa…';
    c.querySelector('.ps-aviso__boton').hidden = true; c.querySelector('.ps-aviso__cerrar').hidden = true;
    c.hidden = false;
    clearTimeout(lento);
    lento = setTimeout(() => { if (estado === 'cargando') c.querySelector('.ps-aviso__texto').textContent = 'Abriendo el mapa… La conexión va lenta; sigue cargando.'; }, 8000);
    return listo.then(async (ok) => {
      for (let i = 0; ok && !hecho() && i < 600; i++) await new Promise((r) => setTimeout(r, 100));
      esperas -= 1;
      clearTimeout(lento);
      if (ok && !hecho()) { ok = false; avisar(); }                              // 60 s más y el diseño sigue sin mapa
      else if (ok && !esperas) c.hidden = true;
      return ok;
    });
  }
  function avisar() {
    const c = aviso();
    clearTimeout(lento);
    c.classList.add('ps-aviso--fallo');
    const t = c.querySelector('.ps-aviso__texto');
    t.setAttribute('role', 'alert');
    t.textContent = 'No se ha podido abrir el mapa. Comprueba la conexión y vuelve a intentarlo.';
    c.querySelector('.ps-aviso__boton').hidden = false; c.querySelector('.ps-aviso__cerrar').hidden = false;
    c.hidden = false;
  }

  // -------------------------------------------------------------------------------------------------------------
  // Vigilar el marco: listo cuando el sitio tiene sus datos y su mapa; fallo si no es el sitio o no llega a estarlo
  // -------------------------------------------------------------------------------------------------------------
  let estado = 'cargando', alListo;
  const listo = new Promise((r) => { alListo = r; });
  function marcar(ok) {
    if (estado !== 'cargando') return;
    estado = ok ? 'listo' : 'fallo';
    alListo(ok);
    if (!ok && esperas) avisar();
  }
  /** El sitio publicado responde (otro origen: su documento no se puede mirar, solo si llega). */
  function alcanzable(ms = 8000) {
    const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
    return fetch(`${base}favicon.svg?sonda=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', signal: c.signal })
      .then(() => true, () => false).finally(() => clearTimeout(t));
  }
  const vistos = new WeakSet();
  function vigilar(marco) {
    if (!marco || vistos.has(marco) || !mismoOrigen) return;
    vistos.add(marco);
    marco.addEventListener('load', () => {
      if (estado !== 'cargando') return;
      let w;
      try { w = marco.contentWindow; if (!w || w.location.href === 'about:blank') return; void w.document.body; } catch { marcar(false); return; }
      if (!w.BE || !w.document.getElementById('app')) { marcar(false); return; }   // no es el sitio: una página 404
      if (!w.maplibregl) { marcar(false); return; }                               // MapLibre (unpkg.com) no llegó
      const t0 = Date.now();
      (function mirar() {
        if (estado !== 'cargando' || marco.contentWindow !== w) return;
        if (w.BE.D && w.BE.mapa?.gl) { marcar(true); return; }
        if (Date.now() - t0 > 60000) { marcar(false); return; }                     // los datos no llegan
        setTimeout(mirar, 250);
      }());
    });
  }
  /** Ir al sitio en esta pestaña (otro origen): solo si responde; si no, el aviso. */
  async function ir(url) {
    if (mismoOrigen || await esperar()) location.href = url;
  }
  // Con el sitio en otro origen no hay documento que mirar: basta con saber si responde.
  if (!mismoOrigen) alcanzable().then(marcar);

  window.PORTADA_SITIO = {
    base, mismoOrigen, publico: PUBLICO, enRepo,
    url, reescribir, vigilar, esperar, avisar, alcanzable, ir, letraGrande, ajustarAyuda,
    get estado() { return estado; },
    listo,
  };
}());
