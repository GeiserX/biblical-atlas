"""Genera, por extension y estilo, un HTML con el relieve de fondo y las capas vectoriales
(costas, rios, lagos; fronteras y paises en el estilo actual) a tamaño nativo en px."""
import json, math, sys, os
HERE = sys.argv[1]; OUT = sys.argv[2]
E = json.load(open('extents.json'))
load = lambda n: json.load(open(f'{HERE}/{n}.geojson'))
COAST, RIVERS, LAKES, BORDERS, COUNTRIES = (load('ne_10m_coastline'), load('ne_10m_rivers_lake_centerlines'),
    load('ne_10m_lakes'), load('ne_10m_admin_0_boundary_lines_land'), load('ne_10m_admin_0_countries'))

def lines(geom):
    t, c = geom['type'], geom['coordinates']
    if t == 'LineString': return [c]
    if t == 'MultiLineString': return c
    if t == 'Polygon': return c
    if t == 'MultiPolygon': return [r for p in c for r in p]
    return []

def make_proj(ext):
    c = math.cos(math.radians(ext['phi'])); k = ext['width'] / ((ext['lon1'] - ext['lon0']) * c)
    return (lambda lon, lat: ((lon - ext['lon0']) * c * k, (ext['lat1'] - lat) * k)), k

def path_d(features, ext, proj, keep=lambda p: True, closed=False):
    out = []
    pad = 1.5
    for f in features:
        if not keep(f['properties']): continue
        for ring in lines(f['geometry']):
            if not ring: continue
            xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
            if max(xs) < ext['lon0'] - pad or min(xs) > ext['lon1'] + pad or max(ys) < ext['lat0'] - pad or min(ys) > ext['lat1'] + pad: continue
            pts = []; last = None
            for lon, lat in ring:
                x, y = proj(lon, lat)
                if last and abs(x - last[0]) < 0.6 and abs(y - last[1]) < 0.6: continue
                pts.append((x, y)); last = (x, y)
            if len(pts) < 2: continue
            out.append('M' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ('Z' if closed else ''))
    return ''.join(out)

STY = {
 'antiguo': dict(coast='#6f5f4b', coast_w=1.0, water_line='#8aa29c', river='#7d9ea3', lake_fill='#c9d5cc', lake_stroke='#6f7f78', borders=False),
 'actual':  dict(coast='#4f7d9e', coast_w=0.9, water_line='#8fb8d4', river='#6b9cc4', lake_fill='#b9d5e6', lake_stroke='#4f7d9e', borders=True),
}
SCALE = {'mundo': 0.85, 'mediterraneo': 1.25, 'israel': 1.7}
RIVER_RANK = {'mundo': 6, 'mediterraneo': 8, 'israel': 12}
LABEL_MAX = {'mundo': 3.1, 'mediterraneo': 5.0, 'israel': 6.0}
LABEL_PX = {'mundo': 17, 'mediterraneo': 22, 'israel': 30}
SKIP_LABEL = {'Dekelia', 'Akrotiri', 'Línea Verde', 'Baikonur', 'Ciudad del Vaticano', 'San Marino', 'Mónaco', 'Andorra', 'Liechtenstein', 'Gibraltar', 'Jersey', 'Guernsey', 'Luxemburgo', 'Malta'}

for name, ext in E.items():
    proj, k = make_proj(ext); W = ext['width']; H = round((ext['lat1'] - ext['lat0']) * k)
    s = SCALE[name]
    coast = path_d(COAST['features'], ext, proj)
    rivers = {}
    for f in RIVERS['features']:
        p = f['properties']
        if p.get('featurecla') not in ('River', 'Lake Centerline') or (p.get('scalerank') or 99) > RIVER_RANK[name]: continue
        rivers.setdefault(min(int(p['scalerank']), 9), []).append(f)
    river_svg = ''.join(f'<path d="{path_d(fs, ext, proj)}" stroke-width="{s * max(0.6, 2.0 - 0.18 * r):.2f}"/>' for r, fs in sorted(rivers.items()))
    lakes = path_d(LAKES['features'], ext, proj, closed=True)
    borders = path_d(BORDERS['features'], ext, proj)
    for style, st in STY.items():
        labels = ''
        if False:
            for f in COUNTRIES['features']:
                p = f['properties']; n = p['NAME_ES']
                if n in SKIP_LABEL or (p['MIN_LABEL'] or 99) > LABEL_MAX[name]: continue
                lx, ly = p['LABEL_X'], p['LABEL_Y']
                x, y = proj(lx, ly)
                if not (60 < x < W - 60 and 30 < y < H - 30): continue
                labels += f'<text x="{x:.0f}" y="{y:.0f}">{n.upper()}</text>'
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
  <g fill="none" stroke-linejoin="round" stroke-linecap="round">
    <path d="{coast}" stroke="{st['water_line']}" stroke-width="{s * 4.5:.2f}" opacity=".28"/>
    <path d="{coast}" stroke="{st['water_line']}" stroke-width="{s * 9:.2f}" opacity=".10"/>
    <g stroke="{st['river']}" opacity=".95">{river_svg}</g>
    <path d="{lakes}" fill="{st['lake_fill']}" stroke="{st['lake_stroke']}" stroke-width="{s * 0.7:.2f}"/>
    <path d="{coast}" stroke="{st['coast']}" stroke-width="{s * st['coast_w']:.2f}"/>
    {f'<path d="{borders}" stroke="#ffffff" stroke-width="{s * 4:.2f}" opacity=".55"/><path d="{borders}" stroke="#8a7a9a" stroke-width="{s * 1.1:.2f}" stroke-dasharray="{s*6:.1f} {s*2.5:.1f} {s*1.2:.1f} {s*2.5:.1f}"/>' if st['borders'] else ''}
  </g>
  <g font-family="Inter" font-weight="600" font-size="{LABEL_PX[name]}" letter-spacing="{LABEL_PX[name] * 0.22:.1f}" fill="#6d6280" text-anchor="middle" dominant-baseline="middle"
     stroke="#ffffff" stroke-opacity=".75" stroke-width="{LABEL_PX[name] * 0.22:.1f}" paint-order="stroke">{labels}</g>
</svg>'''
        html = f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="fonts.css">
<style>html,body{{margin:0;padding:0;background:#fff}} .m{{position:relative;width:{W}px;height:{H}px}} .m>*{{position:absolute;inset:0}}</style></head>
<body><div class="m"><img src="relief_{name}_{style}.png" width="{W}" height="{H}">{svg}</div></body></html>'''
        open(f'{OUT}/map_{name}_{style}.html', 'w').write(html)
        print(name, style, W, H, len(html) // 1024, 'KB')

# etiquetas de paises actuales (Natural Earth, NAME_ES) para pintarlas en HTML desde geo.js
labs = []
for f in COUNTRIES['features']:
    p = f['properties']; n = p['NAME_ES']
    if n in SKIP_LABEL or p['TYPE'] in ('Dependency', 'Lease', 'Indeterminate') or (p['MIN_LABEL'] or 99) > 6: continue
    if not (-12 < p['LABEL_X'] < 75 and 8 < p['LABEL_Y'] < 54): continue
    labs.append({'nombre': n, 'lon': round(p['LABEL_X'], 3), 'lat': round(p['LABEL_Y'], 3), 'min_label': p['MIN_LABEL']})
labs.sort(key=lambda d: d['min_label'])
json.dump(labs, open(f'{OUT}/paises-actuales.json', 'w'), ensure_ascii=False, indent=1)
print(len(labs), 'etiquetas')
