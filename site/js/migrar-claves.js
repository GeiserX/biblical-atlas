/* biblical-atlas · lo guardado con el prefijo anterior se junta con el nuevo. Script clásico, cargado después de
   fundir-claves.js y antes que cualquier otro que lea el almacenamiento (index.html): cuando notes.js, linea.js o la
   cabecera miran sus claves, ya están juntadas.
   Junta con fundirClaves: nunca borra una clave antigua ni pisa una nueva; las notas se juntan por ficha y los
   marcadores y los capítulos leídos se unen. La marca «biblical-atlas:migrado» guarda una huella (longitud y resumen)
   de cada clave antigua ya juntada: una clave antigua sin cambios no se vuelve a juntar, así que no vuelve lo que la
   persona quitó a propósito, y una que cambió después (una pestaña abierta con la versión anterior, una copia que no
   cupo) se junta en la carga siguiente. Si una escritura falla (sin sitio), la marca no cambia y la carga siguiente lo
   reintenta; juntar dos veces lo mismo no escribe nada. Un almacenamiento bloqueado no para la página. */
'use strict';
function migrarClaves(almacen, fundir, ahora) {
  const ANTES = 'biblical-earth:';
  const AHORA = 'biblical-atlas:';
  const MARCA = AHORA + 'migrado';
  // Huella de un valor: longitud y FNV-1a de 32 bits. Basta para ver que una clave cambió.
  const huella = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    return `${s.length}:${(h >>> 0).toString(36)}`;
  };
  try {
    if (typeof fundir !== 'function') return 0;
    // Primero se recogen las claves y luego se escribe: escribir cambia el orden de key(i).
    const claves = [];
    for (let i = 0; i < almacen.length; i++) claves.push(almacen.key(i));
    const viejas = {};
    const actual = {};
    for (const k of claves) {
      if (typeof k !== 'string') continue;
      const v = almacen.getItem(k);
      if (v === null) continue;
      if (k.startsWith(ANTES)) viejas[k.slice(ANTES.length)] = v;
      else if (k.startsWith(AHORA)) actual[k.slice(AHORA.length)] = v;
    }
    let vistas;
    try { vistas = JSON.parse(actual.migrado ?? '{}'); } catch { vistas = {}; }
    if (!vistas || typeof vistas !== 'object' || Array.isArray(vistas)) vistas = {};
    const huellas = {};
    const cambiadas = {};
    for (const [sufijo, v] of Object.entries(viejas)) {
      huellas[sufijo] = huella(v);
      if (vistas[sufijo] !== huellas[sufijo]) cambiadas[sufijo] = v;
    }
    if (!Object.keys(cambiadas).length) return 0;
    let escritas = 0;
    let fallos = 0;
    for (const [sufijo, v] of Object.entries(fundir(actual, cambiadas, ahora))) {
      try { almacen.setItem(AHORA + sufijo, v); escritas++; } catch { fallos++; }
    }
    if (!fallos) almacen.setItem(MARCA, JSON.stringify(huellas));
    return escritas;
  } catch { return 0; }
}
try { migrarClaves(window.localStorage, window.fundirClaves); } catch { /* sin almacenamiento */ }
