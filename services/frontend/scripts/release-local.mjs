#!/usr/bin/env node
/**
 * Local OTA release server for GrindLogger.
 *
 * Builds the web bundle, zips it, writes a manifest, and serves both over your
 * home WiFi so the installed iOS app can update itself (see src/ota.ts).
 *
 * Usage:
 *   node scripts/release-local.mjs            # build + zip + serve
 *   node scripts/release-local.mjs --no-build # reuse existing dist/, just serve
 *
 * Then build the app once with the printed VITE_OTA_MANIFEST_URL so it knows
 * where to look. After that, every run of this script publishes a new bundle
 * the phone picks up on next launch while on the same WiFi.
 */

import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, createReadStream } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RELEASES = join(ROOT, 'releases');
const PORT = 4599;
const noBuild = process.argv.includes('--no-build');

function lanIP() {
  for (const iface of Object.values(networkInterfaces()).flat()) {
    if (iface && iface.family === 'IPv4' && !iface.internal) return iface.address;
  }
  return '127.0.0.1';
}

const ip = lanIP();
const version = String(Date.now());

if (!existsSync(RELEASES)) mkdirSync(RELEASES, { recursive: true });

if (!noBuild) {
  console.log('▸ Building web bundle…');
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
}
if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('✗ dist/ not found — run without --no-build first.');
  process.exit(1);
}

const zipName = `bundle-${version}.zip`;
console.log('▸ Zipping bundle…');
execSync(`cd "${join(ROOT, 'dist')}" && zip -qr "${join(RELEASES, zipName)}" .`);

const manifestUrl = `http://${ip}:${PORT}/manifest.json`;
const bundleUrl = `http://${ip}:${PORT}/${zipName}`;
writeFileSync(join(RELEASES, 'manifest.json'), JSON.stringify({ version, url: bundleUrl }, null, 2));

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const name = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, '')) || 'manifest.json';
  const file = join(RELEASES, name);
  if (!file.startsWith(RELEASES) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': name.endsWith('.json') ? 'application/json' : 'application/zip',
    'Content-Length': statSync(file).size,
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n✓ OTA release published');
  console.log(`  version:  ${version}`);
  console.log(`  bundle:   ${bundleUrl}`);
  console.log(`\n  Build the app once with:`);
  console.log(`    VITE_OTA_MANIFEST_URL=${manifestUrl} npm run ios:sync\n`);
  console.log('  Serving… (Ctrl+C to stop). Re-run this script to publish a new version.');
});
