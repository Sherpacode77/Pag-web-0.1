"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import Image from "next/image"

export function VideoSection() {
  const [playing, setPlaying] = useState(false)

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary mb-2">
            Mira el equipo en accion
          </p>
          <h2 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-4xl text-balance">
            Disenado para la Aventura
          </h2>
        </div>

        <div className="relative aspect-video overflow-hidden bg-secondary">
          {!playing ? (
            <>
              <Image
                src="/images/hero-bikepacking.jpg"
                alt="Video preview - CERO.UNO equipo de bikepacking en accion"
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors md:h-24 md:w-24"
                  aria-label="Reproducir video"
                >
                  <Play className="h-8 w-8 ml-1 md:h-10 md:w-10" />
                </button>
              </div>
              <div className="absolute bottom-6 left-6 z-10">
                <p className="text-white text-sm font-medium uppercase tracking-wider">
                  CERO.UNO / Bikepacking Colombia
                </p>
                <p className="text-white/60 text-xs mt-1">
                  Descubre como nuestros bolsos te acompanan en cada kilometro
                </p>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-background">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/4F_pLzr7KLc?autoplay=1"
                title="CERO.UNO Bikepacking Colombia"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
