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


def persona(pid, nombre, distinct_from=None, same_as=None, otros=()):
    o = {"id": pid, "_fichero": f"data/people/{pid}.yaml", "name": nombre,
         "names": [{"name": nombre}] + [{"name": n} for n in otros]}
    if distinct_from is not None:
        o["distinct_from"] = distinct_from
    if same_as:
        o["relations"] = [{"type": "same_as", "person": same_as}]
    return o


def errores_homonimos(*personas, excepciones=()):
    out = []
    validate.validar_homonimos({"people": list(personas)}, out.append, list(excepciones))
    return out


def excepcion(a, b, nombre="Boanerges", porque="Sobrenombre que comparten."):
    return {"people": [a, b], "name": nombre, "reason": porque}


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
        juan = persona("juan", "Juan", otros=["Boanerges"])
        self.assertEqual(errores_homonimos(juan, persona("santiago", "Santiago", otros=["Boanerges"]),
                                           excepciones=[excepcion("juan", "santiago")]), [])
        e = errores_homonimos(juan, persona("santiago", "Santiago"), excepciones=[excepcion("juan", "santiago")])
        self.assertEqual(len(e), 1, e)
        self.assertIn("la excepción sobra", e[0])

    def test_una_excepcion_solo_exime_su_nombre(self):
        juan = persona("juan", "Juan", otros=["Boanerges"])
        santiago = persona("santiago", "Santiago", otros=["Boanerges", "Juan"])
        e = errores_homonimos(juan, santiago, excepciones=[excepcion("juan", "santiago")])
        self.assertEqual(len(e), 1, e)
        self.assertIn("comparte el nombre «Juan» con santiago", e[0])

    def test_una_excepcion_con_un_id_que_no_existe_es_error(self):
        e = errores_homonimos(persona("juan", "Juan"), excepciones=[excepcion("juan", "nadie")])
        self.assertEqual(len(e), 1, e)
        self.assertIn("ids de personas que existen", e[0])

    def test_una_excepcion_que_no_es_un_par_de_ids_es_error_y_no_rompe(self):
        for gente in [[["juan"], "santiago"], ["juan"], ["juan", "juan"], "juan", None]:
            with self.subTest(gente=gente):
                e = errores_homonimos(persona("juan", "Juan"), persona("santiago", "Santiago"),
                                      excepciones=[{"people": gente, "name": "Juan", "reason": "x"}])
                self.assertEqual(len(e), 1, e)
                self.assertIn("par de dos ids distintos", e[0])

    def test_una_excepcion_sin_reason_es_error(self):
        juan = persona("juan", "Juan", otros=["Boanerges"])
        santiago = persona("santiago", "Santiago", otros=["Boanerges"])
        e = errores_homonimos(juan, santiago, excepciones=[excepcion("juan", "santiago", porque="")])
        self.assertEqual(len(e), 1, e)
        self.assertIn("falta reason", e[0])

    def test_una_excepcion_de_un_par_ya_marcado_sobra(self):
        for a, b in [(persona("uz-a", "Uz", ["uz-b"]), persona("uz-b", "Uz", ["uz-a"])),
                     (persona("uz-a", "Uz", same_as="uz-b"), persona("uz-b", "Uz"))]:
            with self.subTest(a=a):
                e = errores_homonimos(a, b, excepciones=[excepcion("uz-a", "uz-b", nombre="Uz")])
                self.assertEqual(len(e), 1, e)
                self.assertIn("ya llevan distinct_from o same_as", e[0])

    def test_una_lista_de_excepciones_que_no_es_lista_es_error(self):
        out = []
        validate.validar_homonimos({"people": [persona("juan", "Juan")]}, out.append, {"juan": "santiago"})
        self.assertEqual(len(out), 1, out)
        self.assertIn("debe ser una lista", out[0])

    def test_distinct_from_que_se_nombra_a_si_misma_es_error(self):
        e = errores_homonimos(persona("lucas", "Lucas", ["lucas"]))
        self.assertEqual(len(e), 1, e)
        self.assertIn("se nombra a sí misma", e[0])

    def test_cuenta_el_nombre_de_name_aunque_no_vaya_en_names(self):
        maria = {"id": "maria-a", "_fichero": "data/people/maria-a.yaml", "name": "María",
                 "names": [{"name": "María de Betania"}]}
        e = errores_homonimos(maria, persona("maria-b", "María"))
        self.assertEqual(len(e), 1, e)
        self.assertIn("comparte el nombre «María» con maria-b", e[0])

    def test_las_excepciones_del_repositorio_son_pares_con_su_porque(self):
        lista = yaml.safe_load(validate.EXCEPCIONES_HOMONIMOS.read_text(encoding="utf-8"))
        self.assertTrue(lista)
        for e in lista:
            with self.subTest(e=e):
                self.assertEqual(len(set(e.get("people") or [])), 2)
                self.assertTrue(e.get("name") and e.get("reason"))

    def test_la_regla_corre_desde_validar(self):
        datos = validate.load(str(HERE.parent / "data"))
        for o in datos["people"]:
            if o["id"] in ("uz-hijo-de-disan", "uz-hijo-de-nacor"):
                o["distinct_from"] = [i for i in o["distinct_from"] if i not in ("uz-hijo-de-disan", "uz-hijo-de-nacor")]
        errores, _ = validate.validar(datos)
        self.assertEqual([e for e in errores if "comparte el nombre «Uz»" in e],
                         ["data/people/uz-hijo-de-disan.yaml: comparte el nombre «Uz» con uz-hijo-de-nacor y ninguna "
                          "de las dos nombra a la otra; van en distinct_from de las dos (con disambiguation) o en un "
                          "same_as si quizá son la misma persona"], errores)

    def test_distinct_from_sin_disambiguation_es_error(self):
        out = []
        validate.validar_persona({"distinct_from": ["uz-b"]}, "data/people/uz-a.yaml", out.append)
        self.assertEqual(len(out), 1, out)
        self.assertIn("le falta disambiguation", out[0])
        out = []
        validate.validar_persona({"distinct_from": ["uz-b"], "disambiguation": "Uz hijo de Aram."}, "x", out.append)
        self.assertEqual(out, [])
def errores_repite(viaje):
    out = []
    validate.validar_repite(viaje, "data/journeys/x.yaml", out.append)
    return out


class Repite(unittest.TestCase):
    def test_sin_repeats_o_cada_anio_vale(self):
        self.assertEqual(errores_repite({}), [])
        self.assertEqual(errores_repite({"repeats": "yearly"}), [])

    def test_otro_valor_es_error(self):
        for valor in ["monthly", "cada año", True, None, ["yearly"], {"yearly": True}]:
            with self.subTest(valor=valor):
                e = errores_repite({"repeats": valor})
                self.assertEqual(len(e), 1, e)
                self.assertIn("repeats", e[0])

    def test_los_viajes_de_cada_anio_lo_llevan(self):
        datos = HERE.parent / "data" / "journeys"
        con = sorted(f.stem for f in datos.glob("*.yaml")
                     if (yaml.safe_load(f.read_text(encoding="utf-8")) or {}).get("repeats") == "yearly")
        self.assertEqual(con, ["elcana-sube-a-silo", "pascua-de-jesus-a-los-12", "recorrido-de-samuel"])

    def test_validar_mira_repeats_en_cada_viaje(self):
        # Sobre los datos de verdad, con un valor que no vale puesto en memoria: el error sale de validar().
        datos = validate.load(HERE.parent / "data")
        viaje = next(v for v in datos["journeys"] if v["id"] == "recorrido-de-samuel")
        viaje["repeats"] = "monthly"
        errores, _ = validate.validar(datos)
        self.assertEqual([e for e in errores if "repeats debe" in e],
                         [f"{viaje['_fichero']}: repeats debe ser uno de ['yearly'], no 'monthly'"])


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
