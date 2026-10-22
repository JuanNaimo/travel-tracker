"use client"

import { useState } from "react"
import { Plus, Search } from "lucide-react"
import { useTravelData } from "@/components/travel-data-provider"
import { PageContainer } from "@/components/app-shell"
import { TripCard } from "@/components/trip-card"
import { FilterChips } from "@/components/filter-chips"
import { TripFormDialog } from "@/components/trip-form-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { sortTrips, tripCover, tripStatus, tripYear } from "@/lib/travel"

export default function TripsPage() {
  const { trips, places, photos, loading, reload } = useTravelData()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")

  // Filtros: todos, en curso/próximos, y un chip por año con viajes
  const years = [...new Set(trips.map(tripYear).filter((y): y is string => !!y))].sort().reverse()
  const filters = [
    { value: "all", label: "Todos" },
    ...(trips.some((t) => tripStatus(t) !== "past") ? [{ value: "pending", label: "En curso y próximos" }] : []),
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
    <PageContainer className="flex flex-col gap-4 lg:gap-5">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[28px] font-bold tracking-tight lg:text-[34px]">Mis viajes</h1>
        <TripFormDialog
          onSaved={reload}
          trigger={
            <Button className="h-11 rounded-xl font-bold max-sm:size-11 max-sm:p-0" aria-label="Nuevo viaje">
              <Plus aria-hidden className="size-5" />
              <span className="max-sm:hidden">Nuevo viaje</span>
            </Button>
          }
        />
      </header>

      <label className="flex h-[46px] items-center gap-2.5 rounded-[14px] border bg-card px-3.5 text-muted-foreground lg:max-w-md">
        <Search className="size-[18px]" aria-hidden />
        <span className="sr-only">Buscar viajes</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por viaje o lugar"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      {filters.length > 1 && <FilterChips label="Filtrar viajes" options={filters} value={filter} onChange={setFilter} />}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[104px] rounded-[18px] sm:h-[220px]" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-[18px] bg-card p-8 text-center text-sm text-muted-foreground">
          {trips.length === 0 ? "Todavía no tenés viajes. Creá el primero con el botón de arriba." : "No encontramos viajes con esa búsqueda."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-3.5">
          {shown.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              cover={tripCover(trip.id, places, photos)}
              placesCount={places.filter((p) => p.trip_id === trip.id).length}
            />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
