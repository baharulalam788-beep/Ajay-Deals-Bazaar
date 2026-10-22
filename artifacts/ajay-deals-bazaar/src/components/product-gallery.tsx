import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import type { Product } from "@workspace/api-client-react";

export function ProductGallery({ product }: { product: Product }) {
  const images = product.images.slice(0, 15);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const currentImage = images[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
    setZoomed(false);
  }, [product.id, images.length]);

  useEffect(() => {
    if (!zoomed) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [zoomed]);

  const move = (direction: number) => {
    if (images.length < 2) return;
    setActiveIndex((index) => (index + direction + images.length) % images.length);
  };

  return (
    <div className="min-w-0" data-testid={`gallery-product-${product.id}`}>
      <div
        className="product-art relative aspect-square overflow-hidden bg-[#e8f0e9]"
        onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          const end = event.changedTouches[0]?.clientX;
          touchStartX.current = null;
          if (start === null || end === undefined || images.length < 2) return;
          if (start - end > 45) move(1);
          if (end - start > 45) move(-1);
        }}
        data-testid={`gallery-main-${product.id}`}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={`${product.title} image ${activeIndex + 1}`}
            className="absolute inset-0 h-full w-full cursor-zoom-in object-contain"
            onClick={() => setZoomed(true)}
            data-testid={`img-product-main-${product.id}`}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#24675f] to-[#3b4f75] text-center text-white">
            <span className="display text-5xl font-semibold">{product.category.slice(0, 4).toUpperCase()}</span>
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#17675b] shadow-md"
              aria-label="Previous product image"
              data-testid="button-gallery-previous"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#17675b] shadow-md"
              aria-label="Next product image"
              data-testid="button-gallery-next"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
        {currentImage && (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#17675b] shadow-md"
            aria-label="Zoom product image"
            data-testid="button-gallery-zoom"
          >
            <Expand size={16} />
          </button>
        )}
        {images.length > 1 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white" data-testid="text-gallery-count">
            {activeIndex + 1} / {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Product image thumbnails">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border-2 bg-white transition ${activeIndex === index ? "border-[#17675b] ring-2 ring-[#17675b]/15" : "border-[#e2e7e1]"}`}
              aria-label={`Show product image ${index + 1}`}
              aria-pressed={activeIndex === index}
              data-testid={`button-gallery-thumbnail-${index + 1}`}
            >
              <img src={image} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoomed && currentImage && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product image"
          onClick={() => setZoomed(false)}
          data-testid="dialog-product-image-zoom"
        >
          <button
            type="button"
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white text-[#27352f]"
            aria-label="Close zoomed image"
            onClick={() => setZoomed(false)}
            data-testid="button-close-image-zoom"
          >
            <X size={20} />
          </button>
          <img
            src={currentImage}
            alt={`${product.title} enlarged`}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
            data-testid="img-product-zoomed"
          />
        </div>
      )}
    </div>
  );
}
