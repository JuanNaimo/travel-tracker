"use client"

import Image from "next/image"
import Link from "next/link"
import { DownloadSimpleIcon, MapPinIcon, TrashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { db, type Place, type PlacePhoto, type Trip } from "@/lib/api-client"
import { formatDate, placeCode } from "@/lib/travel"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { ConfirmButton } from "@/components/confirm-button"

interface PhotoDetailsProps {
  photo: PlacePhoto
  place: Place | undefined
  trip: Trip | undefined
  onDeleted: () => void
}

/** Detalle de una foto en papel de ticket; va dentro de un contenedor bg-ticket. */
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

  const title = photo.caption ?? place?.name ?? "Foto"

  return (
    <div className="flex flex-col">
      <div className="relative aspect-[4/3] bg-[#101113]">
        <Image src={photo.photo_url} alt={title} fill sizes="(max-width: 1024px) 100vw, 360px" className="object-contain" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="flex items-center justify-between font-mono text-[10px] text-ticket-muted uppercase">
            <span>{trip?.name}</span>
            <span>{place?.visit_date ? formatDate(place.visit_date) : `Subida ${formatDate(photo.created_at)}`}</span>
          </span>
          {place && <span className="font-display text-[34px] leading-none">{placeCode(place.name)}</span>}
          <span className="text-lg leading-tight font-bold">{title}</span>
        </div>
        {place && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-dashed border-perforation pt-3 text-sm">
            <Link href={`/dashboard/trips/${place.trip_id}`} className="font-bold underline underline-offset-4">
              Ver entrada
            </Link>
            <Link href={`/dashboard/map?lugar=${place.id}`} className="inline-flex items-center gap-1 font-bold underline underline-offset-4">
              <MapPinIcon className="size-4" aria-hidden />
              En el mapa
            </Link>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={photo.photo_url}
            download={title.slice(0, 40)}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-ticket-foreground text-sm font-bold text-ticket"
          >
            <DownloadSimpleIcon className="size-4" aria-hidden />
            Descargar
          </a>
          <ConfirmButton
            title="¿Eliminar esta foto?"
            description="La foto se borra del viaje y no se puede recuperar."
            confirmLabel="Eliminar"
            onConfirm={handleDelete}
          >
            <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#b42318]/40 text-sm font-bold text-[#b42318]">
              <TrashIcon className="size-4" aria-hidden />
              Eliminar
            </button>
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
      <DialogContent className="max-h-[92vh] max-w-lg gap-0 overflow-y-auto border-0 bg-ticket p-0 text-ticket-foreground [&>[data-slot=dialog-close]]:rounded-md [&>[data-slot=dialog-close]]:bg-[#f5f2ea] [&>[data-slot=dialog-close]]:p-1.5 [&>[data-slot=dialog-close]]:text-[#101113] [&>[data-slot=dialog-close]]:opacity-100">
        <DialogTitle className="sr-only">{details.photo.caption ?? details.place?.name ?? "Foto"}</DialogTitle>
        <DialogDescription className="sr-only">Detalle de la foto</DialogDescription>
        <PhotoDetails {...details} />
      </DialogContent>
    </Dialog>
  )
}
