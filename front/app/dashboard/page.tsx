"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { differenceInCalendarDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { MapPin, Plane, Plus } from "lucide-react"
import type { Place, PlacePhoto, Trip } from "@/lib/api-client"
import { useTravelData } from "@/components/travel-data-provider"
import { PageContainer, NEW_ENTRY_HREF } from "@/components/app-shell"
import { StatTile } from "@/components/stat-tile"
import { TripCard } from "@/components/trip-card"
import { PhotoThumb } from "@/components/photo-thumb"
import { FilterChips } from "@/components/filter-chips"
import { TripFormDialog } from "@/components/trip-form-dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  currentTrip,
  dayOfTrip,
  daysTraveled,
  formatDay,
  nextTrip,
  parseDay,
  plural,
  sortByVisit,
  sortTrips,
  tripCover,
  tripLength,
  tripStatus,
} from "@/lib/travel"

type Filter = "all" | "ongoing" | "upcoming" | "past"

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "ongoing", label: "En curso" },
  { value: "upcoming", label: "Próximos" },
  { value: "past", label: "Terminados" },
] as const

export default function HomePage() {
  const { user, trips, places, photos, loading, reload } = useTravelData()
  const [filter, setFilter] = useState<Filter>("all")
  const today = useMemo(() => new Date(), [])

  const active = currentTrip(trips, today)
  const upcoming = nextTrip(trips, today)
  const recentPhotos = useMemo(() => [...photos].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 3), [photos])
  const shownTrips = sortTrips(trips).filter((t) => filter === "all" || tripStatus(t, today) === filter)
  const placesOf = (tripId: string) => places.filter((p) => p.trip_id === tripId)

  const greetingName = user?.email.split("@")[0]

  return (
    <PageContainer className="flex flex-col gap-6 lg:gap-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-muted-foreground lg:text-sm">
            {format(today, "EEEE, d 'de' MMMM", { locale: es }).replace(/^./, (c) => c.toUpperCase())}
          </span>
          <h1 className="font-display text-[28px] font-bold tracking-tight lg:text-[34px]">
            Hola{greetingName ? `, ${greetingName}` : ""}
          </h1>
        </div>
        <TripFormDialog
          onSaved={reload}
          trigger={
            <Button variant="outline" className="h-11 rounded-xl bg-card font-bold">
              <Plus aria-hidden />
              Nuevo viaje
            </Button>
          }
        />
      </header>

      {loading ? (
        <Skeleton className="h-[280px] rounded-3xl" />
      ) : active ? (
        <ActiveTripCard
          trip={active}
          cover={tripCover(active.id, places, photos)}
          entries={placesOf(active.id)}
          today={today}
        />
      ) : trips.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl bg-card px-6 py-12 text-center">
          <MapPin className="size-12 text-muted-foreground" aria-hidden />
          <h2 className="font-display text-xl font-bold">Todavía no cargaste ningún viaje</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Creá tu primer viaje y empezá a llenar su diario con lugares, fotos y lo que pasó cada día.
          </p>
          <TripFormDialog onSaved={reload} trigger={<Button className="mt-2 h-11 rounded-xl font-bold">Crear mi primer viaje</Button>} />
        </section>
      ) : null}

      <section aria-label="Resumen" className="grid grid-cols-3 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
        <StatTile value={trips.length} label={trips.length === 1 ? "viaje" : "viajes"} />
        <StatTile value={places.length} label={places.length === 1 ? "lugar" : "lugares"} />
        <StatTile value={daysTraveled(trips, today)} label="días de viaje" />
        <StatTile value={photos.length} label="fotos guardadas" className="hidden lg:flex" />
      </section>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold lg:text-[22px]">Mis viajes</h2>
            <FilterChips label="Filtrar viajes" options={FILTERS} value={filter} onChange={setFilter} />
          </div>
          {loading ? (
            <div className="grid gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[104px] rounded-[18px] sm:h-[220px]" />
              ))}
            </div>
          ) : shownTrips.length === 0 ? (
            <p className="rounded-[18px] bg-card p-6 text-center text-sm text-muted-foreground">
              {trips.length === 0 ? "Acá van a aparecer tus viajes." : "No hay viajes con este filtro."}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-3.5">
              {shownTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} cover={tripCover(trip.id, places, photos)} placesCount={placesOf(trip.id).length} />
              ))}
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-3.5 lg:w-[300px] lg:shrink-0">
          {upcoming && (
            <Link href={`/dashboard/trips/${upcoming.id}`} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 hover:shadow-md">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-warm-soft text-warm">
                <Plane className="size-5" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  Próximo viaje
                  {upcoming.start_date &&
                    ` · en ${plural(differenceInCalendarDays(parseDay(upcoming.start_date), today), "día", "días")}`}
                </span>
                <span className="truncate text-[15px] font-bold">
                  {upcoming.name}
                  {upcoming.start_date && ` · ${formatDay(upcoming.start_date)}`}
                </span>
              </span>
            </Link>
          )}

          {recentPhotos.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-bold">Recuerdos recientes</h2>
                <Link href="/dashboard/photos" className="text-[13px] font-bold text-primary">
                  Ver todo
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {recentPhotos.map((photo) => {
                  const place = places.find((p) => p.id === photo.place_id)
                  return (
                    <Link key={photo.id} href={`/dashboard/photos?foto=${photo.id}`} className="flex flex-col gap-1.5">
                      <PhotoThumb photo={photo} alt={place?.name ?? "Foto"} className="aspect-square rounded-xl" sizes="100px" />
                      <span className="truncate text-xs text-muted-foreground">{photo.caption ?? place?.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          <Link
            href="/dashboard/map"
            className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3.5 text-sm font-bold hover:shadow-md"
          >
            <span className="flex items-center gap-2.5">
              <MapPin className="size-5 text-primary" aria-hidden />
              Ver mis {plural(places.length, "lugar", "lugares")} en el mapa
            </span>
          </Link>
        </aside>
      </div>
    </PageContainer>
  )
}

function ActiveTripCard({
  trip,
  cover,
  entries,
  today,
}: {
  trip: Trip
  cover: PlacePhoto | null
  entries: Place[]
  today: Date
}) {
  const day = dayOfTrip(trip, today) ?? 1
  const length = tripLength(trip) ?? 1
  const last = sortByVisit(entries).at(-1)

  return (
    <section className="grid overflow-hidden rounded-[22px] bg-card md:grid-cols-2 lg:rounded-3xl">
      <div className="relative">
        <PhotoThumb photo={cover} alt={trip.name} className="h-[150px] md:h-full md:min-h-[280px]" sizes="(max-width: 768px) 100vw, 50vw" emptyLabel="Sin foto de portada" />
        <span className="absolute top-3 left-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold tracking-wide text-primary-foreground uppercase lg:top-4 lg:left-4">
          En curso
        </span>
      </div>
      <div className="flex flex-col justify-center gap-3 p-4 lg:gap-4 lg:p-7">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-muted-foreground">
            Día {day} de {length}
            {last && ` · ${last.name}`}
          </span>
          <Link href={`/dashboard/trips/${trip.id}`} className="font-display text-xl font-bold tracking-tight lg:text-[30px]">
            {trip.name}
          </Link>
        </div>
        {last && (
          <p className="hidden text-[15px] leading-relaxed text-muted-foreground lg:block">
            Última entrada: «{last.name}»
            {last.visit_date && `, ${formatDay(last.visit_date)}`}. {plural(entries.length, "entrada", "entradas")} hasta ahora.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <Progress value={(Math.min(day, length) / length) * 100} aria-label="Progreso del viaje" className="h-1.5 lg:h-2" />
          {trip.start_date && trip.end_date && (
            <div className="hidden justify-between text-xs text-muted-foreground lg:flex">
              <span>{formatDay(trip.start_date)}</span>
              <span>{formatDay(trip.end_date)}</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button asChild className="h-[46px] flex-1 rounded-[14px] text-[15px] font-bold lg:flex-none lg:px-5">
            <Link href={`${NEW_ENTRY_HREF}?viaje=${trip.id}`}>
              <Plus aria-hidden />
              Agregar entrada de hoy
            </Link>
          </Button>
          <Button asChild variant="outline" className="hidden h-[46px] rounded-[14px] px-5 text-[15px] font-bold lg:inline-flex">
            <Link href={`/dashboard/trips/${trip.id}`}>Ver diario</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
