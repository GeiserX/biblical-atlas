#!/usr/bin/env python3
"""Escribe docs/ideas/mockups/linea/datos.js (window.TIMELINE_DATA) con lo que una línea de tiempo necesita.

Uso, desde la raíz del repositorio:
    python3 scripts/build.py                            # site/data.json
    node docs/ideas/mockups/linea/ventanas.mjs          # ventanas.json, con las ventanas que calcula el sitio
    python3 docs/ideas/mockups/linea/extract.py         # datos.js

Solo biblioteca estándar. Determinista: la misma entrada da los mismos bytes.

Tiempo: años decimales como en el sitio. El año y (1 = 1 e.c., 0 = 1 a.e.c., -606 = 607 a.e.c.) va de y a y + 1;
un día es 1 / 365.2425. Cada marca lleva [start, end) tal como la coloca el sitio hoy (ventanas.json).
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
DATA = ROOT / "site" / "data.json"
WINDOWS = HERE / "ventanas.json"
LINEA_JS = ROOT / "site" / "js" / "linea.js"
OUT = HERE / "datos.js"

RULER_TYPES = {"rey", "emperador", "gobernador", "sumo-sacerdote"}
PERIOD_LANE = {"era": "eras", "potencia": "imperios", "emperador": "emperadores", "gobernador": "gobernadores",
               "sumo-sacerdote": "sacerdotes"}
KIND_ORDER = {"period": 0, "ruler": 1, "journey": 2, "stop": 3, "letter": 4, "event": 5}
# Duda en el texto de la fecha: un solo extremo («antes de 62», «después de 1600»), una interrogación, «quizá»,
# «tal vez» o dos años a elegir («31 o 32»). «Después de X y antes de Y» es un tramo con dos extremos: no cuenta.
UNCERTAIN = re.compile(r"^a\.\s|^antes de|^d\.\s|^despues de(?!.* y antes de)|fin sin fecha|al menos hasta|\?|quiza|tal vez|\d o \d")
SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[¿¡«A-ZÁÉÍÓÚÑ])")


def norm(s):
    return unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower()


def first_sentence(text):
    text = " ".join(str(text or "").split())
    return SENTENCE_END.split(text, 1)[0] if text else ""


def precision(f):
    """Grano de la fecha: day, month, season, year o years."""
    det = f.get("detalle") or {}
    if det.get("dia"):
        return "day"
    if det.get("mes"):
        return "month"
    if det.get("estacion") or f.get("precision") == "estación":
        return "season"
    if f.get("precision") == "año":
        return "year"
    return "years"


def certainty(f, open_end=None):
    """uncertain: un extremo sin fecha o duda en el texto. computed: fecha nuestra (derivada) o del orden del relato
    (narrativa). approx: la fuente dice «c.». exact: el resto."""
    if f.get("desde") is None or f.get("hasta") is None or open_end or UNCERTAIN.search(norm(f.get("texto"))):
        return "uncertain"
    if f.get("tipo") in ("derivada", "narrativa"):
        return "computed"
    if f.get("aprox"):
        return "approx"
    return "exact"


PASSAGE = re.compile(r"^(\S+)\s+(\d+):(\d+)")


def story_order(marks, passages, rank):
    """Los sucesos de una misma ventana (el mismo día, casi siempre) no traen orden en los datos. Lo deducimos de los
    pasajes: si dos comparten un libro, va antes el que empieza antes en ese libro; con varios libros, manda la mayoría
    y un empate no decide. Se ordena por esas precedencias y, donde no dicen nada, por el orden en que site/data.json
    trae los sucesos.
    Pone `seq` (0, 1, 2...) en cada suceso de una ventana compartida."""
    def starts(m):
        out = {}
        for p in passages.get(m["id"].split(":", 1)[1], []):
            g = PASSAGE.match(p)
            if g and g.group(1) not in out:
                out[g.group(1)] = (int(g.group(2)), int(g.group(3)))
        return out
    groups = {}
    for m in marks:
        if m["kind"] == "event":
            groups.setdefault((round(m["start"], 6), round(m["end"], 6)), []).append(m)
    for ms in groups.values():
        if len(ms) < 2:
            continue
        ms.sort(key=lambda m: rank[m["id"]])
        pos = [starts(m) for m in ms]
        n = len(ms)
        before = [set() for _ in range(n)]   # before[j]: los que van antes que j
        for i in range(n):
            for j in range(i + 1, n):
                vote = sum((pos[i][b] > pos[j][b]) - (pos[i][b] < pos[j][b]) for b in pos[i].keys() & pos[j].keys())
                if vote < 0:
                    before[j].add(i)
                elif vote > 0:
                    before[i].add(j)
        done, order = set(), []
        while len(order) < n:
            ready = [k for k in range(n) if k not in done and before[k] <= done]
            k = ready[0] if ready else min(k for k in range(n) if k not in done)   # un ciclo: manda el orden de los datos
            done.add(k)
            order.append(k)
        for seq, k in enumerate(order):
            ms[k]["seq"] = seq


def main():
    for p in (DATA, WINDOWS):
        if not p.exists():
            sys.exit(f"Falta {p.relative_to(ROOT)}: mira el uso en la cabecera de este fichero.")
    D = json.loads(DATA.read_text(encoding="utf-8"))
    V = json.loads(WINDOWS.read_text(encoding="utf-8"))
    places = D["lugares"]
    people = D["personas"]
    place = lambda ids: [places[i]["nombre"] for i in ids or [] if i in places]
    person = lambda ids: [people[i]["nombre"] if i in people else i for i in ids or []]
    by_id = lambda rows: {r["id"]: r for r in rows}
    wev, wle, wpe, wjo = by_id(V["events"]), by_id(V["letters"]), by_id(V["periods"]), by_id(V["journeys"])

    def mark(kind, id_, lane, name, win, f, **extra):
        m = {"id": f"{kind}:{id_}", "kind": kind, "lane": lane, "name": name, "start": win[0], "end": win[1],
             "date": f.get("texto") or "", "precision": precision(f), "certainty": certainty(f, extra.pop("open", None))}
        m.update({k: v for k, v in extra.items() if v not in (None, [], "", False)})
        return m

    def secular(o):
        out = []
        for a in o.get("alternativas") or []:
            f = a.get("fecha") or {}
            a0, b0 = f.get("desde", f.get("hasta")), f.get("hasta", f.get("desde"))
            if a0 is not None:
                out.append({"date": f.get("texto") or "", "start": a0, "end": (b0 if b0 is not None else a0) + 1})
        return out

    marks = []
    for e in D["eventos"]:
        w = wev[e["id"]]
        if not w["w"]:
            continue
        placed = w["w"] != w["base"]
        marks.append(mark("event", e["id"], "sucesos", e["titulo"], w["w"], e["fecha"],
                          placed=placed, stated=w["base"] if placed else None,
                          places=place(e.get("lugares")), people=person(e.get("personas")),
                          summary=first_sentence(e.get("resumen")), secular=secular(e)))
    for p in D["periodos"]:
        w = wpe[p["id"]]
        if not w["w"]:
            continue
        kind = "ruler" if p["tipo"] in RULER_TYPES else "period"
        lane = V["kingLane"].get(p["id"]) if p["tipo"] == "rey" else PERIOD_LANE[p["tipo"]]
        marks.append(mark(kind, p["id"], lane, p["nombre"], w["w"], p["fecha"], open=w["open"], type=p["tipo"],
                          openEnd={"d": "end", "i": "start"}.get(w["open"]),
                          places=place(p.get("lugares")), people=person([p["persona"]] if p.get("persona") else []),
                          summary=first_sentence(p.get("resumen")), secular=secular(p)))
    for c in D["cartas"]:
        w = wle[c["id"]]
        if not w["w"]:
            continue
        placed = w["w"] != w["year"]
        dest = c.get("destinatarios") or {}
        marks.append(mark("letter", c["id"], "cartas", c["libro"], w["w"], c["fecha"], placed=placed,
                          stated=w["year"] if placed else None,
                          places=place((c.get("escrita_en") or []) + [l for l in dest.get("lugares") or [] if l not in (c.get("escrita_en") or [])]),
                          people=person([c.get("escritor") or "pablo"] + (c.get("personas") or [])),
                          to=dest.get("texto"), summary=first_sentence((c.get("contexto_origen") or {}).get("resumen"))))
    stops_by_journey = {}
    for s in V["stops"]:
        stops_by_journey.setdefault(s["journey"], []).append(s)
    journeys = by_id(D["viajes"])
    for v in D["viajes"]:
        w = wjo[v["id"]]
        who = v.get("persona") or "pablo"
        stop_places = []
        for s in sorted(stops_by_journey.get(v["id"], []), key=lambda s: s["order"]):
            if places[s["place"]]["nombre"] not in stop_places:
                stop_places.append(places[s["place"]]["nombre"])
        marks.append(mark("journey", v["id"], who, v["nombre"], w["w"], v["fecha"], places=stop_places,
                          people=person([who] + (v.get("companeros") or [])), summary=first_sentence(v.get("resumen"))))
    for s in V["stops"]:
        v = journeys[s["journey"]]
        p = next(x for x in v["paradas"] if x["orden"] == s["order"])
        f = p.get("fecha") or {}
        m = mark("stop", s["key"], s["person"], places[s["place"]]["nombre"], s["w"], f, journey=f"journey:{v['id']}",
                 order=s["order"], placed=True, band=s["band"], places=[places[s["place"]]["nombre"]],
                 people=person([s["person"]]), summary=first_sentence(p.get("nota")), ref=p.get("referencia"))
        if s["narrative"] and m["certainty"] != "uncertain":
            m["certainty"] = "computed"
        marks.append(m)
    story_order(marks, {e["id"]: e.get("pasajes") or [] for e in D["eventos"]},
                {f"event:{e['id']}": i for i, e in enumerate(D["eventos"])})
    marks.sort(key=lambda m: (KIND_ORDER[m["kind"]], m["start"], m["end"], m.get("seq", 0), m["id"]))

    src = LINEA_JS.read_text(encoding="utf-8")
    scales = [{"id": norm(n).replace(" ", "-"), "name": n, "short": c, "span": float(s)}
              for n, c, s in re.findall(r"\{\s*n:\s*'([^']+)',\s*c:\s*'([^']+)',\s*s:\s*([\d.]+)\s*\}", src)]
    span_min = float(re.search(r"const SPAN_MIN = ([\d.]+)", src).group(1))
    if len(scales) != 6:
        sys.exit(f"Esperaba 6 escalas en site/js/linea.js y encontré {len(scales)}")
    lanes = V["lanes"]   # los viajes y las paradas de Pablo van en el carril «pablo»

    months = []
    for m in D["calendario"]["meses"]:
        months.append({"id": m["id"], "order": m["orden"], "name": m["nombre"], "ours": m.get("equivale") or "",
                       "names": [{k: v for k, v in (("name", n["nombre"]), ("from", n.get("desde")), ("to", n.get("hasta"))) if v is not None}
                                 for n in m.get("nombres") or []],
                       "feasts": [{"name": x["nombre"], "from": x.get("desde"), "to": x.get("hasta")} for x in m.get("fiestas") or []]})

    out = {
        "format": "linea-disenos/1",
        "time": "Años decimales: el año y va de y a y + 1 (1 = 1 e.c., 0 = 1 a.e.c.). Un día = 1 / 365.2425.",
        "range": [V["tMin"], V["tMax"]],
        "spanMin": span_min,
        "day": V["day"],
        "scales": scales,
        "lanes": lanes,
        "kinds": {"event": "Suceso", "period": "Era o imperio", "ruler": "Rey, emperador, gobernador o sumo sacerdote",
                  "journey": "Viaje", "stop": "Parada de un viaje", "letter": "Carta"},
        "precisions": {"day": "Día", "month": "Mes", "season": "Estación", "year": "Año", "years": "Varios años"},
        "certainties": {"exact": "Fecha de la fuente", "approx": "Aproximada («c.»)",
                        "computed": "Calculada por nosotros o situada por el orden del relato",
                        "uncertain": "Incierta: un extremo sin fecha o una duda en la fuente"},
        "marks": marks,
        "calendar": {"lunarMonth": V["lunarMonth"], "months": months,
                     "years": [{"year": y["year"], "months": y["months"]} for y in V["hebrewYears"]]},
    }
    body = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text("/* Generado por extract.py desde site/data.json y ventanas.json. No se edita a mano. */\n"
                   f"window.TIMELINE_DATA = {body};\n", encoding="utf-8")
    counts = {}
    for m in marks:
        counts[m["kind"]] = counts.get(m["kind"], 0) + 1
    print(f"{OUT.relative_to(ROOT)}: {OUT.stat().st_size / 1024:.0f} KB, {len(marks)} marcas {counts}, "
          f"{len(lanes)} carriles, {len(scales)} escalas, {len(months)} meses, {len(V['hebrewYears'])} años hebreos")


if __name__ == "__main__":
    main()
