/* biblical-atlas · trae lo que este navegador guardó en la dirección anterior del sitio (biblical-earth.geiser.cloud).
   El navegador guarda por origen, así que al cambiar de dirección las notas, los marcadores y lo leído se quedarían
   atrás. La primera vez que alguien entra en la dirección nueva, este script abre en un iframe oculto el puente de la
   anterior (direccion-anterior/puente.js), le pide una copia y la junta con lo de aquí con fundirClaves
   (fundir-claves.js): lo de aquí manda, las notas se juntan por ficha y las listas se unen.
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
  const fundir = window.fundirClaves;

  function leerAqui() {
    const actual = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (typeof k === 'string' && k.startsWith(PREFIJO)) actual[k.slice(PREFIJO.length)] = localStorage.getItem(k);
    }
    return actual;
  }

  function arrancar() {
    if (location.origin !== NUEVO || new Date().toISOString().slice(0, 10) > HASTA || typeof fundir !== 'function') return;
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
