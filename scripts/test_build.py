#!/usr/bin/env python3
"""Pruebas de lo que scripts/build.py compila de un par escrito en las dos fichas. Uso: python3 scripts/test_build.py

Trabajan sobre un data/ pequeño en una carpeta temporal, con el vocabulario de verdad (data/vocabulary.yaml)."""
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build  # noqa: E402

BOOKS = """books:
- {slug: lucas, num: 42, name: Lucas, abbr: Lu, forms: [lucas, lu], chapters: 24}
- {slug: mateo, num: 40, name: Mateo, abbr: Mt, forms: [mateo, mt], chapters: 28}
"""
SOURCES = """it-prueba:
  title: Prueba
  work: Perspicacia
  url: https://wol.jw.org/es/wol/d/r4/lp-s/1200000001
  level: 1
  published: null
  checked_on: '2026-09-29'
"""


def person(pid, relations):
    return (f"id: {pid}\nname: {pid.capitalize()}\nsummary: Prueba.\nreason: Prueba.\nsources: [it-prueba]\n"
            f"relations:\n{relations}checked_on: '2026-09-29'\nstatus: verified\n")


def relation(kind, target, word=None, caption=None, sources=("it-prueba",), reason="Prueba."):
    out = f"- type: {kind}\n  person: {target}\n"
    out += f"  word: {word}\n" if word else ""
    out += f"  caption: {caption}\n  inverse_caption: {caption}\n" if caption else ""
    out += f"  inferred: false\n  sources: [{', '.join(sources)}]\n  reason: {reason}\n"
    return out + "  checked_on: '2026-09-29'\n  status: verified\n"


class PairCopies(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = Path(self.tmp.name) / "data"
        (d / "people").mkdir(parents=True)
        (d / "sources").mkdir()
        (d / "books.yaml").write_text(BOOKS, encoding="utf-8")
        (d / "sources" / "prueba.yaml").write_text(SOURCES, encoding="utf-8")
        shutil.copy(HERE.parent / "data" / "vocabulary.yaml", d / "vocabulary.yaml")
        files = {
            # El dueño no se sabe: manda la ficha cuyo id va primero (pedro), que no cita ningún pasaje.
            "pedro": relation("accompanies", "santiago", caption="socio en la pesca"),
            "santiago": relation("accompanies", "pedro", caption="socio en la pesca", sources=("it-prueba", "lucas-5")),
            # adoptive_father manda (owns: self); la copia de José, adopted_son, está en la ficha que no manda.
            "jesus": relation("kin", "jose", word="adoptive_father", reason="Lu 3:23."),
            "jose": relation("kin", "jesus", word="adopted_son", reason="Mt 13:55."),
        }
        for pid, rels in files.items():
            (d / "people" / f"{pid}.yaml").write_text(person(pid, rels), encoding="utf-8")
        datos, _ = build.cargar(d)
        salida, _, errores = build.componer(datos, "2026-09-29")
        self.assertEqual(errores, [])
        self.rels = {pid: p["relaciones"] for pid, p in salida["personas"].items()}

    def tearDown(self):
        self.tmp.cleanup()

    def test_the_copy_that_stays_keeps_the_pair_reference(self):
        keep, drop = self.rels["pedro"][0], self.rels["santiago"][0]
        self.assertEqual(drop["duplicate_of"], keep["key"])
        self.assertNotIn("duplicate_of", keep)
        self.assertEqual(keep.get("reference"), "Lu 5")

    def test_the_copy_that_stays_keeps_the_word_seen_from_the_other_side(self):
        keep, drop = self.rels["jesus"][0], self.rels["jose"][0]
        self.assertEqual(drop["duplicate_of"], keep["key"])
        self.assertEqual(keep.get("inverse_label"), "hijo adoptivo")
        self.assertEqual(keep.get("reference"), "Lu 3:23; Mt 13:55")


class Summary(unittest.TestCase):
    def test_counts_every_type_the_site_shows(self):
        salida = {"generado": "2026-09-30", "lugares": {"a": 1, "b": 2}, "personas": {"p": 1}, "eventos": [1, 2, 3],
                  "periodos": [], "cartas": [1], "viajes": [], "hallazgos": [1, 2], "recorridos": [1],
                  "fuentes": {"s": 1, "t": 2, "u": 3}, "libros": [1] * 66}
        self.assertEqual(build.resumen(salida), {"generado": "2026-09-30", "lugares": 2, "personas": 1, "eventos": 3,
                                                 "periodos": 0, "cartas": 1, "viajes": 0, "hallazgos": 2,
                                                 "recorridos": 1, "fuentes": 3, "libros": 66})


class ChapterUrls(unittest.TestCase):
    """build.py y bible_coverage.py leen el capítulo de la URL de una fuente, en wol.jw.org o en jw.org."""
    LIBROS = [{"slug": "genesis", "num": 1, "name": "Génesis"}, {"slug": "hechos", "num": 44, "name": "Hechos"},
              {"slug": "2-samuel", "num": 10, "name": "2 Samuel"},
              {"slug": "cantar-de-los-cantares", "num": 22, "name": "El Cantar de los Cantares"}]

    def cap(self, url):
        r = build.cov.capitulo_de_url(url, self.LIBROS)
        return (r[0]["slug"], r[1]) if r else None

    def test_wol(self):
        self.assertEqual(self.cap("https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/44/16"), ("hechos", 16))

    def test_jw_org_con_tilde_y_mayuscula(self):
        base = "https://www.jw.org/es/biblioteca/biblia/biblia-estudio/libros/"
        self.assertEqual(self.cap(base + "G%C3%A9nesis/3/"), ("genesis", 3))
        self.assertEqual(self.cap(base + "2-samuel/1/"), ("2-samuel", 1))
        self.assertEqual(self.cap(base + "hechos/2/#v44002001-v44002047"), ("hechos", 2))
        self.assertEqual(self.cap(base + "el-cantar-de-los-cantares/8/"), ("cantar-de-los-cantares", 8))

    def test_url_capitulo_como_la_escribe_jw_org(self):
        base = "https://www.jw.org/es/biblioteca/biblia/biblia-estudio/libros/"
        self.assertEqual(build.cov.url_capitulo({"name": "Génesis"}, 2), base + "G%C3%A9nesis/2/")
        self.assertEqual(build.cov.url_capitulo({"name": "1 Crónicas"}, 2), base + "1-Cr%C3%B3nicas/2/")
        self.assertEqual(build.cov.url_capitulo({"name": "1 Reyes"}, 3), base + "1-reyes/3/")
        self.assertEqual(build.cov.url_capitulo({"name": "El Cantar de los Cantares"}, 2), base + "el-cantar-de-los-cantares/2/")

    def test_url_capitulo_vuelve_a_su_capitulo_en_los_66_libros(self):
        import yaml
        libros = yaml.safe_load((HERE.parent / "data" / "books.yaml").read_text(encoding="utf-8"))["books"]
        for libro in libros:
            with self.subTest(libro=libro["name"]):
                r = build.cov.capitulo_de_url(build.cov.url_capitulo(libro, 1), libros)
                self.assertEqual((r[0]["num"], r[1]), (libro["num"], 1))

    def test_source_chapters_con_las_dos_formas(self):
        libros = [{"slug": "hechos", "num": 44, "name": "Hechos", "abbr": "Hch"},
                  {"slug": "genesis", "num": 1, "name": "Génesis", "abbr": "Gé"}]
        fuentes = {"hch-16": {"url": "https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/44/16"},
                   "hch-17": {"url": "https://www.jw.org/es/biblioteca/biblia/biblia-estudio/libros/hechos/17/"},
                   "g-3": {"url": "https://www.jw.org/es/biblioteca/biblia/biblia-estudio/libros/G%C3%A9nesis/3/"},
                   "it-x": {"url": "https://www.jw.org/es/biblioteca/libros/Perspicacia-para-comprender-las-Escrituras/X/"}}
        datos = {"books": libros, "sources": fuentes}
        self.assertEqual(build.source_chapters(["hch-16", "hch-17", "g-3", "it-x"], datos), ["Hch 16", "Hch 17", "Gé 3"])

    def test_lo_que_no_es_un_capitulo(self):
        self.assertIsNone(self.cap("https://www.jw.org/es/biblioteca/biblia/biblia-estudio/libros/Tobias/1/"))
        self.assertIsNone(self.cap("https://www.jw.org/es/biblioteca/libros/jesus/ministerio-en-galilea/"))
        self.assertIsNone(self.cap("https://wol.jw.org/es/wol/d/r4/lp-s/1200000129"))


class JourneysForTheSite(unittest.TestCase):
    """A group journey and a companion's range of stops reach data.json with the names the site reads."""

    def test_group_and_companion_ranges(self):
        leg = build.Legacy(build.load_map())
        v = {"person": None, "group": "el Arca del pacto",
             "companions": ["silas", {"person": "lucas", "from": 7, "to": 10}]}
        out = {}
        for k, x in v.items():
            es, hijo = leg.key(k, leg.roots["journeys"], "journeys")
            out[es] = leg.translate(x, hijo, f"journeys.{k}")
        self.assertEqual(out, {"persona": None, "grupo": "el Arca del pacto",
                               "companeros": ["silas", {"persona": "lucas", "desde": 7, "hasta": 10}]})
        self.assertEqual(leg.errors, [])

    def test_companions_stay_a_list_of_ids(self):
        """data.json keeps `companeros` as ids, the shape the atlas MCP server decodes; the ranges go apart."""
        v = {"id": "x", "companeros": ["silas", {"persona": "lucas", "desde": 7, "hasta": 10},
                                       {"persona": "lucas", "desde": 12, "hasta": 12}], "resumen": "y"}
        self.assertEqual(build.tramos_aparte(v), {
            "id": "x", "companeros": ["silas", "lucas"],
            "tramos_companeros": [{"persona": "lucas", "desde": 7, "hasta": 10}, {"persona": "lucas", "desde": 12, "hasta": 12}],
            "resumen": "y"})
        self.assertIs(build.tramos_aparte({"id": "z", "companeros": ["silas"]})["companeros"][0], "silas")

    def test_every_journey_of_data_has_companions_as_ids(self):
        datos, _ = build.cargar(HERE.parent / "data")
        salida, _, _ = build.componer(datos, "2026-10-02")
        malos = [v["id"] for v in salida["viajes"] if not all(isinstance(c, str) for c in v.get("companeros") or [])]
        self.assertEqual(malos, [])
        self.assertTrue(any(v.get("tramos_companeros") for v in salida["viajes"]), "the ranges reach data.json")


if __name__ == "__main__":
    unittest.main(verbosity=1)
