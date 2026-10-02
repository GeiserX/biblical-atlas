#!/usr/bin/env python3
"""Pruebas de scripts/validate.py. Uso: python3 scripts/test_validate.py

Leen data/books.yaml de verdad y no escriben nada."""
import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import validate  # noqa: E402

LIBROS = yaml.safe_load((HERE.parent / "data" / "books.yaml").read_text(encoding="utf-8"))["books"]


def errores(pasaje):
    out = []
    validate.check_passages({"passages": [pasaje]}, "suceso", out.append, LIBROS)
    return out


class Pasajes(unittest.TestCase):
    def test_formas_validas(self):
        for pasaje in ["Mal 3:18", "Rut 1:1-5", "1Sa 15:32, 33", "Mt 26:30, 36-56", "Hch 17:14; 18:5",
                       "Joe 1:1-3:21", "Hch 21:40–22:21", "Abd 11-14", "Sl 34", "Dt 9:12-14, 19, 20, 26-29"]:
            with self.subTest(pasaje=pasaje):
                self.assertEqual(errores(pasaje), [])

    def test_versiculo_de_mas_sigue_siendo_error(self):
        self.assertEqual(len(errores("Mal 3:19")), 1)

    def test_gramatica_rota_es_un_error_y_no_rompe(self):
        for pasaje in ["Mal 3:1:2", "Mal 3:1-2-19", "Mal 3:1,,2", "Mal 3:1;", "Mal 3:1-", "Mal 3:1--2", "Mal 3:1, 2:"]:
            with self.subTest(pasaje=pasaje):
                e = errores(pasaje)
                self.assertEqual(len(e), 1, e)
                self.assertIn("no es un tramo", e[0])


def errores_perspicacia(links, clave="1200000129"):
    out = []
    validate.validar_claves_perspicacia({"people": [{"_fichero": "data/people/x.yaml", "perspicacia": clave,
                                                     "links": links, "sources": []}], "sources": {}}, out.append)
    return out


class ClavePerspicacia(unittest.TestCase):
    JW = "https://www.jw.org/es/biblioteca/libros/Perspicacia-para-comprender-las-Escrituras/%C3%81gabo/"

    def test_wol_con_el_documento(self):
        self.assertEqual(errores_perspicacia([{"type": "perspicacia", "url": "https://wol.jw.org/es/wol/d/r4/lp-s/1200000129"}]), [])

    def test_wol_con_otro_documento_es_error(self):
        self.assertEqual(len(errores_perspicacia([{"type": "perspicacia", "url": "https://wol.jw.org/es/wol/d/r4/lp-s/1200000130"}])), 1)

    def test_articulo_de_perspicacia_en_jw_org(self):
        self.assertEqual(errores_perspicacia([{"type": "perspicacia", "url": self.JW}]), [])

    def test_jw_org_que_no_es_perspicacia_es_error(self):
        otra = "https://www.jw.org/es/biblioteca/libros/jesus/ministerio-en-galilea/vision-transfiguracion/"
        self.assertEqual(len(errores_perspicacia([{"type": "perspicacia", "url": otra}])), 1)
        self.assertEqual(len(errores_perspicacia([{"type": "bible", "url": self.JW}])), 1)


def errores_wol(fuente_url, link_url=None, excepciones=frozenset()):
    out = []
    persona = {"_fichero": "data/people/x.yaml", "links": [{"type": "perspicacia", "url": link_url}] if link_url else []}
    datos = {"sources": {"it-x": {"url": fuente_url}}, "people": [persona], "_origen_fuentes": {"it-x": "data/sources/x.yaml"}}
    validate.validar_wol(datos, out.append, set(excepciones))
    return out


class SinWol(unittest.TestCase):
    WOL = "https://wol.jw.org/es/wol/d/r4/lp-s/1200000129"
    JW = "https://www.jw.org/es/biblioteca/libros/Perspicacia-para-comprender-las-Escrituras/%C3%81gabo/"

    def test_jw_org_vale(self):
        self.assertEqual(errores_wol(self.JW, self.JW), [])

    def test_wol_en_una_fuente_es_error(self):
        e = errores_wol(self.WOL)
        self.assertEqual(len(e), 1, e)
        self.assertIn("data/sources/x.yaml", e[0])

    def test_wol_en_un_enlace_es_error(self):
        e = errores_wol(self.JW, "https://wol.jw.org/es/wol/b/r4/lp-s/nwtsty/44/16")
        self.assertEqual(len(e), 1, e)
        self.assertIn("data/people/x.yaml", e[0])

    def test_una_excepcion_vale(self):
        self.assertEqual(errores_wol(self.WOL, excepciones={self.WOL}), [])

    def test_las_excepciones_del_repositorio_son_url_de_wol_con_su_porque(self):
        lista = yaml.safe_load(validate.EXCEPCIONES_WOL.read_text(encoding="utf-8"))
        self.assertTrue(lista)
        for url, e in lista.items():
            with self.subTest(url=url):
                self.assertTrue(url.startswith("https://wol.jw.org/"))
                self.assertTrue(e.get("source") and e.get("reason"))


def errores_viaje(**campos):
    v = {"person": "pablo", "companions": [], "stops": [{"order": i} for i in range(1, 6)]}
    v.update(campos)
    out = []
    validate.validar_viaje(v, "viaje", out.append)
    return out


class QuienViaja(unittest.TestCase):
    """Un viaje lo hace una persona con ficha o un grupo sin ficha (docs/ideas/viajes-modelo.md, pregunta 1)."""

    def test_persona_vale(self):
        self.assertEqual(errores_viaje(), [])

    def test_grupo_con_persona_nula_vale(self):
        self.assertEqual(errores_viaje(person=None, group="el Arca del pacto"), [])

    def test_sin_persona_ni_grupo_es_error(self):
        self.assertTrue(any("falta quién viaja" in e for e in errores_viaje(person=None)))

    def test_persona_y_grupo_a_la_vez_es_error(self):
        self.assertTrue(any("a la vez" in e for e in errores_viaje(group="los 600 benjaminitas")))

    def test_grupo_de_mas_de_40_palabras_es_error(self):
        out = []
        validate.textos_largos({"person": None, "group": " ".join(["grupo"] * 41)}, "viaje", out.append)
        self.assertTrue(any("viaje.group: 41 palabras" in e for e in out), out)

    def test_grupo_vacio_es_error(self):
        self.assertTrue(any("group debe ser un texto" in e for e in errores_viaje(person=None, group=" ")))

    def test_el_viaje_de_grupo_del_repositorio_pasa(self):
        v = validate._read(HERE.parent / "data" / "journeys" / "el-arca-en-filistea.yaml")
        self.assertIsNone(v["person"])
        out = []
        validate.validar_viaje(v, "el-arca-en-filistea", out.append)
        self.assertEqual(out, [])


class Acompanantes(unittest.TestCase):
    """Cada acompañante es un id (todo el viaje) o {person, from, to} (pregunta 3)."""

    def test_id_y_tramos_valen(self):
        cs = ["bernabe", {"person": "silas", "from": 1, "to": 2}, {"person": "silas", "from": 4, "to": 4}]
        self.assertEqual(errores_viaje(companions=cs), [])

    def test_tramo_fuera_del_viaje_es_error(self):
        for a, b in ((0, 2), (3, 6), (4, 3)):
            with self.subTest(desde=a, hasta=b):
                cs = [{"person": "silas", "from": a, "to": b}]
                self.assertTrue(any("1 <= from <= to <= 5" in e for e in errores_viaje(companions=cs)))

    def test_tramos_que_se_tocan_son_error(self):
        cs = [{"person": "silas", "from": 1, "to": 3}, {"person": "silas", "from": 3, "to": 4}]
        self.assertTrue(any("ya va en las paradas 1 a 3" in e for e in errores_viaje(companions=cs)))
        self.assertTrue(any("ya va" in e for e in errores_viaje(companions=["silas", {"person": "silas", "from": 2, "to": 2}])))

    def test_tramos_pegados_son_un_solo_tramo(self):
        cs = [{"person": "silas", "from": 1, "to": 2}, {"person": "silas", "from": 3, "to": 4}]
        self.assertTrue(any("ya va en las paradas 1 a 2" in e for e in errores_viaje(companions=cs)))
        cs = [{"person": "silas", "from": 4, "to": 4}, {"person": "silas", "from": 2, "to": 3}]
        self.assertTrue(any("ya va en las paradas 4 a 4" in e for e in errores_viaje(companions=cs)))

    def test_paradas_que_no_son_numeros_son_error(self):
        for a, b in (("2", 3), (2, "3"), (1.5, 3), (True, 3)):
            with self.subTest(desde=a, hasta=b):
                cs = [{"person": "silas", "from": a, "to": b}]
                self.assertTrue(any("1 <= from <= to <= 5" in e for e in errores_viaje(companions=cs)))

    def test_todo_el_viaje_se_escribe_con_el_id(self):
        cs = [{"person": "silas", "from": 1, "to": 5}]
        self.assertTrue(any("se escribe solo su id" in e for e in errores_viaje(companions=cs)))

    def test_claves_de_mas_o_sin_persona_son_error(self):
        for c in ({"person": "silas", "from": 1, "to": 2, "note": "x"}, {"from": 1, "to": 2}, 7):
            with self.subTest(c=c):
                self.assertTrue(errores_viaje(companions=[c]))

    def test_quien_viaja_no_se_acompana(self):
        self.assertTrue(any("es quien viaja" in e for e in errores_viaje(companions=["pablo"])))


def avisos_punto(*lugares):
    out = []
    datos = {"places": [dict(l, _fichero=f"data/places/{l['id']}.yaml") for l in lugares]}
    validate.puntos_compartidos(datos, lambda codigo, texto: out.append((codigo, texto)))
    return out


class PuntoCompartido(unittest.TestCase):
    RIO = {"id": "rio-x", "name": "Río X", "names": [{"name": "Río X"}], "type": "river", "lat": 33.5, "lon": 36.3,
           "coord_note": "Punto representativo."}
    CIUDAD = {"id": "ciudad-y", "name": "Ciudad Y", "names": [{"name": "Ciudad Y"}, {"name": "Yeta"}], "type": "city",
              "lat": 33.502, "lon": 36.3}

    def test_rio_encima_de_una_ciudad_avisa(self):
        a = avisos_punto(self.RIO, self.CIUDAD)
        self.assertEqual([c for c, _ in a], ["shared_point"], a)
        self.assertIn("data/places/rio-x.yaml", a[0][1])
        self.assertIn("ciudad-y", a[0][1])

    def test_valle_y_mar_tambien(self):
        for tipo in ("valley", "sea"):
            with self.subTest(tipo=tipo):
                self.assertEqual(len(avisos_punto(dict(self.RIO, type=tipo), self.CIUDAD)), 1)

    def test_la_nota_que_nombra_al_otro_lugar_lo_quita(self):
        for nota in ("Mismo punto que Ciudad Y.", "Comparte punto con yeta, su otro nombre."):
            with self.subTest(nota=nota):
                self.assertEqual(avisos_punto(dict(self.RIO, coord_note=nota), self.CIUDAD), [])

    def test_un_nombre_corto_dentro_de_otra_palabra_no_lo_quita(self):
        ur = dict(self.CIUDAD, name="Ur", names=[{"name": "Ur"}])
        for nota in ("Punto representativo del curso.", "Punto en la desembocadura."):
            with self.subTest(nota=nota):
                self.assertEqual(len(avisos_punto(dict(self.RIO, coord_note=nota), ur)), 1)
        self.assertEqual(avisos_punto(dict(self.RIO, coord_note="Mismo punto que Ur, a propósito."), ur), [])

    def test_el_name_cuenta_aunque_no_este_en_names(self):
        ciudad = dict(self.CIUDAD, names=[{"name": "Yeta"}])
        self.assertEqual(avisos_punto(dict(self.RIO, coord_note="Mismo punto que Ciudad Y."), ciudad), [])

    def test_los_tipos_que_el_mapa_rotula_aparte_no_cuentan(self):
        # La lista va escrita aquí, no leída de ROTULO_APARTE, para que quitar un tipo de allí se note. Solo cuenta el
        # aviso del río: un valle es también un lugar largo y avisa por su cuenta si el río le cae encima.
        for tipo in ("region", "province", "country", "kingdom", "desert", "plain", "valley"):
            with self.subTest(tipo=tipo):
                a = avisos_punto(self.RIO, dict(self.CIUDAD, type=tipo))
                self.assertEqual([t for _, t in a if t.startswith("data/places/rio-x.yaml")], [])

    def test_justo_por_debajo_de_medio_kilometro_avisa(self):
        self.assertEqual(len(avisos_punto(self.RIO, dict(self.CIUDAD, lat=33.504))), 1)

    def test_a_medio_kilometro_o_mas_no_avisa(self):
        self.assertEqual(avisos_punto(self.RIO, dict(self.CIUDAD, lat=33.5046)), [])

    def test_dos_ciudades_juntas_no_son_cosa_de_esta_regla(self):
        self.assertEqual(avisos_punto(dict(self.RIO, type="city"), self.CIUDAD), [])

    def test_un_lugar_sin_punto_no_rompe(self):
        self.assertEqual(avisos_punto(self.RIO, dict(self.CIUDAD, lat=None, lon=None)), [])


class PuntoCompartidoEnValidate(unittest.TestCase):
    """La regla pasa por validate.main: sale como aviso y cuenta en el resumen."""
    def correr(self, lat_ciudad):
        with tempfile.TemporaryDirectory() as d:
            lugares = Path(d) / "places"
            lugares.mkdir()
            (lugares / "rio-x.yaml").write_text("id: rio-x\nname: Río X\ntype: river\nlat: 33.5\nlon: 36.3\n"
                                                "coord_note: Punto representativo.\n", encoding="utf-8")
            (lugares / "ciudad-y.yaml").write_text(f"id: ciudad-y\nname: Ciudad Y\ntype: city\nlat: {lat_ciudad}\n"
                                                   "lon: 36.3\n", encoding="utf-8")
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                validate.main(["--data", d])
            return out.getvalue()

    def test_sale_como_aviso_y_en_el_resumen(self):
        salida = self.correr(33.502)
        self.assertIn("AVISO [shared_point] data/places/rio-x.yaml", salida)
        self.assertIn("(shared_point 1)", salida)

    def test_lejos_no_sale(self):
        self.assertNotIn("shared_point", self.correr(33.6))


if __name__ == "__main__":
    unittest.main()
