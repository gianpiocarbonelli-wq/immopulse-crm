import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getAdjacentPhotoIndices } from '../utils/lazyMedia';
import { LazyImage } from './LazyImage';

interface GalleryModalProps {
  isOpen: boolean;
  clientName: string;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

export function GalleryModal({
  isOpen,
  clientName,
  photos,
  initialIndex,
  onClose,
}: GalleryModalProps) {
  const [index, setIndex] = useState(initialIndex);
  const [isMainLoaded, setIsMainLoaded] = useState(false);
  const mainImgRef = useRef<HTMLImageElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const { lang } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      setIndex(Math.max(0, Math.min(initialIndex, Math.max(0, photos.length - 1))));
    }
  }, [isOpen, initialIndex, photos.length]);

  useEffect(() => {
    if (!isOpen || photos.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setIndex((prev) => (prev - 1 + photos.length) % photos.length);
      } else if (e.key === 'ArrowRight') {
        setIndex((prev) => (prev + 1) % photos.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, photos.length]);

  const safeIndex = photos.length > 0 ? Math.max(0, Math.min(index, photos.length - 1)) : 0;
  const activeSrc = photos[safeIndex] ?? '';

  useEffect(() => {
    if (!isOpen || !activeSrc) return;
    setIsMainLoaded(false);
    const img = mainImgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setIsMainLoaded(true);
    }
  }, [isOpen, activeSrc]);

  useEffect(() => {
    if (!isOpen || photos.length <= 1 || typeof window === 'undefined') return;
    const neighborIndices = getAdjacentPhotoIndices(safeIndex, photos.length);
    const preloaded: HTMLImageElement[] = [];

    for (const neighborIdx of neighborIndices) {
      const src = photos[neighborIdx];
      if (!src) continue;
      const img = new Image();
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.src = src;
      preloaded.push(img);
    }

    return () => {
      for (const img of preloaded) {
        img.src = '';
      }
    };
  }, [isOpen, safeIndex, photos]);

  if (!isOpen || photos.length === 0) return null;

  const handlePrev = () => setIndex((prev) => (prev - 1 + photos.length) % photos.length);
  const handleNext = () => setIndex((prev) => (prev + 1) % photos.length);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        lang === 'en'
          ? `Property photo gallery - ${clientName}`
          : `Galleria foto immobile - ${clientName}`
      }
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-[#092b35]/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-backdrop"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl animate-bottom-sheet">
        <div className="px-5 py-3 border-b border-[#e1f0ed] flex items-center justify-between bg-[#f4faf9]">
          <div className="text-sm font-bold text-[#0e4d5f] truncate pr-2">
            {lang === 'en' ? 'Property Photos' : 'Foto Immobile'} — {clientName}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-[#177858] font-mono tabular-nums">
              {safeIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'en' ? 'Close gallery' : 'Chiudi galleria'}
              className="p-1 rounded-lg text-[#5a808a] hover:text-[#0e4d5f]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          className="p-4 bg-[#f4faf9] flex items-center justify-between gap-2 touch-pan-y"
          onTouchStart={(e) => {
            touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartXRef.current === null || photos.length <= 1) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
            const deltaX = endX - touchStartXRef.current;
            touchStartXRef.current = null;
            if (Math.abs(deltaX) >= 45) {
              if (deltaX < 0) handleNext();
              else handlePrev();
            }
          }}
        >
          <button
            type="button"
            onClick={handlePrev}
            aria-label={lang === 'en' ? 'Previous photo' : 'Foto precedente'}
            className="p-2 rounded-full bg-white border border-[#cbe2de] text-[#0e4d5f] hover:bg-[#eef6f5] shrink-0"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="relative flex-1 flex items-center justify-center min-h-[220px] sm:min-h-[300px]">
            {!isMainLoaded && (
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-lg bg-[#e4f0ee] animate-pulse"
              />
            )}
            <img
              ref={mainImgRef}
              key={activeSrc}
              src={activeSrc}
              alt={
                lang === 'en'
                  ? `Property image ${safeIndex + 1} for ${clientName}`
                  : `Immagine immobile ${safeIndex + 1} di ${clientName}`
              }
              decoding="async"
              fetchPriority="high"
              referrerPolicy="no-referrer"
              onLoad={() => setIsMainLoaded(true)}
              className={`max-h-[60vh] max-w-full object-contain rounded-lg transition-opacity duration-200 ${
                isMainLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={handleNext}
            aria-label={lang === 'en' ? 'Next photo' : 'Foto successiva'}
            className="p-2 rounded-full bg-white border border-[#cbe2de] text-[#0e4d5f] hover:bg-[#eef6f5] shrink-0"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 py-3 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar bg-white border-t border-[#e1f0ed]">
          {photos.map((src, idx) => (
            <button
              key={`gallery-thumb-${idx}`}
              type="button"
              onClick={() => setIndex(idx)}
              aria-label={
                lang === 'en' ? `Select thumbnail ${idx + 1}` : `Seleziona miniatura ${idx + 1}`
              }
              className={`rounded-md overflow-hidden border-2 transition-opacity shrink-0 ${
                idx === safeIndex ? 'border-[#2eb086]' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <LazyImage
                src={src}
                alt={lang === 'en' ? `Thumbnail ${idx + 1}` : `Miniatura ${idx + 1}`}
                direction="horizontal"
                wrapperClassName="w-12 h-12 bg-[#eef6f5]"
                className="w-12 h-12 object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
