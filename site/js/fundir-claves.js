/* biblical-atlas · junta dos juegos de claves guardadas sin perder nada. Script clásico y sin efectos: solo define
   window.fundirClaves. Lo usan migrar-claves.js (el prefijo anterior, en este mismo navegador) y traer.js (la dirección
   anterior del sitio), así que va antes que los dos en index.html.
   - lo que ya hay aquí manda: nunca se borra ni se pisa una clave;
   - las notas de fichas que aquí no tienen nota se añaden; si una ficha tiene una nota distinta en cada lado, se queda la
     de aquí y la copia que llega se aparta entera una vez, como las notas que no se pudieron leer, y «Mis notas» la
     ofrece para descargarla;
   - marcadores y capítulos leídos se unen;
   - cualquier otra clave se escribe solo si aquí no existe. */
'use strict';
window.fundirClaves = (() => {
  const APARTE = 'notes:unreadable:';
  const FUERA = new Set(['migrado', 'traido']);

  const parse = (s) => { try { return JSON.parse(s); } catch { return undefined; } };
  const esNotas = (o) => !!o && typeof o === 'object' && !!o.notes && typeof o.notes === 'object' && !Array.isArray(o.notes);

  /** Lo que hay que escribir para juntar `llegado` con `actual` (los dos { sufijo: valor }). Función pura: no toca el
      almacenamiento. `ahora` da nombre a la copia apartada. Aplicarla dos veces no cambia nada la segunda. */
  return function fundir(actual, llegado, ahora = new Date().toISOString()) {
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
  };
})();
