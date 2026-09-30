/* Portada «Entra por el tiempo»: saca de los datos del sitio (site/data.json) lo poco que pinta la portada.
   Lo usan dos sitios: build-data.mjs, que escribe data.js para abrir la portada sin el sitio, y time.js, que en cuanto
   el sitio de detrás ha cargado sus datos los vuelve a leer de ahí. Así la portada pinta al instante con la copia y
   después enseña lo mismo que el sitio. */
(function (root) {
  'use strict';

  // Lo que cuenta cada época: nueve líneas escritas a mano con los libros que nombra el resumen de cada época en los
  // datos (data/periodos). «Los patriarcas» no los nombra; su línea sale de la de la época anterior (Génesis 1 a 8).
  const LIBROS = {
    'de-adan-al-diluvio': 'Génesis 1 a 8',
    'los-patriarcas': 'Génesis 9 a 50',
    'exodo-y-desierto': 'Éxodo, Levítico, Números y Deuteronomio',
    'josue-y-los-jueces': 'Josué, Jueces y Rut',
    'reyes-de-israel-y-juda': 'De 1 Samuel a 2 Crónicas',
    'destierro-y-regreso': 'Daniel, Esdras, Ester, Nehemías, Ageo, Zacarías y Malaquías',
    'entre-malaquias-y-mateo': 'Sin libro bíblico',
    'jesus-en-la-tierra': 'Mateo, Marcos, Lucas y Juan',
    'congregacion-cristiana': 'De Hechos a Apocalipsis',
  };
  // Tres recorridos no tienen resumen en los datos. Estas líneas salen de su título, de su primera y su última parada
  // y de su razón; son para el prototipo y hay que revisarlas antes de llevarlas al sitio.
  const RESUMEN_RECORRIDO = {
    'cartas-y-ciudades': 'De 1 Tesalonicenses a 2 Timoteo: cada carta de Pablo con su fecha y las ciudades que la recibieron.',
    'la-ultima-semana': 'Día a día, desde la llegada a Betania el 8 de nisán hasta Pentecostés del año 33.',
    pedro: 'Desde Juan 1, junto al mar de Galilea, hasta su segunda carta.',
  };
  // El suceso que nombra cada una de las seis fechas del banner sale solo (el más citado de ese año), salvo en 33 e.c.,
  // donde el más citado es la elección de Matías. Ahí se ancla Pentecostés, que abre la época 9 según su propio resumen.
  const ANCLAS = { 33: 'pentecostes-33' };
  const PRECISION = { 'día': 0, mes: 1, 'estación': 2, 'año': 3, rango: 4 };
  const T_MIN = -4025, T_MAX = 100;

  const tramo = (f) => {
    if (!f) return null;
    const a = f.desde ?? f.hasta, b = f.hasta ?? f.desde;
    return a == null ? null : [a, b + 1];
  };
  const primeraFrase = (s) => (String(s || '').match(/^.*?[.!?](?=\s|$)/) || [String(s || '')])[0];

  function compact(D) {
    const L = D.lugares || {}, P = D.personas || {};
    const periodos = D.periodos || [];
    const eras = periodos.filter((p) => p.tipo === 'era' && tramo(p.fecha)).sort((a, b) => tramo(a.fecha)[0] - tramo(b.fecha)[0])
      .map((p) => ({ id: p.id, nombre: p.nombre, desde: p.fecha.desde, hasta: p.fecha.hasta, texto: p.fecha.texto || '',
        libros: LIBROS[p.id] || '', frase: primeraFrase(p.resumen), sinLibro: /sin libro/i.test(p.resumen || '') }));
    const potencias = periodos.filter((p) => p.tipo === 'potencia')
      .map((p) => ({ id: p.id, nombre: p.nombre, corto: p.nombre.split(',')[0], desde: p.fecha.desde, hasta: p.fecha.hasta,
        consta: p.consta_desde ?? null, texto: p.fecha.texto || '' }))
      .sort((a, b) => (a.desde ?? a.consta ?? -1e9) - (b.desde ?? b.consta ?? -1e9));
    const recorridos = (D.recorridos || []).map((r) => {
      const ts = r.paradas.map((s) => s.t);
      return { id: r.id, titulo: r.titulo, resumen: r.resumen || RESUMEN_RECORRIDO[r.id] || '', escrito: !r.resumen,
        n: r.paradas.length, ts, a: Math.min(...ts), b: Math.max(...ts) };
    });
    // Las preguntas de la portada de hoy (site/js/portada.js), con dos cambios: la de Judá cae en 520 a.e.c. (hoy
    // cae en 521) y la de las cartas enseña todas las cartas en el mapa (cartas=todas), que es lo que pregunta.
    const preguntas = [];
    if (L.babilonia) preguntas.push({ texto: '¿Qué pasaba en Babilonia en tiempos de Jesús?', sel: 'lugar:babilonia', t: 30.5, ver: 'Babilonia' });
    if (L.jerusalen) preguntas.push({ texto: '¿Quién había en Judá con los medos y persas?', sel: 'lugar:jerusalen', t: -518.5, ver: 'Jerusalén' });
    if ((D.cartas || []).some((c) => c.id === '1-tesalonicenses')) preguntas.push({ texto: '¿Desde dónde escribió Pablo cada carta?', sel: 'persona:pablo', t: 50.3, extra: { cartas: 'todas' }, ver: 'Pablo y todas sus cartas' });

    // Sucesos que caben en una frase: los de 30 años o menos, con su lugar principal.
    // [desde, hasta + 1, título, lugar, precisión (0 día a 4 rango), aproximado, fecha escrita, peso]
    const eventos = [];
    for (const e of D.eventos || []) {
      const tr = tramo(e.fecha);
      if (!tr || tr[1] - tr[0] > 30) continue;
      const lugar = (e.lugares || []).map((id) => L[id]?.nombre).find(Boolean) || '';
      // Peso: cuántos pasajes lo cuentan y, a medias, cuántas personas nombra. En 1513 a.e.c. gana «Éxodo de Egipto».
      const peso = (e.pasajes || []).length + (e.personas || []).length / 2;
      eventos.push([tr[0], tr[1], e.titulo, lugar, PRECISION[e.fecha.precision] ?? 4, e.fecha.aprox ? 1 : 0, e.fecha.texto || '', peso]);
    }
    eventos.sort((a, b) => a[0] - b[0] || a[4] - b[4]);
    const anclas = {};
    for (const [y, id] of Object.entries(ANCLAS)) {
      const e = (D.eventos || []).find((x) => x.id === id);
      if (e) anclas[y] = e.titulo;
    }
    // Quién vivía: personas con fechas, pesadas por cuántos sucesos las nombran.
    const peso = new Map();
    for (const e of D.eventos || []) for (const id of e.personas || []) peso.set(id, (peso.get(id) || 0) + 1);
    const personas = Object.values(P).filter((p) => tramo(p.fecha) && (peso.get(p.id) || 0) >= 2)
      .map((p) => { const tr = tramo(p.fecha); return [tr[0], tr[1], p.nombre, peso.get(p.id) || 0]; })
      .sort((a, b) => b[3] - a[3]);
    const revisados = Object.keys(D.cobertura || {}).length;
    return {
      generado: D.generado || '', T_MIN, T_MAX,
      cuentas: { eventos: (D.eventos || []).length, lugares: Object.keys(L).length, personas: Object.keys(P).length,
        fuentes: Object.keys(D.fuentes || {}).length, libros: (D.libros || []).length, revisados },
      eras, potencias, recorridos, preguntas, eventos, personas, anclas,
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { compact };
  else root.TimeData = { compact };
})(this);
