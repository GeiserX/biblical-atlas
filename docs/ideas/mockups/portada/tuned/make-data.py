#!/usr/bin/env python3
"""Portada «La de hoy, afinada»: escribe data.js, la copia pequeña de lo que la portada enseña.

Lee site/data.json (lo genera scripts/build.py) y guarda en data.js solo lo que la portada pinta: las nueve épocas
con sus libros y sus lugares, las tres preguntas, los cuatro recorridos con su ruta, un dato de ejemplo con su
fuente y las cifras del atlas. Así el prototipo abre también sin el sitio al lado.

Uso, desde la raíz del repositorio:  python3 docs/ideas/mockups/portada/tuned/make-data.py
"""
import json
import math
import pathlib

AQUI = pathlib.Path(__file__).resolve().parent
RAIZ = AQUI.parents[4]
D = json.loads((RAIZ / 'site' / 'data.json').read_text(encoding='utf-8'))
L = D['lugares']

# Libros que cuentan cada época: sacados del resumen de cada época en data/ (escritos a mano, como pide la idea D2,
# porque calcularlos da resultados raros: Génesis y Salmos abarcan varias).
LIBROS_EPOCA = {
    'de-adan-al-diluvio': 'Génesis 1 a 8',
    'los-patriarcas': 'Génesis 9 a 50',
    'exodo-y-desierto': 'Éxodo, Levítico, Números y Deuteronomio',
    'josue-y-los-jueces': 'Josué, Jueces y Rut',
    'reyes-de-israel-y-juda': 'De 1 Samuel a 2 Crónicas',
    'destierro-y-regreso': 'Daniel, Esdras, Ester, Nehemías, Ageo, Zacarías y Malaquías',
    'entre-malaquias-y-mateo': None,   # sin libro bíblico
    'jesus-en-la-tierra': 'Mateo, Marcos, Lucas y Juan',
    'congregacion-cristiana': 'De Hechos a Apocalipsis',
}
# Dónde ocurrió cada época (idea D1): lugares escritos a mano; el mapa los encuadra al entrar.
LUGARES_EPOCA = {
    'de-adan-al-diluvio': ['eden', 'ararat'],
    'los-patriarcas': ['ur', 'haran', 'hebron', 'beer-seba', 'egipto'],
    'exodo-y-desierto': ['egipto', 'desierto-de-sinai', 'llanuras-deserticas-de-moab'],
    'josue-y-los-jueces': ['dan', 'siquem', 'silo', 'jerico', 'hebron', 'gaza'],
    'reyes-de-israel-y-juda': ['dan', 'samaria', 'jerusalen', 'beer-seba'],
    'destierro-y-regreso': ['babilonia', 'jerusalen', 'susa'],
    'entre-malaquias-y-mateo': ['jerusalen', 'alejandria', 'antioquia-de-siria'],
    'jesus-en-la-tierra': ['nazaret', 'capernaum', 'jerusalen', 'belen'],
    'congregacion-cristiana': ['jerusalen', 'antioquia-de-siria', 'efeso', 'corinto', 'roma'],
}
# Los tres recorridos que no traen resumen en data/: borradores nuestros, a revisar antes de pasarlos a los datos.
RESUMEN_BORRADOR = {
    'cartas-y-ciudades': 'Catorce cartas, de la primera a los tesalonicenses, hacia el año 50, a la segunda a Timoteo, '
                         'hacia el 65: desde dónde las escribió Pablo y a quién iban.',
    'la-ultima-semana': 'Dieciocho paradas, de la llegada a Betania el 8 de nisán al Pentecostés: la cena, el arresto, '
                        'la muerte y la resurrección de Jesús.',
    'pedro': 'Dieciséis paradas, de Juan 1, cuando conoce a Jesús, a sus dos cartas: la pesca en Galilea, el '
             'Pentecostés, la casa de Cornelio y la cárcel de Jerusalén.',
}


def fmt_anio(y):
    return f'{y} e.c.' if y > 0 else f'{1 - y} a.e.c.'


def rango(a, b):
    ya, yb = math.floor(a), math.floor(b)
    if ya == yb:
        return fmt_anio(ya)
    if ya > 0 and yb > 0:
        return f'{ya}-{yb} e.c.'
    if ya <= 0 and yb <= 0:
        return f'{1 - ya}-{1 - yb} a.e.c.'
    return f'{fmt_anio(ya)} - {fmt_anio(yb)}'


def coord(lid):
    l = L.get(lid)
    if not l or l.get('lat') is None or l.get('lon') is None:
        return None
    return (l['lon'], l['lat'], l['nombre'])


def lugar_de_parada(sel):
    tipo, _, ident = sel.partition(':')
    if tipo == 'lugar':
        return coord(ident)
    if tipo == 'carta':
        c = next((x for x in D['cartas'] if x['id'] == ident), None)
        for lid in (c or {}).get('escrita_en', []):
            if coord(lid):
                return coord(lid)
    if tipo == 'evento':
        e = next((x for x in D['eventos'] if x['id'] == ident), None)
        for lid in (e or {}).get('lugares', []):
            if coord(lid) and L[lid].get('precision') == 'punto':
                return coord(lid)
    return None   # un capítulo (pasaje:jn-1) no tiene lugar propio


def ruta(paradas):
    """Puntos de la ruta en una caja de 100 x 56, proyección equirectangular corregida por la latitud."""
    pts = [lugar_de_parada(p['sel']) for p in paradas]
    ok = [p for p in pts if p]
    if len(ok) < 2:
        return {'forma': 'dias', 'puntos': []}
    lat0 = sum(p[1] for p in ok) / len(ok)
    k = math.cos(math.radians(lat0))
    xs = [p[0] * k for p in ok]
    ys = [p[1] for p in ok]
    ancho, alto = max(xs) - min(xs), max(ys) - min(ys)
    km = math.hypot(ancho * 111, alto * 111)
    if km < 40:   # la última semana: casi todo en Jerusalén; un nudo no dice nada, se dibujan los días
        return {'forma': 'dias', 'puntos': []}
    esc = min(92 / max(ancho, 1e-6), 48 / max(alto, 1e-6))
    ox = (100 - ancho * esc) / 2
    oy = (56 - alto * esc) / 2
    out = []
    for i, p in enumerate(pts):
        if not p:
            out.append(None)   # parada sin lugar: cuenta, pero no se dibuja
            continue
        x = ox + (p[0] * k - min(xs)) * esc
        y = oy + (max(ys) - p[1]) * esc
        out.append([round(x, 1), round(y, 1)])
    # Los nombres de los dos lugares más alejados entre sí, para que la ruta se lea sin mapa debajo.
    idx = [i for i, p in enumerate(pts) if p]
    a, b = max(((i, j) for i in idx for j in idx), key=lambda ij: math.hypot(out[ij[0]][0] - out[ij[1]][0], out[ij[0]][1] - out[ij[1]][1]))
    if out[a][0] > out[b][0]:
        a, b = b, a
    return {'forma': 'ruta', 'puntos': out, 'nombres': [[pts[a][2], *out[a]], [pts[b][2], *out[b]]]}


# Las puntas de la tira de días, escritas a mano a partir de la primera y la última parada.
DIAS_PUNTAS = {'la-ultima-semana': ['8 de nisán', 'Pentecostés']}


def dias(paradas):
    """Para la última semana: el número de día de cada parada, para agrupar los puntos."""
    return [math.floor((p['t'] - math.floor(p['t'])) * 365.25) for p in paradas]


eras = sorted((p for p in D['periodos'] if p['tipo'] == 'era'), key=lambda p: p['fecha']['desde'])
salida_eras = []
for i, p in enumerate(eras, 1):
    f = p['fecha']
    lugares = [x for x in LUGARES_EPOCA.get(p['id'], []) if x in L]
    salida_eras.append({
        'id': p['id'], 'num': i, 'nombre': p['nombre'], 'fecha': f.get('texto') or rango(f['desde'], f['hasta']),
        'desde': f['desde'], 'hasta': f['hasta'] + 1, 'libros': LIBROS_EPOCA.get(p['id']), 'lugares': lugares,
    })

salida_rec = []
for r in D['recorridos']:
    ts = [p['t'] for p in r['paradas']]
    ru = ruta(r['paradas'])
    salida_rec.append({
        'id': r['id'], 'titulo': r['titulo'], 'paradas': len(r['paradas']), 'fechas': rango(min(ts), max(ts)),
        'resumen': r.get('resumen') or RESUMEN_BORRADOR.get(r['id']), 'borrador': not r.get('resumen'),
        'minutos': max(3, round(len(r['paradas']) * 40 / 60)),   # 40 s por parada: una estimación, y se dice
        'ruta': ru, 'dias': dias(r['paradas']) if ru['forma'] == 'dias' else None,
        'puntas': DIAS_PUNTAS.get(r['id']) if ru['forma'] == 'dias' else None,
    })

ev = next(e for e in D['eventos'] if e['id'] == 'destruccion-de-jerusalen-607')
f0 = D['fuentes'][ev['fuentes'][0]]
ejemplo = {
    'sel': 'evento:' + ev['id'], 't': -605.4422, 'titulo': ev['titulo'], 'fecha': ev['fecha']['texto'],
    'pasajes': ev['pasajes'][:2], 'fuente': {'titulo': f0['titulo'], 'url': f0['url'], 'nivel': f0['nivel']},
    'secular': (ev.get('alternativas') or [{}])[0].get('fecha', {}).get('texto'),
}

salida = {
    'generado': D['generado'],
    'cifras': {'sucesos': len(D['eventos']), 'lugares': len(L), 'personas': len(D['personas']),
               'fuentes': len(D['fuentes']), 'libros': len(D['libros']), 'revisados': len(D['cobertura'])},
    'eras': salida_eras,
    'recorridos': salida_rec,
    'ejemplo': ejemplo,
    'libros': {str(l['num']): [l['nombre'], l['capitulos']] for l in D['libros']},
}
texto = json.dumps(salida, ensure_ascii=False, separators=(',', ':'))
(AQUI / 'data.js').write_text(
    '/* Generado por make-data.py a partir de site/data.json. No se edita a mano. */\n'
    f'window.PORTADA_DATOS = {texto};\n', encoding='utf-8')
print(f'data.js: {len(texto.encode())} bytes, {len(salida_eras)} épocas, {len(salida_rec)} recorridos')
