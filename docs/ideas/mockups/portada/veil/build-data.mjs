// Escribe data.js: la copia pequeña de lo que la portada enseña (épocas, recorridos, preguntas y los lugares del viaje
// de la fecha inicial), para pintar la primera pantalla sin esperar a site/data.json y para cuando la página se sirve
// sin el sitio. Sale de site/data.json con la misma regla que usa la página viva (shared.js).
//
//   python3 scripts/build.py                                   # si falta site/data.json
//   node docs/ideas/mockups/portada/veil/build-data.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
await import('./shared.js');
const source = path.resolve(here, '../../../../../site/data.json');
const D = JSON.parse(fs.readFileSync(source, 'utf8'));
const V = globalThis.veilShared.derive(D);
const text = `/* Generado por build-data.mjs a partir de site/data.json (${V.generated}). No editar a mano. */\n`
  + `window.VEIL_DATA = ${JSON.stringify(V)};\n`;
fs.writeFileSync(path.join(here, 'data.js'), text);
console.log(`data.js: ${V.eras.length} épocas, ${V.tours.length} recorridos, ${V.questions.length} preguntas, `
  + `${V.start ? V.start.places.length : 0} lugares del viaje inicial, ${text.length} bytes`);
