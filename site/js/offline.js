/* biblical-atlas · registra el service worker (sw.js) y avisa cuando hay una versión nueva (docs/development.md, «Sin
   conexión»). Lo cargan las tres páginas; es el único sitio que registra el worker.
   - Solo por https: en local (http://localhost) el worker no se registra, para que un cambio se vea al recargar y para
     no meterse entre las pruebas y la red. Una prueba lo enciende con localStorage «biblical-atlas:sin-conexion» = 1.
     Desde file:// no hay worker posible y la página abre como siempre.
   - Se registra al terminar la carga, para no quitarle red al arranque. En la primera visita, cuando el worker toma
     la página, le pasa lo que ya se descargó (mapas, teselas, el detalle si llegó), y él lo guarda desde la caché HTTP.
   - Una versión nueva se instala sola y espera. Un aviso discreto lo dice, con «Recargar»: solo al pulsarlo se activa
     y la página recarga. Si otra pestaña la activa, esta recarga también, porque su worker ya es el de la versión nueva
     y sus datos no casarían con los que quedan por pedir.
   - Al volver la red, y al volver a la pestaña (como mucho una vez cada diez minutos), busca una versión nueva. */
'use strict';
(() => {
if (location.protocol === 'file:' || !('serviceWorker' in navigator)) return;
let on = location.protocol === 'https:';
try { on ||= localStorage.getItem('biblical-atlas:sin-conexion') === '1'; } catch { /* sin almacenamiento */ }
if (!on) return;

const sw = navigator.serviceWorker;
let controlled = !!sw.controller;
sw.addEventListener('controllerchange', () => {
  if (controlled) { location.reload(); return; }
  controlled = true;
  // Lo descargado hasta ahora, y durante un minuto lo que termina de llegar sin pasar por el worker: una descarga que
  // empezó antes de que él tomara la página (el estilo del mapa, sus teselas) acaba después.
  const seen = (entries) => sw.controller?.postMessage({ type: 'seen', urls: entries.filter((r) => !r.workerStart).map((r) => r.name) });
  sw.controller?.postMessage({ type: 'seen', urls: [location.href] });
  seen(performance.getEntriesByType('resource'));
  const late = new PerformanceObserver((list) => seen(list.getEntries()));
  late.observe({ type: 'resource' });
  setTimeout(() => late.disconnect(), 60000);
});

function notice(worker) {
  if (document.getElementById('nueva-version')) return;
  const box = document.createElement('div');
  box.id = 'nueva-version';
  box.className = 'nueva-version';
  box.setAttribute('role', 'status');
  box.innerHTML = '<span>Hay una versión nueva del atlas.</span>'
    + '<button type="button" class="be-btn be-btn--sm be-btn--primary" data-nueva="recargar">Recargar</button>'
    + '<button type="button" class="be-btn be-btn--sm be-btn--ghost be-btn--icon" data-nueva="luego" aria-label="Más tarde" title="Más tarde">'
    + '<svg class="be-i be-i--sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>';
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-nueva]');
    if (!b) return;
    if (b.dataset.nueva === 'luego') { box.remove(); return; }
    b.disabled = true;
    worker.postMessage({ type: 'skip-waiting' });   // controllerchange recarga la página
  });
  document.body.appendChild(box);
}

addEventListener('load', async () => {
  let reg;
  try { reg = await sw.register('sw.js', { updateViaCache: 'none' }); } catch (err) { console.warn('Sin conexión no disponible:', err.message); return; }
  const watch = (w) => w?.addEventListener('statechange', () => { if (w.state === 'installed' && sw.controller) notice(w); });
  if (reg.waiting && sw.controller) notice(reg.waiting);
  watch(reg.installing);
  reg.addEventListener('updatefound', () => watch(reg.installing));
  let last = Date.now();
  const check = (always) => {
    if (!always && Date.now() - last < 600000) return;
    last = Date.now();
    reg.update().catch(() => { /* sin red: se intentará al volver */ });
  };
  addEventListener('online', () => check(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(false); });
});
})();
