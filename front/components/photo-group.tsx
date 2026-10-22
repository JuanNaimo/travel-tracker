"use client"

import type { Place, PlacePhoto, PhotoMapTarget } from "@/lib/api-client"
import { PhotoCard } from "@/components/photo-card"
import { PhotoUpload } from "@/components/photo-upload"

interface PhotoGroupProps {
  place: Place
  photos: PlacePhoto[]
  onPhotoClick: (target: PhotoMapTarget) => void
  onPhotoAdded: (photo: PlacePhoto) => void
}

export function PhotoGroup({ place, photos, onPhotoClick, onPhotoAdded }: PhotoGroupProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {place.name}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {photos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} place={place} onClick={onPhotoClick} />
        ))}
      </div>
      <PhotoUpload placeId={place.id} onSuccess={onPhotoAdded} />
    </div>
  )
}
