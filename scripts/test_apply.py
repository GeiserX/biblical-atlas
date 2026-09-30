#!/usr/bin/env python3
"""Pruebas de scripts/apply.py. Uso: python3 scripts/test_apply.py

Trabajan sobre un data/ pequeño en una carpeta temporal, sin red y sin tocar el repo. Los datos van en el esquema en
inglés; las propuestas, en el formato 1 que escriben los carriles, con lo de una ficha en español."""
import contextlib
import copy
import filecmp
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import apply  # noqa: E402

# Una ficha escrita a mano: líneas cortadas a otro ancho y lista en línea. yaml.safe_dump no la reproduce.
ANA = """# biblical-earth: un fichero por persona. Esquema en docs/investigacion/README.md.
id: ana
name: Ana
names:
- name: Ana
summary: Una persona de prueba con un resumen largo que se corta a mano antes de llegar a la columna ciento
  veinte para que el volcado no lo reproduzca igual.
reason: Prueba.
sources: [f-comun]
relations:
- type: lived_in
  place: aldea
  inferred: false
  sources: [f-comun]
  reason: Prueba.
  checked_on: '2026-01-01'
  status: verified
checked_on: '2026-01-01'
status: verified
"""
FUENTES = """# biblical-earth: fuentes comunes.
f-comun:
  title: Común
  work: Prueba
  url: https://wol.jw.org/es/wol/d/r4/lp-s/1200000001
  level: 1
  published: null
  checked_on: '2026-01-01'
"""
# Lucas con un solo tramo junto a Pablo, y dos coberturas que lo citan con la forma corta.
LUCAS = """# biblical-earth: un fichero por persona. Esquema en docs/investigacion/README.md.
id: lucas
name: Lucas
summary: Prueba.
reason: Prueba.
sources: [f-comun]
relations:
- type: accompanies
  person: pablo
  date:
    from: 50
    to: 50
    precision: season
    approx: true
    type: anchored
    chronology: tnm
    text: primavera de 50 e.c.
  inferred: false
  sources: [hch-16]
  reason: Los pasajes en «nosotros» empiezan en Troas (Hch 16:10).
  checked_on: '2026-01-01'
  status: verified
checked_on: '2026-01-01'
status: verified
"""
HECHOS = """# biblical-earth: cobertura de un libro. Formato en data/coverage/README.md.
book: hechos
chapters:
  16:
    status: complete
    reviewed_on: 2026-01-01
    spans:
    - {v: 10-17, type: narration, entities: [person:lucas, relation:lucas/accompanies/pablo]}
"""
OTRO_LIBRO = """# biblical-earth: cobertura de un libro. Formato en data/coverage/README.md.
book: filemon
chapters:
  1:
    status: complete
    reviewed_on: 2026-01-01
    spans:
    - {v: 24, type: letter, entities: [person:lucas, relation:lucas/accompanies/pablo], mentions: [person:pablo]}
"""


def fuente(fid, n, dia="2026-09-29"):
    return {fid: {"titulo": fid, "obra": "Prueba", "url": f"https://wol.jw.org/es/wol/d/r4/lp-s/12000000{n:02d}",
                  "nivel": 1, "publicado": None, "consultado": dia}}


def persona(pid, clave, fuentes, relaciones=()):
    return {"id": pid, "nombre": pid.capitalize(), "perspicacia": clave, "nombres": [{"nombre": pid.capitalize()}],
            "resumen": "Prueba.", "razon": "Prueba.", "fuentes": list(fuentes), "relaciones": list(relaciones),
            "consultado": "2026-09-29", "estado": "verificado"}


def rel(pid, relacion, fuentes):
    return {"tipo": "pariente", "persona": pid, "relacion": relacion, "deducido": False, "fuentes": list(fuentes),
            "razon": "Prueba.", "estado": "verificado"}


def propuesta(cap, cambios, fuentes=None, leido="2026-09-29", libro="prueba"):
    return {"formato": apply.FORMATO, "libro": libro, "capitulos": [cap], "agente": f"prueba-{cap}",
            "leido": leido, "fuentes": fuentes or {},
            "cobertura": {str(cap): {"estado": "completo", "revisado": leido,
                                     "tramos": [{"v": "1-3", "tipo": "narracion", "entidades": [f"persona:x{cap}"]},
                                                {"v": 4, "tipo": "narracion", "nota": "Una nota, con coma."}]}},
            "cambios": cambios}


def read_yaml(ruta):
    return yaml.safe_load(ruta.read_text(encoding="utf-8"))


P1 = propuesta(1, [
    {"op": "crear", "tipo": "personas", "id": "x1", "datos": persona("x1", "1200000011", ["prueba-1", "f1"])},
    {"op": "anadir", "tipo": "personas", "id": "ana", "campo": "fuentes", "valores": ["prueba-1"]},
], fuente("f1", 11))
P2 = propuesta(2, [
    {"op": "crear", "tipo": "personas", "id": "x2", "datos": persona("x2", "1200000012#2", ["prueba-2", "f2"],
                                                                     [rel("x1", "padre", ["prueba-2"])])},
    {"op": "anadir", "tipo": "personas", "id": "x1", "campo": "relaciones", "valores": [rel("ana", "madre", ["prueba-2"])]},
    {"op": "cambiar", "tipo": "personas", "id": "ana", "campo": "razon", "antes": "Prueba.", "despues": "Prueba 2.",
     "historial": {"fecha": "2026-09-29", "cambio": "Prueba.", "fuente": "prueba-2"}},
    {"op": "cambiar", "tipo": "personas", "id": "ana", "campo": "perspicacia", "antes": None, "despues": "1200000001"},
], fuente("f2", 12))
P3 = propuesta(3, [
    {"op": "anadir", "tipo": "personas", "id": "x1", "campo": "fuentes", "valores": ["prueba-3", "f3"]},
], fuente("f3", 13, "2026-09-30"), leido="2026-09-30")


class Prueba(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.raiz = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def data(self, nombre):
        d = self.raiz / nombre / "data"
        (d / "people").mkdir(parents=True)
        (d / "sources").mkdir()
        (d / "people" / "ana.yaml").write_text(ANA, encoding="utf-8")
        (d / "sources" / "comun.yaml").write_text(FUENTES, encoding="utf-8")
        return d

    def correr(self, data, *props, extra=()):
        rutas = []
        for i, p in enumerate(props):
            r = self.raiz / f"p{len(list(self.raiz.glob('p*.json')))}.json"
            r.write_text(json.dumps(p, ensure_ascii=False), encoding="utf-8")
            rutas.append(str(r))
        salida = io.StringIO()
        with contextlib.redirect_stdout(salida), contextlib.redirect_stderr(salida):
            codigo = apply.main(["--data", str(data), *extra, *rutas])
        return codigo, salida.getvalue()

    def correr_ruta(self, data, ruta):
        with contextlib.redirect_stdout(io.StringIO()):
            return apply.main(["--data", str(data), str(ruta)])

    def iguales(self, a, b):
        cmp = filecmp.dircmp(a, b)
        pendientes = [cmp]
        while pendientes:
            c = pendientes.pop()
            self.assertEqual((c.left_only, c.right_only), ([], []), f"ficheros distintos en {c.left}")
            _, distintos, errores = filecmp.cmpfiles(c.left, c.right, c.common_files, shallow=False)
            self.assertEqual((distintos, errores), ([], []), f"contenido distinto en {c.left}")
            pendientes += c.subdirs.values()

    # -- lo de siempre, en el esquema nuevo
    def test_por_partes_igual_que_de_una_vez(self):
        a, b = self.data("a"), self.data("b")
        self.assertEqual(self.correr(a, P1, P2)[0], 0)
        self.assertEqual(self.correr(a, P3)[0], 0)
        self.assertEqual(self.correr(b, P3, P2, P1)[0], 0)      # el orden de los ficheros no importa
        self.iguales(a, b)
        cob = (a / "coverage" / "prueba.yaml").read_text(encoding="utf-8")
        self.assertIn("  1:\n", cob)
        self.assertIn("  3:\n", cob)
        self.assertIn("type: narration, entities: [person:x1]", cob)
        fue = (a / "sources" / "cobertura-prueba.yaml").read_text(encoding="utf-8")
        for fid in ("f1:", "f2:", "f3:"):
            self.assertIn(fid, fue)
        self.assertIn("  title: f1\n", fue)
        x2 = read_yaml(a / "people" / "x2.yaml")
        self.assertEqual(x2["relations"][0]["word"], "father")

    def test_solo_cambian_las_lineas_tocadas(self):
        a = self.data("a")
        self.correr(a, P1)
        nuevo = (a / "people" / "ana.yaml").read_text(encoding="utf-8")
        esperado = ANA.replace("sources: [f-comun]\nrelations", "sources:\n- f-comun\n- prueba-1\nrelations").replace(
            "\nchecked_on: '2026-01-01'", "\nchecked_on: '2026-09-29'")
        self.assertEqual(nuevo, esperado)

    def test_fuente_con_otros_datos_es_error_y_no_escribe(self):
        a = self.data("a")
        otra = dict(P1, fuentes={"f-comun": fuente("f-comun", 99)["f-comun"]})
        codigo, texto = self.correr(a, otra)
        self.assertEqual(codigo, 1, texto)
        self.assertFalse((a / "people" / "x1.yaml").exists())
        self.assertEqual((a / "people" / "ana.yaml").read_text(encoding="utf-8"), ANA)

    def test_misma_fuente_distinta_en_dos_propuestas_es_error(self):
        a = self.data("a")
        otra = dict(P2, fuentes={"f1": fuente("f1", 98)["f1"]})
        codigo, texto = self.correr(a, P1, otra)
        self.assertEqual(codigo, 1, texto)
        self.assertFalse((a / "people" / "x1.yaml").exists())

    def test_choque_no_se_aplica(self):
        a = self.data("a")
        mala = propuesta(1, [{"op": "cambiar", "tipo": "personas", "id": "ana", "campo": "razon", "antes": "Otra.",
                              "despues": "Nueva.", "historial": {"fecha": "2026-09-29", "cambio": "x", "fuente": "f"}}])
        codigo, texto = self.correr(a, mala)
        self.assertEqual(codigo, 2, texto)
        self.assertIn("CHOQUE", texto)
        self.assertIn("reason: Prueba.", (a / "people" / "ana.yaml").read_text(encoding="utf-8"))

    def test_misma_clave_misma_persona(self):
        a = self.data("a")
        self.correr(a, P1)
        otra = propuesta(2, [{"op": "crear", "tipo": "personas", "id": "x1-bis",
                              "datos": persona("x1-bis", "1200000011", ["prueba-2"])}])
        otra["cobertura"]["2"]["tramos"][0]["entidades"] = ["persona:x1-bis"]
        codigo, texto = self.correr(a, otra)
        self.assertEqual(codigo, 0, texto)
        self.assertFalse((a / "people" / "x1-bis.yaml").exists())
        self.assertIn("prueba-2", (a / "people" / "x1.yaml").read_text(encoding="utf-8"))
        self.assertIn("person:x1]", (a / "coverage" / "prueba.yaml").read_text(encoding="utf-8"))

    def test_paralelo_deja_operaciones_que_la_integracion_aplica_igual(self):
        a, b = self.data("a"), self.data("b")
        self.correr(a, P1, P2)
        self.correr(b, P1, P2, extra=["--parallel"])
        self.assertEqual((b / "people" / "ana.yaml").read_text(encoding="utf-8"), ANA)
        ops = b / "_proposals" / "prueba.json"
        self.assertTrue(ops.exists())
        self.assertEqual(self.correr_ruta(b, ops), 0)
        ops.unlink()
        ops.parent.rmdir()
        self.iguales(a, b)

    def test_cambiar_conserva_el_historial_anterior(self):
        """Un cambiar con historial añade una entrada y no borra las que ya había."""
        data = self.data("historial")
        ana = (data / "people" / "ana.yaml").read_text(encoding="utf-8").replace(
            "\nchecked_on: '2026-01-01'",
            "\nhistory:\n- date: '2026-01-01'\n  change: Primera.\n  source: f-comun\n"
            "- date: '2026-02-01'\n  change: Segunda.\n  source: f-comun\nchecked_on: '2026-01-01'")
        (data / "people" / "ana.yaml").write_text(ana, encoding="utf-8")
        p = propuesta(5, [{"op": "cambiar", "tipo": "personas", "id": "ana", "campo": "razon", "antes": "Prueba.",
                           "despues": "Prueba 5.", "historial": {"fecha": "2026-09-29", "cambio": "Tercera.",
                                                                 "fuente": "prueba-5"}},
                          {"op": "crear", "tipo": "personas", "id": "x5",
                           "datos": persona("x5", "1200000015", ["prueba-5"])}])
        codigo, salida = self.correr(data, p)
        self.assertEqual(codigo, 0, salida)
        hist = read_yaml(data / "people" / "ana.yaml")["history"]
        self.assertEqual([h["change"] for h in hist], ["Primera.", "Segunda.", "Tercera."])

    def test_old_option_aliases(self):
        a = self.data("a")
        codigo, salida = self.correr(a, P1, extra=["--seco"])
        self.assertEqual(codigo, 0, salida)
        self.assertFalse((a / "people" / "x1.yaml").exists())
        self.assertIn("(seco)", salida)

    # -- la clave de una relación (modelo.md, sección 6)
    def lucas_data(self):
        data = self.data("lucas")
        (data / "people" / "lucas.yaml").write_text(LUCAS, encoding="utf-8")
        (data / "coverage").mkdir()
        (data / "coverage" / "hechos.yaml").write_text(HECHOS, encoding="utf-8")
        (data / "coverage" / "filemon.yaml").write_text(OTRO_LIBRO, encoding="utf-8")
        tramo = {"tipo": "acompana", "persona": "pablo",
                 "fecha": {"desde": 56, "hasta": 61, "precision": "rango", "aprox": True, "tipo": "anclada",
                           "cronologia": "tnm", "texto": "c. 56-61 e.c."},
                 "deducido": False, "fuentes": ["hch-20"], "razon": "El «nosotros» vuelve en Filipos (Hch 20:5).",
                 "estado": "verificado"}
        p = propuesta(20, [{"op": "anadir", "tipo": "personas", "id": "lucas", "campo": "relaciones",
                            "valores": [tramo]}], leido="2026-09-30", libro="hechos")
        p["cobertura"]["20"]["tramos"] = [{"v": "5-6", "tipo": "narracion",
                                           "entidades": ["persona:lucas", "relation:lucas/accompanies/pablo@56"]}]
        return data, p

    def test_a_new_span_does_not_overwrite_another(self):
        """Añadir a Lucas el tramo de 56 a 61 junto a Pablo deja dos relaciones, cada una con su fecha y su razón."""
        data, p = self.lucas_data()
        codigo, salida = self.correr(data, p)
        self.assertEqual(codigo, 0, salida)
        rels = read_yaml(data / "people" / "lucas.yaml")["relations"]
        self.assertEqual([(r["type"], r["person"], r["date"]["from"]) for r in rels],
                         [("accompanies", "pablo", 50), ("accompanies", "pablo", 56)])
        self.assertEqual(rels[0]["sources"], ["hch-16"])
        self.assertEqual(rels[1]["sources"], ["hch-20"])
        self.assertEqual((rels[0]["checked_on"], rels[1]["checked_on"]), ("2026-01-01", "2026-09-30"))

    def test_undated_next_to_a_span_is_a_clash(self):
        """Una relación sin fecha junto a otra con fecha de la misma terna es ambigua: no se sabe a qué tramo van sus
        fuentes. No se aplica y sale como choque; lo demás de la propuesta sí se aplica."""
        data, p = self.lucas_data()
        tramo = p["cambios"][0]["valores"][0]
        del tramo["fecha"]
        p["cambios"].append({"op": "anadir", "tipo": "personas", "id": "lucas", "campo": "fuentes",
                             "valores": ["hch-20"]})
        codigo, salida = self.correr(data, p)
        self.assertEqual(codigo, 2, salida)
        self.assertIn("CHOQUE en la relación accompanies/pablo: llega sin fecha", salida)
        lucas_data = read_yaml(data / "people" / "lucas.yaml")
        self.assertEqual(len(lucas_data["relations"]), 1)
        self.assertEqual(lucas_data["relations"][0]["sources"], ["hch-16"])
        self.assertEqual(lucas_data["sources"], ["f-comun", "hch-20"])

    def test_references_follow_their_span(self):
        """Tras el tramo nuevo, la forma corta ya casa con dos: las citas que ya había pasan a @50, en el libro que la
        propuesta trae y en los que no, y la del tramo nuevo se queda en @56."""
        data, p = self.lucas_data()
        antes = (data / "coverage" / "filemon.yaml").read_text(encoding="utf-8")
        codigo, salida = self.correr(data, p)
        self.assertEqual(codigo, 0, salida)
        hechos = read_yaml(data / "coverage" / "hechos.yaml")["chapters"]
        self.assertEqual(hechos[16]["spans"][0]["entities"], ["person:lucas", "relation:lucas/accompanies/pablo@50"])
        self.assertEqual(hechos[20]["spans"][0]["entities"], ["person:lucas", "relation:lucas/accompanies/pablo@56"])
        despues = (data / "coverage" / "filemon.yaml").read_text(encoding="utf-8")
        self.assertEqual(despues, antes.replace("relation:lucas/accompanies/pablo]", "relation:lucas/accompanies/pablo@50]"))

    def test_a_source_in_the_middle_keeps_the_other_items_lines(self):
        """Una fuente nueva en la primera de dos relaciones reescribe solo esa: la segunda, con su razón partida a mano,
        conserva sus líneas tal cual."""
        data, _ = self.lucas_data()
        segunda = ("- type: lived_in\n  place: aldea\n  inferred: false\n  sources: [hch-16]\n"
                   "  reason: Un texto largo partido a mano en una\n    línea corta, que yaml.safe_dump escribiría de otra manera.\n"
                   "  checked_on: '2026-01-01'\n  status: verified\n")
        texto = LUCAS.replace("  status: verified\nchecked_on:", "  status: verified\n" + segunda + "checked_on:", 1)
        (data / "people" / "lucas.yaml").write_text(texto, encoding="utf-8")
        tramo = {"tipo": "acompana", "persona": "pablo",
                 "fecha": {"desde": 50, "hasta": 50, "precision": "estación", "aprox": True, "tipo": "anclada",
                           "cronologia": "tnm", "texto": "primavera de 50 e.c."},
                 "deducido": False, "fuentes": ["hch-16", "hch-20"],
                 "razon": "Los pasajes en «nosotros» empiezan en Troas (Hch 16:10).", "estado": "verificado"}
        p = propuesta(16, [{"op": "anadir", "tipo": "personas", "id": "lucas", "campo": "relaciones",
                            "valores": [tramo]}], leido="2026-09-30", libro="hechos")
        codigo, salida = self.correr(data, p)
        self.assertEqual(codigo, 0, salida)
        nuevo = (data / "people" / "lucas.yaml").read_text(encoding="utf-8")
        self.assertEqual(read_yaml(data / "people" / "lucas.yaml")["relations"][0]["sources"], ["hch-16", "hch-20"])
        self.assertIn(segunda, nuevo)

    # -- checked_on en cada hecho anidado (modelo.md, sección 4)
    def test_checked_on_on_added_relation_or_new_source(self):
        a = self.data("a")
        (a / "people" / "x1.yaml").write_text(ANA.replace("id: ana", "id: x1").replace("place: aldea", "place: otra"),
                                             encoding="utf-8")
        mismo = {"tipo": "vivio_en", "lugar": "aldea", "deducido": False, "fuentes": ["f-comun"], "razon": "Prueba.",
                 "estado": "verificado"}
        p = propuesta(1, [
            {"op": "anadir", "tipo": "personas", "id": "ana", "campo": "relaciones",
             "valores": [dict(mismo, fuentes=["f-comun", "nueva"]), rel("x1", "madre", ["nueva"])]},
            {"op": "anadir", "tipo": "personas", "id": "x1", "campo": "relaciones",
             "valores": [dict(mismo, lugar="otra")]},
        ], leido="2026-09-30")
        codigo, salida = self.correr(a, p)
        self.assertEqual(codigo, 0, salida)
        rels = read_yaml(a / "people" / "ana.yaml")["relations"]
        self.assertEqual(rels[0]["sources"], ["f-comun", "nueva"])
        self.assertEqual(rels[0]["checked_on"], "2026-09-30")       # ganó una fuente
        self.assertEqual((rels[1]["word"], rels[1]["checked_on"]), ("mother", "2026-09-30"))   # nueva
        self.assertEqual(list(rels[1])[-2:], ["checked_on", "status"])
        otra = read_yaml(a / "people" / "x1.yaml")["relations"]
        self.assertEqual(otra[0]["checked_on"], "2026-01-01")       # la misma, sin fuente nueva: no se leyó de nuevo

    def test_two_creations_of_a_place_do_not_repeat_candidate(self):
        """Tres propuestas crean el mismo lugar con el mismo candidato: un día, otro con una fuente más y otro con el
        mismo sitio dicho con otras palabras. Queda un candidato con las fuentes de las tres, como se unen las fuentes
        de una ficha, y la diferencia de nombre va al informe."""
        a = self.data("a")
        candidato = {"nombre": "Et-Tell", "geometria": {"tipo": "punto", "lat": 32.91, "lon": 35.63},
                     "estado": "favorecido_nivel_1", "fuentes": ["it-betsaida"], "razon": "Prueba."}

        def place_data(fuentes, **otro):
            return {"id": "betsaida", "nombre": "Betsaida", "tipo": "ciudad", "precision": "incierto",
                    "candidatos": [dict(candidato, fuentes=fuentes, **otro)], "resumen": "Prueba.", "razon": "Prueba.",
                    "fuentes": ["it-betsaida"], "consultado": "2026-09-29", "estado": "verificado"}

        p1 = propuesta(1, [{"op": "crear", "tipo": "lugares", "id": "betsaida", "datos": place_data(["it-betsaida"])}])
        p2 = propuesta(2, [{"op": "crear", "tipo": "lugares", "id": "betsaida",
                            "datos": place_data(["it-betsaida", "openbible-geo"])}], leido="2026-09-30")
        p3 = propuesta(3, [{"op": "crear", "tipo": "lugares", "id": "betsaida",      # el mismo sitio, otras palabras
                            "datos": place_data(["it-betsaida", "hch-1"], nombre="Et-Tell, al norte del lago")}],
                       leido="2026-10-01")
        codigo, salida = self.correr(a, p1, p2, p3)
        self.assertEqual(codigo, 0, salida)
        cands = read_yaml(a / "places" / "betsaida.yaml")["candidates"]
        self.assertEqual(len(cands), 1, cands)
        self.assertEqual(cands[0]["sources"], ["it-betsaida", "openbible-geo", "hch-1"])
        self.assertEqual((cands[0]["name"], cands[0]["status"], cands[0]["checked_on"]),
                         ("Et-Tell", "favored_level_1", "2026-10-01"))
        self.assertIn("el candidato «Et-Tell, al norte del lago» ya estaba con otro valor en name", salida)

    # -- una propuesta de antes de la migración (modelo.md, sección 15)
    FECHA = {"desde": -1943, "hasta": -1943, "precision": "año", "aprox": True, "tipo": "anclada",
             "cronologia": "tnm", "texto": "1943 a.e.c."}

    def dated_data(self):
        data = self.data("fecha")
        ana = (data / "people" / "ana.yaml").read_text(encoding="utf-8").replace(
            "reason: Prueba.\nsources", "date:\n  from: -1943\n  to: -1943\n  precision: year\n  approx: true\n"
            "  type: anchored\n  chronology: tnm\n  text: 1943 a.e.c.\nreason: Prueba.\nsources", 1)
        (data / "people" / "ana.yaml").write_text(ana, encoding="utf-8")
        despues = dict(self.FECHA, desde=-1933, hasta=-1933, texto="1933 a.e.c.")
        return data, propuesta(1, [{"op": "cambiar", "tipo": "personas", "id": "ana", "campo": "fecha",
                                    "antes": self.FECHA, "despues": despues,
                                    "historial": {"fecha": "2026-09-29", "cambio": "Diez años después.",
                                                  "fuente": "f-comun"}}])

    def test_an_old_proposal_applies(self):
        data, p = self.dated_data()
        codigo, salida = self.correr(data, p)
        self.assertEqual(codigo, 0, salida)
        ana = read_yaml(data / "people" / "ana.yaml")
        self.assertEqual(ana["date"], {"from": -1933, "to": -1933, "precision": "year", "approx": True,
                                       "type": "anchored", "chronology": "tnm", "text": "1933 a.e.c."})
        self.assertEqual(ana["history"], [{"date": "2026-09-29", "change": "Diez años después.", "source": "f-comun"}])

    def test_control_untranslated_before_is_a_clash(self):
        """El control de la anterior: si «antes» no se traduce, el escritor dice que ya no es el valor de la ficha."""
        data, p = self.dated_data()
        traducir = apply.migrate.translate_proposal

        def without_before(prop, run):
            out = traducir(prop, run)
            for ch, original in zip(out["cambios"], prop["cambios"]):
                if "antes" in original:
                    ch["antes"] = copy.deepcopy(original["antes"])
            return out

        with mock.patch.object(apply.migrate, "translate_proposal", without_before):
            codigo, salida = self.correr(data, p)
        self.assertEqual(codigo, 2, salida)
        self.assertIn("CHOQUE en «date»", salida)

    def test_change_a_list_written_before_checked_on(self):
        """Un cambiar de relaciones escrito contra los datos de antes de migrar se aplica: el checked_on que la ficha
        lleva y «antes» no, no cuenta. La relación que sigue igual conserva su fecha; la que cambia toma la del día."""
        a = self.data("a")
        vieja = {"tipo": "vivio_en", "lugar": "aldea", "deducido": False, "fuentes": ["f-comun"], "razon": "Prueba.",
                 "estado": "verificado"}
        p = propuesta(1, [{"op": "cambiar", "tipo": "personas", "id": "ana", "campo": "relaciones",
                           "antes": [vieja],
                           "despues": [vieja, dict(vieja, tipo="nacio_en", lugar="otra", fuentes=["nueva"])],
                           "historial": {"fecha": "2026-09-30", "cambio": "Nació en otra.", "fuente": "nueva"}}],
                      leido="2026-09-30")
        codigo, salida = self.correr(a, p)
        self.assertEqual(codigo, 0, salida)
        rels = read_yaml(a / "people" / "ana.yaml")["relations"]
        self.assertEqual([(r["type"], r["place"], r["checked_on"]) for r in rels],
                         [("lived_in", "aldea", "2026-01-01"), ("born_in", "otra", "2026-09-30")])

    # -- en qué ficha va una relación (modelo.md, sección 5)
    def test_a_word_of_the_other_file_is_not_added(self):
        a = self.data("a")
        p = propuesta(1, [{"op": "anadir", "tipo": "personas", "id": "ana", "campo": "relaciones",
                           "valores": [rel("x1", "hijo", ["nueva"])]}])
        codigo, salida = self.correr(a, p)
        self.assertEqual(codigo, 1, salida)
        self.assertIn("people/x1", salida)
        self.assertIn("father o mother o parent", salida)
        self.assertEqual((a / "people" / "ana.yaml").read_text(encoding="utf-8"), ANA)

    def test_a_removed_key_reaches_the_one_that_stays(self):
        """redirects.yaml: una propuesta que aún trae la copia quitada suma sus fuentes a la que quedó, no escribe
        otra vez el par, y su cita pasa a la relación que quedó."""
        a = self.data("a")
        (a / "people" / "ciro.yaml").write_text(ANA.replace("id: ana", "id: ciro"), encoding="utf-8")
        (a / "people" / "cambises-ii.yaml").write_text(
            ANA.replace("id: ana", "id: cambises-ii").replace(
                "- type: lived_in\n  place: aldea", "- type: kin\n  person: ciro\n  word: father"), encoding="utf-8")
        filas = a.parent / "scripts" / "migration"
        filas.mkdir(parents=True)
        (filas / "redirects.yaml").write_text(
            "- from: ciro/kin/cambises-ii\n  to: cambises-ii/kin/ciro/father\n  removed_on: '2026-09-29'\n"
            "  reason: Prueba.\n", encoding="utf-8")
        p = propuesta(1, [{"op": "anadir", "tipo": "personas", "id": "ciro", "campo": "relaciones",
                           "valores": [rel("cambises-ii", "padre de Cambises II", ["nueva"])]}], leido="2026-09-30")
        p["cobertura"]["1"]["tramos"][0]["entidades"] = ["persona:ciro", "relacion:ciro/pariente/cambises-ii"]
        codigo, salida = self.correr(a, p)
        self.assertEqual(codigo, 0, salida)
        self.assertEqual(len(read_yaml(a / "people" / "ciro.yaml")["relations"]), 1)      # solo la de antes
        queda = read_yaml(a / "people" / "cambises-ii.yaml")["relations"][0]
        self.assertEqual((queda["sources"], queda["checked_on"]), (["f-comun", "nueva"], "2026-09-30"))
        cob = read_yaml(a / "coverage" / "prueba.yaml")["chapters"][1]["spans"][0]["entities"]
        self.assertEqual(cob, ["person:ciro", "relation:cambises-ii/kin/ciro"])

    # -- claves nuevas del modelo (new_keys de scripts/migration/map.yaml), que no tienen nombre antiguo
    EVENTO = """# biblical-earth: un fichero por evento. Esquema en docs/investigacion/README.md.
id: muerte
title: Muere Ana
places:
- aldea
people:
- ana
roles: {}
summary: Prueba.
reason: Prueba.
sources: [f-comun]
checked_on: '2026-01-01'
status: verified
"""

    def roles_proposal(self, tipo, ficha, campo):
        return propuesta(1, [{"op": "cambiar", "tipo": tipo, "id": ficha, "campo": campo, "antes": {},
                              "despues": {"ana": "died"},
                              "historial": {"fecha": "2026-09-30", "cambio": "Ana muere en la escena.",
                                            "fuente": "f-comun"}}], leido="2026-09-30")

    def test_change_of_roles_on_an_event_applies(self):
        a = self.data("a")
        (a / "events").mkdir()
        for tipo in ("eventos", "events"):
            with self.subTest(tipo=tipo):
                (a / "events" / "muerte.yaml").write_text(self.EVENTO, encoding="utf-8")
                codigo, salida = self.correr(a, self.roles_proposal(tipo, "muerte", "roles"))
                self.assertEqual(codigo, 0, salida)
                ev = read_yaml(a / "events" / "muerte.yaml")
                self.assertEqual(ev["roles"], {"ana": "died"})
                self.assertEqual(ev["history"], [{"date": "2026-09-30", "change": "Ana muere en la escena.",
                                                  "source": "f-comun"}])

    def test_a_wrong_new_key_still_stops(self):
        """El control de la anterior: una clave que no está en el mapa, o una clave nueva en una carpeta que no la
        tiene, sigue parando la propuesta sin escribir nada."""
        a = self.data("a")
        (a / "events").mkdir()
        (a / "events" / "muerte.yaml").write_text(self.EVENTO, encoding="utf-8")
        for tipo, ficha, campo in (("eventos", "muerte", "rolez"), ("personas", "ana", "roles")):
            with self.subTest(campo=campo, tipo=tipo):
                codigo, salida = self.correr(a, self.roles_proposal(tipo, ficha, campo))
                self.assertEqual(codigo, 1, salida)
                self.assertIn(f"el campo «{campo}» no está en el mapa", salida)
                self.assertEqual((a / "events" / "muerte.yaml").read_text(encoding="utf-8"), self.EVENTO)
                self.assertEqual((a / "people" / "ana.yaml").read_text(encoding="utf-8"), ANA)


if __name__ == "__main__":
    unittest.main(verbosity=2)
