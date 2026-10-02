#!/usr/bin/env python3
"""Pruebas de scripts/validate.py. Uso: python3 scripts/test_validate.py

Leen data/books.yaml de verdad y no escriben nada."""
import sys
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


if __name__ == "__main__":
    unittest.main()
