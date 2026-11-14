import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

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

  if (!isOpen || photos.length === 0) return null;

  const safeIndex = Math.max(0, Math.min(index, photos.length - 1));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Galleria foto immobile - ${clientName}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-[#092b35]/85 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-[#cbe2de] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-3 border-b border-[#e1f0ed] flex items-center justify-between bg-[#f4faf9]">
          <div className="text-sm font-bold text-[#0e4d5f]">Foto Immobile — {clientName}</div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#177858] font-mono tabular-nums">
              {safeIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi galleria"
              className="p-1 rounded-lg text-[#5a808a] hover:text-[#0e4d5f]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-[#f4faf9] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev - 1 + photos.length) % photos.length)}
            aria-label="Foto precedente"
            className="p-2 rounded-full bg-white border border-[#cbe2de] text-[#0e4d5f] hover:bg-[#eef6f5]"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <img
            src={photos[safeIndex]}
            alt={`Immagine immobile ${safeIndex + 1} di ${clientName}`}
            referrerPolicy="no-referrer"
            className="max-h-[60vh] max-w-full object-contain rounded-lg"
          />
          <button
            type="button"
            onClick={() => setIndex((prev) => (prev + 1) % photos.length)}
            aria-label="Foto successiva"
            className="p-2 rounded-full bg-white border border-[#cbe2de] text-[#0e4d5f] hover:bg-[#eef6f5]"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-4 py-3 flex items-center justify-center gap-2 overflow-x-auto bg-white border-t border-[#e1f0ed]">
          {photos.map((src, idx) => (
            <button
              key={`gallery-thumb-${idx}`}
              type="button"
              onClick={() => setIndex(idx)}
              aria-label={`Seleziona miniatura ${idx + 1}`}
              className={`rounded-md overflow-hidden border-2 transition-opacity shrink-0 ${
                idx === safeIndex ? 'border-[#2eb086]' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={src}
                alt={`Miniatura ${idx + 1}`}
                referrerPolicy="no-referrer"
                className="w-12 h-12 object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
