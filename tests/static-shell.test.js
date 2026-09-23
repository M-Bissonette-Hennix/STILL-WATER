import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function exists(rel) { return fs.existsSync(path.join(root, rel)); }

function localImports(file) {
  const text = fs.readFileSync(file, 'utf8');
  const refs = [];
  const regex = /(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = regex.exec(text))) refs.push(m[1]);
  return refs;
}

function walkImportGraph(entryRel) {
  const seen = new Set();
  const stack = [entryRel];
  while (stack.length) {
    const rel = stack.pop();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = path.join(root, rel);
    assert.ok(fs.existsSync(abs), `missing module: ${rel}`);
    for (const spec of localImports(abs)) {
      const next = path.normalize(path.join(path.dirname(rel), spec));
      stack.push(next);
    }
  }
  return seen;
}

test('browser module import graph is closed over local files', () => {
  const graph = walkImportGraph('src/app.js');
  assert.ok(graph.has('src/core/protocol.js'));
  assert.ok(graph.has('src/data/db.js'));
  assert.ok(graph.has('src/ui/render.js'));
});

test('service worker precache references existing local assets', () => {
  const text = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const coreMatch = text.match(/const CORE = \[([\s\S]*?)\];/);
  assert.ok(coreMatch, 'CORE precache array missing');
  const refs = [...coreMatch[1].matchAll(/['"]\.\/([^'"]+)['"]/g)].map(m => m[1]).filter(Boolean);
  for (const rel of refs) assert.ok(exists(rel), `service worker precache missing: ${rel}`);
  assert.ok(refs.length >= 20, 'precache list unexpectedly small');
});

test('manifest is relative-path GitHub Pages compatible and icons exist', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith('./'));
    assert.ok(exists(icon.src.slice(2)), `missing manifest icon: ${icon.src}`);
  }
});

test('index uses relative app shell paths and restrictive CSP', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /src="\.\/src\/app\.js"/);
  assert.doesNotMatch(html, /src="\/src\//);
  assert.doesNotMatch(html, /href="\/src\//);
});
