"use client"

import { StarIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: "sm" | "md" | "lg"
  interactive?: boolean
  onChange?: (rating: number) => void
}

export function StarRating({ rating, maxRating = 5, size = "md", interactive = false, onChange }: StarRatingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  return (
    <div className="flex gap-1">
      {Array.from({ length: maxRating }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => interactive && onChange?.(star)}
          disabled={!interactive}
          aria-label={`${star} de ${maxRating} estrellas`}
          aria-pressed={interactive ? star <= rating : undefined}
          className={cn(
            "transition-colors",
            interactive && "cursor-pointer hover:scale-110",
            !interactive && "cursor-default",
          )}
        >
          <StarIcon
            aria-hidden
            weight={star <= rating ? "fill" : "bold"}
            className={cn(sizeClasses[size], star <= rating ? "text-signal-text" : "text-muted-foreground/50")}
          />
        </button>
      ))}
    </div>
  )
}
