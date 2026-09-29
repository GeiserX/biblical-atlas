#!/usr/bin/env python3
"""Pruebas de scripts/migration/migrate.py. Uso: python3 scripts/migration/test_migrate.py

Trabajan sobre un data/ pequeño en una carpeta temporal, sin red y sin tocar el repo. Leen el mapa y el vocabulario de
verdad (scripts/migration/map.yaml y data/vocabulary.yaml): si alguien quita un renombre del mapa, la primera prueba
falla, porque la migración se para en vez de dejar una clave en español."""
import contextlib
import hashlib
import io
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import migrate  # noqa: E402

BOOKS = """# biblical-earth: los 66 libros de la Biblia (aquí, dos).
libros:
- slug: rut
  num: 8
  nombre: Rut
  abr: Rut
  formas: [rut]
  capitulos: 4
- slug: hechos
  num: 44
  nombre: Hechos
  abr: Hch
  formas: [hch, hechos]
  capitulos: 28
"""
CALENDAR = """# biblical-earth: los meses del calendario hebreo. Esquema en docs/investigacion/README.md.
#
# Un comentario que no se toca: fecha.detalle.mes.
meses:
- id: nisan
  orden: 1
  nombre: Nisán
  nombres:
  - nombre: Nisán
    desde: -536
    fuentes: [f-comun]
    razon: 'Prueba: nombre.'
  fiestas:
  - desde: 14
    hasta: 14
    nombre: Pascua
    fuentes: [f-comun]
    razon: Prueba de fiesta.
  fuentes:
  - f-comun
  razon: Prueba de mes.
  consultado: '2026-09-28'
"""
SOURCES = """# biblical-earth: fuentes de prueba.
f-comun:
  titulo: Común
  obra: Prueba
  url: https://wol.jw.org/es/wol/d/r4/lp-s/1200000001
  nivel: 1
  publicado: null
  consultado: '2026-01-01'
hch-16:
  titulo: Hechos 16
  obra: Biblia
  url: https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/44/16
  nivel: 1
  publicado: null
  consultado: '2026-01-01'
"""


def person_file(pid, relaciones="", dia="2026-09-20", extra=""):
    return (f"# biblical-earth: un fichero por persona. Esquema en docs/investigacion/README.md.\n"
            f"id: {pid}\nnombre: {pid.capitalize()}\nnombres:\n- nombre: {pid.capitalize()}\n{extra}"
            f"resumen: Prueba.\nrazon: Prueba.\nfuentes:\n- f-comun\nconsultado: '{dia}'\nestado: verificado\n"
            + (f"relaciones:\n{relaciones}" if relaciones else ""))


def relation_text(tipo, otro, relacion=None, inversa=None, fecha=None, razon="Prueba.", clave="persona", fuentes=("f-comun",)):
    s = f"- tipo: {tipo}\n  {clave}: {otro}\n"
    if relacion is not None:
        s += f"  relacion: {relacion}\n"
    if inversa is not None:
        s += f"  relacion_inversa: {inversa}\n"
    if fecha is not None:
        s += (f"  fecha:\n    desde: {fecha}\n    hasta: {fecha}\n    precision: año\n    aprox: true\n"
              f"    tipo: anclada\n    cronologia: tnm\n    texto: c. {fecha} e.c.\n")
    s += "  deducido: false\n  fuentes:\n" + "".join(f"  - {f}\n" for f in fuentes)
    return s + f"  razon: {razon}\n  estado: verificado\n"


FILES = {
    "libros.yaml": BOOKS,
    "calendario.yaml": CALENDAR,
    "fuentes/comun.yaml": SOURCES,
    "personas/lucas.yaml": person_file("lucas", relation_text("acompana", "pablo", fecha=50, razon="Van juntos (Hch 16:10-17).")
                                   + relation_text("acompana", "pablo", fecha=56, razon="Vuelve el «nosotros» (Hch 20:5).")),
    "personas/pablo.yaml": person_file("pablo"),
    "personas/jesus.yaml": person_file("jesus"),
    "personas/jese.yaml": person_file("jese"),
    "personas/zorobabel.yaml": person_file("zorobabel"),
    "personas/andres.yaml": person_file("andres", relation_text("acompana", "jesus", "maestro")
                                    + relation_text("acompana", "pedro", "amigo", "amigo")),
    "personas/pedro.yaml": person_file("pedro"),
    "personas/julio.yaml": person_file("julio", relation_text("acompana", "pablo", "custodio", "custodiado por")),
    "personas/sesbazar.yaml": person_file("sesbazar", relation_text("mismo_que", "zorobabel", "probablemente la misma persona")),
    # comillas y un comentario dentro de la ficha, que tienen que sobrevivir
    "personas/david.yaml": person_file("david", "# un comentario entre relaciones\n" + relation_text("pariente", "jese", "'padre'")
                                   + relation_text("vivio_en", "belen", clave="lugar"), extra="no_confundir_con: []\n"),
    "lugares/belen.yaml": """# biblical-earth: un fichero por lugar. Esquema en docs/investigacion/README.md.
id: belen
nombre: Belén
tipo: ciudad
precision: incierto
coord_fuente: calculo
candidatos:
- nombre: Belén de Judá
  lat: 31.7
  lon: 35.2
  geometria:
    tipo: punto
  fuentes: [f-comun]
  razon: Prueba.
  estado: favorecido_nivel_1
fuentes: [f-comun]
razon: Prueba.
consultado: '2026-09-15'
estado: verificado
""",
    "viajes/primer-viaje.yaml": """# biblical-earth: un fichero por viaje. Esquema en docs/investigacion/README.md.
id: primer-viaje
nombre: Primer viaje
persona: pablo
companeros: []
fuentes: [f-comun]
razon: Prueba.
consultado: '2026-09-27'
estado: verificado
paradas:
- orden: 1
  lugar: belen
  nota: null
  razon: Prueba.
  fuentes: [f-comun]
  estado: pendiente
""",
    "eventos/muere-isaac.yaml": """# biblical-earth: un fichero por evento. Esquema en docs/investigacion/README.md.
id: muere-isaac
titulo: Muere Isaac
personas:
- isaac
- esau
presentes: []
fuentes: [f-comun]
razon: Prueba.
consultado: '2026-09-29'
estado: verificado
""",
    "cobertura/hechos.yaml": """# biblical-earth: cobertura de un libro. Formato en data/cobertura/README.md.
libro: hechos
capitulos:
  16:
    estado: completo
    revisado: 2026-09-29
    tramos:
    - {v: 10-17, tipo: narracion, entidades: [persona:lucas, relacion:lucas/acompana/pablo, relacion:andres/acompana/jesus]}
  20:
    estado: pendiente
    tramos:
    - {v: 5, tipo: narracion, entidades: [relacion:lucas/acompana/pablo], menciona: [lugar:belen]}
""",
    "recorridos/pedro.yaml": """# biblical-earth: un fichero por recorrido.
id: pedro
titulo: Pedro
paradas:
- sel: persona:pedro
  t: 29.8
  texto: Prueba.
  pasajes: [Jn 1:35-42]
""",
    "hallazgos/cilindro.yaml": """# biblical-earth: un fichero por hallazgo.
id: cilindro
nombre: Cilindro
lugar_hallazgo: belen
relaciona:
- persona:pablo
identificacion: segura
fuentes: [f-comun]
razon: Prueba.
consultado: '2026-09-28'
estado: verificado
""",
}
OLD_KEYS = {k for k, v in migrate.load(migrate.MAP_PATH)["keys"].items() if k != v} | {"relacion", "relacion_inversa"}


def write_files(base, ficheros):
    for rel_, texto in ficheros.items():
        p = base / rel_
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(texto, encoding="utf-8")


def run_migrate(*argv):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = migrate.main(list(argv))
    return code, out.getvalue() + err.getvalue()


def fingerprint(base):
    return {str(p.relative_to(base)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(base.rglob("*")) if p.is_file()}


def collect_keys(x, out):
    if isinstance(x, dict):
        for k, v in x.items():
            out.add(k)
            collect_keys(v, out)
    elif isinstance(x, list):
        for v in x:
            collect_keys(v, out)
    return out


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.data = Path(self.tmp.name) / "data"
        write_files(self.data, FILES)
        self.nada = str(Path(self.tmp.name) / "sin-decisiones")

    def tearDown(self):
        self.tmp.cleanup()

    def migrate_data(self, *extra):
        return run_migrate("--data", str(self.data), "--decisions", self.nada, *extra)

    def read_text(self, rel_):
        return (self.data / rel_).read_text(encoding="utf-8")

    def yaml(self, rel_):
        return yaml.safe_load(self.read_text(rel_))


class Migration(Base):
    def test_no_old_key_remains(self):
        code, out = self.migrate_data()
        self.assertEqual(code, 0, out)
        for d in ("personas", "lugares", "viajes", "eventos", "cobertura", "recorridos", "hallazgos", "fuentes"):
            self.assertFalse((self.data / d).exists(), d)
        for p in self.data.rglob("*.yaml"):
            quedan = collect_keys(yaml.safe_load(p.read_text(encoding="utf-8")), set()) & OLD_KEYS
            self.assertFalse(quedan, f"{p.relative_to(self.data)} conserva {quedan}")

    def test_second_run_changes_nothing(self):
        self.assertEqual(self.migrate_data()[0], 0)
        antes = fingerprint(self.data)
        code, out = self.migrate_data("--check")
        self.assertEqual(code, 0, out)
        code, out = self.migrate_data()
        self.assertEqual(code, 0, out)
        self.assertIn("Nada que cambiar", out)
        self.assertEqual(antes, fingerprint(self.data))

    def test_check_writes_nothing_and_exits_1(self):
        antes = fingerprint(self.data)
        code, out = self.migrate_data("--check")
        self.assertEqual(code, 1, out)
        self.assertEqual(antes, fingerprint(self.data))

    def test_comments_quotes_and_order(self):
        self.migrate_data()
        cal = self.read_text("calendar.yaml")
        self.assertTrue(cal.startswith("# biblical-earth: los meses del calendario hebreo."))
        self.assertIn("# Un comentario que no se toca: fecha.detalle.mes.", cal)
        david = self.read_text("people/david.yaml")
        self.assertIn("# un comentario entre relaciones\n", david)
        self.assertIn("  word: 'father'\n", david)                     # conserva las comillas
        self.assertIn("revisado", FILES["cobertura/hechos.yaml"])
        self.assertIn("reviewed_on: 2026-09-29", self.read_text("coverage/hechos.yaml"))
        self.assertIn("Formato en data/coverage/README.md.", self.read_text("coverage/hechos.yaml"))
        self.assertEqual(list(self.yaml("people/david.yaml"))[:5], ["id", "name", "names", "distinct_from", "summary"])

    def test_relations(self):
        self.migrate_data()
        andres = self.yaml("people/andres.yaml")["relations"]
        self.assertEqual(andres[0]["type"], "disciple_of")
        self.assertNotIn("word", andres[0])
        self.assertEqual((andres[1]["type"], andres[1]["word"]), ("tie", "friend"))
        self.assertNotIn("inverse_caption", andres[1])                    # la inversa sale del vocabulario
        julio = self.yaml("people/julio.yaml")["relations"][0]
        self.assertEqual((julio["type"], julio["caption"], julio["inverse_caption"]), ("tie", "custodio", "custodiado por"))
        ses = self.yaml("people/sesbazar.yaml")["relations"][0]
        self.assertEqual((ses["type"], ses["certainty"]), ("same_as", "probable"))
        david = self.yaml("people/david.yaml")["relations"]
        self.assertEqual((david[0]["type"], david[0]["word"]), ("kin", "father"))
        self.assertEqual((david[1]["type"], david[1]["place"]), ("lived_in", "belen"))
        lucas = self.yaml("people/lucas.yaml")["relations"]
        self.assertEqual(lucas[0]["date"]["precision"], "year")

    def test_checked_on_on_every_nested_fact(self):
        self.migrate_data()
        for r in self.yaml("people/lucas.yaml")["relations"]:
            self.assertEqual(r["checked_on"], "2026-09-20")
            self.assertEqual(list(r)[-2:], ["checked_on", "status"])       # justo antes de status
        self.assertEqual(self.yaml("journeys/primer-viaje.yaml")["stops"][0]["checked_on"], "2026-09-27")
        self.assertEqual(self.yaml("places/belen.yaml")["candidates"][0]["checked_on"], "2026-09-15")
        mes = self.yaml("calendar.yaml")["months"][0]
        self.assertEqual(mes["names"][0]["checked_on"], "2026-09-28")    # la del mes, no la de ningún fichero
        self.assertEqual(mes["festivals"][0]["checked_on"], "2026-09-28")

    def test_no_date_to_copy_stops_without_writing(self):
        write_files(self.data, {"calendario.yaml": CALENDAR.replace("  consultado: '2026-09-28'\n", "")})
        antes = fingerprint(self.data)
        code, out = self.migrate_data()
        self.assertEqual(code, 2, out)
        self.assertIn("no tiene fecha que copiar", out)
        self.assertEqual(antes, fingerprint(self.data))

    def test_typed_events(self):
        self.migrate_data()
        e = self.yaml("events/muere-isaac.yaml")
        self.assertEqual((e["type"], e["roles"]), ("death", {"isaac": "died"}))
        self.assertEqual(list(e)[:5], ["id", "title", "people", "type", "roles"])

    def test_selections_and_enums(self):
        self.migrate_data()
        self.assertEqual(self.yaml("tours/pedro.yaml")["stops"][0]["sel"], "person:pedro")
        h = self.yaml("finds/cilindro.yaml")
        self.assertEqual((h["relates_to"], h["identification"], h["found_at"]), (["person:pablo"], "certain", "belen"))
        b = self.yaml("places/belen.yaml")
        self.assertEqual((b["type"], b["precision"], b["coord_source"]), ("city", "uncertain", "calculation"))
        self.assertEqual(b["candidates"][0]["status"], "favored_level_1")
        self.assertEqual(b["candidates"][0]["geometry"]["type"], "point")

    def test_canonical_references_by_chapter(self):
        self.migrate_data()
        cob = self.yaml("coverage/hechos.yaml")["chapters"]
        self.assertEqual(cob[16]["spans"][0]["entities"],
                         ["person:lucas", "relation:lucas/accompanies/pablo@50", "relation:andres/disciple_of/jesus"])
        self.assertEqual(cob[20]["spans"][0]["entities"], ["relation:lucas/accompanies/pablo@56"])
        self.assertEqual(cob[20]["spans"][0]["mentions"], ["place:belen"])

    def test_unclaimed_reference_stops(self):
        write_files(self.data, {"cobertura/hechos.yaml": FILES["cobertura/hechos.yaml"].replace("  20:", "  21:")})
        antes = fingerprint(self.data)
        code, out = self.migrate_data()
        self.assertEqual(code, 2, out)
        self.assertIn("ninguna cita el capítulo", out)
        self.assertEqual(antes, fingerprint(self.data))

    def test_unknown_key_stops_without_writing(self):
        write_files(self.data, {"personas/pedro.yaml": person_file("pedro", extra="apodo: Cefas\n")})
        antes = fingerprint(self.data)
        code, out = self.migrate_data()
        self.assertEqual(code, 2, out)
        self.assertIn("«apodo»", out)
        self.assertEqual(antes, fingerprint(self.data))

    def test_unknown_value_stops(self):
        write_files(self.data, {"lugares/belen.yaml": FILES["lugares/belen.yaml"].replace("tipo: ciudad", "tipo: aldea")})
        code, out = self.migrate_data()
        self.assertEqual(code, 2, out)
        self.assertIn("«aldea»", out)

    def test_anchor_and_alias(self):
        write_files(self.data, {"personas/pablo.yaml": person_file("pablo", extra="fecha: &f1\n  desde: 50\n  hasta: 50\n"
                                                          "  precision: año\n  aprox: true\n  tipo: anclada\n"
                                                          "  cronologia: tnm\n  texto: c. 50\n")
                             + "relaciones:\n- tipo: vivio_en\n  lugar: belen\n  fecha: *f1\n  deducido: false\n"
                               "  fuentes: [f-comun]\n  razon: Prueba.\n  estado: verificado\n"})
        code, out = self.migrate_data()
        self.assertEqual(code, 0, out)
        p = self.yaml("people/pablo.yaml")
        self.assertEqual(p["relations"][0]["date"]["precision"], "year")
        self.assertIn("date: *f1", self.read_text("people/pablo.yaml"))


class BookBranch(Base):
    def test_word_without_rule_becomes_caption_and_is_listed(self):
        write_files(self.data, {"personas/rode.yaml": person_file("rode", relation_text("acompana", "pedro", "sirvienta", "señora")),
                             "personas/nueva-persona.yaml": person_file("nueva-persona")})
        code, out = self.migrate_data()
        self.assertEqual(code, 0, out)
        r = self.yaml("people/rode.yaml")["relations"][0]
        self.assertEqual((r["type"], r["caption"], r["inverse_caption"]), ("accompanies", "sirvienta", "señora"))
        self.assertIn("NO SE PUDO MAPEAR", out)
        self.assertIn("«sirvienta» sin regla", out)

    def test_with_p_an_unchanged_fact_keeps_the_date_of_p(self):
        p_data = Path(self.tmp.name) / "p" / "data"
        write_files(p_data, FILES)
        # la rama tocó la ficha de Lucas: su fecha es otra y le añadió un tramo nuevo
        nueva = person_file("lucas", relation_text("acompana", "pablo", fecha=50, razon="Van juntos (Hch 16:10-17).")
                        + relation_text("acompana", "pablo", fecha=56, razon="Vuelve el «nosotros» (Hch 20:5).")
                        + relation_text("acompana", "pablo", fecha=65, razon="Solo Lucas está con él."), dia="2026-09-29")
        write_files(self.data, {"personas/lucas.yaml": nueva})
        code, out = self.migrate_data("--baseline", str(p_data))
        self.assertEqual(code, 0, out)
        fechas = [r["checked_on"] for r in self.yaml("people/lucas.yaml")["relations"]]
        self.assertEqual(fechas, ["2026-09-20", "2026-09-20", "2026-09-29"])


class Proposal(Base):
    def test_translates_the_file_data_it_carries(self):
        self.migrate_data()
        p = {"formato": "biblical-earth/propuesta-cobertura/1", "libro": "hechos", "capitulos": [16], "agente": "x",
             "leido": "2026-09-29",
             "cobertura": {"16": {"estado": "completo", "revisado": "2026-09-29", "tramos": [
                 {"v": "1-3", "tipo": "narracion",
                  "entidades": ["persona:timoteo", "relacion:timoteo/acompana/pablo", "relacion:lucas/acompana/pablo"]}]}},
             "fuentes": {"it-timoteo": {"titulo": "Timoteo", "obra": "Perspicacia", "url": "https://x", "nivel": 1,
                                        "publicado": None, "consultado": "2026-09-29"}},
             "cambios": [
                 {"op": "crear", "tipo": "personas", "id": "timoteo", "datos": {
                     "id": "timoteo", "nombre": "Timoteo", "resumen": "Prueba.", "razon": "Prueba.",
                     "fuentes": ["it-timoteo"], "consultado": "2026-09-29", "estado": "verificado",
                     "relaciones": [{"tipo": "acompana", "persona": "pablo", "relacion": "compañero",
                                     "deducido": False, "fuentes": ["it-timoteo"], "razon": "Prueba.",
                                     "estado": "verificado"}]}},
                 {"op": "cambiar", "tipo": "lugares", "id": "belen", "campo": "precision", "antes": "incierto",
                  "despues": "punto", "historial": {"fecha": "2026-09-29", "cambio": "Prueba.", "fuente": "f-comun"}}],
             "preguntas": []}
        entrada = Path(self.tmp.name) / "p.json"
        salida = Path(self.tmp.name) / "q.json"
        entrada.write_text(json.dumps(p, ensure_ascii=False), encoding="utf-8")
        code, out = run_migrate("--proposal", str(entrada), "--data", str(self.data), "--out", str(salida))
        self.assertEqual(code, 0, out)
        q = json.loads(salida.read_text(encoding="utf-8"))
        self.assertEqual(q["formato"], p["formato"])                               # el sobre no cambia
        crear, cambiar = q["cambios"]
        self.assertEqual(crear["tipo"], "people")
        self.assertEqual(crear["datos"]["relations"][0],
                         {"type": "accompanies", "person": "pablo", "word": "companion", "inferred": False,
                          "sources": ["it-timoteo"], "reason": "Prueba.", "status": "verified"})
        self.assertEqual((cambiar["campo"], cambiar["antes"], cambiar["despues"]), ("precision", "uncertain", "point"))
        self.assertEqual(cambiar["historial"], {"date": "2026-09-29", "change": "Prueba.", "source": "f-comun"})
        tramo = q["cobertura"]["16"]["spans"][0]
        self.assertEqual(tramo["type"], "narration")
        self.assertEqual(tramo["entities"], ["person:timoteo", "relation:timoteo/accompanies/pablo",
                                             "relation:lucas/accompanies/pablo@50"])
        self.assertEqual(q["fuentes"]["it-timoteo"]["title"], "Timoteo")


class Decisions(Base):
    def decide(self, entradas, nombre="K1.yaml"):
        d = Path(self.tmp.name) / "decisiones"
        d.mkdir(exist_ok=True)
        (d / nombre).write_text(yaml.safe_dump({"format": "biblical-earth/migration-decisions/1", "decision": "K1",
                                                "checked_on": "2026-09-29", "entries": entradas},
                                               allow_unicode=True, sort_keys=False), encoding="utf-8")
        return run_migrate("--data", str(self.data), "--decisions", str(d))

    def test_set_add_remove_and_redirect(self):
        code, out = self.decide([
            {"file": "people/julio", "relation": "julio/tie/pablo", "remove": True,
             "redirect_to": "pablo/tie/julio/custodian", "sources": ["f-comun"], "reason": "Va en la ficha de Pablo."},
            {"file": "people/pablo", "add": {"type": "tie", "person": "julio", "word": "custodian", "inferred": False,
                                             "sources": ["f-comun"], "reason": "Julio lo custodia.",
                                             "status": "verified"},
             "sources": ["hch-16"], "reason": "Va en la ficha de quien va custodiado."},
            {"file": "people/sesbazar", "relation": "sesbazar/same_as/zorobabel", "set": {"certainty": "possible"},
             "sources": ["hch-16"], "reason": "Prueba de set."},
            {"file": "events/muere-isaac", "set": {"roles": {"isaac": "died", "esau": "spoke"}},
             "sources": ["f-comun"], "reason": "Prueba de un campo del fichero."}])
        self.assertEqual(code, 0, out)
        self.assertEqual(self.yaml("people/julio.yaml").get("relations"), [])
        r = self.yaml("people/pablo.yaml")["relations"][0]
        self.assertEqual((r["word"], r["checked_on"], r["sources"]), ("custodian", "2026-09-29", ["f-comun", "hch-16"]))
        s = self.yaml("people/sesbazar.yaml")["relations"][0]
        self.assertEqual((s["certainty"], s["checked_on"], s["sources"]), ("possible", "2026-09-29", ["f-comun", "hch-16"]))
        self.assertEqual(self.yaml("events/muere-isaac.yaml")["roles"], {"isaac": "died", "esau": "spoke"})
        # una segunda vez no cambia nada
        antes = fingerprint(self.data)
        d = str(Path(self.tmp.name) / "decisiones")
        code, out = run_migrate("--data", str(self.data), "--decisions", d)
        self.assertEqual((code, antes), (0, fingerprint(self.data)), out)

    def test_reference_follows_the_removed_relation(self):
        write_files(self.data, {"cobertura/hechos.yaml": FILES["cobertura/hechos.yaml"].replace(
            "relacion:andres/acompana/jesus", "relacion:julio/acompana/pablo")})
        code, out = self.decide([
            {"file": "people/pablo", "add": {"type": "tie", "person": "julio", "word": "custodian", "inferred": False,
                                             "sources": ["f-comun"], "reason": "Julio lo custodia.",
                                             "status": "verified"},
             "sources": ["f-comun"], "reason": "Va en la ficha de quien va custodiado."},
            {"file": "people/julio", "relation": "julio/tie/pablo", "remove": True,
             "redirect_to": "pablo/tie/julio/custodian", "sources": ["f-comun"], "reason": "Va en la ficha de Pablo."}])
        self.assertEqual(code, 0, out)
        ents = self.yaml("coverage/hechos.yaml")["chapters"][16]["spans"][0]["entities"]
        self.assertIn("relation:pablo/tie/julio", ents)

    def test_the_kept_relation_gets_the_sources_of_the_removed_one(self):
        """Una fuente que solo llevaba la copia quitada (por ejemplo, porque llegó con una rama fusionada después de
        escribir la decisión) pasa a la que queda, aunque la entrada no la nombre."""
        code, out = self.decide([
            {"file": "people/julio", "relation": "julio/tie/pablo", "set": {"inferred": True},
             "sources": ["hch-16"], "reason": "Una fuente más en la copia que se va a quitar."},
            {"file": "people/pablo", "add": {"type": "tie", "person": "julio", "word": "custodian", "inferred": False,
                                             "sources": ["f-comun"], "reason": "Julio lo custodia.",
                                             "status": "verified"},
             "sources": ["f-comun"], "reason": "Va en la ficha de quien va custodiado."},
            {"file": "people/julio", "relation": "julio/tie/pablo", "remove": True,
             "redirect_to": "pablo/tie/julio/custodian", "sources": ["f-comun"], "reason": "Va en la ficha de Pablo."}])
        self.assertEqual(code, 0, out)
        r = self.yaml("people/pablo.yaml")["relations"][0]
        self.assertEqual(r["sources"], ["f-comun", "hch-16"])

    def test_coverage_entry_cites_in_its_span(self):
        entry = {"file": "coverage/hechos", "chapter": 20, "span": "5",
                 "entities": ["person:lucas"], "mentions": ["person:pablo"],
                 "sources": ["hch-16"], "reason": "Prueba de una entrada de cobertura."}
        code, out = self.decide([entry])
        self.assertEqual(code, 0, out)
        span = self.yaml("coverage/hechos.yaml")["chapters"][20]["spans"][0]
        self.assertEqual((span["entities"][-1], span["mentions"]), ("person:lucas", ["place:belen", "person:pablo"]))
        antes = fingerprint(self.data)
        code, out = self.decide([entry])
        self.assertEqual((code, fingerprint(self.data)), (0, antes), out)
        code, out = self.decide([dict(entry, span="6")])
        self.assertEqual(code, 2, out)
        self.assertIn("no tiene un tramo con v 6", out)

    def test_malformed_decision_stops(self):
        antes = fingerprint(self.data)
        code, out = self.decide([{"file": "people/sesbazar", "relation": "sesbazar/same_as/zorobabel",
                                   "set": {"certainty": "possible"}, "sources": ["no-existe"], "reason": "Prueba."}])
        self.assertEqual(code, 2, out)
        self.assertIn("«no-existe» no existe", out)
        self.assertEqual(antes, fingerprint(self.data))


class WholeCheckout(Base):
    def test_scripts_videos_references_redirects_and_report(self):
        root = Path(self.tmp.name)
        raiz = HERE.parent.parent
        write_files(root, {
            "scripts/aplicar.py": "# el escritor\n",
            # El módulo de la cobertura con su nombre antiguo: el del checkout si aún no está migrado y, si lo está, el
            # nuevo, que la migración vuelve a renombrar en la copia.
            "scripts/cobertura.py": next(p for p in (raiz / "scripts" / "cobertura.py",
                                                     raiz / "scripts" / "bible_coverage.py") if p.exists()
                                         ).read_text(encoding="utf-8"),
            "scripts/videos/nombres/pablo.yaml": "# Nombres que busca scripts/videos/indexar.py.\n#\n# Ids de "
                                                 "data/lugares.\n\natalia:\n  nombres: [Atalia]\n  acentos: estricto\n",
            ".github/workflows/validar.yml": "      - run: python3 scripts/revisar.py --fallar\n",
            "scripts/README.md": "Ver [`videos/nombres/`](videos/nombres/) y `data/personas/`.\n",
        })
        shutil.copy(raiz / "data" / "vocabulary.yaml", root / "data" / "vocabulary.yaml")
        code, out = run_migrate("--root", str(root), "--decisions", self.nada)
        self.assertEqual(code, 0, out)
        self.assertTrue((root / "scripts/apply.py").exists() and not (root / "scripts/aplicar.py").exists())
        self.assertTrue((root / "scripts/bible_coverage.py").exists())
        cfg = (root / "scripts/videos/place_names/pablo.yaml").read_text(encoding="utf-8")
        self.assertEqual(cfg, "# Nombres que busca scripts/videos/index.py.\n#\n# Ids de data/places.\n\natalia:\n"
                              "  names: [Atalia]\n  accents: strict\n")
        self.assertEqual((root / ".github/workflows/validar.yml").read_text(encoding="utf-8"),
                         "      - run: python3 scripts/review.py --fail\n")
        self.assertEqual((root / "scripts/README.md").read_text(encoding="utf-8"),
                         "Ver [`videos/place_names/`](videos/place_names/) y `data/people/`.\n")
        self.assertEqual(yaml.safe_load((root / "scripts/migration/redirects.yaml").read_text(encoding="utf-8")), [])
        informes = list((root / "scripts/migration/reports").glob("*.yaml"))
        self.assertEqual(len(informes), 1)
        report = yaml.safe_load(informes[0].read_text(encoding="utf-8"))
        self.assertEqual(report["counts"]["sucesos tipados"], 1)
        # Las rutas del informe son las del repositorio, nunca las de la máquina que migró.
        renamed = [x for row in report["renamed"] for x in (row["from"], row["to"])]
        self.assertIn("data/lugares", renamed)
        self.assertFalse([x for x in renamed if x.startswith("/") or str(root) in x], renamed)
        antes = fingerprint(root)
        code, out = run_migrate("--root", str(root), "--decisions", self.nada)
        self.assertEqual((code, fingerprint(root)), (0, antes), out)


class FromM(Base):
    """Lo que M escribe a mano en data/ (el vocabulario y el README de la cobertura) llega a la rama migrada: sin
    ello, migrar los datos de P no da los datos de M."""

    README_P = "# La cobertura\n\nEjemplo antiguo: `relacion:filemon/vivio_en/colosas` en data/cobertura/.\n"

    def checkout(self):
        root = Path(self.tmp.name)
        (root / "data" / "cobertura" / "README.md").write_text(self.README_P, encoding="utf-8")
        return root

    def test_whole_checkout_takes_vocabulary_and_coverage_readme_from_m(self):
        root = self.checkout()
        raiz = HERE.parent.parent
        self.assertFalse((root / "data" / "vocabulary.yaml").exists())
        code, out = run_migrate("--root", str(root), "--decisions", self.nada)
        self.assertEqual(code, 0, out)
        for rel_ in migrate.FROM_M:
            self.assertEqual((root / "data" / rel_).read_bytes(), (raiz / "data" / rel_).read_bytes(), rel_)
        self.assertIn("se trae de M, escrito a mano: data/coverage/README.md", out)
        antes = fingerprint(root)
        code, out = run_migrate("--root", str(root), "--decisions", self.nada, "--check")
        self.assertEqual((code, fingerprint(root)), (0, antes), out)

    def test_a_readme_the_branch_changed_is_listed_not_overwritten(self):
        root = self.checkout()
        p = Path(self.tmp.name) / "P" / "data"
        write_files(p, {"cobertura/README.md": "# Otra versión de P\n"})
        code, out = run_migrate("--root", str(root), "--decisions", self.nada, "--baseline", str(p))
        self.assertEqual(code, 0, out)
        self.assertIn("data/cobertura/README.md: la rama lo cambió respecto a P", out)
        texto = (root / "data" / "coverage" / "README.md").read_text(encoding="utf-8")
        self.assertIn("relacion:filemon/vivio_en/colosas", texto)
        self.assertIn("data/coverage/", texto)

    def test_merge_head_is_m_in_a_book_branch(self):
        repo = Path(self.tmp.name) / "repo"
        repo.mkdir()
        def git(*a):
            import subprocess
            subprocess.run(["git", "-C", str(repo), "-c", "user.name=prueba", "-c", "user.email=prueba@example.invalid",
                            *a], check=True, capture_output=True)
        git("init", "-q", "-b", "p")
        write_files(repo, {"data/cobertura/README.md": self.README_P})
        git("add", "-A")
        git("commit", "-qm", "P")
        git("checkout", "-qb", "m")
        write_files(repo, {"data/vocabulary.yaml": "format: prueba\n", "data/coverage/README.md": "# M\n"})
        git("rm", "-rq", "data/cobertura")
        git("add", "-A")
        git("commit", "-qm", "M")
        git("checkout", "-q", "p")
        git("merge", "--no-commit", "-s", "ours", "m")
        original = migrate.ROOT
        migrate.ROOT = repo
        try:
            self.assertEqual(migrate.m_files(repo, None), {})
            self.assertEqual(migrate.m_files(repo, "p"), {"vocabulary.yaml": "format: prueba\n",
                                                          "coverage/README.md": "# M\n"})
        finally:
            migrate.ROOT = original


class MapRules(Base):
    """Control negativo dentro de la suite: con un renombre menos en el mapa, la migración se para y lo nombra."""

    def test_without_the_razon_rename_it_stops(self):
        mapa = yaml.safe_load(migrate.MAP_PATH.read_text(encoding="utf-8"))
        del mapa["keys"]["razon"]
        roto = Path(self.tmp.name) / "map.yaml"
        roto.write_text(yaml.safe_dump(mapa, allow_unicode=True, sort_keys=False), encoding="utf-8")
        original = migrate.MAP_PATH
        migrate.MAP_PATH = roto
        try:
            antes = fingerprint(self.data)
            code, out = self.migrate_data()
        finally:
            migrate.MAP_PATH = original
        self.assertEqual(code, 2, out)
        self.assertIn("«razon»", out)
        self.assertEqual(antes, fingerprint(self.data))


if __name__ == "__main__":
    unittest.main(verbosity=1)
