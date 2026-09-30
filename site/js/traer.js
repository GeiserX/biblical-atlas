/* biblical-atlas · trae lo que este navegador guardó en la dirección anterior del sitio (biblical-earth.geiser.cloud).
   El navegador guarda por origen, así que al cambiar de dirección las notas, los marcadores y lo leído se quedarían
   atrás. La primera vez que alguien entra en la dirección nueva, este script abre en un iframe oculto el puente de la
   anterior (direccion-anterior/puente.js), le pide una copia y la junta con lo de aquí:
   - lo que ya hay aquí manda: nunca se borra ni se pisa una clave;
   - las notas de fichas que aquí no tienen nota se añaden; si una ficha tiene una nota distinta en cada lado, se queda
     la de aquí y la copia que llega se aparta entera una vez, como las notas que no se pudieron leer, y «Mis notas» la
     ofrece para descargarla;
   - marcadores y capítulos leídos se unen;
   - cualquier otra clave se escribe solo si aquí no existe.
   Solo corre en la dirección nueva, antes de HASTA y una vez (biblical-atlas:traido). Si llega algo, recarga la página
   una vez: los módulos leyeron el almacenamiento al arrancar. Sin respuesta en 10 s no marca nada y lo reintenta en la
   carga siguiente. */
'use strict';
window.traerAnterior = (() => {
  const NUEVO = 'https://biblical-atlas.geiser.cloud';
  const ANTERIOR = 'https://biblical-earth.geiser.cloud';
  const PREFIJO = 'biblical-atlas:';
  const HASTA = '2027-03-31';   // último día en que se intenta
  const ESPERA = 10000;
  const APARTE = 'notes:unreadable:';
  const FUERA = new Set(['migrado', 'traido']);

  const parse = (s) => { try { return JSON.parse(s); } catch { return undefined; } };
  const esNotas = (o) => !!o && typeof o === 'object' && !!o.notes && typeof o.notes === 'object' && !Array.isArray(o.notes);

  /** Lo que hay que escribir para juntar `llegado` con `actual` (los dos { sufijo: valor }). Función pura: no toca el
      almacenamiento. `ahora` da nombre a la copia apartada. Aplicarla dos veces no cambia nada la segunda. */
  function fundir(actual, llegado, ahora = new Date().toISOString()) {
    const escribir = {};
    const apartar = (raw) => {
      const ya = Object.keys(actual).some((k) => k.startsWith(APARTE) && actual[k] === raw);
      if (!ya && !(APARTE + ahora in actual)) escribir[APARTE + ahora] = raw;
    };
    for (const [sufijo, valor] of Object.entries(llegado || {})) {
      if (typeof valor !== 'string' || !sufijo || FUERA.has(sufijo)) continue;
      const aqui = Object.prototype.hasOwnProperty.call(actual, sufijo) ? actual[sufijo] : null;
      if (aqui === valor) continue;
      if (sufijo === 'notes') {
        if (aqui === null) { escribir.notes = valor; continue; }
        const l = parse(aqui), v = parse(valor);
        if (!esNotas(v) || !esNotas(l)) { apartar(valor); continue; }
        const nuevas = {};
        let choque = false;
        for (const [k, n] of Object.entries(v.notes)) {
          if (!Object.prototype.hasOwnProperty.call(l.notes, k)) nuevas[k] = n;
          else if (l.notes[k]?.text !== n?.text) choque = true;
        }
        if (Object.keys(nuevas).length) escribir.notes = JSON.stringify({ ...l, notes: { ...l.notes, ...nuevas } });
        if (choque) apartar(valor);
      } else if (sufijo === 'marcadores' || sufijo === 'leidos') {
        if (aqui === null) { escribir[sufijo] = valor; continue; }
        const l = parse(aqui), v = parse(valor);
        if (!Array.isArray(l) || !Array.isArray(v)) continue;   // una lista que no se entiende no se toca
        const igual = sufijo === 'leidos' ? (a, b) => a === b : (a, b) => a?.t === b?.t && a?.sel === b?.sel;
        const suma = [...l];
        for (const x of v) if (!suma.some((y) => igual(x, y))) suma.push(x);
        if (suma.length > l.length) escribir[sufijo] = JSON.stringify(suma);
      } else if (aqui === null) {
        escribir[sufijo] = valor;
      }
    }
    return escribir;
  }

  function leerAqui() {
    const actual = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (typeof k === 'string' && k.startsWith(PREFIJO)) actual[k.slice(PREFIJO.length)] = localStorage.getItem(k);
    }
    return actual;
  }

  function arrancar() {
    if (location.origin !== NUEVO || new Date().toISOString().slice(0, 10) > HASTA) return;
    try {
      if (localStorage.getItem(PREFIJO + 'traido') !== null) return;
      localStorage.setItem(PREFIJO + 'prueba', '1');   // un almacenamiento que no deja escribir no puede recibir nada
      localStorage.removeItem(PREFIJO + 'prueba');
    } catch { return; }
    const marco = document.createElement('iframe');
    marco.src = ANTERIOR + '/puente.html';
    marco.hidden = true;
    marco.setAttribute('aria-hidden', 'true');
    marco.tabIndex = -1;
    const n = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const fin = () => { clearTimeout(reloj); removeEventListener('message', oir); marco.remove(); };
    const reloj = setTimeout(fin, ESPERA);
    function oir(e) {
      if (e.origin !== ANTERIOR || e.source !== marco.contentWindow) return;
      const d = e.data;
      if (!d || d.puente !== 1) return;
      if (d.tipo === 'listo') { marco.contentWindow.postMessage({ puente: 1, tipo: 'pide', n }, ANTERIOR); return; }
      if (d.tipo !== 'datos' || d.n !== n || !d.claves || typeof d.claves !== 'object') return;
      fin();
      let escritas = 0;
      try {
        for (const [sufijo, valor] of Object.entries(fundir(leerAqui(), d.claves))) {
          localStorage.setItem(PREFIJO + sufijo, valor);
          escritas++;
        }
        localStorage.setItem(PREFIJO + 'traido', new Date().toISOString().slice(0, 10));
      } catch { /* sin sitio: lo escrito se queda y la marca no, así que se reintenta */ }
      if (escritas) location.reload();
    }
    addEventListener('message', oir);
    document.body.appendChild(marco);
  }

  arrancar();
  return { fundir, NUEVO, ANTERIOR, HASTA };
})();
