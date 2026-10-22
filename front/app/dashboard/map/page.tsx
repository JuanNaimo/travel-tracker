"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { MapPin } from "lucide-react"
import type { Place, PlacePhoto, Trip } from "@/lib/api-client"
import { useTravelData } from "@/components/travel-data-provider"
import { NEW_ENTRY_HREF } from "@/components/app-shell"
import { MARKER_COLORS, TravelMap } from "@/components/travel-map"
import { FilterChips } from "@/components/filter-chips"
import { PhotoThumb } from "@/components/photo-thumb"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CATEGORY_LABELS, formatDate, formatDay, plural, sortByVisit, tripStatus } from "@/lib/travel"

type Mode = "all" | "visited" | "upcoming"
const MODES = [
  { value: "all", label: "Todos" },
  { value: "visited", label: "Visitados" },
  { value: "upcoming", label: "Próximos" },
] as const

function MapView() {
  const router = useRouter()
  const params = useSearchParams()
  const { trips, places, photos, loading } = useTravelData()
  const [mode, setMode] = useState<Mode>("all")
  const [tripId, setTripId] = useState("all")
  const [selectedId, setSelectedId] = useState<string | null>(params.get("lugar"))

  const tripOf = (place: Place) => trips.find((t) => t.id === place.trip_id)
  const isUpcoming = (place: Place) => {
    const trip = tripOf(place)
    return !!trip && tripStatus(trip) === "upcoming"
  }

  const shown = sortByVisit(places).filter((place) => {
    if (tripId !== "all" && place.trip_id !== tripId) return false
    if (mode === "visited") return !isUpcoming(place)
    if (mode === "upcoming") return isUpcoming(place)
    return true
  })
  const selected = shown.find((p) => p.id === selectedId) ?? null
  const tripsWithPlaces = new Set(places.map((p) => p.trip_id)).size
  const selectedProps = selected && {
    place: selected,
    trip: tripOf(selected),
    upcoming: isUpcoming(selected),
    photo: photos.find((ph) => ph.place_id === selected.id),
  }

  const addAt = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    const trip = tripId !== "all" ? `&viaje=${tripId}` : ""
    router.push(`${NEW_ENTRY_HREF}?lat=${latitude.toFixed(6)}&lng=${longitude.toFixed(6)}${trip}`)
  }

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterChips label="Mostrar lugares" options={MODES} value={mode} onChange={setMode} tone="ink" />
      {trips.length > 1 && (
        <Select value={tripId} onValueChange={setTripId}>
          <SelectTrigger aria-label="Filtrar por viaje" className="h-9 w-auto rounded-full bg-card text-[13px] font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los viajes</SelectItem>
            {trips.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col lg:gap-5 lg:px-12 lg:pt-7 lg:pb-10">
      <header className="hidden flex-wrap items-end justify-between gap-4 lg:flex">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-[34px] font-bold tracking-tight">Tu mapa</h1>
          <span className="text-[15px] text-muted-foreground">
            {plural(places.length, "lugar", "lugares")} en {plural(tripsWithPlaces, "viaje", "viajes")} · Clic derecho en el mapa para
            agregar una entrada ahí
          </span>
        </div>
        {filters}
      </header>

      <div className="flex h-[calc(100dvh-84px)] flex-col max-lg:-mb-24 lg:h-auto lg:flex-row lg:items-stretch lg:gap-5">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden lg:h-[640px] lg:flex-none lg:basis-0 lg:grow lg:rounded-3xl">
          {!loading && (
            <TravelMap
              places={shown}
              selectedPlaceId={selected?.id}
              markerColor={(p) => (isUpcoming(p) ? MARKER_COLORS.upcoming : MARKER_COLORS.visited)}
              onPlaceClick={(p) => setSelectedId(p.id)}
              onMapClick={addAt}
            />
          )}
          <div className="pointer-events-none absolute inset-x-4 top-4 z-[15] lg:hidden">
            <div className="pointer-events-auto">{filters}</div>
          </div>
          <div className="absolute bottom-4 left-4 z-[15] hidden gap-4 rounded-xl bg-card px-3.5 py-2.5 text-[13px] lg:flex">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full" style={{ background: MARKER_COLORS.visited }} />
              Visitado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full" style={{ background: MARKER_COLORS.upcoming }} />
              Próximo
            </span>
          </div>

        </div>

        {/* En el celular el detalle va en una hoja debajo del mapa */}
        <section className="relative z-[15] flex flex-col gap-3 rounded-t-[26px] bg-card px-5 pt-2.5 pb-4 shadow-[0_-4px_20px_rgba(18,32,27,0.08)] lg:hidden">
            <span className="h-[5px] w-10 self-center rounded-full bg-border" aria-hidden />
            <div className="flex items-baseline justify-between">
              <h1 className="font-display text-xl font-bold">{plural(shown.length, "lugar", "lugares")}</h1>
              <span className="text-[13px] text-muted-foreground">Mantené apretado para agregar</span>
            </div>
            {selectedProps && <SelectedPlace {...selectedProps} compact />}
          </section>

        <aside className="hidden w-[300px] shrink-0 flex-col gap-3.5 lg:flex">
          {selectedProps ? (
            <SelectedPlace {...selectedProps} />
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-[20px] bg-card p-6 text-center text-sm text-muted-foreground">
              <MapPin className="size-10 opacity-50" aria-hidden />
              Elegí un lugar del mapa o de la lista para ver el detalle.
            </div>
          )}
          <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto rounded-[20px] bg-card p-4">
            <h2 className="px-1 pb-1.5 text-[15px] font-bold">Lugares</h2>
            {shown.length === 0 ? (
              <p className="px-1 py-4 text-sm text-muted-foreground">No hay lugares para mostrar.</p>
            ) : (
              shown.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => setSelectedId(place.id)}
                  aria-pressed={place.id === selected?.id}
                  className={cn(
                    "flex min-h-11 items-center justify-between gap-3 rounded-[10px] px-3 text-left text-sm",
                    place.id === selected?.id ? "bg-accent" : "hover:bg-muted",
                  )}
                >
                  <span className="truncate font-bold">{place.name}</span>
                  <span className="shrink-0 text-muted-foreground">{place.visit_date ? formatDay(place.visit_date) : tripOf(place)?.name}</span>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )

}

type SelectedPlaceProps = {
  place: Place
  trip: Trip | undefined
  upcoming: boolean
  photo: PlacePhoto | undefined
  compact?: boolean
}

function SelectedPlace({ place, trip, upcoming, photo, compact = false }: SelectedPlaceProps) {

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-background p-2.5">
        <PhotoThumb photo={photo} alt={place.name} className="size-14 shrink-0 rounded-xl" sizes="56px" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-bold">{place.name}</span>
          <span className="truncate text-[13px] text-muted-foreground">
            {[trip?.name, place.visit_date && formatDate(place.visit_date)].filter(Boolean).join(" · ")}
          </span>
        </div>
        <Button asChild size="sm" className="h-10 rounded-xl px-3.5 font-bold">
          <Link href={`/dashboard/trips/${place.trip_id}`}>Ver</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] bg-card">
      <PhotoThumb photo={photo} alt={place.name} className="h-40" sizes="300px" emptyLabel="Sin fotos" />
      <div className="flex flex-col gap-2 p-[18px]">
        <span className={cn("text-xs font-bold tracking-wide uppercase", upcoming ? "text-warm-foreground" : "text-primary")}>
          {upcoming ? "Próximo" : "Visitado"} · {CATEGORY_LABELS[place.category]}
        </span>
        <span className="font-display text-[22px] font-bold">{place.name}</span>
        <span className="text-sm text-muted-foreground">
          {[trip?.name, place.visit_date && formatDate(place.visit_date)].filter(Boolean).join(" · ")}
        </span>
        {place.description && <p className="line-clamp-3 text-sm">{place.description}</p>}
        <div className="mt-1.5 flex gap-2">
          <Button asChild className="h-11 flex-1 rounded-xl font-bold">
            <Link href={`/dashboard/trips/${place.trip_id}`}>Abrir viaje</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl font-bold">
            <Link href={`/dashboard/entries/${place.id}/edit`}>Editar</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function MapPage() {
  return (
    <Suspense>
      <MapView />
    </Suspense>
  )
}
