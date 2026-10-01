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


if __name__ == "__main__":
    unittest.main()
