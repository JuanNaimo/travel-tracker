"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

const CHARSET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789"
const FRAME_MS = 45
const SETTLE_FRAMES = 6
const STAGGER_FRAMES = 1.5

interface SplitFlapProps {
  text: string
  className?: string
  /** Cada carácter en su propia paleta, como un tablero de aeropuerto. */
  tiles?: boolean
}

/** Texto que se acomoda letra por letra como un tablero de salidas. */
export function SplitFlap({ text, className, tiles = false }: SplitFlapProps) {
  const reduce = useReducedMotion()
  const [frame, setFrame] = useState(0)
  const total = Math.ceil(SETTLE_FRAMES + text.length * STAGGER_FRAMES)

  // Reiniciar la animación cuando cambia el texto
  const [prevText, setPrevText] = useState(text)
  if (text !== prevText) {
    setPrevText(text)
    setFrame(0)
  }

  useEffect(() => {
    if (reduce || frame >= total) return
    const id = window.setTimeout(() => setFrame((f) => f + 1), FRAME_MS)
    return () => window.clearTimeout(id)
  }, [frame, total, reduce])

  const chars = [...text].map((char, i) => {
    const settled = reduce || char === " " || frame >= SETTLE_FRAMES + i * STAGGER_FRAMES
    return settled ? char : CHARSET[(i * 7 + frame * 3) % CHARSET.length]
  })

  return (
    <span className={cn("inline-flex flex-wrap", tiles && "gap-[3px]", className)}>
      <span className="sr-only">{text}</span>
      {chars.map((char, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            tiles &&
              "relative inline-flex min-w-[0.72em] justify-center rounded-[3px] bg-[#1c1d21] px-[0.06em] text-[#f5f5f0] after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-black/60",
            char === " " && (tiles ? "bg-transparent after:hidden" : "w-[0.3em]"),
          )}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  )
}
