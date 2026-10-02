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


def viaje_con_ramas(ramas, **campos):
    """Un viaje de grupo de cinco paradas; ramas = {order: branches_from}."""
    v = {"person": None, "group": "los desterrados", "companions": [],
         "stops": [{"order": i, **({"branches_from": ramas[i]} if i in ramas else {})} for i in range(1, 6)]}
    v.update(campos)
    return v


def errores_ramas(ramas, **campos):
    out = []
    v = viaje_con_ramas(ramas, **campos)
    validate.validar_ramas(v, "viaje", out.append)
    validate.validar_viaje(v, "viaje", out.append)
    return out


class DestinosEnParalelo(unittest.TestCase):
    """`branches_from`: destinos a los que se llega en paralelo desde una parada anterior (docs/ideas/destinos-paralelos.md)."""

    def test_sin_la_clave_cada_parada_sigue_a_la_anterior(self):
        v = viaje_con_ramas({})
        self.assertEqual(validate.anteriores(v), {1: None, 2: 1, 3: 2, 4: 3, 5: 4})
        self.assertEqual(validate.camino_paradas(validate.anteriores(v), 2, 4), {2, 3, 4})

    def test_abanico_desde_la_primera_vale(self):
        self.assertEqual(errores_ramas({2: 1, 3: 1, 4: 1, 5: 1}), [])
        v = viaje_con_ramas({2: 1, 3: 1, 4: 1, 5: 1})
        self.assertEqual(validate.anteriores(v), {1: None, 2: 1, 3: 1, 4: 1, 5: 1})

    def test_una_rama_y_el_tronco_que_sigue_valen(self):
        # 1 > 2 > 3 > 5, y 4 sale de 3 a la vez que 5: la parada 5 sigue al tronco, no a la rama.
        self.assertEqual(errores_ramas({4: 3}), [])
        self.assertEqual(validate.anteriores(viaje_con_ramas({4: 3}))[5], 3)

    def test_parada_que_no_existe_o_no_es_anterior_es_error(self):
        for r in (9, 0, 5, 3, "1", 1.0, None, True):
            with self.subTest(r=r):
                e = errores_ramas({3: r, 4: 1, 5: 1}) if r != 3 else errores_ramas({3: 3, 4: 1, 5: 1})
                self.assertTrue(any("parada anterior del mismo viaje" in x for x in e), e)

    def test_ciclo_es_error(self):
        e = errores_ramas({2: 3, 3: 2})
        self.assertTrue(any("stop 2: branches_from es el order de una parada anterior" in x for x in e), e)

    def test_cadena_de_ramas_es_error(self):
        e = errores_ramas({2: 1, 3: 1, 4: 2})
        self.assertTrue(any("branches_from 2 es a su vez un destino en paralelo" in x for x in e), e)

    def test_un_solo_camino_desde_la_parada_es_error(self):
        # 5 sale de 4, y de 4 no sale nada más: la clave no dice nada que el orden no diga ya.
        e = errores_ramas({5: 4})
        self.assertTrue(any("stop 4: de ella sale un solo camino" in x for x in e), e)

    def test_viaje_de_persona_no_se_reparte(self):
        e = errores_ramas({2: 1, 3: 1}, person="pablo", group=None)
        self.assertTrue(any("solo vale en un viaje de grupo" in x for x in e), e)

    def test_acompanante_de_todo_el_viaje_con_ramas_es_error(self):
        e = errores_ramas({2: 1, 3: 1, 4: 1, 5: 1}, companions=["beera"])
        self.assertTrue(any("iría en todos los destinos en paralelo" in x for x in e), e)

    def test_tramo_que_sigue_una_rama_vale(self):
        cs = [{"person": "beera", "from": 1, "to": 3}]
        self.assertEqual(errores_ramas({2: 1, 3: 1, 4: 1, 5: 1}, companions=cs), [])
        self.assertEqual(validate.camino_paradas(validate.anteriores(viaje_con_ramas({2: 1, 3: 1, 4: 1, 5: 1})), 1, 3), {1, 3})

    def test_tramo_que_cruza_dos_ramas_es_error(self):
        cs = [{"person": "beera", "from": 2, "to": 3}]
        e = errores_ramas({2: 1, 3: 1, 4: 1, 5: 1}, companions=cs)
        self.assertTrue(any("la parada 3 no está en la ruta que sale de la parada 2" in x for x in e), e)

    def test_dos_tramos_en_ramas_distintas_se_tocan_en_la_salida(self):
        cs = [{"person": "beera", "from": 1, "to": 2}, {"person": "beera", "from": 3, "to": 3}]
        e = errores_ramas({2: 1, 3: 1, 4: 1, 5: 1}, companions=cs)
        self.assertTrue(any("ya va en las paradas 1 a 2" in x for x in e), e)

    def test_los_dos_destierros_del_repositorio_pasan(self):
        for nombre, salida in (("destierro-de-israel-en-740", 1), ("destierro-de-beera", 1)):
            with self.subTest(viaje=nombre):
                v = validate._read(HERE.parent / "data" / "journeys" / f"{nombre}.yaml")
                self.assertEqual([p.get("branches_from") for p in v["stops"]], [None, salida, salida, salida, salida])
                out = []
                validate.validar_ramas(v, nombre, out.append)
                validate.validar_viaje(v, nombre, out.append)
                self.assertEqual(out, [])

    def test_validar_mira_las_ramas_en_cada_viaje(self):
        datos = validate.load(HERE.parent / "data")
        viaje = next(v for v in datos["journeys"] if v["id"] == "destierro-de-beera")
        viaje["stops"][2]["branches_from"] = 2
        errores, _ = validate.validar(datos)
        self.assertTrue(any("destierro-de-beera" in e and "es a su vez un destino en paralelo" in e for e in errores), errores)


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


class Transcurrido(unittest.TestCase):
    """narrative_order.elapsed: lo que validate.py deja escribir es lo que el sitio sabe dibujar (be-64b.15)."""
    def suceso(self, sid, orden, elapsed=None, desde=-1449, hasta=-1399, detalle=None):
        n = {"series": "s", "order": orden}
        if elapsed is not None:
            n["elapsed"] = elapsed
        f = {"from": desde, "to": hasta}
        if detalle:
            f["detail"] = detalle
        return {"id": sid, "_fichero": f"data/events/{sid}.yaml", "narrative_order": n, "date": f}

    def errores(self, *sucesos):
        out = []
        validate.validar_transcurrido({"events": list(sucesos)}, out.append)
        return out

    def test_validos(self):
        a = self.suceso("a", 1)
        self.assertEqual(self.errores(a, self.suceso("b", 2, {"days": 4, "reason": "Jue 19:8."})), [])
        self.assertEqual(self.errores(a, self.suceso("b", 2, {"reason": "Sin plazo en el texto."})), [])
        # since a la cabeza, con sucesos sin elapsed en medio: se reparten entre los dos (Asdod, Gat y Ecrón).
        self.assertEqual(self.errores(a, self.suceso("b", 2, {"reason": "x"}), self.suceso("c", 3),
                                      self.suceso("d", 4, {"since": "a", "months": 4, "reason": "x"})), [])
        # since a uno atado de la cadena.
        self.assertEqual(self.errores(a, self.suceso("b", 2, {"days": 1, "reason": "x"}), self.suceso("c", 3, {"days": 0, "reason": "x"}),
                                      self.suceso("d", 4, {"since": "b", "days": 1, "reason": "x"})), [])

    def test_errores_de_forma(self):
        a = self.suceso("a", 1)
        casos = {
            "sin reason": {"days": 1},
            "dos cifras": {"days": 1, "months": 2, "reason": "x"},
            "negativa": {"years": -1, "reason": "x"},
            "no es número": {"days": "uno", "reason": "x"},
            "nan": {"days": float("nan"), "reason": "x"},
            "infinita": {"years": float("inf"), "reason": "x"},
            "clave de más": {"days": 1, "reason": "x", "note": "y"},
            "since posterior": {"since": "c", "reason": "x"},
            "since que no existe": {"since": "z", "reason": "x"},
        }
        for nombre, el in casos.items():
            with self.subTest(nombre):
                self.assertEqual(len(self.errores(a, self.suceso("b", 2, el), self.suceso("c", 3))), 1)

    def test_since_a_un_suceso_sin_atar_entre_dos_atados(self):
        # Revisión del motor, caso 1: since a Gat, que no lleva elapsed, dibujaba la devolución 65 meses después de Gat.
        e = self.errores(self.suceso("captura", 1), self.suceso("dagon", 2, {"reason": "x"}), self.suceso("gat", 3),
                         self.suceso("devolucion", 4, {"since": "gat", "months": 1, "reason": "x"}))
        self.assertEqual(len(e), 1)
        self.assertIn("no es la cabeza ni un suceso atado", e[0])

    def test_since_anterior_a_la_cabeza(self):
        # Caso 2: since a un suceso de antes de la cabeza de la cadena.
        e = self.errores(self.suceso("antes", 1), self.suceso("cabeza", 2), self.suceso("b", 3, {"reason": "x"}),
                         self.suceso("c", 4, {"since": "antes", "months": 1, "reason": "x"}))
        self.assertEqual(len(e), 1)
        self.assertIn("no es la cabeza ni un suceso atado", e[0])

    def test_un_ancla_a_un_lado_del_plazo(self):
        # Caso 3: «tres días después» de un suceso con mes y día: el sitio lo dibujaba un día después, sin avisar.
        ancla = self.suceso("templo", 1, desde=-1033, hasta=-1033, detalle={"month": "ziv", "day": 2})
        e = self.errores(ancla, self.suceso("b", 2, {"days": 3, "reason": "x"}, -1033, -1033))
        self.assertEqual(len(e), 1)
        self.assertIn("ancla", e[0])
        e = self.errores(self.suceso("a", 1), self.suceso("b", 2, {"days": 3, "reason": "x"}, -1033, -1033, {"month": "ziv"}))
        self.assertEqual(len(e), 1)
        self.assertIn("ancla", e[0])

    def test_un_bloque_mas_largo_que_sus_fechas(self):
        # Revisión del motor, hallazgo 1: tres años detrás de un nacimiento de un año, y 200 años en un tramo de 56.
        nacimiento = self.suceso("nacimiento", 1, desde=-1179, hasta=-1179)
        e = self.errores(nacimiento, self.suceso("entrega", 2, {"years": 3, "reason": "x"}, -1179, -1116))
        self.assertEqual(len(e), 1)
        self.assertIn("solo dejan 1.00", e[0])
        e = self.errores(self.suceso("a", 1, desde=-1172, hasta=-1116), self.suceso("b", 2, {"years": 200, "reason": "x"}, -1172, -1116))
        self.assertEqual(len(e), 1)
        self.assertEqual(self.errores(self.suceso("a", 1, desde=-1172, hasta=-1116), self.suceso("b", 2, {"years": 20, "reason": "x"}, -1172, -1116)), [])

    def test_el_primero_de_la_serie_no_tiene_de_donde_partir(self):
        self.assertEqual(len(self.errores(self.suceso("a", 1, {"days": 1, "reason": "x"}))), 1)

    def test_fechas_que_no_se_tocan(self):
        self.assertEqual(len(self.errores(self.suceso("a", 1), self.suceso("b", 2, {"days": 1, "reason": "x"}, -1300, -1290))), 1)


if __name__ == "__main__":
    unittest.main()
