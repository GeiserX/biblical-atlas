#!/usr/bin/env python3
"""Pruebas de lo que scripts/build.py compila de un par escrito en las dos fichas. Uso: python3 scripts/test_build.py

Trabajan sobre un data/ pequeño en una carpeta temporal, con el vocabulario de verdad (data/vocabulary.yaml)."""
import json
import shutil
import sqlite3
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
                  "fuentes": {"s": {}, "t": {}, "u": {}}, "libros": [1] * 66}
        self.assertEqual(build.resumen(salida), {"generado": "2026-09-30", "lugares": 2, "personas": 1, "eventos": 3,
                                                 "periodos": 0, "cartas": 1, "viajes": 0, "hallazgos": 2,
                                                 "recorridos": 1, "fuentes": 0, "libros": 66, "capitulos": 0})

    def test_sources_count_only_written_ones_some_fact_cites_and_chapters_apart(self):
        # «u» no la cita nadie; «mateo-26» y «mateo-27» los añade la compilación; una fuente suelta («fuente») y una
        # anidada (un candidato, el calendario) también cuentan, y un id citado dos veces cuenta una vez. «w» solo lo
        # cita un cargo, que se compila con `sources`.
        F = {"s": {}, "t": {}, "u": {}, "v": {}, "w": {}, "mateo-26": {"implicita": True}, "mateo-27": {"implicita": True}}
        salida = {"generado": "2026-09-30", "fuentes": F, "libros": [], "periodos": [], "cartas": [], "viajes": [],
                  "hallazgos": [], "recorridos": [{"paradas": [{"fuente": "v"}]}],
                  "personas": {"p": {"offices": [{"office": "king", "sources": ["w"]}]}},
                  "lugares": {"a": {"candidatos": [{"fuentes": ["t", "mateo-26"]}]}},
                  "eventos": [{"fuentes": ["s", "t"]}], "calendario": {"explicacion": [{"fuentes": ["s"]}]}}
        self.assertEqual(build.cifras_fuentes(salida), (4, 2))
        self.assertEqual({k: build.resumen(salida)[k] for k in ("fuentes", "capitulos")}, {"fuentes": 4, "capitulos": 2})
        # El índice del registro dice el total de su página y, dentro, las mismas cifras.
        self.assertEqual(build._cuenta_fuentes(salida), "7: 4 enlazadas por algún dato, 2 capítulos de la Biblia y 1 sin citar")


class Chunks(unittest.TestCase):
    """data.core.json y data.detail.json: unidos dan data.json, y build.py se niega a escribir si no."""

    @classmethod
    def setUpClass(cls):
        datos, _ = build.cargar(HERE.parent / "data")
        cls.salida, _, errores = build.componer(datos, "2026-10-03")
        assert errores == [], errores
        cls.core, cls.detail = build.split_chunks(cls.salida)

    def copies(self):
        return json.loads(json.dumps(self.core)), json.loads(json.dumps(self.detail))

    def test_core_plus_detail_is_data_json(self):
        self.assertEqual(build.check_chunks(self.salida, self.core, self.detail), [])
        self.assertEqual(build.merge_chunks(*self.copies()), self.salida)

    def test_the_core_keeps_what_the_map_reads_and_drops_the_texts(self):
        pablo = self.core["personas"]["pablo"]
        self.assertNotIn("razon", pablo)
        self.assertNotIn("resumen", pablo)
        self.assertIn("fuentes", pablo)
        for r in pablo["relaciones"]:
            self.assertLessEqual(set(r), build.RELATION_CORE_KEYS)
        self.assertTrue(all(set(f) <= build.SOURCE_CORE_KEYS for f in self.core["fuentes"].values()))
        self.assertIn("resumen", self.core["eventos"][0])           # «Mientras tanto» lo enseña al abrir
        self.assertNotIn("razon", self.core["eventos"][0])
        self.assertEqual(self.core["periodos"], self.salida["periodos"])

    def test_a_key_lost_on_the_way_fails(self):
        core, detail = self.copies()
        del detail["personas"]["pablo"]["razon"]
        errores = build.check_chunks(self.salida, core, detail)
        self.assertEqual(len(errores), 1)
        self.assertIn("$.personas.pablo.razon", errores[0])

    def test_a_key_left_in_both_halves_with_another_value_fails(self):
        core, detail = self.copies()
        core["eventos"][0]["titulo"] += "!"
        self.assertIn("$.eventos[0].titulo", build.check_chunks(self.salida, core, detail)[0])

    def test_a_source_cited_only_by_a_detail_key_fails(self):
        # «h» solo la cita una entrada del historial, que va al detalle: la portada contaría una fuente menos.
        salida = {"fuentes": {"s": {"nivel": 1}, "h": {"nivel": 1}},
                  "personas": {"p": {"fuentes": ["s"], "historial": [{"cambio": "x", "fuente": "h"}]}}}
        core, detail = build.split_chunks(salida)
        errores = build.check_chunks(salida, core, detail)
        self.assertEqual(len(errores), 1)
        self.assertIn("cifras de las fuentes", errores[0])

    def test_lists_merge_by_position(self):
        salida = {"viajes": [{"id": "a", "paradas": [{"orden": 1, "razon": "r1"}, {"orden": 2}]}, {"id": "b"}]}
        core, detail = build.split_chunks(salida)
        self.assertEqual(core["viajes"], [{"id": "a", "paradas": [{"orden": 1}, {"orden": 2}]}, {"id": "b"}])
        self.assertEqual(detail["viajes"], [{"paradas": [{"razon": "r1"}, None]}, None])
        self.assertEqual(build.merge_chunks(core, detail), salida)


class SqliteRepite(unittest.TestCase):
    def test_la_tabla_viajes_guarda_repeats(self):
        # Con los datos de verdad: los tres viajes de cada año llevan 'yearly' en la base, y ningún otro lleva nada.
        datos, _ = build.cargar(HERE.parent / "data")
        salida, _, errores = build.componer(datos, "2026-10-02")
        self.assertEqual(errores, [])
        with tempfile.TemporaryDirectory() as tmp:
            ruta = Path(tmp) / "a.sqlite"
            build.escribir_sqlite(salida, ruta)
            con = sqlite3.connect(ruta)
            filas = con.execute("select id, repeats from viajes where repeats is not null order by id").fetchall()
            con.close()
        self.assertEqual(filas, [("elcana-sube-a-silo", "yearly"), ("pascua-de-jesus-a-los-12", "yearly"),
                                 ("recorrido-de-samuel", "yearly")])


class SqliteAreaDesconocida(unittest.TestCase):
    def test_la_tabla_paradas_guarda_el_area_desconocida(self):
        # Con los datos de verdad: una parada que la fuente no sitúa va sin lugar y con sus palabras; las demás, sin área.
        datos, _ = build.cargar(HERE.parent / "data")
        salida, _, errores = build.componer(datos, "2026-10-02")
        self.assertEqual(errores, [])
        with tempfile.TemporaryDirectory() as tmp:
            ruta = Path(tmp) / "a.sqlite"
            build.escribir_sqlite(salida, ruta)
            con = sqlite3.connect(ruta)
            filas = con.execute("select viaje_id, orden, lugar_id, unknown_area from paradas where unknown_area is not null"
                                " order by viaje_id, orden").fetchall()
            sin_lugar = con.execute("select count(*) from paradas where lugar_id is null and unknown_area is null").fetchone()[0]
            con.close()
        areas = {(v, o): json.loads(a) for v, o, _, a in filas}
        self.assertEqual([x[2] for x in filas if x[0] == "los-astrologos-de-oriente"], [None, None])
        self.assertEqual(areas[("los-astrologos-de-oriente", 0)]["words"], "Oriente")
        self.assertEqual(areas[("los-astrologos-de-oriente", 3)]["words"], "su país")
        self.assertEqual(sin_lugar, 0)

    def test_data_json_lleva_el_area_en_la_parada(self):
        datos, _ = build.cargar(HERE.parent / "data")
        salida, _, _ = build.componer(datos, "2026-10-02")
        v = next(x for x in salida["viajes"] if x["id"] == "los-astrologos-de-oriente")
        self.assertEqual([(p["orden"], p["lugar"], (p.get("unknown_area") or {}).get("words")) for p in v["paradas"]],
                         [(0, None, "Oriente"), (1, "jerusalen", None), (2, "belen", None), (3, None, "su país")])
        # Cada zona conjeturada sale con su contorno y su caja, como la forma de una zona, y su estado de conjetura.
        z = v["paradas"][0]["unknown_area"]["guesses"][0]
        self.assertEqual((z["name"], z["status"], len(z["ring"]), z["ring"][0] == z["ring"][-1]), ("región de Babilonia", "conjecture", 73, True))
        self.assertEqual(len(z["bbox"]), 2)


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
        malos = [v["id"] for v in self.salida()["viajes"] if not all(isinstance(c, str) for c in v.get("companeros") or [])]
        self.assertEqual(malos, [])
        self.assertTrue(any(v.get("tramos_companeros") for v in self.salida()["viajes"]), "the ranges reach data.json")

    def test_sqlite_keeps_the_group_and_the_ranges(self):
        import sqlite3
        with tempfile.TemporaryDirectory() as d:
            ruta = Path(d) / "atlas.sqlite"
            build.escribir_sqlite(self.salida(), ruta)
            con = sqlite3.connect(ruta)
            fila = con.execute("SELECT persona_id, grupo FROM viajes WHERE id = 'el-arca-en-filistea'").fetchone()
            tramos = con.execute("SELECT companeros, tramos_companeros FROM viajes WHERE id = 'segundo-viaje'").fetchone()
            con.close()
        self.assertEqual(fila, (None, "el Arca del pacto"))
        self.assertIn('"silas"', tramos[0])
        self.assertIn('"desde": 16', tramos[1])

    def test_branches_from_reaches_data_json_under_its_own_key(self):
        """A parallel destination keeps `orden` and `lugar` as the site and the MCP reader read them, and adds
        `branches_from`; a stop without it has no such key."""
        v = next(x for x in self.salida()["viajes"] if x["id"] == "destierro-de-israel-en-740")
        self.assertEqual([(p["orden"], p["lugar"], p.get("branches_from")) for p in v["paradas"]],
                         [(1, "samaria", None), (2, "hala", 1), (3, "habor", 1), (4, "media", 1)])
        self.assertNotIn("branches_from", v["paradas"][0])
        con = [x["id"] for x in self.salida()["viajes"] if any("branches_from" in p for p in x["paradas"])]
        self.assertEqual(sorted(con), ["destierro-de-beera", "destierro-de-israel-en-740"])

    def test_sqlite_keeps_branches_from(self):
        import sqlite3
        with tempfile.TemporaryDirectory() as d:
            ruta = Path(d) / "atlas.sqlite"
            build.escribir_sqlite(self.salida(), ruta)
            con = sqlite3.connect(ruta)
            filas = con.execute("SELECT orden, branches_from FROM paradas WHERE viaje_id = 'destierro-de-beera' "
                                "ORDER BY orden").fetchall()
            nulas = con.execute("SELECT COUNT(*) FROM paradas WHERE viaje_id = 'segundo-viaje' AND branches_from IS NOT NULL").fetchone()
            con.close()
        self.assertEqual(filas, [(1, None), (2, 1), (3, 1), (4, 1), (5, 1)])
        self.assertEqual(nulas, (0,))

    _salida = None

    @classmethod
    def salida(cls):
        if cls._salida is None:
            datos, _ = build.cargar(HERE.parent / "data")
            cls._salida = build.componer(datos, "2026-10-02")[0]
        return cls._salida


class Formas(unittest.TestCase):
    """build.py añade a cada forma su contorno y su caja, que el sitio dibuja y encuadra sin hacer cuentas."""

    def test_contorno_y_caja_de_un_lugar_y_de_un_candidato(self):
        elipse = {"type": "ellipse", "radii_km": [40, 10], "bearing": 0}
        poligono = {"type": "polygon", "vertices": [[30.9, 33.9], [31.1, 33.9], "b"]}
        lugares = [{"id": "a", "lat": 32.0, "lon": 35.0, "shape": elipse,
                    "candidatos": [{"geometria": {"lat": 31.0, "lon": 34.0}, "shape": poligono}]}]
        build.compile_shapes(lugares, {"places": [{"id": "b", "lat": 31.0, "lon": 34.2, "precision": "point"}]})
        self.assertEqual(len(elipse["ring"]), 73)
        self.assertEqual(elipse["ring"][0], elipse["ring"][-1])
        (o, s_), (e, n) = elipse["bbox"]
        # 80 km de norte a sur y 20 de este a oeste: 0,72 grados de latitud y 0,21 de longitud a 32 N.
        self.assertAlmostEqual(n - s_, 80 / 111.2, places=2)
        self.assertAlmostEqual(e - o, 20 / (111.2 * 0.848), places=2)
        self.assertEqual(poligono["ring"], [[33.9, 30.9], [33.9, 31.1], [34.2, 31.0], [33.9, 30.9]])
        self.assertEqual(poligono["bbox"], [[33.9, 30.9], [34.2, 31.1]])


    def test_el_rumbo_gira_la_elipse(self):
        # Rumbo 90: el eje largo va de oeste a este, así que la caja es más ancha que alta (en km).
        elipse = {"type": "ellipse", "radii_km": [40, 10], "bearing": 90}
        build.compile_shapes([{"id": "a", "lat": 32.0, "lon": 35.0, "shape": elipse}], {"places": []})
        (o, s_), (e, n) = elipse["bbox"]
        self.assertAlmostEqual((e - o) * 111.2 * 0.848, 80, delta=1)
        self.assertAlmostEqual((n - s_) * 111.2, 20, delta=1)

    def test_contorno_de_una_caja(self):
        caja = {"type": "box", "bounds": {"south": 31.9, "west": 34.9, "north": 32.1, "east": 35.2}}
        build.compile_shapes([{"id": "a", "lat": 32.0, "lon": 35.0, "shape": caja}], {"places": []})
        self.assertEqual(caja["ring"], [[34.9, 31.9], [35.2, 31.9], [35.2, 32.1], [34.9, 32.1], [34.9, 31.9]])
        self.assertEqual(caja["bbox"], [[34.9, 31.9], [35.2, 32.1]])


LLANO = """id: llano
name: Llano
names:
- name: Llano
type: plain
lat: 32.0
lon: 35.0
precision: zone
coord_source: openbible:a1
coord_url: https://www.openbible.info/geo/ancient/a1/x
shape:
  type: box
  bounds: {south: 31.9, west: 34.9, north: 32.1, east: 35.2}
  note: Caja de prueba.
  sources: [it-prueba]
  reason: Prueba.
  checked_on: '2026-10-02'
  status: verified
summary: Prueba.
reason: Prueba.
sources: [it-prueba]
links: []
checked_on: '2026-10-02'
status: pending
"""


class FormasEnLaSalida(unittest.TestCase):
    """La forma llega a la base SQLite (columna forma) y al registro (sección «Formas de las zonas»)."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        d = self.dir / "data"
        (d / "places").mkdir(parents=True)
        (d / "sources").mkdir()
        (d / "books.yaml").write_text(BOOKS, encoding="utf-8")
        (d / "sources" / "prueba.yaml").write_text(SOURCES, encoding="utf-8")
        shutil.copy(HERE.parent / "data" / "vocabulary.yaml", d / "vocabulary.yaml")
        (d / "places" / "llano.yaml").write_text(LLANO, encoding="utf-8")
        self.datos, _ = build.cargar(d)
        self.salida, self.legado, errores = build.componer(self.datos, "2026-10-02")
        self.assertEqual(errores, [])

    def tearDown(self):
        self.tmp.cleanup()

    def test_columna_forma_en_sqlite(self):
        import json
        import sqlite3
        ruta = self.dir / "x.sqlite"
        build.escribir_sqlite(self.salida, ruta)
        con = sqlite3.connect(ruta)
        try:
            (forma,), = con.execute("SELECT forma FROM lugares WHERE id = 'llano'").fetchall()
        finally:
            con.close()
        self.assertEqual(json.loads(forma)["bbox"], [[34.9, 31.9], [35.2, 32.1]])

    def test_seccion_del_registro(self):
        build.escribir_registro(self.salida, self.legado, self.datos, self.dir / "registro")
        texto = (self.dir / "registro" / "lugares.md").read_text(encoding="utf-8")
        self.assertIn("Formas de las zonas", texto)
        self.assertIn("**Llano**: caja. Caja de prueba.", texto)


class CapaIngles(unittest.TestCase):
    """site/data.en.json (docs/ideas/ingles.md): los textos en inglés con las claves y la forma de data.json, y
    data.json sin un solo bloque de idioma."""

    @classmethod
    def setUpClass(cls):
        datos, _ = build.cargar(HERE.parent / "data")
        cls.datos = datos
        cls.salida, _, cls.errores = build.componer(datos, "2026-10-03")
        cls.capa = build.capas_idioma(datos)["en"]

    def test_data_json_sigue_en_espanol(self):
        self.assertEqual(self.errores, [])
        self.assertNotIn('"en":', json.dumps(self.salida, ensure_ascii=False))
        self.assertEqual(self.salida["lugares"]["filipos"]["nombre"], "Filipos")

    def test_la_capa_tiene_la_forma_de_data_json(self):
        f = self.capa["lugares"]["filipos"]
        self.assertEqual(f["nombre"], "Philippi")
        self.assertEqual(f["nombres"], [{"nombre": "Philippi"}])
        self.assertEqual([e["url"] for e in f["enlaces"]],
                         ["https://www.jw.org/en/library/books/Insight-on-the-Scriptures/Philippi/",
                          "https://www.jw.org/en/library/bible/study-bible/books/acts/16/"])
        self.assertNotIn("estado", f)   # el sello de la traducción no va al sitio
        # Las relaciones de la capa van una a una con las de data.json (sin las de holds_office).
        self.assertEqual(len(self.capa["personas"]["lidia"]["relaciones"]), len(self.salida["personas"]["lidia"]["relaciones"]))
        e = self.capa["eventos"]["lidia-se-bautiza"]
        self.assertEqual(e["fecha"], {"texto": "c. 50 C.E."})   # la fecha simple se escribe sola
        self.assertEqual(e["buscar"], "Lydia Philippi")

    def test_fuentes_y_libros(self):
        F = self.capa["fuentes"]
        self.assertEqual(F["it-lidia"]["url"], "https://www.jw.org/en/library/books/Insight-on-the-Scriptures/Lydia/")
        self.assertEqual(F["hechos-16"]["titulo"], "Acts 16")          # capítulo implícito
        self.assertEqual(F["hch-16"]["url"], "https://www.jw.org/en/library/bible/study-bible/books/acts/16/")
        self.assertNotIn("openbible-geo", F)                           # no cambia con el idioma
        self.assertNotIn("mateo-1", F)                                 # su libro aún no tiene el inglés
        self.assertEqual(self.capa["libros"]["hechos"]["abr"], "Ac")

    def test_los_cargos_llevan_su_ingles(self):
        # Una relación holds_office no va en `relaciones` sino en `offices`: su inglés va ahí, en el mismo orden.
        import copy
        datos = copy.deepcopy(self.datos)
        lidia = next(p for p in datos["people"] if p["id"] == "lidia")
        lidia["relations"].append({"type": "holds_office", "office": "rey", "sources": ["it-lidia"],
                                   "reason": "Razón del cargo.", "en": {"reason": "Reason for the office."},
                                   "date": {"from": 49, "to": 49, "text": "c. 50 e.c."}})
        salida, _, _ = build.componer(datos, "2026-10-03")
        capa = build.capas_idioma(datos)["en"]
        self.assertEqual(len(capa["personas"]["lidia"]["offices"]), len(salida["personas"]["lidia"]["offices"]))
        self.assertEqual(capa["personas"]["lidia"]["offices"][-1], {"reason": "Reason for the office.", "date": {"texto": "c. 50 C.E."}})
        self.assertNotIn("offices", self.capa["personas"]["lidia"])   # sin cargos, nada que añadir

    def test_layer_y_strip(self):
        import languages
        o = {"name": "A", "en": {"name": "B", "checked_on": "2026-10-03"}, "names": [{"name": "A"}, {"name": "C", "en": {"name": "D"}}],
             "date": {"from": -606, "to": -606, "text": "607 a.e.c."}}
        self.assertEqual(languages.layer(o, "en"), {"name": "B", "names": [None, {"name": "D"}], "date": {"text": "607 B.C.E."}})
        self.assertNotIn('"en"', json.dumps(languages.strip(o)))


if __name__ == "__main__":
    unittest.main(verbosity=1)
