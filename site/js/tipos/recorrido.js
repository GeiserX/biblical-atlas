/* biblical-atlas · tipo «recorrido»: un recorrido guiado («recorrido:de-babilonia-a-jerusalen»). La ficha es la historia
   parada a parada (pantalla 14); la lleva js/recorridos.js. Dueño durante el reparto: app-estudio. */
'use strict';
(() => {
const BE = window.BE;
const busca = (id) => (BE.D.recorridos || []).find((r) => r.id === id);

BE.tipo('recorrido', {
  nodo: 'evento',
  existe: (id) => !!busca(id),
  nombre: (id) => busca(id).titulo,
  implicados(id, r) {
    for (const p of busca(id).paradas || []) {
      const s = BE.parseSel(p.sel);
      if (!s || s.tipo === 'recorrido') continue;
      const x = BE.implicados(s);
      x.claves.forEach((k) => r.claves.add(k));
      x.lugares.forEach((l) => r.lugares.add(l));
    }
  },
  momento: (id) => { const rc = busca(id); const p = rc.paradas[BE.recorridos?.pasoDe(id) ?? 0] || rc.paradas[0]; return p?.t ?? null; },
  ficha: (id) => BE.recorridos.ficha(id),
  buscar(q, nq, puntuar) {
    return (BE.D.recorridos || []).map((r) => ({ r, p: puntuar([r.titulo]) })).filter((x) => x.p).map(({ r, p }) => ({ grupo: 'Recorridos', sel: { tipo: 'recorrido', id: r.id }, titulo: r.titulo, meta: `${r.paradas.length} paradas${r.resumen ? ` · ${r.resumen}` : ''}`, puntos: p }));
  },
});
})();
