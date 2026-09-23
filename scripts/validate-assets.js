import fs from 'node:fs';
const files = [
  'index.html','manifest.webmanifest','sw.js',
  'assets/icons/icon.svg','assets/icons/icon-180.png','assets/icons/icon-192.png','assets/icons/icon-512.png',
  'src/app.js','src/ui/render.js','src/data/db.js','src/data/checkpoint.js'
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
