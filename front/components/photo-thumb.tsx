import Image from "next/image"
import { ImageIcon } from "lucide-react"
import type { PlacePhoto } from "@/lib/api-client"
import { cn } from "@/lib/utils"

interface PhotoThumbProps {
  photo: PlacePhoto | null | undefined
  alt: string
  className?: string
  sizes?: string
  /** Texto del recuadro cuando todavía no hay foto. */
  emptyLabel?: string
}

/** Foto recortada que llena su contenedor; sin foto muestra un recuadro neutro. */
export function PhotoThumb({ photo, alt, className, sizes = "(max-width: 768px) 50vw, 25vw", emptyLabel }: PhotoThumbProps) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {photo ? (
        <Image src={photo.photo_url} alt={photo.caption ?? alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ImageIcon className="size-[18px]" aria-hidden />
          {emptyLabel}
        </div>
      )}
    </div>
  )
}
