"use client"

import { Camera } from "lucide-react"
import type { PlacePhotoGroup, PhotoMapTarget, PlacePhoto } from "@/lib/api-client"
import { PhotoGroup } from "@/components/photo-group"

interface PhotoAlbumProps {
  tripName: string
  groups: PlacePhotoGroup[]
  onPhotoClick: (target: PhotoMapTarget) => void
  onPhotoAdded: (photo: PlacePhoto) => void
}

export function PhotoAlbum({ tripName, groups, onPhotoClick, onPhotoAdded }: PhotoAlbumProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Camera className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-bold">Álbum: {tripName}</h2>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-8">
          <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay fotos en este viaje todavía.</p>
        </div>
      ) : (
        <div>
          {groups.map((group) => (
            <PhotoGroup
              key={group.place.id}
              place={group.place}
              photos={group.photos}
              onPhotoClick={onPhotoClick}
              onPhotoAdded={onPhotoAdded}
            />
          ))}
        </div>
      )}
    </div>
  )
}
