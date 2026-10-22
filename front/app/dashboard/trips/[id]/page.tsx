"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Pencil, Plus, Share2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { db, type Place, type PlacePhoto, type Trip } from "@/lib/api-client"
import { useTravelData } from "@/components/travel-data-provider"
import { NEW_ENTRY_HREF } from "@/components/app-shell"
import { PhotoThumb } from "@/components/photo-thumb"
import { PhotoDialog } from "@/components/photo-details"
import { StatTile } from "@/components/stat-tile"
import { TravelMap } from "@/components/travel-map"
import { TripFormDialog } from "@/components/trip-form-dialog"
import { ConfirmButton } from "@/components/confirm-button"
import { StarRating } from "@/components/star-rating"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  CATEGORY_LABELS,
  dayOfTrip,
  formatDay,
  formatLongDate,
  formatMoney,
  formatTripDates,
  groupByDay,
  moodLabel,
  plural,
  sortByVisit,
  tripCover,
  tripLength,
  tripStatus,
  TRIP_STATUS_LABELS,
} from "@/lib/travel"

type Tab = "diario" | "fotos" | "lugares"
const TABS: { value: Tab; label: string }[] = [
  { value: "diario", label: "Diario" },
  { value: "fotos", label: "Fotos" },
  { value: "lugares", label: "Lugares" },
]

export default function TripPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { trips, places, photos, loading, reload } = useTravelData()
  const [tab, setTab] = useState<Tab>("diario")
  const [openPhoto, setOpenPhoto] = useState<PlacePhoto | null>(null)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

  const trip = trips.find((t) => t.id === id)
  if (loading) {
    return (
      <div className="mx-auto max-w-[1120px] space-y-4 p-4 lg:p-12">
        <Skeleton className="h-[300px] rounded-3xl" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40" />
      </div>
    )
  }
  if (!trip) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <h1 className="font-display text-2xl font-bold">No encontramos este viaje</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/trips">Volver a mis viajes</Link>
        </Button>
      </div>
    )
  }

  const tripPlaces = places.filter((p) => p.trip_id === trip.id)
  const placeIds = new Set(tripPlaces.map((p) => p.id))
  const tripPhotos = photos.filter((ph) => placeIds.has(ph.place_id))
  const cover = tripCover(trip.id, places, photos)
  const status = tripStatus(trip)
  const expenses = tripPlaces.reduce((sum, p) => sum + p.expenses, 0)
  const newEntryHref = `${NEW_ENTRY_HREF}?viaje=${trip.id}`

  const handleDelete = async () => {
    const { error } = await db.trips.delete(trip.id)
    if (error) {
      toast.error("No se pudo eliminar el viaje.")
      return
    }
    toast.success(`"${trip.name}" eliminado.`)
    await reload()
    router.push("/dashboard/trips")
  }

  const handleShare = async () => {
    const lines = [trip.name, formatTripDates(trip), trip.description, ...sortByVisit(tripPlaces).map((p) => `• ${p.name}`)]
    const text = lines.filter(Boolean).join("\n")
    if (navigator.share) {
      await navigator.share({ title: trip.name, text }).catch(() => undefined)
      return
    }
    await navigator.clipboard.writeText(text)
    toast.success("Resumen del viaje copiado.")
  }

  const statusLine =
    status === "ongoing"
      ? `En curso · Día ${dayOfTrip(trip, new Date())} de ${tripLength(trip)}`
      : status === "upcoming"
        ? "Próximo viaje"
        : TRIP_STATUS_LABELS[status]

  return (
    <div className="pb-6 lg:pb-12">
      <div className="mx-auto w-full max-w-[1120px] lg:px-12 lg:pt-7">
        <nav aria-label="Ruta" className="mb-5 hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
          <Link href="/dashboard/trips" className="text-primary">
            Mis viajes
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-foreground">{trip.name}</span>
        </nav>

        <div className="relative">
          <PhotoThumb
            photo={cover}
            alt={trip.name}
            className="h-[300px] lg:h-[340px] lg:rounded-3xl"
            sizes="(max-width: 1024px) 100vw, 1120px"
            emptyLabel="Las fotos que cargues van a aparecer acá"
          />
          <Link
            href="/dashboard/trips"
            aria-label="Volver"
            className="absolute top-5 left-4 flex size-11 items-center justify-center rounded-full bg-card text-foreground lg:hidden"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        </div>

        <div className="relative -mt-7 flex flex-col gap-5 rounded-t-[28px] bg-background px-5 pt-6 lg:mt-0 lg:rounded-none lg:px-0">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex max-w-2xl flex-col gap-1">
              <span className={cn("text-xs font-bold tracking-wider uppercase", status === "upcoming" ? "text-warm-foreground" : "text-primary")}>
                {statusLine}
              </span>
              <h1 className="font-display text-[32px] font-bold tracking-tight lg:text-[44px]">{trip.name}</h1>
              {formatTripDates(trip) && <span className="text-sm text-muted-foreground lg:text-[15px]">{formatTripDates(trip)}</span>}
              {trip.rating && <StarRating rating={trip.rating} size="sm" />}
              {trip.description && <p className="mt-1 text-[15px] leading-relaxed lg:text-base">{trip.description}</p>}
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="outline" className="h-11 rounded-xl bg-card font-bold" onClick={handleShare}>
                <Share2 aria-hidden />
                Compartir
              </Button>
              <TripFormDialog
                trip={trip}
                onSaved={reload}
                trigger={
                  <Button variant="outline" className="h-11 rounded-xl bg-card font-bold">
                    <Pencil aria-hidden />
                    Editar
                  </Button>
                }
              />
              <ConfirmButton
                title={`¿Eliminar "${trip.name}"?`}
                description={`Se borran también ${plural(tripPlaces.length, "entrada", "entradas")} y ${plural(tripPhotos.length, "foto", "fotos")}. No se puede deshacer.`}
                confirmLabel="Eliminar viaje"
                onConfirm={handleDelete}
              >
                <Button variant="outline" className="h-11 rounded-xl bg-card font-bold text-destructive hover:text-destructive" aria-label="Eliminar viaje">
                  <Trash2 aria-hidden />
                </Button>
              </ConfirmButton>
              <Button asChild className="h-11 rounded-xl font-bold max-sm:w-full">
                <Link href={newEntryHref}>
                  <Plus aria-hidden />
                  Nueva entrada
                </Link>
              </Button>
            </div>
          </header>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <section className="flex min-w-0 flex-1 flex-col gap-4">
              <div className="grid grid-cols-3 gap-2.5 lg:hidden">
                <StatTile value={tripPlaces.length} label="entradas" />
                <StatTile value={tripPhotos.length} label="fotos" />
                <StatTile value={expenses > 0 ? `$${formatMoney(expenses)}` : (tripLength(trip) ?? "—")} label={expenses > 0 ? "gastos" : "días"} />
              </div>

              <div role="tablist" aria-label="Secciones del viaje" className="grid grid-cols-3 gap-1 rounded-[14px] bg-muted p-1 lg:flex lg:self-start">
                {TABS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.value}
                    onClick={() => setTab(t.value)}
                    className={cn(
                      "h-10 rounded-[10px] px-5 text-sm font-bold transition-colors",
                      tab === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "diario" && (
                <Diary trip={trip} places={tripPlaces} photos={tripPhotos} onPhotoClick={setOpenPhoto} newEntryHref={newEntryHref} />
              )}

              {tab === "fotos" &&
                (tripPhotos.length === 0 ? (
                  <EmptyState text="Este viaje todavía no tiene fotos. Agregalas desde una entrada." href={newEntryHref} />
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:gap-2">
                    {tripPhotos.map((photo) => (
                      <button key={photo.id} type="button" onClick={() => setOpenPhoto(photo)} className="overflow-hidden rounded-lg sm:rounded-[10px]">
                        <PhotoThumb photo={photo} alt={photo.caption ?? "Foto del viaje"} className="aspect-square transition-transform hover:scale-105" sizes="200px" />
                      </button>
                    ))}
                  </div>
                ))}

              {tab === "lugares" &&
                (tripPlaces.length === 0 ? (
                  <EmptyState text="Todavía no hay lugares en este viaje." href={newEntryHref} />
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="h-[280px] overflow-hidden rounded-2xl lg:hidden">
                      <TravelMap places={tripPlaces} selectedPlaceId={selectedPlaceId} onPlaceClick={(p) => setSelectedPlaceId(p.id)} />
                    </div>
                    <PlaceList places={tripPlaces} selectedPlaceId={selectedPlaceId} onSelect={setSelectedPlaceId} />
                  </div>
                ))}
            </section>

            <aside className="hidden w-[300px] shrink-0 flex-col gap-3.5 lg:flex">
              <div className="grid grid-cols-3 gap-2.5">
                <StatTile value={tripPlaces.length} label="entradas" className="px-3.5 py-3" />
                <StatTile value={tripPhotos.length} label="fotos" className="px-3.5 py-3" />
                <StatTile value={tripLength(trip) ?? "—"} label="días" className="px-3.5 py-3" />
              </div>
              {tripPlaces.length > 0 && (
                <div className="flex flex-col gap-3 rounded-[18px] bg-card p-4">
                  <h2 className="text-[15px] font-bold">Recorrido</h2>
                  <div className="h-[220px] overflow-hidden rounded-xl">
                    <TravelMap places={tripPlaces} selectedPlaceId={selectedPlaceId} onPlaceClick={(p) => setSelectedPlaceId(p.id)} />
                  </div>
                  <PlaceList places={tripPlaces} selectedPlaceId={selectedPlaceId} onSelect={setSelectedPlaceId} compact />
                </div>
              )}
              {expenses > 0 && (
                <div className="flex items-center justify-between rounded-[18px] bg-card p-4 text-sm">
                  <span className="text-muted-foreground">Gastos registrados</span>
                  <span className="font-bold">${formatMoney(expenses)}</span>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>


      {openPhoto && (
        <PhotoDialog
          open
          onOpenChange={(open) => !open && setOpenPhoto(null)}
          photo={openPhoto}
          place={places.find((p) => p.id === openPhoto.place_id)}
          trip={trip}
          onDeleted={async () => {
            setOpenPhoto(null)
            await reload()
          }}
        />
      )}
    </div>
  )
}

function EmptyState({ text, href }: { text: string; href: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[18px] bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild className="rounded-xl font-bold">
        <Link href={href}>
          <Plus aria-hidden />
          Nueva entrada
        </Link>
      </Button>
    </div>
  )
}

function Diary({
  trip,
  places,
  photos,
  onPhotoClick,
  newEntryHref,
}: {
  trip: Trip
  places: Place[]
  photos: PlacePhoto[]
  onPhotoClick: (photo: PlacePhoto) => void
  newEntryHref: string
}) {
  if (places.length === 0) {
    return <EmptyState text="El diario está vacío. Contá qué hiciste el primer día." href={newEntryHref} />
  }

  const days = groupByDay(places)
  return (
    <ol className="flex flex-col gap-4">
      {days.map((day, dayIndex) => (
        <li key={day.date ?? "sin-fecha"} className="flex gap-3.5">
          <div className="flex flex-col items-center gap-1.5 pt-1" aria-hidden>
            <span className={cn("size-3 rounded-full border-2 border-primary", dayIndex === 0 ? "bg-primary" : "bg-card")} />
            {dayIndex < days.length - 1 && <span className="w-0.5 flex-1 bg-border" />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {day.places.map((place) => (
              <EntryCard
                key={place.id}
                trip={trip}
                place={place}
                photos={photos.filter((ph) => ph.place_id === place.id)}
                onPhotoClick={onPhotoClick}
              />
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}

function EntryCard({
  trip,
  place,
  photos,
  onPhotoClick,
}: {
  trip: Trip
  place: Place
  photos: PlacePhoto[]
  onPhotoClick: (photo: PlacePhoto) => void
}) {
  const day = place.visit_date ? dayOfTrip(trip, place.visit_date) : null
  const mood = moodLabel(place.rating)
  const shown = photos.slice(0, 3)
  const extra = photos.length - shown.length

  return (
    <article className="flex flex-col gap-2.5 rounded-[18px] bg-card p-3.5 lg:rounded-[20px] lg:p-[22px]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold tracking-wide text-primary uppercase">
          {place.visit_date
            ? `${day && day > 0 ? `Día ${day} · ` : ""}${formatLongDate(place.visit_date)}`
            : "Sin fecha"}
        </span>
        <Link href={`/dashboard/entries/${place.id}/edit`} className="shrink-0 text-xs font-bold text-muted-foreground hover:text-foreground">
          Editar
        </Link>
      </div>
      <h3 className="font-display text-lg font-bold lg:text-2xl">{place.name}</h3>
      {place.description && (
        <p className="text-sm leading-relaxed whitespace-pre-line lg:text-[15px]">{place.description}</p>
      )}
      {shown.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
          {shown.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => onPhotoClick(photo)}
              className="relative overflow-hidden rounded-[10px] lg:rounded-xl"
              aria-label={i === shown.length - 1 && extra > 0 ? `Ver ${extra} fotos más` : "Ver foto"}
            >
              <PhotoThumb photo={photo} alt={photo.caption ?? place.name} className="aspect-[4/3]" sizes="(max-width: 1024px) 33vw, 240px" />
              {i === shown.length - 1 && extra > 0 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">+{extra}</span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">{CATEGORY_LABELS[place.category]}</span>
        {mood && <span className="rounded-full bg-warm-soft px-2.5 py-1 text-xs text-warm-foreground">{mood}</span>}
        {place.expenses > 0 && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">${formatMoney(place.expenses)}</span>
        )}
      </div>
    </article>
  )
}

function PlaceList({
  places,
  selectedPlaceId,
  onSelect,
  compact = false,
}: {
  places: Place[]
  selectedPlaceId: string | null
  onSelect: (id: string) => void
  compact?: boolean
}) {
  return (
    <ol className={cn("flex flex-col", compact ? "gap-1 text-sm" : "gap-2.5")}>
      {sortByVisit(places).map((place, i) => (
        <li key={place.id}>
          <button
            type="button"
            onClick={() => onSelect(place.id)}
            aria-pressed={place.id === selectedPlaceId}
            className={cn(
              "flex w-full items-center gap-3 text-left transition-colors",
              compact ? "min-h-9 rounded-lg px-2" : "rounded-2xl bg-card p-3.5",
              place.id === selectedPlaceId && (compact ? "bg-accent" : "ring-2 ring-primary"),
            )}
          >
            {!compact && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                {i + 1}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn("truncate", compact ? "font-medium" : "text-[15px] font-bold")}>{place.name}</span>
              {!compact && <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[place.category]}</span>}
            </span>
            {place.visit_date && <span className="shrink-0 text-xs text-muted-foreground">{formatDay(place.visit_date)}</span>}
          </button>
        </li>
      ))}
    </ol>
  )
}
