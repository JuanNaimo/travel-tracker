"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, m } from "motion/react"
import { MapPinAreaIcon } from "@phosphor-icons/react"
import type { Place, PlacePhoto, Trip } from "@/lib/api-client"
import { useTravelData } from "@/components/travel-data-provider"
import { NEW_ENTRY_HREF } from "@/components/app-shell"
import { MARKER_COLORS, TravelMap } from "@/components/travel-map"
import { FilterChips } from "@/components/filter-chips"
import { PhotoThumb } from "@/components/photo-thumb"
import { SplitFlap } from "@/components/split-flap"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CATEGORY_LABELS, formatDate, formatDay, placeCode, plural, sortByVisit, tripStatus } from "@/lib/travel"

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
    <div className="flex flex-wrap items-center gap-1.5">
      <FilterChips label="Mostrar lugares" options={MODES} value={mode} onChange={setMode} />
      {trips.length > 1 && (
        <Select value={tripId} onValueChange={setTripId}>
          <SelectTrigger aria-label="Filtrar por viaje" className="h-9 w-auto rounded-md bg-card font-mono dark:bg-card text-[11px] font-semibold tracking-wider uppercase">
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
    <div className="mx-auto flex w-full max-w-[1120px] flex-col lg:gap-5 lg:px-12 lg:pt-9 lg:pb-10">
      <header className="hidden flex-wrap items-end justify-between gap-4 lg:flex">
        <div className="flex flex-col gap-2">
          <span className="label-mono text-muted-foreground">
            {plural(places.length, "lugar", "lugares")} · {plural(tripsWithPlaces, "viaje", "viajes")} · clic derecho para agregar
          </span>
          <h1 className="title-board text-[72px]">
            <SplitFlap text="TU MAPA" />
          </h1>
        </div>
        {filters}
      </header>

      <div className="flex h-[calc(100dvh-6rem)] flex-col max-lg:-mb-28 lg:h-auto lg:flex-row lg:items-stretch lg:gap-5">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden lg:h-[640px] lg:flex-none lg:grow lg:basis-0 lg:rounded-2xl lg:border">
          {!loading && (
            <TravelMap
              places={shown}
              selectedPlaceId={selected?.id}
              markerColor={(p) => (isUpcoming(p) ? MARKER_COLORS.upcoming : MARKER_COLORS.visited)}
              onPlaceClick={(p) => setSelectedId(p.id)}
              onMapClick={addAt}
            />
          )}
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[15] lg:hidden">
            <div className="pointer-events-auto">{filters}</div>
          </div>
          <div className="label-mono absolute bottom-4 left-4 z-[15] hidden gap-4 rounded-lg bg-[#1c1d21] px-3.5 py-2.5 text-[#f5f5f0] lg:flex">
            <span className="flex items-center gap-2">
              <span className="size-3 rotate-45 rounded-[3px] border-2 border-[#ffc72c]" style={{ background: MARKER_COLORS.visited }} />
              Visitado
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rotate-45 rounded-[3px]" style={{ background: MARKER_COLORS.upcoming }} />
              Próximo
            </span>
          </div>
        </div>

        {/* En el celular el detalle va en una hoja debajo del mapa, por encima de la barra de navegación */}
        <section className="relative z-[15] flex flex-col gap-3 rounded-t-[22px] bg-card px-[18px] pt-2.5 pb-24 lg:hidden">
          <span className="h-[5px] w-10 self-center rounded-full bg-border" aria-hidden />
          <div className="flex items-baseline justify-between">
            <h1 className="title-board text-3xl">{plural(shown.length, "lugar", "lugares")}</h1>
            <span className="label-mono text-[10px] text-muted-foreground">Mantené apretado para agregar</span>
          </div>
          {!selectedProps && <p className="label-mono text-[10px] text-muted-foreground">Tocá un avión para ver el lugar</p>}
          <AnimatePresence mode="wait">
            {selectedProps && (
              <m.div key={selectedProps.place.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                <SelectedPlace {...selectedProps} compact />
              </m.div>
            )}
          </AnimatePresence>
        </section>

        <aside className="hidden w-[300px] shrink-0 flex-col gap-4 lg:flex">
          <AnimatePresence mode="wait">
            {selectedProps ? (
              <m.div key={selectedProps.place.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <SelectedPlace {...selectedProps} />
              </m.div>
            ) : (
              <m.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center">
                <MapPinAreaIcon className="size-10 text-muted-foreground" aria-hidden />
                <span className="label-mono text-muted-foreground">Elegí un lugar del mapa o de la lista</span>
              </m.div>
            )}
          </AnimatePresence>
          <div className="flex max-h-[420px] flex-col overflow-y-auto rounded-xl border bg-card p-3">
            <h2 className="label-mono px-2 pb-2 text-muted-foreground">Lugares</h2>
            {shown.length === 0 ? (
              <p className="label-mono px-2 py-4 text-muted-foreground">Nada para mostrar</p>
            ) : (
              shown.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => setSelectedId(place.id)}
                  aria-pressed={place.id === selected?.id}
                  className={cn(
                    "grid min-h-11 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 text-left font-mono text-[11px]",
                    place.id === selected?.id ? "bg-signal text-signal-foreground" : "hover:bg-muted",
                  )}
                >
                  <span className="font-bold">{placeCode(place.name)}</span>
                  <span className="truncate font-sans text-sm font-bold">{place.name}</span>
                  <span className={cn("uppercase", place.id !== selected?.id && "text-muted-foreground")}>
                    {place.visit_date ? formatDay(place.visit_date) : "—"}
                  </span>
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
  const meta = [trip?.name, place.visit_date && formatDate(place.visit_date)].filter(Boolean).join(" · ")

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-background p-2.5">
        <PhotoThumb photo={photo} alt={place.name} className="size-14 shrink-0 rounded-lg" sizes="56px" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-bold">{place.name}</span>
          <span className="label-mono truncate text-[10px] text-muted-foreground">{meta}</span>
        </div>
        <Button asChild size="sm" className="h-10 rounded-lg px-3.5 font-bold">
          <Link href={`/dashboard/trips/${place.trip_id}`}>Ver</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-ticket text-ticket-foreground">
      <PhotoThumb photo={photo} alt={place.name} className="h-40" sizes="300px" emptyLabel="Sin fotos" />
      <div className="flex flex-col gap-2 p-4">
        <span className="flex items-center justify-between font-mono text-[10px] text-ticket-muted uppercase">
          <span>{CATEGORY_LABELS[place.category]}</span>
          <span className={cn("rounded-[3px] px-1.5 py-0.5 font-bold", upcoming ? "bg-signal text-signal-foreground" : "bg-ticket-foreground text-ticket")}>
            {upcoming ? "Próximo" : "Visitado"}
          </span>
        </span>
        <span className="font-display text-[34px] leading-none">{placeCode(place.name)}</span>
        <span className="text-lg leading-tight font-bold">{place.name}</span>
        <span className="font-mono text-[11px] text-ticket-muted uppercase">{meta}</span>
        {place.description && <p className="line-clamp-3 text-sm">{place.description}</p>}
        <div className="mt-1.5 flex gap-2">
          <Link
            href={`/dashboard/trips/${place.trip_id}`}
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-ticket-foreground text-sm font-bold text-ticket"
          >
            Abrir viaje
          </Link>
          <Link
            href={`/dashboard/entries/${place.id}/edit`}
            className="flex h-11 items-center justify-center rounded-lg border border-ticket-foreground/30 px-4 text-sm font-bold"
          >
            Editar
          </Link>
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
