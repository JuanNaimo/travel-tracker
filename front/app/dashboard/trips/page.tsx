"use client"

import { useState } from "react"
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react"
import { useTravelData } from "@/components/travel-data-provider"
import { PageContainer } from "@/components/app-shell"
import { DepartureBoard } from "@/components/departure-board"
import { FilterChips } from "@/components/filter-chips"
import { SplitFlap } from "@/components/split-flap"
import { TripFormDialog } from "@/components/trip-form-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { plural, sortTrips, tripStatus, tripYear } from "@/lib/travel"

export default function TripsPage() {
  const { trips, places, photos, loading, reload } = useTravelData()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")

  // Filtros: todos, en curso/próximos, y un chip por año con viajes
  const years = [...new Set(trips.map(tripYear).filter((y): y is string => !!y))].sort().reverse()
  const filters = [
    { value: "all", label: "Todos" },
    ...(trips.some((t) => tripStatus(t) !== "past") ? [{ value: "pending", label: "Por volar" }] : []),
    ...years.slice(0, 4).map((y) => ({ value: y, label: y })),
  ]

  const q = query.trim().toLocaleLowerCase("es")
  const shown = sortTrips(trips).filter((trip) => {
    if (filter === "pending" && tripStatus(trip) === "past") return false
    if (/^\d{4}$/.test(filter) && tripYear(trip) !== filter) return false
    if (!q) return true
    const tripPlaces = places.filter((p) => p.trip_id === trip.id).map((p) => p.name)
    return [trip.name, trip.description ?? "", ...tripPlaces].some((text) => text.toLocaleLowerCase("es").includes(q))
  })

  return (
    <PageContainer className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="label-mono text-muted-foreground">{plural(trips.length, "viaje", "viajes")} registrados</span>
          <h1 className="title-board text-[54px] lg:text-[72px]">
            <SplitFlap text="MIS VIAJES" />
          </h1>
        </div>
        <TripFormDialog
          onSaved={reload}
          trigger={
            <Button className="h-11 rounded-xl font-bold max-sm:size-11 max-sm:p-0" aria-label="Nuevo viaje">
              <PlusIcon aria-hidden className="size-5" />
              <span className="max-sm:hidden">Nuevo viaje</span>
            </Button>
          }
        />
      </header>

      <label className="flex h-12 items-center gap-2.5 rounded-xl border bg-card px-3.5 text-muted-foreground focus-within:border-ring lg:max-w-md">
        <MagnifyingGlassIcon className="size-[18px]" aria-hidden />
        <span className="sr-only">Buscar viajes</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar destino o lugar"
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      {filters.length > 1 && <FilterChips label="Filtrar viajes" options={filters} value={filter} onChange={setFilter} />}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="label-mono rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          {trips.length === 0 ? "Todavía no hay viajes. Creá el primero con el botón de arriba." : "Ningún viaje coincide con la búsqueda"}
        </p>
      ) : (
        <DepartureBoard trips={shown} places={places} photos={photos} withCovers />
      )}
    </PageContainer>
  )
}
