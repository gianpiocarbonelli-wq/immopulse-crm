import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readPngDimensions(filePath: string): { width: number; height: number } {
  const buf = fs.readFileSync(filePath);
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} must be valid PNG`);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

test('PWA public icon assets exist with valid PNG dimensions', () => {
  const publicDir = path.resolve(import.meta.dirname, '../../public');

  assert.equal(fs.existsSync(path.join(publicDir, 'icon.svg')), true);
  assert.deepEqual(readPngDimensions(path.join(publicDir, 'pwa-192x192.png')), {
    width: 192,
    height: 192,
  });
  assert.deepEqual(readPngDimensions(path.join(publicDir, 'pwa-512x512.png')), {
    width: 512,
    height: 512,
  });
  assert.deepEqual(readPngDimensions(path.join(publicDir, 'pwa-maskable-512x512.png')), {
    width: 512,
    height: 512,
  });
  assert.deepEqual(readPngDimensions(path.join(publicDir, 'apple-touch-icon.png')), {
    width: 180,
    height: 180,
  });
});

test('vite.config.ts PWA manifest and Workbox caching rules are properly configured', () => {
  const rootDir = path.resolve(import.meta.dirname, '../..');
  const viteConfigSrc = fs.readFileSync(path.join(rootDir, 'vite.config.ts'), 'utf8');

  assert.match(viteConfigSrc, /short_name:\s*'ImmoPulse'/);
  assert.match(viteConfigSrc, /display:\s*'standalone'/);
  assert.match(viteConfigSrc, /includeManifestIcons:\s*false/);
  assert.match(viteConfigSrc, /cleanupOutdatedCaches:\s*true/);
  assert.match(viteConfigSrc, /cacheName:\s*'local-images-cache'/);
  assert.match(viteConfigSrc, /statuses:\s*\[200\]/);
  assert.match(viteConfigSrc, /handler:\s*'NetworkOnly'/);
  assert.equal(viteConfigSrc.includes('__dirname'), false);
});
