/* biblical-atlas · «Volver al mapa» en «Acerca de» y en el calendario (docs/ideas/atras-adelante-flecos.md, pregunta 1).
   Si en esta pestaña la página de antes es el mapa, el botón vuelve a él como el Atrás del navegador: a la misma
   entrada, con su visita, su Atrás y su Adelante, y sin entradas nuevas. Si no (un enlace compartido, una pestaña
   nueva, otra página del sitio, la portada), sigue siendo el enlace a la vista de la que se salió.

   El mapa marca el enlace con volver=atras al salir; desde la portada no lo marca, porque Atrás llevaría a la portada y
   el botón promete el mapa. La pestaña lo confirma: la entrada de antes es index.html de este sitio (Navigation API o,
   sin ella, document.referrer). Se apunta en la entrada de esta página al cargarla: un ancla de la página (#gracias)
   crea otra entrada, y desde ella Atrás ya no lleva al mapa. En ese momento la dirección pierde volver=atras. Script
   clásico: la página abre también desde file://. */
'use strict';
(() => {
const CLAVE = 'volverAlMapa';
/** ¿Es `url` el mapa de este sitio (index.html, o la carpeta)? */
function esMapa(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.origin === location.origin && u.pathname.replace(/index\.html$/, '') === location.pathname.replace(/[^/]*$/, '');
  } catch { return false; }
}
/** ¿Está el mapa justo detrás de esta entrada? */
function mapaDetras() {
  if (history.length < 2) return false;   // una pestaña nueva (Ctrl+clic) no tiene nada detrás
  const nav = window.navigation, i = nav?.currentEntry?.index;
  if (Number.isInteger(i) && typeof nav.entries === 'function') return esMapa(nav.entries()[i - 1]?.url);
  return esMapa(document.referrer);
}
/** La dirección de ahora sin volver=atras (en ?… o en #…). */
function sinMarca() {
  const u = new URL(location.href);
  if (u.searchParams.has('volver')) u.searchParams.delete('volver');
  if (u.hash.includes('volver=')) u.hash = u.hash.slice(1).split('&').filter((x) => !x.startsWith('volver=')).join('&');
  return u.href;
}
/** marca: si el mapa dijo volver=atras al salir. La marca pasa a la entrada y sale de la dirección: una dirección
    copiada o guardada no la lleva, y abierta otro día sobre la portada no volvería a ella. */
function iniciar(marca) {
  const estado = marca && mapaDetras() ? { ...(history.state || {}), [CLAVE]: true } : history.state;
  try { history.replaceState(estado, '', sinMarca()); } catch { /* sin historial */ }
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[data-volver]');
    if (!a || !history.state?.[CLAVE] || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    history.back();
  });
}
window.BEVolver = { iniciar, esMapa };
})();
