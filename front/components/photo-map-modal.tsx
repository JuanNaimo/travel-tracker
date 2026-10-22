"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TravelMap } from "@/components/travel-map"
import type { PhotoMapTarget } from "@/lib/api-client"
import { MapPin } from "lucide-react"

interface PhotoMapModalProps {
  open: boolean
  target: PhotoMapTarget | null
  onClose: () => void
}

export function PhotoMapModal({ open, target, onClose }: PhotoMapModalProps) {
  const hasLocation =
    target != null &&
    typeof target.place.latitude === "number" &&
    typeof target.place.longitude === "number" &&
    !(target.place.latitude === 0 && target.place.longitude === 0)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[60vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {target?.place.name ?? ""}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {!hasLocation ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Ubicación no disponible para este lugar.</p>
            </div>
          ) : (
            <TravelMap
              places={[target!.place]}
              center={{ lat: target!.place.latitude, lng: target!.place.longitude }}
              zoom={14}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
