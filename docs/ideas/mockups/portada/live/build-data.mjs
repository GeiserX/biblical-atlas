// Escribe data.js, la copia pequeña de lo que pinta la portada, a partir de site/data.json (que sale de scripts/build.py).
//   node docs/ideas/mockups/portada/live/build-data.mjs
// La página pinta con data.js al instante y, cuando el sitio del marco ha cargado sus datos, vuelve a leerlos de allí
// con la misma función (extract.js), así que las dos copias no pueden decir cosas distintas.
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const aqui = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { extraer } = require('./extract.js');
const D = JSON.parse(readFileSync(join(aqui, '../../../../../site/data.json'), 'utf8'));
const datos = extraer(D);
const js = `/* Generado por build-data.mjs a partir de site/data.json (${datos.generado}). No se edita a mano. */\nwindow.LIVE_DATA = ${JSON.stringify(datos)};\n`;
writeFileSync(join(aqui, 'data.js'), js);
console.log(`data.js: ${js.length} bytes · ${datos.eras.length} épocas · ${datos.recorridos.length} recorridos · ${datos.preguntas.length} preguntas`);
