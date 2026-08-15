import { useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react'

interface Screenshot {
  thumbnail: string
  url: string
}

interface Props {
  screenshots: Screenshot[]
}

export function ScreenshotCarousel({ screenshots }: Props) {
  const [current, setCurrent] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [loaded, setLoaded] = useState<Set<number>>(new Set())

  const n = screenshots.length
  const prev = useCallback(() => setCurrent(i => (i - 1 + n) % n), [n])
  const next = useCallback(() => setCurrent(i => (i + 1) % n), [n])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, prev, next])

  if (n === 0) return null

  // Normalise the index distance: 0 = center, 1 = right, -1 = left, else hidden.
  const diff = (i: number) => {
    const raw = ((i - current) % n + n) % n
    return raw > Math.floor(n / 2) ? raw - n : raw
  }

  const slideStyle = (i: number): React.CSSProperties => {
    const d = diff(i)
    const base: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: '50%',
      width: '62%',
      height: '100%',
      transition: 'transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.45s ease, filter 0.45s ease',
      borderRadius: '14px',
      overflow: 'hidden',
    }

    if (d === 0) return {
      ...base,
      transform: 'translateX(-50%) rotateY(0deg) scale(1)',
      zIndex: 10,
      opacity: 1,
      filter: 'none',
      cursor: 'pointer',
      boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    }
    if (d === 1) return {
      ...base,
      transform: 'translateX(-5%) rotateY(-44deg) scale(0.7)',
      zIndex: 5,
      opacity: 0.72,
      filter: 'brightness(0.6)',
      cursor: 'pointer',
    }
    if (d === -1) return {
      ...base,
      transform: 'translateX(-95%) rotateY(44deg) scale(0.7)',
      zIndex: 5,
      opacity: 0.72,
      filter: 'brightness(0.6)',
      cursor: 'pointer',
    }
    // Hidden slides
    return {
      ...base,
      transform: 'translateX(-50%) scale(0)',
      zIndex: 0,
      opacity: 0,
      pointerEvents: 'none',
      visibility: 'hidden',
    }
  }

  const handleSlideClick = (i: number) => {
    const d = diff(i)
    if (d === 0) setLightboxOpen(true)
    else if (d === 1) next()
    else if (d === -1) prev()
  }

  return (
    <div>
      {/* Carousel stage */}
      <div className="overflow-hidden rounded-2xl">
        <div
          className="relative w-full select-none"
          style={{ height: '200px', perspective: '1100px' }}
        >
          {screenshots.map((s, i) => {
            const isCenter = diff(i) === 0
            return (
              <div
                key={i}
                style={slideStyle(i)}
                className={isCenter ? 'group' : ''}
                onClick={() => handleSlideClick(i)}
              >
                {/* Skeleton shimmer */}
                {!loaded.has(i) && (
                  <div className="absolute inset-0 bg-stone-200 dark:bg-stone-700 animate-pulse" />
                )}
                <img
                  src={s.url}
                  alt={`Screenshot ${i + 1}`}
                  className={`w-full h-full object-cover transition-all duration-300 ${isCenter ? 'group-hover:scale-105' : ''} ${loaded.has(i) ? 'opacity-100' : 'opacity-0'}`}
                  draggable={false}
                  loading="lazy"
                  onLoad={() => setLoaded(prev => new Set([...prev, i]))}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                {/* Expand overlay — center slide only */}
                {isCenter && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30 pointer-events-none">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full shadow-lg">
                      <Maximize2 size={24} className="text-white drop-shadow" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Arrow buttons */}
          {n > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-amber-500 text-white rounded-full transition-colors backdrop-blur-sm"
                aria-label="Previous screenshot"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-amber-500 text-white rounded-full transition-colors backdrop-blur-sm"
                aria-label="Next screenshot"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dot indicators */}
      {n > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {screenshots.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to screenshot ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? 'bg-amber-500 w-5'
                  : 'bg-stone-300 dark:bg-stone-600 w-1.5 hover:bg-stone-400 dark:hover:bg-stone-500'
              }`}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex flex-col"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Top bar: counter + close */}
          <div className="flex-none flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-white/70 text-sm font-medium tabular-nums select-none">
              {n > 1 ? `${current + 1} / ${n}` : ''}
            </span>
            <button
              onClick={() => setLightboxOpen(false)}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Image row: prev — image — next */}
          <div className="flex flex-1 items-center min-h-0 gap-3 px-4 pb-4">
            {/* Prev button — always takes up space so image stays centered */}
            <button
              onClick={e => { e.stopPropagation(); prev() }}
              disabled={n <= 1}
              className="flex-none p-3 bg-white/10 hover:bg-amber-500 disabled:opacity-0 disabled:pointer-events-none rounded-full text-white transition-colors"
              aria-label="Previous screenshot"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Image — fills remaining space, never touches buttons */}
            <div className="flex flex-1 items-center justify-center min-h-0 h-full" onClick={e => e.stopPropagation()}>
              <img
                src={screenshots[current].url}
                alt={`Screenshot ${current + 1}`}
                className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
              />
            </div>

            {/* Next button */}
            <button
              onClick={e => { e.stopPropagation(); next() }}
              disabled={n <= 1}
              className="flex-none p-3 bg-white/10 hover:bg-amber-500 disabled:opacity-0 disabled:pointer-events-none rounded-full text-white transition-colors"
              aria-label="Next screenshot"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
