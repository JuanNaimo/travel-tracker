"use client"

import Image from "next/image"
import type { PlacePhoto, Place, PhotoMapTarget } from "@/lib/api-client"

interface PhotoCardProps {
  photo: PlacePhoto
  place: Place
  onClick: (target: PhotoMapTarget) => void
}

export function PhotoCard({ photo, place, onClick }: PhotoCardProps) {
  return (
    <button
      className="group relative w-full overflow-hidden rounded-lg bg-muted cursor-pointer text-left"
      onClick={() => onClick({ place, photo })}
    >
      <div className="aspect-[4/3] relative">
        <Image
          src={photo.photo_url}
          alt={photo.caption ?? place.name}
          fill
          loading="lazy"
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 33vw"
        />
      </div>
      {photo.caption && (
        <p className="p-2 text-xs text-muted-foreground truncate">{photo.caption}</p>
      )}
    </button>
  )
}
