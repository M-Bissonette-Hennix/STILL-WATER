import fs from 'node:fs';
const files = [
  'index.html','manifest.webmanifest','sw.js',
  'assets/icons/icon.svg','assets/icons/icon-180.png','assets/icons/icon-192.png','assets/icons/icon-512.png',
  'assets/kuji/01-rin.jpg','assets/kuji/02-pyo.jpg','assets/kuji/03-to.jpg','assets/kuji/04-sha.jpg','assets/kuji/05-kai.jpg',
  'assets/kuji/06-jin.jpg','assets/kuji/07-retsu.jpg','assets/kuji/08-zai.jpg','assets/kuji/09-zen.jpg',
  'src/app.js','src/ui/render.js','src/data/db.js','src/data/checkpoint.js','src/audio/audio-engine.js','src/app/protocol-ui.js'
];
let failed = false;
const jsFiles = ['src/app.js','src/ui/render.js','src/data/db.js','src/core/protocol.js','src/core/state-machine.js','src/core/timing-engine.js','src/core/progression-engine.js'];
for (const file of files) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
    console.error(`MISSING — ${file}`);
    failed = true;
  } else console.log(`PASS — ${file}`);
}
if (failed) process.exit(1);
for (const file of jsFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('http://') || text.includes('https://')) {
    console.error(`EXTERNAL-RUNTIME-REFERENCE — ${file}`);
    process.exit(1);
  }
}
console.log('PASS — no external runtime references in critical modules');
