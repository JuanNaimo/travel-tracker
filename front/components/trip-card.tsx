import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { PlacePhoto, Trip } from "@/lib/api-client"
import { formatTripDates, plural, tripStatus, TRIP_STATUS_LABELS } from "@/lib/travel"
import { PhotoThumb } from "@/components/photo-thumb"

interface TripCardProps {
  trip: Trip
  cover: PlacePhoto | null
  placesCount: number
}

/** Fila con miniatura en el celular; tarjeta con portada desde `sm`. */
export function TripCard({ trip, cover, placesCount }: TripCardProps) {
  const status = tripStatus(trip)
  const dates = formatTripDates(trip)

  return (
    <Link
      href={`/dashboard/trips/${trip.id}`}
      className="group flex items-center gap-3.5 rounded-[18px] bg-card p-2.5 text-foreground transition-shadow hover:shadow-md sm:flex-col sm:items-stretch sm:gap-0 sm:overflow-hidden sm:p-0"
    >
      <div className="relative shrink-0">
        <PhotoThumb
          photo={cover}
          alt={trip.name}
          className="size-[84px] rounded-[14px] sm:h-[140px] sm:w-full sm:rounded-none"
          sizes="(max-width: 640px) 84px, 33vw"
        />
        {(status === "ongoing" || status === "upcoming") && (
          <span
            className={
              status === "ongoing"
                ? "absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary-foreground uppercase"
                : "absolute top-2 left-2 rounded-full bg-warm-soft px-2 py-0.5 text-[10px] font-bold tracking-wide text-warm-foreground uppercase"
            }
          >
            {TRIP_STATUS_LABELS[status]}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:px-4 sm:pt-3.5 sm:pb-4">
        <span className="truncate font-display text-[17px] font-bold">{trip.name}</span>
        {trip.description && <span className="line-clamp-1 text-[13px] text-muted-foreground">{trip.description}</span>}
        <span className="text-xs text-muted-foreground">
          {[dates, plural(placesCount, "entrada", "entradas")].filter(Boolean).join(" · ")}
        </span>
      </div>
      <ChevronRight className="size-[18px] shrink-0 text-muted-foreground sm:hidden" aria-hidden />
    </Link>
  )
}
