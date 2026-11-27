import { build } from 'esbuild';
import fs from 'node:fs';
const res = await build({
  entryPoints: ['src/main.js'], bundle: true, minify: !process.argv.includes('--dev'), format: 'iife', write: false, target: 'es2020',
  loader: { '.json': 'json' }, legalComments: 'none', logLevel: 'info',
});
let js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync('template.html', 'utf8').replace('/*BUNDLE*/', () => js);
fs.writeFileSync('index.html', html);
console.log('index.html', (html.length / 1024 / 1024).toFixed(2), 'MB');
