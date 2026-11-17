import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAdjacentPhotoIndices,
  getResponsiveRootMargin,
  shouldMountLazyMedia,
  supportsIntersectionObserver,
} from './lazyMedia.ts';

test('getResponsiveRootMargin tunes vertical prefetch margin by mobile/tablet/desktop width', () => {
  assert.equal(getResponsiveRootMargin(390, 'vertical'), '180px 40px');
  assert.equal(getResponsiveRootMargin(767, 'vertical'), '180px 40px');
  assert.equal(getResponsiveRootMargin(768, 'vertical'), '260px 60px');
  assert.equal(getResponsiveRootMargin(1024, 'vertical'), '260px 60px');
  assert.equal(getResponsiveRootMargin(1440, 'vertical'), '340px 100px');
});

test('getResponsiveRootMargin tunes horizontal prefetch margin for thumbnail strips', () => {
  assert.equal(getResponsiveRootMargin(375, 'horizontal'), '120px 90px');
  assert.equal(getResponsiveRootMargin(900, 'horizontal'), '160px 140px');
  assert.equal(getResponsiveRootMargin(1440, 'horizontal'), '220px 180px');
});

test('shouldMountLazyMedia defers until in view unless priority is true', () => {
  assert.equal(shouldMountLazyMedia(false, false), false);
  assert.equal(shouldMountLazyMedia(false, undefined), false);
  assert.equal(shouldMountLazyMedia(true, false), true);
  assert.equal(shouldMountLazyMedia(false, true), true);
});

test('getAdjacentPhotoIndices computes unique wrapping neighbor indices', () => {
  assert.deepEqual(getAdjacentPhotoIndices(0, 0), []);
  assert.deepEqual(getAdjacentPhotoIndices(0, 1), []);
  assert.deepEqual(getAdjacentPhotoIndices(0, 2), [1]);
  assert.deepEqual(getAdjacentPhotoIndices(0, 5), [1, 4]);
  assert.deepEqual(getAdjacentPhotoIndices(4, 5), [0, 3]);
  assert.deepEqual(getAdjacentPhotoIndices(2, 5), [3, 1]);
});

test('supportsIntersectionObserver returns false safely in Node test runtime', () => {
  assert.equal(supportsIntersectionObserver(), false);
});
