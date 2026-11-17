import { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import {
  getResponsiveRootMargin,
  shouldMountLazyMedia,
  supportsIntersectionObserver,
  type ScrollDirection,
} from '../utils/lazyMedia';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  placeholderClassName?: string;
  direction?: ScrollDirection;
  rootMargin?: string;
  priority?: boolean;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

export function LazyImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  wrapperClassName = 'w-full h-full',
  placeholderClassName = 'bg-[#eef6f5]',
  direction = 'vertical',
  rootMargin,
  priority = false,
  referrerPolicy = 'no-referrer',
}: LazyImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isInView, setIsInView] = useState<boolean>(
    () => Boolean(priority) || !supportsIntersectionObserver(),
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    if (priority || isInView) return;
    if (!supportsIntersectionObserver()) {
      setIsInView(true);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    const resolvedMargin = rootMargin ?? getResponsiveRootMargin(window.innerWidth, direction);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        rootMargin: resolvedMargin,
        threshold: 0.01,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [priority, isInView, rootMargin, direction]);

  const shouldRenderImg = shouldMountLazyMedia(isInView, priority);

  useEffect(() => {
    if (!shouldRenderImg) return;
    const img = imgRef.current;
    if (img && img.complete) {
      if (img.naturalWidth > 0) {
        setIsLoaded(true);
      } else {
        setHasError(true);
      }
    }
  }, [shouldRenderImg, src]);

  return (
    <div
      ref={containerRef}
      data-lazy-loaded={isLoaded ? 'true' : 'false'}
      data-lazy-mounted={shouldRenderImg ? 'true' : 'false'}
      className={`relative overflow-hidden ${wrapperClassName}`}
    >
      {!isLoaded && !hasError && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 ${placeholderClassName} animate-pulse`}
        />
      )}

      {hasError ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-[#eef6f5] text-[#7ea1aa]"
        >
          <ImageOff className="w-4 h-4" />
        </div>
      ) : (
        shouldRenderImg && (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'low'}
            referrerPolicy={referrerPolicy}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              setIsLoaded(false);
            }}
            className={`${className} transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )
      )}
    </div>
  );
}
