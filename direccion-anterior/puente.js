/* biblical-atlas · puente de la dirección anterior. Lo sirve worker.js en https://biblical-earth.geiser.cloud/puente.html.
   El sitio nuevo lo abre en un iframe oculto y le pide lo que este navegador guardó aquí; el puente contesta con una
   copia y no escribe ni borra nada. Tres mensajes, siempre con el origen exacto del otro lado, nunca '*':
     1. puente -> sitio: { puente: 1, tipo: 'listo' }
     2. sitio -> puente: { puente: 1, tipo: 'pide', n }
     3. puente -> sitio: { puente: 1, tipo: 'datos', n, claves: { sufijo: valor } }
   Solo contesta a un mensaje que llega del sitio nuevo y de la ventana que lo abrió. */
'use strict';
(() => {
  const NUEVO = 'https://biblical-atlas.geiser.cloud';
  const PREFIJOS = ['biblical-earth:', 'biblical-atlas:'];   // el segundo manda: es la copia con la que se siguió trabajando
  const FUERA = new Set(['migrado', 'traido']);

  function leer() {
    const claves = {};
    try {
      for (const prefijo of PREFIJOS) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (typeof k !== 'string' || !k.startsWith(prefijo)) continue;
          const sufijo = k.slice(prefijo.length);
          if (!sufijo || FUERA.has(sufijo)) continue;
          const v = localStorage.getItem(k);
          if (v !== null) claves[sufijo] = v;
        }
      }
    } catch { return {}; }
    return claves;
  }

  const destino = window.opener || (window.parent !== window ? window.parent : null);
  if (!destino) return;
  addEventListener('message', (e) => {
    if (e.origin !== NUEVO || e.source !== destino) return;
    if (!e.data || e.data.puente !== 1 || e.data.tipo !== 'pide') return;
    destino.postMessage({ puente: 1, tipo: 'datos', n: e.data.n, claves: leer() }, NUEVO);
    if (window.opener) window.close();
  });
  destino.postMessage({ puente: 1, tipo: 'listo' }, NUEVO);
})();
