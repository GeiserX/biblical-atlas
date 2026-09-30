// Escribe data.js, la copia pequeña de los datos que la portada «Entra por el tiempo» usa para pintar sin esperar al
// sitio. Uso, desde la raíz del repositorio y después de python3 scripts/build.py:
//   node docs/ideas/mockups/portada/time/build-data.mjs
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const { compact } = createRequire(import.meta.url)('./compact.js');
const origen = path.resolve(aqui, '../../../../../site/data.json');
const datos = compact(JSON.parse(fs.readFileSync(origen, 'utf8')));
const js = `/* Generado por build-data.mjs a partir de site/data.json (${datos.generado}). No editar a mano. */\nwindow.TIME_DATA = ${JSON.stringify(datos)};\n`;
fs.writeFileSync(path.join(aqui, 'data.js'), js);
console.log(`data.js: ${(js.length / 1024).toFixed(1)} KB · ${datos.eras.length} épocas · ${datos.eventos.length} sucesos · ${datos.personas.length} personas`);
