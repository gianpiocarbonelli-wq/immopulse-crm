export type ScrollDirection = 'vertical' | 'horizontal';

export function supportsIntersectionObserver(): boolean {
  return typeof window !== 'undefined' && typeof IntersectionObserver !== 'undefined';
}

export function getResponsiveRootMargin(
  viewportWidth?: number,
  direction: ScrollDirection = 'vertical',
): string {
  const width =
    typeof viewportWidth === 'number' && Number.isFinite(viewportWidth) && viewportWidth > 0
      ? viewportWidth
      : typeof window !== 'undefined'
        ? window.innerWidth
        : 1024;

  if (direction === 'horizontal') {
    if (width < 768) {
      return '120px 90px';
    }
    if (width < 1280) {
      return '160px 140px';
    }
    return '220px 180px';
  }

  if (width < 768) {
    return '180px 40px';
  }
  if (width < 1280) {
    return '260px 60px';
  }
  return '340px 100px';
}

export function shouldMountLazyMedia(isInView: boolean, priority?: boolean): boolean {
  return Boolean(priority || isInView);
}

export function getAdjacentPhotoIndices(currentIndex: number, total: number): number[] {
  if (!Number.isInteger(total) || total <= 1) return [];
  const safeCurrent = ((currentIndex % total) + total) % total;
  const next = (safeCurrent + 1) % total;
  const prev = (safeCurrent - 1 + total) % total;

  const indices: number[] = [];
  if (next !== safeCurrent) indices.push(next);
  if (prev !== safeCurrent && prev !== next) indices.push(prev);
  return indices;
}
