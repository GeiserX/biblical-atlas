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


def persona(pid, nombre, distinct_from=None, same_as=None, otros=()):
    o = {"id": pid, "_fichero": f"data/people/{pid}.yaml", "name": nombre,
         "names": [{"name": nombre}] + [{"name": n} for n in otros]}
    if distinct_from is not None:
        o["distinct_from"] = distinct_from
    if same_as:
        o["relations"] = [{"type": "same_as", "person": same_as}]
    return o


def errores_homonimos(*personas, excepciones=frozenset()):
    out = []
    validate.validar_homonimos({"people": list(personas)}, out.append, set(excepciones))
    return out


class Homonimos(unittest.TestCase):
    def test_marcados_en_las_dos_fichas_vale(self):
        self.assertEqual(errores_homonimos(persona("uz-a", "Uz", ["uz-b"]), persona("uz-b", "Uz", ["uz-a"])), [])

    def test_same_as_vale(self):
        self.assertEqual(errores_homonimos(persona("hur-a", "Hur", same_as="hur-b"), persona("hur-b", "Hur")), [])

    def test_nombre_compartido_sin_marcar_es_error(self):
        e = errores_homonimos(persona("uz-a", "Uz"), persona("uz-b", "Uz"))
        self.assertEqual(len(e), 1, e)
        self.assertIn("comparte el nombre «Uz» con uz-b", e[0])

    def test_tambien_cuenta_un_nombre_de_names(self):
        e = errores_homonimos(persona("bernabe", "Bernabé", otros=["José"]), persona("jose", "José"))
        self.assertEqual(len(e), 1, e)

    def test_nombre_con_otra_tilde_no_es_homonimo(self):
        self.assertEqual(errores_homonimos(persona("ana", "Ana"), persona("ana-b", "Aná")), [])

    def test_una_sola_direccion_es_error(self):
        e = errores_homonimos(persona("uz-a", "Uz", ["uz-b"]), persona("uz-b", "Uz"))
        self.assertEqual(len(e), 1, e)
        self.assertIn("uz-b no la nombra a ella", e[0])

    def test_distinct_from_y_same_as_en_el_mismo_par_es_error(self):
        e = errores_homonimos(persona("sostenes", "Sóstenes", ["sostenes-b"], same_as="sostenes-b"),
                              persona("sostenes-b", "Sóstenes", ["sostenes"]))
        self.assertEqual(len(e), 1, e)
        self.assertIn("a la vez en distinct_from y en un same_as", e[0])

    def test_una_excepcion_vale_y_caduca_si_ya_no_comparten_nombre(self):
        par = frozenset(("juan", "santiago"))
        juan = persona("juan", "Juan", otros=["Boanerges"])
        self.assertEqual(errores_homonimos(juan, persona("santiago", "Santiago", otros=["Boanerges"]),
                                           excepciones={par}), [])
        e = errores_homonimos(juan, persona("santiago", "Santiago"), excepciones={par})
        self.assertEqual(len(e), 1, e)
        self.assertIn("la excepción sobra", e[0])

    def test_las_excepciones_del_repositorio_son_pares_con_su_porque(self):
        lista = yaml.safe_load(validate.EXCEPCIONES_HOMONIMOS.read_text(encoding="utf-8"))
        self.assertTrue(lista)
        for e in lista:
            with self.subTest(e=e):
                self.assertEqual(len(set(e.get("people") or [])), 2)
                self.assertTrue(e.get("name") and e.get("reason"))

    def test_distinct_from_sin_disambiguation_es_error(self):
        out = []
        validate.validar_persona({"distinct_from": ["uz-b"]}, "data/people/uz-a.yaml", out.append)
        self.assertEqual(len(out), 1, out)
        self.assertIn("le falta disambiguation", out[0])
        out = []
        validate.validar_persona({"distinct_from": ["uz-b"], "disambiguation": "Uz hijo de Aram."}, "x", out.append)
        self.assertEqual(out, [])


if __name__ == "__main__":
    unittest.main()
