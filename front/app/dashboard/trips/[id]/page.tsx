"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { AnimatePresence, m } from "motion/react"
import { ArrowLeftIcon, PencilSimpleIcon, PlusIcon, ShareNetworkIcon, TrashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { db, type Place, type PlacePhoto, type Trip } from "@/lib/api-client"
import { useTravelData } from "@/components/travel-data-provider"
import { NEW_ENTRY_HREF } from "@/components/app-shell"
import { BoardingPass } from "@/components/boarding-pass"
import { PhotoThumb } from "@/components/photo-thumb"
import { PhotoDialog } from "@/components/photo-details"
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
  placeCode,
  plural,
  sortByVisit,
  tripCover,
} from "@/lib/travel"

type Tab = "diario" | "fotos" | "lugares"
const TABS: { value: Tab; label: string }[] = [
  { value: "diario", label: "Bitácora" },
  { value: "fotos", label: "Fotos" },
  { value: "lugares", label: "Escalas" },
]

const pad = (n: number) => String(n).padStart(2, "0")

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
      <div className="mx-auto max-w-[1120px] space-y-4 p-[18px] lg:p-12">
        <Skeleton className="h-[300px] rounded-2xl" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40" />
      </div>
    )
  }
  if (!trip) {
    return (
      <div className="flex flex-col items-center gap-3 p-12 text-center">
        <h1 className="title-board text-4xl">Vuelo no encontrado</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/trips">Volver a mis viajes</Link>
        </Button>
      </div>
    )
  }

  const tripPlaces = places.filter((p) => p.trip_id === trip.id)
  const placeIds = new Set(tripPlaces.map((p) => p.id))
  const tripPhotos = photos.filter((ph) => placeIds.has(ph.place_id))
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

  return (
    <div className="mx-auto w-full max-w-[1120px] px-[18px] pt-5 pb-10 sm:px-6 lg:px-12 lg:pt-8">
      <Link href="/dashboard/trips" className="label-mono mb-4 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Mis viajes
      </Link>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5">
          <header className="flex flex-col gap-3">
            <h1 className="title-board text-[48px] lg:text-[64px]">{trip.name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground uppercase">
              {formatTripDates(trip) && <span>{formatTripDates(trip)}</span>}
              {expenses > 0 && <span>Gastos ${formatMoney(expenses)}</span>}
              {trip.rating && <StarRating rating={trip.rating} size="sm" />}
            </div>
            {trip.description && <p className="max-w-2xl text-[15px] leading-relaxed">{trip.description}</p>}
          </header>

          <div className="lg:hidden">
            <BoardingPass trip={trip} places={places} photoCount={tripPhotos.length} cover={tripCover(trip.id, places, photos)} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild className="h-11 rounded-xl font-bold max-sm:flex-1">
              <Link href={newEntryHref}>
                <PlusIcon aria-hidden />
                Nueva entrada
              </Link>
            </Button>
            <Button variant="outline" className="h-11 rounded-xl bg-card" onClick={handleShare} aria-label="Compartir">
              <ShareNetworkIcon aria-hidden />
              <span className="max-sm:hidden">Compartir</span>
            </Button>
            <TripFormDialog
              trip={trip}
              onSaved={reload}
              trigger={
                <Button variant="outline" className="h-11 rounded-xl bg-card" aria-label="Editar viaje">
                  <PencilSimpleIcon aria-hidden />
                  <span className="max-sm:hidden">Editar</span>
                </Button>
              }
            />
            <ConfirmButton
              title={`¿Eliminar "${trip.name}"?`}
              description={`Se borran también ${plural(tripPlaces.length, "entrada", "entradas")} y ${plural(tripPhotos.length, "foto", "fotos")}. No se puede deshacer.`}
              confirmLabel="Eliminar viaje"
              onConfirm={handleDelete}
            >
              <Button variant="outline" className="h-11 rounded-xl bg-card text-destructive hover:text-destructive" aria-label="Eliminar viaje">
                <TrashIcon aria-hidden />
              </Button>
            </ConfirmButton>
          </div>

          <div role="tablist" aria-label="Secciones del viaje" className="flex gap-6 border-b">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "relative pb-3 font-mono text-xs font-semibold tracking-wider uppercase transition-colors",
                  tab === t.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {tab === t.value && <m.span layoutId="trip-tab" className="absolute inset-x-0 -bottom-px h-[3px] bg-signal" />}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <m.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              {tab === "diario" && <Diary trip={trip} places={tripPlaces} photos={tripPhotos} onPhotoClick={setOpenPhoto} newEntryHref={newEntryHref} />}

              {tab === "fotos" &&
                (tripPhotos.length === 0 ? (
                  <EmptyState text="Este viaje todavía no tiene fotos. Agregalas desde una entrada." href={newEntryHref} />
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] sm:gap-2">
                    {tripPhotos.map((photo, i) => (
                      <m.button
                        key={photo.id}
                        type="button"
                        onClick={() => setOpenPhoto(photo)}
                        aria-label="Ver foto"
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: Math.min(i, 12) * 0.03 }}
                        className="overflow-hidden rounded-md"
                      >
                        <PhotoThumb photo={photo} alt="" className="aspect-square transition-transform hover:scale-105" sizes="200px" />
                      </m.button>
                    ))}
                  </div>
                ))}

              {tab === "lugares" &&
                (tripPlaces.length === 0 ? (
                  <EmptyState text="Todavía no hay escalas en este viaje." href={newEntryHref} />
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="h-[280px] overflow-hidden rounded-xl border lg:h-[360px]">
                      <TravelMap places={tripPlaces} selectedPlaceId={selectedPlaceId} onPlaceClick={(p) => setSelectedPlaceId(p.id)} />
                    </div>
                    <Itinerary places={tripPlaces} selectedPlaceId={selectedPlaceId} onSelect={setSelectedPlaceId} />
                  </div>
                ))}
            </m.div>
          </AnimatePresence>
        </div>

        <aside className="hidden flex-col gap-4 lg:sticky lg:top-8 lg:flex">
          <BoardingPass trip={trip} places={places} photoCount={tripPhotos.length} cover={tripCover(trip.id, places, photos)} />
          {tripPlaces.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <h2 className="label-mono text-muted-foreground">Escalas</h2>
              <Itinerary places={tripPlaces} selectedPlaceId={selectedPlaceId} onSelect={(id) => {
                setSelectedPlaceId(id)
                setTab("lugares")
              }} compact />
            </div>
          )}
        </aside>
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
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
      <p className="label-mono text-muted-foreground">{text}</p>
      <Button asChild className="rounded-xl font-bold">
        <Link href={href}>
          <PlusIcon aria-hidden />
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
    return <EmptyState text="La bitácora está vacía. Contá qué hiciste el primer día." href={newEntryHref} />
  }

  return (
    <ol className="flex flex-col">
      {groupByDay(places).map((day, dayIndex) => {
        const number = day.date ? dayOfTrip(trip, day.date) : null
        return (
          <m.li
            key={day.date ?? "sin-fecha"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(dayIndex, 6) * 0.06 }}
            className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 border-t py-5 first:border-t-0 first:pt-1 sm:grid-cols-[72px_minmax(0,1fr)]"
          >
            <div className="flex flex-col font-mono">
              <span className="text-[10px] text-muted-foreground">DÍA</span>
              <span className="font-display text-[34px] leading-none text-signal-text">{number && number > 0 ? pad(number) : "—"}</span>
              {day.date && <span className="mt-1 text-[10px] text-muted-foreground uppercase">{formatDay(day.date)}</span>}
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              {day.places.map((place) => (
                <EntryCard key={place.id} place={place} photos={photos.filter((ph) => ph.place_id === place.id)} onPhotoClick={onPhotoClick} />
              ))}
            </div>
          </m.li>
        )
      })}
    </ol>
  )
}

function EntryCard({ place, photos, onPhotoClick }: { place: Place; photos: PlacePhoto[]; onPhotoClick: (photo: PlacePhoto) => void }) {
  const mood = moodLabel(place.rating)
  const shown = photos.slice(0, 3)
  const extra = photos.length - shown.length

  return (
    <article className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="label-mono text-[10px] text-muted-foreground">
            {placeCode(place.name)} · {place.visit_date ? formatLongDate(place.visit_date) : "Sin fecha"}
          </span>
          <h3 className="text-xl leading-tight font-bold lg:text-2xl">{place.name}</h3>
        </div>
        <Link
          href={`/dashboard/entries/${place.id}/edit`}
          aria-label={`Editar ${place.name}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <PencilSimpleIcon className="size-4" aria-hidden />
        </Link>
      </div>
      {place.description && <p className="text-[15px] leading-relaxed whitespace-pre-line">{place.description}</p>}
      {shown.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {shown.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => onPhotoClick(photo)}
              className="relative overflow-hidden rounded-md"
              aria-label={i === shown.length - 1 && extra > 0 ? `Ver ${extra} fotos más` : "Ver foto"}
            >
              <PhotoThumb photo={photo} alt={photo.caption ?? place.name} className="aspect-[4/3] transition-transform hover:scale-105" sizes="(max-width: 1024px) 33vw, 240px" />
              {i === shown.length - 1 && extra > 0 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-mono text-sm font-bold text-white">+{extra}</span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 font-mono text-[11px] uppercase">
        <span className="rounded-[4px] border px-2 py-0.5">{CATEGORY_LABELS[place.category]}</span>
        {mood && <span className="rounded-[4px] bg-signal px-2 py-0.5 font-semibold text-signal-foreground">{mood}</span>}
        {place.expenses > 0 && <span className="rounded-[4px] border px-2 py-0.5 text-muted-foreground">${formatMoney(place.expenses)}</span>}
      </div>
    </article>
  )
}

function Itinerary({
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
    <ol className="flex flex-col font-mono">
      {sortByVisit(places).map((place, i, list) => (
        <li key={place.id} className="relative">
          {/* Línea de ruta entre escalas */}
          {i < list.length - 1 && <span className="absolute top-7 left-[13px] h-[calc(100%-12px)] border-l-2 border-dotted border-muted-foreground/50" aria-hidden />}
          <button
            type="button"
            onClick={() => onSelect(place.id)}
            aria-pressed={place.id === selectedPlaceId}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg py-2 pr-2 text-left transition-colors hover:bg-muted",
              place.id === selectedPlaceId && "bg-muted",
            )}
          >
            <span
              className={cn(
                "relative flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                place.id === selectedPlaceId ? "border-signal bg-signal text-signal-foreground" : "bg-background",
              )}
            >
              {pad(i + 1)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn("truncate font-sans font-bold", compact ? "text-sm" : "text-[15px]")}>{place.name}</span>
              {!compact && <span className="text-[11px] text-muted-foreground uppercase">{CATEGORY_LABELS[place.category]}</span>}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground uppercase">{place.visit_date ? formatDay(place.visit_date) : "—"}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}
