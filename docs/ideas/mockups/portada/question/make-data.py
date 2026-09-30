#!/usr/bin/env python3
"""Portada «Entra por una pregunta»: copia pequeña de los datos que usa la maqueta.

Lee site/data.json (lo compila scripts/build.py) y escribe, junto a este fichero:
  data.js    lo que pinta la primera pantalla y las zonas: épocas con sus libros, recorridos, preguntas,
             «Por estas fechas», «Un momento cualquiera», la pregunta con tres respuestas y los libros.
  indice.js  el índice de la caja de búsqueda (nombre, tipo, fecha y destino). Se carga al tocar la caja.

Uso: python3 docs/ideas/mockups/portada/question/make-data.py  (desde la raíz del repositorio)
Sin dependencias. Falla si falta alguno de los destinos escritos a mano, para que no quede un enlace roto.
"""
import collections
import json
import pathlib
import re
import sys
import unicodedata

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parents[4]
D = json.loads((RAIZ / 'site' / 'data.json').read_text(encoding='utf-8'))


def norm(s):
    s = unicodedata.normalize('NFD', str(s or ''))
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()


def corta(texto):
    """La fecha sin el paréntesis que la explica: «c. 33-65 e.c. (de la muerte…)» → «c. 33-65 e.c.»."""
    return re.sub(r'\s*\(.*$', '', str(texto or '')).strip()


def primera_frase(texto, maximo=170, minimo=40):
    """La primera frase (o las dos primeras, si la primera es muy corta). Un punto de «a.e.c.», «e.c.», «c.» o «párr.»
    no cierra la frase."""
    t = str(texto or '').strip()
    fin = None
    for m in re.finditer(r'[.!?](?=\s|$)', t):
        antes = t[: m.start() + 1].rsplit(' ', 1)[-1].lower()
        if re.fullmatch(r'(a\.e\.c|e\.c|c|párr|núm|cap|vol|p)\.', antes):
            continue
        fin = m.end()
        if fin >= minimo:
            break
    t = t[:fin] if fin else t
    return t if len(t) <= maximo else t[: maximo - 1].rsplit(' ', 1)[0] + '…'


def fmt_anio(y):
    return f'{y} e.c.' if y > 0 else f'{1 - y} a.e.c.'


PERS, LUG = D['personas'], D['lugares']
EVENTOS = {e['id']: e for e in D['eventos']}
CARTAS = {c['id']: c for c in D['cartas']}
RECORRIDOS = {r['id']: r for r in D['recorridos']}
PERIODOS = {p['id']: p for p in D['periodos']}
LIBROS = D['libros']
POR_ABR = {norm(l['abr']): l for l in LIBROS}


def exige(cond, que):
    if not cond:
        sys.exit(f'make-data.py: falta {que} en site/data.json')


# ---------------------------------------------------------------------------
# Épocas: las nueve eras con los libros que las cuentan (D2). Los libros van escritos a mano y salen del resumen de cada
# era en los datos; la 2 no lo dice y se escribe con cuidado: el Génesis desde el Diluvio y el principio de Éxodo.
# ---------------------------------------------------------------------------
LIBROS_ERA = {
    'de-adan-al-diluvio': 'Génesis 1 a 8',
    'los-patriarcas': 'Génesis 9 a 50 y el principio de Éxodo',
    'exodo-y-desierto': 'Éxodo, Levítico, Números y Deuteronomio',
    'josue-y-los-jueces': 'Josué, Jueces y Rut',
    'reyes-de-israel-y-juda': 'De 1 Samuel a 2 Crónicas',
    'destierro-y-regreso': 'Daniel, Esdras, Ester, Nehemías, Ageo, Zacarías y Malaquías',
    'entre-malaquias-y-mateo': 'Sin libro bíblico',
    'jesus-en-la-tierra': 'Mateo, Marcos, Lucas y Juan',
    'congregacion-cristiana': 'De Hechos a Apocalipsis',
}
eras = sorted((p for p in D['periodos'] if p.get('tipo') == 'era'), key=lambda p: p['fecha']['desde'])
exige(len(eras) == 9, 'nueve eras')
ERAS = []
for i, p in enumerate(eras):
    exige(p['id'] in LIBROS_ERA, f'los libros de la era {p["id"]}')
    f = p['fecha']
    ERAS.append({'id': p['id'], 'n': i + 1, 'nombre': p['nombre'], 'fecha': f['texto'], 'desde': f['desde'],
                 'hasta': f['hasta'] + 1, 'libros': LIBROS_ERA[p['id']], 'sinLibro': p['id'] == 'entre-malaquias-y-mateo'})

# ---------------------------------------------------------------------------
# Recorridos: título, paradas, fechas y la primera frase de la primera parada (tres de los cuatro no tienen resumen).
# ---------------------------------------------------------------------------
TOURS = []
for r in D['recorridos']:
    ts = [p['t'] for p in r['paradas']]
    a, b = int(min(ts) // 1), int(max(ts) // 1)
    fecha = fmt_anio(a) if a == b else (f'{1 - a}-{1 - b} a.e.c.' if b <= 0 else (f'{a}-{b} e.c.' if a > 0 else f'{fmt_anio(a)} - {fmt_anio(b)}'))
    TOURS.append({'id': r['id'], 'titulo': r['titulo'], 'paradas': len(r['paradas']), 'fecha': fecha,
                  'linea': primera_frase(r.get('resumen') or r['paradas'][0]['texto'])})

# ---------------------------------------------------------------------------
# Preguntas (E1 y E2). Las tres primeras abren tres vistas distintas: el mapa en una fecha, el grafo de relaciones y un
# capítulo con el mapa al lado. Las otras dos son las de la portada de hoy, arregladas: 520 y no 521 a.e.c., y las
# cartas abiertas de verdad. Cada una acaba dentro del mapa con una invitación y su destino («Llévame»).
# ---------------------------------------------------------------------------
PREGUNTAS = [
    {'id': 'jerusalen-520', 'vista': 'mapa', 'vistaTexto': 'El mapa en una fecha',
     'texto': '¿Quién había en Judá con los medos y persas?', 'fecha': 'c. 520 a.e.c.',
     'linea': 'Jerusalén en 520 a.e.c.: Zorobabel gobierna, Josué es sumo sacerdote, y Ageo y Zacarías animan a terminar el templo.',
     'dir': 'sel=lugar:jerusalen&t=-518.5000&v=40&mapa=antiguo', 'img': 'img/q-mapa.webp',
     'alt': 'El mapa antiguo alrededor de Jerusalén y el mar Salado, con el cursor en c. 520 a.e.c.',
     'invita': 'Mueve el cursor hasta 515 a.e.c.: ese año se termina el segundo templo.',
     'llevame': 'sel=evento:templo-terminado-515&mapa=antiguo', 'meta': -514},
    {'id': 'loida-pablo', 'vista': 'grafo', 'vistaTexto': 'Las relaciones',
     'texto': '¿Qué une a Loida con Pablo?', 'fecha': 'c. 49-65 e.c.',
     'linea': 'Dos pasos con su referencia: Loida es la abuela de Timoteo, y Timoteo viaja con Pablo.',
     'dir': 'conexion=persona:loida~persona:pablo&t=49.5000&v=40&mapa=antiguo', 'img': 'img/q-grafo.webp',
     'alt': 'La vista de relaciones: Loida, Timoteo y Pablo unidos en dos pasos, cada uno con su referencia.',
     'invita': 'Mira en el mapa dónde se unió Timoteo a Pablo, entre finales de 49 y principios de 50.',
     'llevame': 'sel=evento:timoteo-se-une-a-pablo&mapa=antiguo', 'metaSel': 'evento:timoteo-se-une-a-pablo'},
    {'id': 'hechos-16', 'vista': 'lectura', 'vistaTexto': 'Un capítulo y su mapa',
     'texto': '¿Por dónde pasó Pablo en Hechos 16?', 'fecha': 'c. 49-50 e.c.',
     'linea': 'El capítulo pasaje a pasaje, de Derbe a Filipos, con cada parada numerada en el mapa.',
     'dir': 'leer=hch-16&mapa=antiguo', 'img': 'img/q-lectura.webp',
     'alt': 'El modo lectura de Hechos 16 a la izquierda y el mapa con las paradas numeradas a la derecha.',
     'invita': 'Pulsa «Pasaje siguiente» hasta Troas y mira cómo Pablo cruza a Macedonia en la primavera de 50.',
     'llevame': 'leer=hch-16&sel=evento:de-troas-a-filipos&mapa=antiguo', 'meta': 50},
    {'id': 'babilonia-jesus', 'vista': 'mapa', 'vistaTexto': 'El mapa en una fecha',
     'texto': '¿Qué pasaba en Babilonia en tiempos de Jesús?', 'fecha': 'c. 30 e.c.',
     'linea': 'Babilonia en 30 e.c., lejos de Jerusalén y ya en ruinas.',
     'dir': 'sel=lugar:babilonia&t=30.5000&v=40&mapa=antiguo',
     'invita': 'Mueve el cursor hacia atrás, hasta 539 a.e.c.: Babilonia cae ante Ciro.',
     'llevame': 'sel=evento:caida-de-babilonia&mapa=antiguo', 'meta': -538},
    {'id': 'cartas', 'vista': 'mapa', 'vistaTexto': 'Las cartas de Pablo en el mapa',
     'texto': '¿Desde dónde escribió Pablo cada carta?', 'fecha': 'c. 50-65 e.c.',
     'linea': 'Las 14 cartas como arcos, de la ciudad donde se escribe a la que la recibe.',
     'dir': 'sel=carta:1-tesalonicenses&cartas=todas&mapa=antiguo',
     'invita': 'Mueve el cursor hasta 65 e.c. y mira aparecer cada carta en su fecha.',
     'llevame': 'sel=carta:2-timoteo&cartas=todas&mapa=antiguo', 'meta': 65},
]


def comprueba_dir(d):
    p = dict(x.split('=', 1) for x in d.split('&'))
    if 'sel' in p:
        tipo, _id = p['sel'].split(':', 1)
        tabla = {'lugar': LUG, 'persona': PERS, 'evento': EVENTOS, 'carta': CARTAS, 'recorrido': RECORRIDOS, 'periodo': PERIODOS}[tipo]
        exige(_id in tabla, f'el destino {p["sel"]}')
    if 'conexion' in p:
        for s in p['conexion'].split('~'):
            exige(s.split(':', 1)[1] in PERS, f'la persona {s}')
    if 'leer' in p:
        clave, cap = p['leer'].rsplit('-', 1)
        exige(clave in POR_ABR and 1 <= int(cap) <= POR_ABR[clave]['capitulos'], f'el capítulo {p["leer"]}')


for q in PREGUNTAS:
    comprueba_dir(q['dir'])
    comprueba_dir(q['llevame'])

# ---------------------------------------------------------------------------
# Tres ejemplos de tres clases (B1): una persona, un capítulo y un año. Cada uno va directo a su destino.
# ---------------------------------------------------------------------------
EJEMPLOS = [
    {'k': 'persona', 'texto': 'Pedro', 'dir': 'sel=persona:pedro&mapa=antiguo', 'ayuda': 'una persona'},
    {'k': 'capitulo', 'texto': 'Hechos 16', 'dir': 'leer=hch-16&mapa=antiguo', 'ayuda': 'un capítulo'},
    {'k': 'anio', 'texto': '607 a.e.c.', 'dir': 't=-605.5000&v=40&mapa=antiguo', 'ayuda': 'un año'},
]
for e in EJEMPLOS:
    comprueba_dir(e['dir'])
    t = re.search(r'(?:^|&)t=(-?[\d.]+)', e['dir'])
    if t:   # el año que enseña el sitio (año astronómico por abajo) tiene que ser el del texto: 607 a.e.c. y no 608
        if fmt_anio(int(float(t.group(1)) // 1)) != e['texto']:
            sys.exit(f'make-data.py: el ejemplo «{e["texto"]}» abre el sitio en {fmt_anio(int(float(t.group(1)) // 1))}')

# ---------------------------------------------------------------------------
# Capítulos con datos: los que citan los sucesos. Para decir sin rodeos si «Tu lectura» tendrá algo en el mapa.
# ---------------------------------------------------------------------------
caps = collections.defaultdict(set)
REF = re.compile(r'^(?:([1-3]?[^\d\s:;,]+)\s+)?(\d+)(?::|$)')
for e in D['eventos']:
    for ref in e.get('pasajes', []):
        libro = None
        for trozo in ref.split(';'):
            m = REF.match(trozo.strip())
            if not m:
                continue
            if m.group(1):
                libro = POR_ABR.get(norm(m.group(1)))
            if libro:
                caps[libro['slug']].add(int(m.group(2)))
BOOKS = [[l['slug'], l['num'], l['nombre'], l['abr'], l['capitulos'],
          sorted(set([norm(l['abr']), norm(l['nombre'])] + [norm(f) for f in l.get('formas', [])])),
          sorted(caps.get(l['slug'], []))] for l in LIBROS]

# ---------------------------------------------------------------------------
# Por estas fechas (A6): para cada mes hebreo, un suceso con ese mes en los datos. Primero los de día conocido.
# ---------------------------------------------------------------------------
PARADAS = {p['sel'] for r in D['recorridos'] for p in r['paradas']}
por_mes = collections.defaultdict(list)
for e in D['eventos']:
    mes = (e['fecha'].get('detalle') or {}).get('mes')
    if mes and e.get('estado') == 'verificado':
        por_mes[mes].append(e)
MESES = []
for m in D['calendario']['meses']:
    lista = por_mes.get(m['id'], [])
    if not lista:
        continue
    lista.sort(key=lambda e: (e['fecha'].get('precision') != 'día', f'evento:{e["id"]}' not in PARADAS, -len(e.get('pasajes', [])), e['fecha']['desde']))
    e = lista[0]
    item = {'id': m['id'], 'nombre': m['nombre'], 'equivale': m['equivale'], 'n': len(lista),
            'titulo': e['titulo'], 'fecha': corta(e['fecha']['texto']),
            'lugar': LUG[e['lugares'][0]]['nombre'] if e.get('lugares') and e['lugares'][0] in LUG else '',
            'dir': f'sel=evento:{e["id"]}&mapa=antiguo'}
    if m['id'] == 'nisan':   # nisán tiene 83 sucesos: la entrada es el recorrido de la última semana, día a día
        r = RECORRIDOS['la-ultima-semana']
        item.update({'titulo': 'La última semana de Jesús, día a día', 'fecha': '33 e.c.', 'lugar': 'Jerusalén',
                     'dir': 'sel=recorrido:la-ultima-semana&paso=1&mapa=antiguo', 'recorrido': len(r['paradas'])})
    MESES.append(item)

# ---------------------------------------------------------------------------
# Un momento cualquiera (B2): sucesos verificados con resumen, lugar y fecha de un año o menos. Se reparten por el
# tiempo para que salgan todas las épocas, no solo las más contadas.
# ---------------------------------------------------------------------------
buenos = [e for e in D['eventos'] if e.get('estado') == 'verificado' and e.get('resumen') and e.get('lugares')
          and e['lugares'][0] in LUG and e['fecha'].get('precision') in ('año', 'día', 'mes') and e.get('pasajes')]
buenos.sort(key=lambda e: e['fecha']['desde'])
MOMENTOS = []
if buenos:
    paso = max(1, len(buenos) // 72)
    for e in buenos[::paso][:72]:
        MOMENTOS.append([e['id'], e['titulo'], corta(e['fecha']['texto']), LUG[e['lugares'][0]]['nombre'], primera_frase(e['resumen'], 150)])

# ---------------------------------------------------------------------------
# Una pregunta con tres respuestas (E3): las de las paradas que se entienden solas. Dos dependen de su parada
# («este primer grupo», «aquel día») y se quedan en su recorrido.
# ---------------------------------------------------------------------------
DEPENDEN = re.compile(r'\b(este|esta|aquel|aquella)\b', re.I)
PREG_TOUR = []
for r in D['recorridos']:
    for i, p in enumerate(r['paradas']):
        q = p.get('pregunta')
        if q and not DEPENDEN.search(q['texto']):
            PREG_TOUR.append({'texto': q['texto'], 'opciones': q['opciones'], 'respuesta': q['respuesta'],
                              'explicacion': q.get('explicacion', ''), 'recorrido': r['id'], 'tituloRecorrido': r['titulo'],
                              'paso': i + 1, 'dir': f'sel={p["sel"]}&t={p["t"]:.4f}&mapa=antiguo',
                              'dirRecorrido': f'sel=recorrido:{r["id"]}&paso={i + 1}&mapa=antiguo'})

CIFRAS = {'sucesos': len(D['eventos']), 'lugares': len(LUG), 'personas': len(PERS), 'fuentes': len(D['fuentes']),
          'libros': len(LIBROS), 'revisados': len(D.get('cobertura', {})), 'generado': D['generado']}

datos = {'eras': ERAS, 'recorridos': TOURS, 'preguntas': PREGUNTAS, 'ejemplos': EJEMPLOS, 'libros': BOOKS,
         'meses': MESES, 'momentos': MOMENTOS, 'preguntasRecorrido': PREG_TOUR, 'cifras': CIFRAS}
(AQUI / 'data.js').write_text('/* Generado por make-data.py a partir de site/data.json. No se edita a mano. */\n'
                              f'window.QD = {json.dumps(datos, ensure_ascii=False, separators=(",", ":"))};\n', encoding='utf-8')

# ---------------------------------------------------------------------------
# Índice de búsqueda: [clase, id, nombre, otros nombres separados por «|», fecha corta, extra, peso]. Clases: p persona,
# l lugar, e suceso, o periodo, c carta, r recorrido, v viaje. Los capítulos y los años se leen al escribir.
# ---------------------------------------------------------------------------
cuenta_lugar = collections.Counter(l for e in D['eventos'] for l in e.get('lugares', []))
TIPO_LUGAR = {'ciudad': 'ciudad', 'region': 'región', 'monte': 'monte', 'rio': 'río', 'isla': 'isla', 'mar': 'mar'}
filas = []


def otros(x, nombre):
    return '|'.join(sorted({n['nombre'] for n in x.get('nombres', []) if n.get('nombre') and n['nombre'] != nombre}))


cuenta_persona = collections.Counter(x for e in D['eventos'] for x in e.get('personas', []))
for p in PERS.values():   # el séptimo campo es el peso: cuántos sucesos lo nombran, para desempatar («Pe» → Pedro)
    filas.append(['p', p['id'], p['nombre'], otros(p, p['nombre']), corta((p.get('fecha') or {}).get('texto')), '', cuenta_persona.get(p['id'], 0)])
for l in LUG.values():
    n = cuenta_lugar.get(l['id'], 0)
    filas.append(['l', l['id'], l['nombre'], otros(l, l['nombre']), '', f'{n} {"suceso" if n == 1 else "sucesos"}' if n else '', n])
for e in D['eventos']:
    filas.append(['e', e['id'], e['titulo'], '', corta(e['fecha']['texto']), ''])
for p in D['periodos']:
    a, b = p['fecha'].get('desde'), p['fecha'].get('hasta')
    tramo = f'{a if a is not None else b},{(b if b is not None else a) + 1}' if a is not None or b is not None else ''
    filas.append(['o', p['id'], p['nombre'], '', corta(p['fecha'].get('texto')), tramo])
for c in D['cartas']:
    filas.append(['c', c['id'], c['libro'], '', corta(c['fecha']['texto']), ''])
for r in TOURS:
    filas.append(['r', r['id'], r['titulo'], '', r['fecha'], f'{r["paradas"]} paradas'])
for v in D['viajes']:
    filas.append(['v', v['id'], v['nombre'], '', corta(v['fecha']['texto']), ''])
(AQUI / 'indice.js').write_text('/* Generado por make-data.py a partir de site/data.json. No se edita a mano. */\n'
                                f'window.QI = {json.dumps(filas, ensure_ascii=False, separators=(",", ":"))};\n', encoding='utf-8')
print(f'data.js {(AQUI / "data.js").stat().st_size // 1024} KB · indice.js {(AQUI / "indice.js").stat().st_size // 1024} KB · '
      f'{len(filas)} entradas · {len(MOMENTOS)} momentos · {len(MESES)} meses · {len(PREG_TOUR)} preguntas de recorrido')
