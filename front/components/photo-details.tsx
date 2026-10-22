"use client"

import Image from "next/image"
import Link from "next/link"
import { Download, MapPin, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { db, type Place, type PlacePhoto, type Trip } from "@/lib/api-client"
import { formatDate } from "@/lib/travel"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ConfirmButton } from "@/components/confirm-button"

interface PhotoDetailsProps {
  photo: PlacePhoto
  place: Place | undefined
  trip: Trip | undefined
  onDeleted: () => void
}

export function PhotoDetails({ photo, place, trip, onDeleted }: PhotoDetailsProps) {
  const handleDelete = async () => {
    const { error } = await db.photos.delete(photo.id)
    if (error) {
      toast.error("No se pudo eliminar la foto.")
      return
    }
    toast.success("Foto eliminada.")
    onDeleted()
  }

  return (
    <div className="flex flex-col">
      <div className="relative aspect-[4/3] bg-muted">
        <Image src={photo.photo_url} alt={photo.caption ?? place?.name ?? "Foto"} fill sizes="(max-width: 1024px) 100vw, 360px" className="object-contain" />
      </div>
      <div className="flex flex-col gap-3 p-[18px]">
        <div className="flex flex-col gap-1">
          {trip && <span className="text-xs font-bold tracking-wide text-primary uppercase">{trip.name}</span>}
          <span className="font-display text-xl font-bold">{photo.caption ?? place?.name ?? "Foto"}</span>
          <span className="text-sm text-muted-foreground">
            {place?.visit_date ? formatDate(place.visit_date) : `Subida el ${formatDate(photo.created_at)}`}
          </span>
        </div>
        {place && (
          <dl className="flex flex-col gap-2 border-t pt-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Entrada</dt>
              <dd>
                <Link href={`/dashboard/trips/${place.trip_id}`} className="font-bold text-primary">
                  {place.name}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Ubicación</dt>
              <dd>
                <Link href={`/dashboard/map?lugar=${place.id}`} className="inline-flex items-center gap-1 font-medium">
                  <MapPin className="size-3.5" aria-hidden />
                  Ver en el mapa
                </Link>
              </dd>
            </div>
          </dl>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-11 rounded-xl font-bold">
            <a href={photo.photo_url} download={`${(photo.caption ?? place?.name ?? "foto").slice(0, 40)}`}>
              <Download aria-hidden />
              Descargar
            </a>
          </Button>
          <ConfirmButton
            title="¿Eliminar esta foto?"
            description="La foto se borra del viaje y no se puede recuperar."
            confirmLabel="Eliminar"
            onConfirm={handleDelete}
          >
            <Button variant="outline" className="h-11 rounded-xl font-bold text-destructive hover:text-destructive">
              <Trash2 aria-hidden />
              Eliminar
            </Button>
          </ConfirmButton>
        </div>
      </div>
    </div>
  )
}

export function PhotoDialog({
  open,
  onOpenChange,
  ...details
}: PhotoDetailsProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg gap-0 overflow-y-auto p-0">
        <DialogTitle className="sr-only">{details.photo.caption ?? details.place?.name ?? "Foto"}</DialogTitle>
        <DialogDescription className="sr-only">Detalle de la foto</DialogDescription>
        <PhotoDetails {...details} />
      </DialogContent>
    </Dialog>
  )
}
