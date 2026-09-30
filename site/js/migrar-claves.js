/* biblical-atlas · lo guardado con el prefijo anterior pasa al nuevo. Script clásico, cargado antes que cualquier otro
   que lea el almacenamiento (index.html): cuando notes.js, linea.js o la cabecera miran sus claves, ya están copiadas.
   Copia y nada más: nunca borra una clave antigua ni escribe encima de una nueva que ya existe. La marca
   «biblical-atlas:migrado» impide que vuelva una clave que la persona quitó a propósito (una última vista olvidada, una
   lista de marcadores vaciada). Si una copia falla (sin sitio), la marca no se pone y la siguiente carga lo reintenta;
   las claves antiguas siguen intactas. Un almacenamiento bloqueado no para la página. */
'use strict';
function migrarClaves(almacen) {
  const ANTES = 'biblical-earth:';
  const AHORA = 'biblical-atlas:';
  const MARCA = AHORA + 'migrado';
  try {
    if (almacen.getItem(MARCA) !== null) return 0;
    // Primero se recogen las claves y luego se escribe: escribir cambia el orden de key(i).
    const viejas = [];
    for (let i = 0; i < almacen.length; i++) {
      const k = almacen.key(i);
      if (typeof k === 'string' && k.startsWith(ANTES)) viejas.push(k);
    }
    let copiadas = 0;
    let fallos = 0;
    for (const vieja of viejas) {
      try {
        const nueva = AHORA + vieja.slice(ANTES.length);
        if (almacen.getItem(nueva) !== null) continue;
        const valor = almacen.getItem(vieja);
        if (valor === null) continue;
        almacen.setItem(nueva, valor);
        copiadas++;
      } catch { fallos++; }
    }
    if (!fallos) almacen.setItem(MARCA, '1');
    return copiadas;
  } catch { return 0; }
}
try { migrarClaves(window.localStorage); } catch { /* sin almacenamiento */ }
