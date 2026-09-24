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


test('all nine Kuji records map to existing local illustration assets', async () => {
  const { KUJI } = await import('../src/app/protocol-ui.js');
  assert.equal(KUJI.length, 9);
  for (const seal of KUJI) {
    assert.ok(seal.image?.startsWith('./assets/kuji/'), `missing image path for ${seal.name}`);
    assert.ok(exists(seal.image.slice(2)), `missing Kuji image: ${seal.image}`);
  }
});

test('audio assets exist, are non-empty, and are service-worker precached', () => {
  const cue = path.join(root, 'assets/audio/cue.mp3');
  const timeline = path.join(root, 'assets/audio/train-timeline.mp3');
  const transitionTest = path.join(root, 'assets/audio/transition-test.mp3');
  assert.ok(fs.existsSync(cue), 'cue audio missing');
  assert.ok(fs.statSync(cue).size > 1000, 'cue audio unexpectedly small');
  assert.ok(fs.existsSync(timeline), 'TRAIN timeline audio missing');
  assert.ok(fs.statSync(timeline).size > 500_000, 'TRAIN timeline audio unexpectedly small');
  assert.ok(fs.existsSync(transitionTest), 'timed transition diagnostic audio missing');
  assert.ok(fs.statSync(transitionTest).size > 5_000, 'timed transition diagnostic unexpectedly small');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(sw, /\.\/assets\/audio\/cue\.mp3/);
  assert.match(sw, /\.\/assets\/audio\/train-timeline\.mp3/);
  assert.match(sw, /\.\/assets\/audio\/transition-test\.mp3/);
  assert.match(sw, /still-water-shell-v0\.2\.2/);
});

test('index preloads the media timeline and cue assets using relative GitHub Pages paths', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /href="\.\/assets\/audio\/train-timeline\.mp3"/);
  assert.match(html, /href="\.\/assets\/audio\/cue\.mp3"/);
  assert.match(html, /href="\.\/assets\/audio\/transition-test\.mp3"/);
});

test('critical audio path does not depend on Web Audio AudioContext', () => {
  const text = fs.readFileSync(path.join(root, 'src/audio/audio-engine.js'), 'utf8');
  assert.doesNotMatch(text, /AudioContext|webkitAudioContext|createOscillator/);
  assert.match(text, /train-timeline\.mp3/);
  assert.match(text, /cue\.mp3/);
  assert.match(text, /transition-test\.mp3/);
});
