import test from 'node:test';
import assert from 'node:assert/strict';
import { detectIOSUserAgent } from './usePWAInstall';

test('detectIOSUserAgent detects iPhone, iPad, iPod and ignores desktop/Android', () => {
  assert.equal(
    detectIOSUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'),
    true,
  );
  assert.equal(
    detectIOSUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'),
    true,
  );
  assert.equal(
    detectIOSUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36'),
    false,
  );
  assert.equal(
    detectIOSUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0'),
    false,
  );
});
