/* Lo que comparten los cinco prototipos de la línea de tiempo, para que se comparen en las mismas condiciones:
   - los enlaces entre diseños llevan la dirección de este (fecha, escala, vista, marca elegida y tema), así que el
     otro diseño abre en el mismo sitio;
   - el tema: el de la dirección y, si no dice nada, el del sistema;
   - un aviso si falta el kit de letra (la página se abrió sirviendo una carpeta que no es docs/ideas);
   - «Ir a»: leer una fecha escrita;
   - barras de herramientas con una sola parada de tabulador y flechas entre sus botones.
   Se carga antes que el script de cada prototipo. */
(() => {
  'use strict';
  // Las claves de la dirección, iguales en los cinco: t (el cursor), escala (el id de una escala o un ancho en años),
  // desde (el principio de la vista), sel (la marca elegida) y tema (claro u oscuro).
  const KEYS = ['t', 'escala', 'desde', 'sel', 'tema'];

  function carry(a) {
    if (!a.dataset.base) a.dataset.base = a.getAttribute('href');
    const p = new URLSearchParams(location.hash.slice(1)), q = new URLSearchParams();
    for (const k of KEYS) if (p.has(k)) q.set(k, p.get(k));
    const h = q.toString();
    a.setAttribute('href', a.dataset.base + (h ? `#${h}` : ''));
  }
  for (const type of ['pointerdown', 'focusin', 'mouseover', 'click']) {
    document.addEventListener(type, (e) => {
      const a = e.target.closest && e.target.closest('a[data-lleva]');
      if (a) carry(a);
    }, true);
  }

  const systemDark = () => !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  /** 'oscuro' o 'claro': el de la dirección si lo dice; si no, el del sistema. */
  function theme() {
    const m = /(?:^|[#&])tema=(claro|oscuro)/.exec(location.hash);
    return m ? m[1] : systemDark() ? 'oscuro' : 'claro';
  }

  /** Una fecha escrita a años decimales: «607 a.e.c.», «607 aec», «33», «33 e.c.», «nisán 33», «14 nisán 33».
      Devuelve el instante (el centro del año, del mes o del día) o null si no la entiende. `months` es la lista de
      meses hebreos de los datos, [{name, s, e}] ordenados, para las fechas con mes. */
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function parseDate(text, months) {
    const s = fold(String(text || '')).replace(/\s+/g, ' ').trim();
    const m = s.match(/^(?:(\d{1,2}) (?:de )?)?(?:([a-z]+) (?:de )?)?(\d{1,4}) ?(a\.? ?e\.? ?c\.?|a\.? ?c\.?|e\.? ?c\.?|d\.? ?c\.?)?$/);
    if (!m) return null;
    const n = +m[3];
    if (!n) return null;
    const bce = !!(m[4] && m[4].startsWith('a'));
    const y = bce ? 1 - n : n;
    if (!m[2]) return m[1] ? null : y + 0.5;
    if (!months) return null;
    const name = m[2];
    const mo = months.find((x) => x.s >= y - 0.2 && x.s < y + 1 && fold(x.name).startsWith(name));
    if (!mo) return null;
    const day = m[1] ? +m[1] : null;
    const DAY = 1 / 365.2425;
    if (day == null) return (mo.s + mo.e) / 2;
    if (day < 1 || mo.s + (day - 1) * DAY >= mo.e) return null;
    return mo.s + (day - 0.5) * DAY;
  }

  /** Barra de herramientas con una sola parada de tabulador: las flechas van de un botón a otro. Los campos de texto y
      las listas desplegables siguen siendo paradas propias, porque las flechas ya las usan. */
  function toolbar(bar) {
    const items = () => [...bar.querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent !== null);
    const sync = (keep) => {
      const list = items();
      if (!list.length) return;
      const cur = list.includes(keep) ? keep : list.find((b) => b.tabIndex === 0) || list[0];
      for (const b of list) b.tabIndex = b === cur ? 0 : -1;
    };
    bar.addEventListener('focusin', (e) => { if (e.target.matches('button')) sync(e.target); });
    bar.addEventListener('keydown', (e) => {
      if (!e.target.matches('button')) return;
      const list = items(), i = list.indexOf(e.target);
      if (i < 0) return;
      const j = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: list.length - 1 }[e.key];
      if (j == null) return;
      e.preventDefault();
      const n = list[(j + list.length) % list.length];
      sync(n); n.focus();
    });
    sync();
    new MutationObserver(() => sync()).observe(bar, { childList: true, subtree: true });
  }

  /** Si la letra del kit no llegó, la página se abrió sirviendo otra carpeta: se dice arriba cómo abrirla bien. */
  function kitCheck() {
    const done = () => {
      const ok = [...document.fonts].some((f) => /Inter/.test(f.family));
      if (ok || document.getElementById('aviso-kit')) return;
      const p = document.createElement('p');
      p.id = 'aviso-kit';
      p.setAttribute('role', 'note');
      p.style.cssText = 'margin:0;padding:10px 16px;background:#fff4d6;color:#3b2a00;border-bottom:2px solid #b8892f;font:500 14px/1.4 system-ui,sans-serif';
      p.textContent = 'Falta el kit de letra del producto: esta página se abrió sirviendo una carpeta que no es docs/ideas. '
        + 'Se ve con la letra del sistema. Para verla como es, desde la raíz del repositorio: '
        + 'python3 -m http.server 8000 --bind 127.0.0.1 -d docs/ideas';
      document.body.prepend(p);
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(done, done); else done();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kitCheck); else kitCheck();

  /** En el teléfono, los enlaces a los otros diseños se recogen tras un botón: la cabecera ocupa una línea y no tres. */
  function foldNav() {
    const nav = document.querySelector('nav[aria-label="Los cinco diseños"]');
    if (!nav || nav.dataset.plegable) return;
    nav.dataset.plegable = '1';
    if (!nav.id) nav.id = 'otros-disenos';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav-plegar';
    b.setAttribute('aria-controls', nav.id);
    b.setAttribute('aria-expanded', 'false');
    b.textContent = 'Los cinco diseños';
    nav.before(b);
    const st = document.createElement('style');
    st.textContent = '.nav-plegar{display:none}@media (max-width:700px){.nav-plegar{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px;'
      + 'border:1px solid color-mix(in srgb,currentColor 30%,transparent);border-radius:999px;background:transparent;color:inherit;font:600 13px/1 Inter,system-ui,sans-serif;cursor:pointer}'
      + '.nav-plegar::after{content:"▾"}.nav-plegar[aria-expanded="true"]::after{content:"▴"}'
      + 'nav[data-plegable]:not(.abierta){display:none!important}}';
    document.head.appendChild(st);
    b.addEventListener('click', () => { const on = nav.classList.toggle('abierta'); b.setAttribute('aria-expanded', String(on)); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', foldNav); else foldNav();

  window.LINEA_COMUN = { KEYS, theme, systemDark, parseDate, toolbar };
})();
