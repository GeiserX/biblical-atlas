#!/usr/bin/env python3
"""Pruebas de scripts/aplicar.py. Uso: python3 scripts/test_aplicar.py

Trabajan sobre un data/ pequeño en una carpeta temporal, sin red y sin tocar el repo."""
import contextlib
import filecmp
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import aplicar  # noqa: E402

# Una ficha escrita a mano: líneas cortadas a otro ancho y lista en línea. yaml.safe_dump no la reproduce.
ANA = """# biblical-earth: un fichero por persona. Esquema en docs/investigacion/README.md.
id: ana
nombre: Ana
nombres:
- nombre: Ana
resumen: Una persona de prueba con un resumen largo que se corta a mano antes de llegar a la columna ciento
  veinte para que el volcado no lo reproduzca igual.
razon: Prueba.
fuentes: [f-comun]
relaciones:
- tipo: vivio_en
  lugar: aldea
  deducido: false
  fuentes: [f-comun]
  razon: Prueba.
  estado: verificado
consultado: '2026-01-01'
estado: verificado
"""
FUENTES = """# biblical-earth: fuentes comunes.
f-comun:
  titulo: Común
  obra: Prueba
  url: https://wol.jw.org/es/wol/d/r4/lp-s/1200000001
  nivel: 1
  publicado: null
  consultado: '2026-01-01'
"""


def fuente(fid, n, dia="2026-09-29"):
    return {fid: {"titulo": fid, "obra": "Prueba", "url": f"https://wol.jw.org/es/wol/d/r4/lp-s/12000000{n:02d}",
                  "nivel": 1, "publicado": None, "consultado": dia}}


def persona(pid, clave, fuentes, relaciones=()):
    return {"id": pid, "nombre": pid.capitalize(), "perspicacia": clave, "nombres": [{"nombre": pid.capitalize()}],
            "resumen": "Prueba.", "razon": "Prueba.", "fuentes": list(fuentes), "relaciones": list(relaciones),
            "consultado": "2026-09-29", "estado": "verificado"}


def rel(pid, relacion, fuentes):
    return {"tipo": "pariente", "persona": pid, "relacion": relacion, "deducido": False, "fuentes": list(fuentes),
            "razon": "Prueba.", "estado": "verificado"}


def propuesta(cap, cambios, fuentes=None, leido="2026-09-29"):
    return {"formato": aplicar.FORMATO, "libro": "prueba", "capitulos": [cap], "agente": f"prueba-{cap}",
            "leido": leido, "fuentes": fuentes or {},
            "cobertura": {str(cap): {"estado": "completo", "revisado": leido,
                                     "tramos": [{"v": "1-3", "tipo": "narracion", "entidades": [f"persona:x{cap}"]},
                                                {"v": 4, "tipo": "narracion", "nota": "Una nota, con coma."}]}},
            "cambios": cambios}


P1 = propuesta(1, [
    {"op": "crear", "tipo": "personas", "id": "x1", "datos": persona("x1", "1200000011", ["prueba-1", "f1"])},
    {"op": "anadir", "tipo": "personas", "id": "ana", "campo": "fuentes", "valores": ["prueba-1"]},
], fuente("f1", 11))
P2 = propuesta(2, [
    {"op": "crear", "tipo": "personas", "id": "x2", "datos": persona("x2", "1200000012#2", ["prueba-2", "f2"],
                                                                     [rel("x1", "padre", ["prueba-2"])])},
    {"op": "anadir", "tipo": "personas", "id": "x1", "campo": "relaciones", "valores": [rel("ana", "madre", ["prueba-2"])]},
    {"op": "cambiar", "tipo": "personas", "id": "ana", "campo": "razon", "antes": "Prueba.", "despues": "Prueba 2.",
     "historial": {"fecha": "2026-09-29", "cambio": "Prueba.", "fuente": "prueba-2"}},
    {"op": "cambiar", "tipo": "personas", "id": "ana", "campo": "perspicacia", "antes": None, "despues": "1200000001"},
], fuente("f2", 12))
P3 = propuesta(3, [
    {"op": "anadir", "tipo": "personas", "id": "x1", "campo": "fuentes", "valores": ["prueba-3", "f3"]},
], fuente("f3", 13, "2026-09-30"), leido="2026-09-30")


class Prueba(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.raiz = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def data(self, nombre):
        d = self.raiz / nombre / "data"
        (d / "personas").mkdir(parents=True)
        (d / "fuentes").mkdir()
        (d / "personas" / "ana.yaml").write_text(ANA, encoding="utf-8")
        (d / "fuentes" / "comun.yaml").write_text(FUENTES, encoding="utf-8")
        return d

    def correr(self, data, *props, extra=()):
        rutas = []
        for i, p in enumerate(props):
            r = self.raiz / f"p{len(list(self.raiz.glob('p*.json')))}.json"
            r.write_text(json.dumps(p, ensure_ascii=False), encoding="utf-8")
            rutas.append(str(r))
        salida = io.StringIO()
        with contextlib.redirect_stdout(salida), contextlib.redirect_stderr(salida):
            codigo = aplicar.main(["--data", str(data), *extra, *rutas])
        return codigo, salida.getvalue()

    def correr_ruta(self, data, ruta):
        with contextlib.redirect_stdout(io.StringIO()):
            return aplicar.main(["--data", str(data), str(ruta)])

    def iguales(self, a, b):
        cmp = filecmp.dircmp(a, b)
        pendientes = [cmp]
        while pendientes:
            c = pendientes.pop()
            self.assertEqual((c.left_only, c.right_only), ([], []), f"ficheros distintos en {c.left}")
            _, distintos, errores = filecmp.cmpfiles(c.left, c.right, c.common_files, shallow=False)
            self.assertEqual((distintos, errores), ([], []), f"contenido distinto en {c.left}")
            pendientes += c.subdirs.values()

    def test_por_partes_igual_que_de_una_vez(self):
        a, b = self.data("a"), self.data("b")
        self.assertEqual(self.correr(a, P1, P2)[0], 0)
        self.assertEqual(self.correr(a, P3)[0], 0)
        self.assertEqual(self.correr(b, P3, P2, P1)[0], 0)      # el orden de los ficheros no importa
        self.iguales(a, b)
        cob = (a / "cobertura" / "prueba.yaml").read_text(encoding="utf-8")
        self.assertIn("  1:\n", cob)
        self.assertIn("  3:\n", cob)
        fue = (a / "fuentes" / "cobertura-prueba.yaml").read_text(encoding="utf-8")
        for fid in ("f1:", "f2:", "f3:"):
            self.assertIn(fid, fue)

    def test_solo_cambian_las_lineas_tocadas(self):
        a = self.data("a")
        self.correr(a, P1)
        nuevo = (a / "personas" / "ana.yaml").read_text(encoding="utf-8")
        esperado = ANA.replace("fuentes: [f-comun]\nrelaciones", "fuentes:\n- f-comun\n- prueba-1\nrelaciones").replace(
            "consultado: '2026-01-01'", "consultado: '2026-09-29'")
        self.assertEqual(nuevo, esperado)

    def test_fuente_con_otros_datos_es_error_y_no_escribe(self):
        a = self.data("a")
        otra = dict(P1, fuentes={"f-comun": fuente("f-comun", 99)["f-comun"]})
        codigo, texto = self.correr(a, otra)
        self.assertEqual(codigo, 1, texto)
        self.assertFalse((a / "personas" / "x1.yaml").exists())
        self.assertEqual((a / "personas" / "ana.yaml").read_text(encoding="utf-8"), ANA)

    def test_misma_fuente_distinta_en_dos_propuestas_es_error(self):
        a = self.data("a")
        otra = dict(P2, fuentes={"f1": fuente("f1", 98)["f1"]})
        codigo, texto = self.correr(a, P1, otra)
        self.assertEqual(codigo, 1, texto)
        self.assertFalse((a / "personas" / "x1.yaml").exists())

    def test_choque_no_se_aplica(self):
        a = self.data("a")
        mala = propuesta(1, [{"op": "cambiar", "tipo": "personas", "id": "ana", "campo": "razon", "antes": "Otra.",
                              "despues": "Nueva.", "historial": {"fecha": "2026-09-29", "cambio": "x", "fuente": "f"}}])
        codigo, texto = self.correr(a, mala)
        self.assertEqual(codigo, 2, texto)
        self.assertIn("CHOQUE", texto)
        self.assertIn("razon: Prueba.", (a / "personas" / "ana.yaml").read_text(encoding="utf-8"))

    def test_misma_clave_misma_persona(self):
        a = self.data("a")
        self.correr(a, P1)
        otra = propuesta(2, [{"op": "crear", "tipo": "personas", "id": "x1-bis",
                              "datos": persona("x1-bis", "1200000011", ["prueba-2"])}])
        otra["cobertura"]["2"]["tramos"][0]["entidades"] = ["persona:x1-bis"]
        codigo, texto = self.correr(a, otra)
        self.assertEqual(codigo, 0, texto)
        self.assertFalse((a / "personas" / "x1-bis.yaml").exists())
        self.assertIn("prueba-2", (a / "personas" / "x1.yaml").read_text(encoding="utf-8"))
        self.assertIn("persona:x1]", (a / "cobertura" / "prueba.yaml").read_text(encoding="utf-8"))

    def test_paralelo_deja_operaciones_que_la_integracion_aplica_igual(self):
        a, b = self.data("a"), self.data("b")
        self.correr(a, P1, P2)
        self.correr(b, P1, P2, extra=["--paralelo"])
        self.assertEqual((b / "personas" / "ana.yaml").read_text(encoding="utf-8"), ANA)
        ops = b / "_propuestas" / "prueba.json"
        self.assertTrue(ops.exists())
        self.assertEqual(self.correr_ruta(b, ops), 0)
        ops.unlink()
        ops.parent.rmdir()
        self.iguales(a, b)


if __name__ == "__main__":
    unittest.main(verbosity=2)
