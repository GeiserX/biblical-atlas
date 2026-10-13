/* biblical-atlas · el modo reunión en «Acerca de» y en el calendario: la misma clase en <html> (be-reunion), la misma
   preferencia guardada y la misma luna que en el mapa (index.html y base.js, ponerPreferencia). Va en <head> sin defer:
   pone la clase antes del primer pintado, así la página no sale clara un instante. Script clásico: estas páginas abren
   también desde file://. Los colores de los dos temas están en kit/tokens.css. */
'use strict';
(() => {
  const CLAVE = 'biblical-atlas:pref:reunion', raiz = document.documentElement;
  try { if (localStorage.getItem(CLAVE) === '1') raiz.classList.add('be-reunion'); } catch { /* sin almacenamiento */ }
  addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('reunion-boton');
    if (!b) return;
    const pintar = () => {
      const on = raiz.classList.contains('be-reunion');
      b.setAttribute('aria-pressed', String(on));
      b.title = on ? 'Salir del modo reunión: vuelve el fondo claro' : 'Modo reunión: fondo oscuro, brillo bajo y sin animaciones';
    };
    b.addEventListener('click', () => {
      const on = !raiz.classList.contains('be-reunion');
      raiz.classList.toggle('be-reunion', on);
      try { localStorage.setItem(CLAVE, on ? '1' : '0'); } catch { /* sin almacenamiento */ }
      pintar();
    });
    pintar();
  });
})();
