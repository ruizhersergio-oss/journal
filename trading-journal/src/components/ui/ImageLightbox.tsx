'use client'

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageLightboxProps {
  images: string[]
  index:  number
  onClose: () => void
  onIndexChange: (index: number) => void
}

export default function ImageLightbox({ images, index, onClose, onIndexChange }: ImageLightboxProps) {
  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + images.length) % images.length)
  }, [index, images.length, onIndexChange])

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % images.length)
  }, [index, images.length, onIndexChange])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && images.length > 1) goPrev()
      if (e.key === 'ArrowRight' && images.length > 1) goNext()
    }
    document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, goPrev, goNext, images.length])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        title="Cerrar"
      >
        <X size={22} />
      </button>

      {images.length > 1 && (
        <span className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium">
          {index + 1} / {images.length}
        </span>
      )}

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          className="absolute left-2 md:left-4 p-2 md:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Anterior"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[index]}
        alt={`Trade chart ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[92vw] max-h-[90vh] object-contain rounded-lg"
      />

      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext() }}
          className="absolute right-2 md:right-4 p-2 md:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Siguiente"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>,
    document.body
  )
}
