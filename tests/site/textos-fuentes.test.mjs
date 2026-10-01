// What the atlas tells its readers about its sources: that each fact links to its source, and nothing more. The texts
// for readers (the site's pages and messages, the README, the published pages of the documentation) never say that the
// content comes from a given site, nor that it is not copied. The links themselves, and the names of the linked
// publications, stay.
//
//   node --test tests/site/textos-fuentes.test.mjs
//
// No browser, no data. The working rules for contributors (CONTRIBUTING.md, docs/investigacion/, docs/decisiones.md, the
// validator) are not texts for readers and are not read here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const LECTORES = ['site/index.html', 'site/acerca.html', 'site/calendario.html', 'site/js', 'README.md', 'mkdocs.yml',
  'docs/index.md', 'docs/getting-started.md', 'docs/usage.md', 'docs/how-it-works.md'];
// Sentences that name where the content comes from, or say it is not copied.
const PROHIBIDAS = [
  /\bno (?:se )?copia(?:mos|n)?\b/i, /\bnunca (?:se )?copia(?:mos)?\b/i, /\bnada se copia\b/i, /\bsolo enlaza\b/i,
  /fuente (?:principal )?(?:es|en) (?:jw\.org|wol)/i, /\bsalen? de (?:jw\.org|wol|estas publicaciones de jw)/i,
  /de jw\.org gana/i, /\bfuentes citadas\b/i, /\bfuentes de jw\.org\b/i, /\bsolo cuando jw\.org/i,
  /tabla A7 de la TNM/i, /y de jw\.org\b/i, /de las que sale cada dato/i, /de jw\.org que lo sostiene/i,
  // The words of the cards, the legend and the filter: they name the kind of source, not the site.
  /\b(?:según|por) jw\.org\b/i, /\bcita jw\.org\b/i, /\bjw\.org (?:ha usado|usa|use)\b/i, /\bBiblia (?:y|ni|o) (?:(?:una )?publicación de )?jw\.org\b/i,
  /\bfechas? de jw\.org\b/i, /\bres[uú]menes nuestros\b/i,
];

function ficheros(rel) {
  const p = ROOT + rel;
  if (!fs.statSync(p).isDirectory()) return [rel];
  return fs.readdirSync(p, { recursive: true }).filter((f) => String(f).endsWith('.js')).map((f) => `${rel}/${f}`);
}
// A comment in the code is for whoever edits it, not for readers.
const sinComentarios = (rel, s) => (rel.endsWith('.js') ? s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '') : s);

test('no text for readers says where the content comes from or that it is not copied', () => {
  const hallados = [];
  for (const rel of LECTORES.flatMap(ficheros)) {
    const texto = sinComentarios(rel, fs.readFileSync(ROOT + rel, 'utf8'));
    texto.split('\n').forEach((linea, i) => {
      for (const re of PROHIBIDAS) if (re.test(linea)) hallados.push(`${rel}:${i + 1} ${re} «${linea.trim().slice(0, 120)}»`);
    });
  }
  assert.deepEqual(hallados, []);
});

test('each of those texts still says that facts link to their sources', () => {
  for (const rel of ['site/index.html', 'site/acerca.html', 'README.md', 'docs/index.md', 'mkdocs.yml', 'docs/how-it-works.md']) {
    assert.match(fs.readFileSync(ROOT + rel, 'utf8'), /enlaza(?:do)? a su fuente|enlazado a su fuente|enlaza a la página/, rel);
  }
});
