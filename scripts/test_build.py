#!/usr/bin/env python3
"""Pruebas de lo que scripts/build.py compila de un par escrito en las dos fichas. Uso: python3 scripts/test_build.py

Trabajan sobre un data/ pequeño en una carpeta temporal, con el vocabulario de verdad (data/vocabulary.yaml)."""
import shutil
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


if __name__ == "__main__":
    unittest.main(verbosity=1)
