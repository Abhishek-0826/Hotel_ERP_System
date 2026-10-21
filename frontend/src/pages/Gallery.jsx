import { useState, useEffect, useCallback } from "react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { GALLERY_PHOTOS, GALLERY_CATEGORIES } from "../data/propertyImages";
import { X, ChevronLeft, ChevronRight } from "../components/icons";

export default function Gallery() {
  const [category, setCategory] = useState("All");
  const [lightbox, setLightbox] = useState(null); // index into filtered array

  const filtered =
    category === "All"
      ? GALLERY_PHOTOS
      : GALLERY_PHOTOS.filter((p) => p.category === category);

  const openLightbox = (index) => setLightbox(index);
  const closeLightbox = () => setLightbox(null);

  const prev = useCallback(() => {
    setLightbox((i) => (i === 0 ? filtered.length - 1 : i - 1));
  }, [filtered.length]);

  const next = useCallback(() => {
    setLightbox((i) => (i === filtered.length - 1 ? 0 : i + 1));
  }, [filtered.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, prev, next]);

  const currentPhoto = lightbox !== null ? filtered[lightbox] : null;

  return (
    <>
      <Navbar />

      {/* Header */}
      <header className="border-b border-ink-100 bg-white py-10">
        <div className="container-page">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
            Royal Stay
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">
            Photo Gallery
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Explore our property — rooms, amenities, dining, and more.
          </p>
        </div>
      </header>

      {/* Category Filters */}
      <div className="sticky top-16 z-10 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="container-page overflow-x-auto py-3">
          <div className="flex gap-2">
            {GALLERY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                  category === cat
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="container-page py-10">
        <p className="mb-6 text-sm text-ink-400">
          {filtered.length} photo{filtered.length !== 1 ? "s" : ""}
          {category !== "All" ? ` in ${category}` : ""}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => openLightbox(index)}
              className="group relative overflow-hidden rounded-xl bg-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <img
                src={photo.thumb}
                alt={photo.title}
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div>
                  <p className="text-xs font-bold text-white">{photo.title}</p>
                  <p className="text-[10px] text-white/70">{photo.category}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Lightbox */}
      {currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {/* Counter */}
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
            {lightbox + 1} / {filtered.length}
          </div>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Previous"
          >
            <ChevronLeft size={24} />
          </button>

          {/* Image */}
          <img
            src={currentPhoto.url}
            alt={currentPhoto.title}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Next"
          >
            <ChevronRight size={24} />
          </button>

          {/* Caption */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
            <p className="text-sm font-bold text-white">{currentPhoto.title}</p>
            <p className="text-xs text-white/60">{currentPhoto.category}</p>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
