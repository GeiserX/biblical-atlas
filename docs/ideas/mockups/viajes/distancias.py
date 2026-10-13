#!/usr/bin/env python3
"""Distancias y tiempos de cada tramo de cada viaje, para los prototipos de la sección «Viajes».

Uso, desde la raíz del repositorio (antes, python3 scripts/build.py):

    python3 docs/ideas/mockups/viajes/distancias.py            # escribe datos.js y comprueba
    python3 docs/ideas/mockups/viajes/distancias.py --control  # mueve Roma 0,6° al este: el control tiene que fallar

Un tramo va de una parada a la siguiente, por los mismos puntos que dibuja el mapa (BE.puntoLugar en
site/js/trayectorias.js): el punto del lugar o, si es incierto, su candidato preferido. La distancia es la del círculo
máximo entre esos dos puntos, en línea recta: no sigue costas, calzadas ni rodeos. Un tramo que toca una parada sin
punto no se mide.

El tiempo de un tramo sale de tiempos.json cuando el texto o una nota de estudio lo da («dicho»), y si no, de las
fechas de sus dos paradas («deducido»): como mucho, el hueco entre el principio de la primera y el final de la segunda.

Comprobaciones (salida 1 si alguna falla):
  1. Cada tramo de control de tiempos.json queda dentro de su tolerancia frente a la distancia que da la fuente.
  2. Cada tiempo de tiempos.json nombra un viaje, unas paradas y unas fuentes que existen en site/data.json.
  3. Ningún tope deducido («como mucho …») es de 0 días o menos.
"""
import json, math, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..', '..', '..'))
PREFERENCIA = ['seguro', 'favorecido_nivel_1', 'tradicion', 'alternativa', 'solo_nivel_2']
DIA = 1 / 365.2425
MES = 29.5306 * DIA
MESES = ['nisan', 'iyar', 'sivan', 'tamuz', 'ab', 'elul', 'tisri', 'hesvan', 'kislev', 'tebet', 'sebat', 'adar']
NISAN = 0.22                       # el año del sitio empieza en enero; nisán, hacia finales de marzo
ESTACIONES = [                     # tramo del año de cada estación, como TRAMO_ESTACION en trayectorias.js
    ('finales del verano', 0.62, 0.72), ('principios del otoño', 0.72, 0.80), ('pentecostés', 0.38, 0.40),
    ('pascua', 0.25, 0.27), ('primavera', 0.22, 0.47), ('verano', 0.47, 0.72), ('otoño', 0.72, 0.97),
    ('invierno', 0.97, 1.22)]


def punto(l):
    """[lon, lat] e incierto, como BE.puntoLugar; None si el lugar no tiene dónde dibujarse."""
    if not l:
        return None
    if not isinstance(l.get('candidatos'), list):
        return ([l['lon'], l['lat']], l.get('precision') == 'zona') if l.get('lat') is not None and l.get('lon') is not None else None
    cs = [c for c in l['candidatos'] if c.get('estado') in PREFERENCIA and (c.get('geometria') or {}).get('lat') is not None]
    if not cs:
        return None
    g = sorted(cs, key=lambda c: PREFERENCIA.index(c['estado']))[0]['geometria']
    if g.get('tipo') == 'franja' and g.get('hasta'):
        return [(g['lon'] + g['hasta']['lon']) / 2, (g['lat'] + g['hasta']['lat']) / 2], True
    return [g['lon'], g['lat']], True


def km(a, b):
    R = 6371.0088
    f1, f2 = math.radians(a[1]), math.radians(b[1])
    df, dl = f2 - f1, math.radians(b[0] - a[0])
    return 2 * R * math.asin(math.sqrt(math.sin(df / 2) ** 2 + math.cos(f1) * math.cos(f2) * math.sin(dl / 2) ** 2))


def ventana(f):
    """[principio, final] de una fecha en años decimales, con la precisión que da."""
    if not f or f.get('desde') is None and f.get('hasta') is None:
        return None
    a = f['desde'] if f.get('desde') is not None else f['hasta']
    b = f['hasta'] if f.get('hasta') is not None else f['desde']
    det, pr, tx = f.get('detalle') or {}, f.get('precision'), (f.get('texto') or '').lower()
    if det.get('mes') in MESES:
        m0 = a + NISAN + MESES.index(det['mes']) * MES
        if det.get('dia'):
            d = m0 + (det['dia'] - 1) * DIA
            return [d, d + DIA]
        return [m0, m0 + MES]
    if pr == 'estación' and (a == b or (b == a + 1 and 'invierno' in tx)):
        # Un invierno escrito sobre dos años («invierno de 58-59») es uno solo, el que empieza en el primero.
        nombre = det.get('estacion') or next((n for n, _, _ in ESTACIONES if n in tx), None)
        for n, x, y in ESTACIONES:
            if n == nombre:
                return [a + x, a + y]
    return [a, b + 1]


def humano(anios):
    d = anios / DIA
    if d < 1.5:
        return 'un día'
    if d < 14:
        return f'{round(d)} días'
    if d < 60:
        return f'{round(d / 7)} semanas'
    if anios < 1.5:
        m = round(anios * 12)
        return 'un mes' if m == 1 else f'{m} meses'
    return f'{round(anios)} años'


def anual(f):
    """[principio, final] de los años de una fecha, sin mes ni estación."""
    a = f['desde'] if f.get('desde') is not None else f['hasta']
    b = f['hasta'] if f.get('hasta') is not None else f['desde']
    return [a, b + 1]


def deducido(pa, pb):
    """El tiempo deducido de un tramo y su tope en años (None si no es un tope «como mucho»)."""
    wa, wb = ventana(pa.get('fecha')), ventana(pb.get('fecha'))
    if not wa or not wb:
        return None, None
    exacto = all((p.get('fecha') or {}).get('precision') == 'día' for p in (pa, pb))
    if exacto:
        return {'k': 'deducido', 'v': humano(max(0, wb[0] - wa[0]))}, None
    if wb[1] <= wa[0]:
        # Ventanas al revés: un mes del final del año (adar cae pasado enero) junto a una parada con solo el año.
        # Sin más detalle, cada parada vuelve a su año entero.
        wa, wb = anual(pa['fecha']), anual(pb['fecha'])
    if wb[1] - wa[0] >= 1 and wa == wb:
        return {'k': 'deducido', 'v': 'en el mismo año, sin más detalle'}, None
    return {'k': 'deducido', 'v': 'como mucho ' + humano(wb[1] - wa[0])}, wb[1] - wa[0]


def main(control=False):
    D = json.load(open(os.path.join(RAIZ, 'site', 'data.json'), encoding='utf-8'))
    T = json.load(open(os.path.join(AQUI, 'tiempos.json'), encoding='utf-8'))
    L, P, F = D['lugares'], D['personas'], D['fuentes']
    if control:
        L['roma'] = {**L['roma'], 'lon': L['roma']['lon'] + 0.6}
    eras = sorted((p for p in D['periodos'] if p.get('tipo') == 'era'), key=lambda p: p['fecha']['desde'])
    errores = []
    dichos = {}
    for t in T['tiempos']:
        v = next((x for x in D['viajes'] if x['id'] == t['journey']), None)
        ordenes = {p['orden'] for p in v['paradas']} if v else set()
        for o in ([t['at']] if t['kind'] == 'stay' else [t['from'], t['to']]):
            if o not in ordenes:
                errores.append(f"tiempos.json: {t['journey']} no tiene la parada {o}")
        for s in t['sources']:
            if s not in F:
                errores.append(f"tiempos.json: la fuente {s} no existe")
        dichos.setdefault(t['journey'], []).append(t)

    viajes, tramos = [], {}
    for v in D['viajes']:
        ps = sorted(v['paradas'], key=lambda p: p['orden'])
        stops = []
        for p in ps:
            x = punto(L.get(p['lugar'])) if p.get('lugar') else None
            stops.append({'o': p['orden'], 'l': p.get('lugar'), 'n': L[p['lugar']]['nombre'] if p.get('lugar') else f"«{(p.get('unknown_area') or {}).get('words', '?')}» (sin situar)",
                          'c': [round(x[0][0], 4), round(x[0][1], 4)] if x else None,
                          'f': (p.get('fecha') or {}).get('texto'), 'r': p.get('referencia'),
                          **({'i': 1} if x and x[1] else {}), **({'p': 1} if p.get('estado') == 'pendiente' else {}),
                          **({'bf': p['branches_from']} if p.get('branches_from') is not None else {})})
        por = {s['o']: s for s in stops}
        porp = {p['orden']: p for p in ps}
        linea = [p for p in ps if p.get('branches_from') is None]
        pares = [(linea[k], linea[k + 1]) for k in range(len(linea) - 1)]
        for p in ps:
            if p.get('branches_from') is not None:
                pares.append((porp[p['branches_from']], p))
        legs = []
        for a, b in pares:
            ca, cb = por[a['orden']]['c'], por[b['orden']]['c']
            d = km(ca, cb) if ca and cb else None
            leg = {'a': a['orden'], 'b': b['orden'], 'km': round(d, 1) if d is not None else None}
            dicho = next((t for t in dichos.get(v['id'], []) if t['kind'] == 'leg' and t['from'] == a['orden'] and t['to'] == b['orden']), None)
            tiempo, tope = deducido(a, b)
            if tope is not None and tope <= 0:
                errores.append(f"{v['id']} {a['orden']}→{b['orden']}: tope deducido de {tope / DIA:.1f} días")
            if dicho:
                tiempo = {'k': 'fuente' if dicho.get('estimate') else 'dicho', 'v': dicho['value'], 'x': dicho['text'], 'r': dicho['reference']}
            tramo = next((t for t in dichos.get(v['id'], []) if t['kind'] == 'leg' and t['from'] <= a['orden'] and t['to'] >= b['orden'] and t['to'] - t['from'] > 1), None)
            if tramo:
                leg['span'] = {'k': 'fuente' if tramo.get('estimate') else 'dicho', 'v': tramo['value'], 'x': tramo['text'], 'r': tramo['reference'],
                               'de': por[tramo['from']]['n'], 'a': por[tramo['to']]['n'], 'o': [tramo['from'], tramo['to']],
                               'primero': a['orden'] == tramo['from']}
            leg['t'] = tiempo
            legs.append(leg)
            tramos[(v['id'], a['orden'], b['orden'])] = d
        stays = {str(t['at']): {'v': t['value'], 'x': t['text'], 'r': t['reference']} for t in dichos.get(v['id'], []) if t['kind'] == 'stay'}
        f = v.get('fecha') or {}
        w = ventana(f) or [0, 0]
        era = next((e['id'] for e in eras if e['fecha']['desde'] <= w[0] < e['fecha']['hasta'] + 1), eras[-1]['id'])
        quien = P[v['persona']]['nombre'] if v.get('persona') else v.get('grupo')
        medidos = [x['km'] for x in legs if x['km'] is not None]
        viajes.append({'id': v['id'], 'n': v['nombre'], 'q': quien, 'qid': v.get('persona'), 'f': f.get('texto'), 'a': w[0], 'r': v.get('referencia'),
                       'e': era, 's': stops, 't': legs, 'st': stays,
                       'km': round(sum(medidos)), 'sin': len(legs) - len(medidos),
                       **({'rep': 1} if v.get('repeats') == 'yearly' else {})})
    viajes.sort(key=lambda x: (x['a'], x['n']))

    print('Control de distancias (línea recta frente a la que da la fuente):')
    for c in T['control']:
        d = tramos.get((c['journey'], c['from'], c['to']))
        if d is None:
            print(f"  FALLA {c['journey']} {c['from']}→{c['to']}: ese tramo no existe o no se puede medir")
            errores.append(f"control {c['journey']} {c['from']}→{c['to']}: tramo sin medir")
            continue
        ok = abs(d - c['km']) <= c['tolerance'] * c['km']
        print(f"  {'bien ' if ok else 'FALLA'} {c['journey']} {c['from']}→{c['to']}: {d:.1f} km calculados, unos {c['km']} km en {c['reference']} ({(d / c['km'] - 1) * 100:+.1f} %)")
        if not ok:
            errores.append(f"control {c['journey']} {c['from']}→{c['to']}: {d:.1f} km frente a {c['km']}")
    for c in T.get('observed', []):
        d = tramos.get((c['journey'], c['from'], c['to']))
        if d is None:
            continue
        print(f"  aviso {c['journey']} {c['from']}→{c['to']}: {d:.1f} km calculados, unos {c['km']} km en {c['reference']} ({(d / c['km'] - 1) * 100:+.1f} %), no es control")

    todos = [x for v in viajes for x in v['t']]
    sin = sum(1 for x in todos if x['km'] is None)
    k = {}
    for x in todos:
        k[x['t']['k'] if x['t'] else 'sin fecha'] = k.get(x['t']['k'] if x['t'] else 'sin fecha', 0) + 1
    print(f"{len(viajes)} viajes, {sum(len(v['s']) for v in viajes)} paradas, {len(todos)} tramos; {sin} sin medir (una parada sin punto). Tiempos: {k}")
    if errores:
        print('\n'.join('ERROR ' + e for e in errores))
        return 1
    if not control:
        out = {'generado': D.get('generado'), 'eras': [{'id': e['id'], 'n': e['nombre']} for e in eras], 'viajes': viajes}
        txt = '/* Generado por distancias.py desde site/data.json y tiempos.json. No editar a mano. */\nwindow.VIAJES = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
        open(os.path.join(AQUI, 'datos.js'), 'w', encoding='utf-8').write(txt)
        print(f"datos.js: {len(txt.encode('utf-8'))} bytes")
    return 0


if __name__ == '__main__':
    sys.exit(main('--control' in sys.argv))
