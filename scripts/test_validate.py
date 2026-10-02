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


HECHO = {"sources": ["it-x"], "reason": "Razón de prueba.", "checked_on": "2026-10-02", "status": "verified",
         "note": "Cuenta de prueba."}


def errores_forma(forma, candidato=False, puntos=None):
    """Errores de un lugar de prueba en (32, 35) con esta forma, en el lugar o en su único candidato."""
    lugar = {"type": "region", "precision": "zone", "lat": 32.0, "lon": 35.0, "links": [], "status": "pending"}
    if candidato:
        lugar.update(lat=None, lon=None, candidates=[{
            "name": "Zona", "geometry": {"type": "zone", "lat": 32.0, "lon": 35.0, "radius_km": 30},
            "coord_source": "calculation", "note": "Centro de prueba.", "shape": forma, "sources": ["it-x"], "reason": "Razón de prueba.",
            "checked_on": "2026-10-02", "status": "favored_level_1"}])
    else:
        lugar["shape"] = forma
    out = []
    validate.validar_lugar(lugar, "data/places/x.yaml", out.append, {}, puntos or {})
    return out


class Formas(unittest.TestCase):
    ELIPSE = {"type": "ellipse", "radii_km": [40, 10], "bearing": 5, **HECHO}

    def test_formas_validas(self):
        for forma in [self.ELIPSE, {"type": "circle", "radius_km": 20, **HECHO},
                      {"type": "box", "bounds": {"south": 31.8, "west": 34.8, "north": 32.2, "east": 35.3}, **HECHO},
                      {"type": "polygon", "vertices": [[31.9, 34.9], [32.1, 34.9], "aqui"], **HECHO}]:
            with self.subTest(tipo=forma["type"]):
                self.assertEqual(errores_forma(forma, puntos={"aqui": (32.0, 35.2)}), [])
        self.assertEqual(errores_forma(self.ELIPSE, candidato=True), [])

    def test_el_punto_fuera_de_la_forma_es_error(self):
        lejos = {**self.ELIPSE, "center": {"lat": 32.5, "lon": 35.0}}
        e = errores_forma(lejos)
        self.assertEqual(len(e), 1, e)
        self.assertIn("queda fuera de la forma", e[0])
        # De través la elipse mide 10 km a cada lado: a 20 km del eje, fuera; a lo largo, a 20 km del centro, dentro.
        self.assertEqual(len(errores_forma({**self.ELIPSE, "bearing": 0, "center": {"lat": 32.0, "lon": 35.21}})), 1)
        self.assertEqual(errores_forma({**self.ELIPSE, "bearing": 0, "center": {"lat": 32.18, "lon": 35.0}}), [])

    def test_un_poligono_que_se_cruza_es_error(self):
        e = errores_forma({"type": "polygon", "vertices": [[31.9, 34.9], [32.1, 35.1], [32.1, 34.9], [31.9, 35.1]], **HECHO})
        self.assertTrue(any("se cruza" in x for x in e), e)

    def test_un_poligono_que_vuelve_sobre_si_o_pisa_otro_lado_es_error(self):
        # Un lado que vuelve sobre el anterior (de 32 a 31,5 por la misma línea) y un vértice sobre otro lado.
        for vs in ([[31.0, 35.0], [32.0, 35.0], [31.5, 35.0], [31.5, 36.0]],
                   [[31.8, 34.8], [31.8, 35.2], [32.2, 35.2], [31.8, 35.0], [32.2, 34.8]],
                   [[31.0, 35.0], [32.0, 35.0], [33.0, 35.0]]):
            with self.subTest(vertices=vs):
                e = errores_forma({"type": "polygon", "vertices": vs, **HECHO})
                self.assertTrue(any("se cruza o se toca" in x for x in e), e)

    def test_numeros_infinitos_y_radios_desmedidos_son_error(self):
        inf, nan = float("inf"), float("nan")
        casos = [({"type": "circle", "radius_km": inf}, "radius_km mayor que 0"),
                 ({"type": "circle", "radius_km": nan}, "radius_km mayor que 0"),
                 ({"type": "circle", "radius_km": 30000}, "radius_km mayor que 0"),
                 ({"type": "ellipse", "radii_km": [inf, 10], "bearing": 5}, "radii_km"),
                 ({"type": "ellipse", "radii_km": [3000, 10], "bearing": 5}, "radii_km"),
                 ({"type": "ellipse", "radii_km": [40, 10], "bearing": 5, "center": {"lat": nan, "lon": 35.0}},
                  "center solo va"),
                 ({"type": "box", "bounds": {"south": 31.8, "west": -inf, "north": 32.2, "east": 35.3}}, "un box"),
                 ({"type": "polygon", "vertices": [[nan, 34.9], [32.1, 34.9], [32.0, 35.2]]}, "vertices[0]")]
        for forma, texto in casos:
            with self.subTest(forma=forma):
                e = errores_forma({**forma, **HECHO})   # sin excepción: un error que se lee
                self.assertTrue(any(texto in x for x in e), e)

    def test_cada_parametro_mal_escrito_es_error(self):
        casos = [({"type": "box", "bounds": {"south": 31.8, "west": 34.8, "north": 32.2, "east": 35.3},
                   "center": {"lat": 32.0, "lon": 35.0}}, "center solo va en circle o ellipse"),
                 ({"type": "circle", "radius_km": 0}, "un circle necesita radius_km"),
                 ({"type": "box", "bounds": {"south": 32.2, "west": 34.8, "north": 31.8, "east": 35.3}}, "south < north"),
                 ({"type": "box", "bounds": {"south": 31.8, "west": 35.3, "north": 32.2, "east": 34.8}}, "west < east"),
                 ({"type": "polygon", "vertices": [[31.9, 34.9], [32.1, 34.9], [32.0, 35.2], [31.9, 34.9]]},
                  "dos vértices caen en el mismo punto")]
        for forma, texto in casos:
            with self.subTest(forma=forma):
                e = errores_forma({**forma, **HECHO})
                self.assertTrue(any(texto in x for x in e), e)

    def test_un_candidato_de_punto_no_lleva_forma(self):
        lugar = {"type": "region", "precision": "zone", "lat": None, "lon": None, "links": [], "status": "pending",
                 "candidates": [{"name": "Punto", "geometry": {"type": "point", "lat": 32.0, "lon": 35.0},
                                 "coord_source": "calculation", "note": "Punto de prueba.", "sources": ["it-x"],
                                 "reason": "Razón de prueba.", "checked_on": "2026-10-02", "status": "favored_level_1",
                                 "shape": self.ELIPSE}]}
        out = []
        validate.validar_lugar(lugar, "data/places/x.yaml", out.append, {}, {})
        self.assertTrue(any("shape solo va en un candidato de geometry.type zone" in x for x in out), out)

    def test_un_vertice_que_no_es_un_lugar_con_punto_es_error(self):
        e = errores_forma({"type": "polygon", "vertices": [[31.9, 34.9], [32.1, 34.9], "sodoma"], **HECHO})
        self.assertTrue(any("'sodoma' no es un lugar con punto exacto" in x for x in e), e)

    def test_un_vertice_no_cuelga_del_punto_de_una_zona(self):
        # validate.py y build.py solo dan a los vértices los lugares con precision: point; un río con punto
        # representativo no entra, aunque tenga lat y lon.
        datos_puntos = {"aqui": (32.0, 35.2)}
        bien = {"type": "polygon", "vertices": [[31.9, 34.9], [32.1, 34.9], "aqui"], **HECHO}
        self.assertEqual(errores_forma(bien, puntos=datos_puntos), [])
        lugares = [{"id": "aqui", "lat": 32.0, "lon": 35.2, "precision": "point"},
                   {"id": "rio", "lat": 32.0, "lon": 35.2, "precision": "zone"}]
        self.assertEqual(set(validate.formas.puntos_de_vertices(lugares)), {"aqui"})

    def test_demasiados_vertices_es_error(self):
        vs = [[32 + 0.1 * __import__("math").sin(k), 35 + 0.1 * __import__("math").cos(k)] for k in range(13)]
        self.assertTrue(any("de 3 a 12" in x for x in errores_forma({"type": "polygon", "vertices": vs, **HECHO})))

    def test_sin_fuente_ni_cuenta_es_error(self):
        e = errores_forma({"type": "ellipse", "radii_km": [40, 10], "bearing": 5, "checked_on": "2026-10-02",
                           "status": "verified"})
        self.assertTrue(any("'sources' vacío" in x for x in e) and any("falta note" in x for x in e), e)

    def test_tipo_fuera_del_vocabulario_y_campos_de_otro_tipo(self):
        self.assertTrue(any("no es uno de" in x for x in errores_forma({"type": "hexagon", **HECHO})))
        e = errores_forma({**self.ELIPSE, "radius_km": 40})
        self.assertTrue(any("campos que no son de un ellipse" in x for x in e), e)
        e = errores_forma({"type": "ellipse", "radii_km": [10, 40], "bearing": 200, **HECHO})
        self.assertEqual(len(e), 2, e)

    def test_un_candidato_no_repite_su_circulo(self):
        e = errores_forma({"type": "circle", "radius_km": 20, **HECHO}, candidato=True)
        self.assertTrue(any("ya es un círculo" in x for x in e), e)

    def test_un_lugar_sin_zona_no_lleva_forma(self):
        lugar = {"type": "city", "precision": "point", "lat": 32.0, "lon": 35.0, "links": [], "status": "pending",
                 "shape": self.ELIPSE}
        out = []
        validate.validar_lugar(lugar, "data/places/x.yaml", out.append, {}, {})
        self.assertTrue(any("shape solo va en un lugar con punto y precision: zone" in x for x in out), out)


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
