#!/usr/bin/env python3
"""Pruebas de scripts/videos/index.py y passages.py sobre el checkout ya migrado. Uso:
python3 scripts/videos/test_videos.py

Sin red y sin la carpeta privada de subtítulos: leen la configuración de nombres (place_names, people_names) y la tabla
de libros (data/books.yaml) del repositorio, y escriben los YAML de salida en una carpeta temporal. Si alguien deja una
ruta o una clave del esquema antiguo en los dos scripts, estas pruebas fallan."""
import re
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import index  # noqa: E402
import passages  # noqa: E402

MAP = yaml.safe_load((HERE.parent / "migration" / "map.yaml").read_text(encoding="utf-8"))
OLD_KEYS = {k for k, v in MAP["keys"].items() if k != v} | {k for k, v in MAP["video_config_keys"].items() if k != v}


def keys_of(x, out):
    if isinstance(x, dict):
        for k, v in x.items():
            out.add(k)
            keys_of(v, out)
    elif isinstance(x, list):
        for v in x:
            keys_of(v, out)
    return out


class VideoScripts(unittest.TestCase):
    def test_name_folders_and_data_folders_exist(self):
        for tipo, (datos, salida, _) in index.SALIDAS.items():
            self.assertTrue((index.RAIZ / datos).is_dir(), datos)
            self.assertTrue((index.RAIZ / salida).is_dir(), salida)
        self.assertTrue(index.NOMBRES.is_dir() and index.PERSONAS.is_dir())
        self.assertTrue(passages.LIBROS.exists())

    def test_names_are_read_with_the_new_keys(self):
        lugares = index.leer_carpeta(index.NOMBRES)
        personas = index.leer_carpeta(index.PERSONAS, index.AMBIGUOS)
        self.assertGreater(len(lugares), 50)
        self.assertGreater(len(personas), 20)
        for d in [*lugares.values(), *personas.values()]:
            self.assertIn("names", d)                      # a veces vacía: names: []
            self.assertFalse(OLD_KEYS & set(d), d)
        texto = "Pablo llegó a Filipos, y después a Tesalónica."
        self.assertIn("filipos", index.Buscador(lugares).contar(texto))

    def test_every_name_id_exists_in_data(self):
        tipos = {"lugar": index.leer_carpeta(index.NOMBRES), "persona": index.leer_carpeta(index.PERSONAS, index.AMBIGUOS)}
        index.comprobar_ids(tipos, {t: index.RAIZ / index.SALIDAS[t][0] for t in tipos}, prueba=False)

    def test_books_table_and_citations(self):
        libros = passages.Libros(passages.LIBROS)
        cuenta, malas = libros.citas("Leemos Hechos 16:14 y el capítulo 3 de Daniel.")
        self.assertEqual((cuenta, malas), ({("hechos", 16): 1, ("daniel", 3): 1}, 0))

    def test_written_yaml_is_in_the_new_schema(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            v = {"docid": "1", "titulo": "Un video", "url": "https://www.jw.org/", "publicado": "2020-01-01",
                 "menciones": 3, "terminos": {"Filipos": 3}}
            index.escribir_yaml(tmp, "lugar", "filipos", "2026-09-29", [v])
            passages.escribir_yaml(tmp, "hechos", "2026-09-29", {
                "serie": [{"docid": "2", "titulo": "Serie", "url": "https://www.jw.org/", "publicado": None}],
                "capitulos": {"16": [dict(v, por=["titulo", "subtitulos"], citas=2)]}})
            lugar = yaml.safe_load((tmp / "filipos.yaml").read_text(encoding="utf-8"))
            libro = yaml.safe_load((tmp / "hechos.yaml").read_text(encoding="utf-8"))
        self.assertEqual(list(lugar), ["place", "generated_on", "videos"])
        self.assertEqual(list(libro), ["book", "generated_on", "series", "chapters"])
        self.assertEqual(libro["chapters"][16][0]["matched_by"], ["title", "subtitles"])
        self.assertFalse(OLD_KEYS & (keys_of(lugar, set()) | keys_of(libro, set())))

    def test_no_old_path_or_flag_left(self):
        viejos = [*MAP["directories"], *MAP["files"], *MAP["scripts"]]
        viejos = [v for v in viejos if MAP["directories"].get(v, MAP["files"].get(v, MAP["scripts"].get(v))) != v]
        for script in (HERE / "index.py", HERE / "passages.py"):
            texto = script.read_text(encoding="utf-8")
            for v in viejos:
                self.assertNotIn(v, texto, f"{script.name} nombra {v}")
            documentadas = re.findall(r'add_argument\("(--[\w-]+)"', texto)
            self.assertFalse(set(documentadas) & set(MAP["flags"]), f"{script.name}: {documentadas}")


if __name__ == "__main__":
    unittest.main(verbosity=1)
