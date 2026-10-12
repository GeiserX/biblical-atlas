#!/usr/bin/env python3
"""Lista los grupos de homónimos de data/: personas, lugares y sucesos que se llaman igual.

Un grupo son dos o más fichas del mismo tipo con el mismo nombre visible: `name` en personas y lugares, `title` en
sucesos. Es el nombre que enseña una fila de la búsqueda, así que cada grupo da filas que solo se distinguen por la
línea de debajo (site/js/buscar.js, distinguishingLine). tests/site/search-namesakes.test.mjs lee la salida con --json y
comprueba en el sitio compilado que cada grupo sale distinguido.

    python3 scripts/homonyms.py            # cuántos grupos hay de cada tipo y cuáles
    python3 scripts/homonyms.py --json     # los mismos grupos, para las pruebas
    python3 scripts/homonyms.py --data DIR # otra copia de data/
"""
import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
# Tipo del sitio, carpeta de data/ y clave del nombre visible.
KINDS = [('person', 'people', 'name'), ('place', 'places', 'name'), ('event', 'events', 'title')]
Loader = getattr(yaml, 'CSafeLoader', yaml.SafeLoader)


def groups(data_dir):
    """{kind: [{'name': ..., 'ids': [...]}, ...]}: los grupos ordenados por nombre y los ids de cada uno también."""
    out = {}
    for kind, folder, key in KINDS:
        by_name = defaultdict(list)
        for f in sorted((data_dir / folder).glob('*.yaml')):
            o = yaml.load(f.read_text(encoding='utf-8'), Loader=Loader) or {}
            if o.get(key) and o.get('id'):
                by_name[o[key]].append(o['id'])
        out[kind] = [{'name': n, 'ids': sorted(ids)} for n, ids in sorted(by_name.items()) if len(ids) > 1]
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--json', action='store_true', help='escribe los grupos en JSON')
    ap.add_argument('--data', type=Path, default=ROOT / 'data', help='la carpeta de los datos (data/)')
    args = ap.parse_args(argv)
    gs = groups(args.data)
    if args.json:
        json.dump(gs, sys.stdout, ensure_ascii=False, indent=1)
        print()
        return 0
    total = sum(len(v) for v in gs.values())
    words = {'person': 'personas', 'place': 'lugares', 'event': 'sucesos'}
    print(f'{total} grupos de homónimos: ' + ', '.join(f'{len(v)} de {words[k]} ({sum(len(g["ids"]) for g in v)} fichas)' for k, v in gs.items()))
    for k, v in gs.items():
        for g in v:
            print(f'{words[k]}\t{g["name"]}\t{" ".join(g["ids"])}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
