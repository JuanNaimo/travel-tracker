"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { differenceInCalendarDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { m } from "motion/react"
import { AirplaneTakeoffIcon, ArrowRightIcon, MapTrifoldIcon, PlusIcon } from "@phosphor-icons/react"
import { useTravelData } from "@/components/travel-data-provider"
import { PageContainer, NEW_ENTRY_HREF } from "@/components/app-shell"
import { StatTile } from "@/components/stat-tile"
import { BoardingPass } from "@/components/boarding-pass"
import { DepartureBoard } from "@/components/departure-board"
import { PhotoThumb } from "@/components/photo-thumb"
import { FilterChips } from "@/components/filter-chips"
import { SplitFlap } from "@/components/split-flap"
import { TripFormDialog } from "@/components/trip-form-dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { currentTrip, daysTraveled, formatDay, nextTrip, parseDay, plural, sortTrips, tripCover, tripStatus } from "@/lib/travel"

type Filter = "all" | "ongoing" | "upcoming" | "past"

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "ongoing", label: "En vuelo" },
  { value: "upcoming", label: "Embarque" },
  { value: "past", label: "Aterrizó" },
] as const

export default function HomePage() {
  const { trips, places, photos, loading, reload } = useTravelData()
  const [filter, setFilter] = useState<Filter>("all")
  const today = useMemo(() => new Date(), [])

  const active = currentTrip(trips, today)
  const upcoming = nextTrip(trips, today)
  const featured = active ?? upcoming
  const recentPhotos = useMemo(() => [...photos].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 4), [photos])
  const shownTrips = sortTrips(trips).filter((t) => filter === "all" || tripStatus(t, today) === filter)
  const photosOf = (tripId: string) => {
    const ids = new Set(places.filter((p) => p.trip_id === tripId).map((p) => p.id))
    return photos.filter((ph) => ids.has(ph.place_id)).length
  }

  return (
    <PageContainer className="flex flex-col gap-6 lg:gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="label-mono flex items-center gap-2 text-muted-foreground">
            {format(today, "EEE d MMM", { locale: es })}
            {active && (
              <span className="flex items-center gap-1.5 font-semibold text-signal-text">
                <span className="size-1.5 animate-pulse rounded-full bg-signal" />
                En viaje
              </span>
            )}
          </span>
          <h1 className="title-board text-[54px] lg:text-[72px]">
            <span className="block">Tus</span>
            <SplitFlap text="SALIDAS" className="text-signal-text" />
          </h1>
        </div>
        <TripFormDialog
          onSaved={reload}
          trigger={
            <Button variant="outline" className="h-11 rounded-xl bg-card font-mono text-xs font-semibold tracking-wider uppercase">
              <PlusIcon aria-hidden />
              Nuevo viaje
            </Button>
          }
        />
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <section className="flex flex-col gap-3.5" aria-label={active ? "Viaje en curso" : "Próximo viaje"}>
          {loading ? (
            <Skeleton className="h-[290px] rounded-2xl" />
          ) : featured ? (
            <>
              <BoardingPass
                trip={featured}
                places={places}
                photoCount={photosOf(featured.id)}
                cover={tripCover(featured.id, places, photos)}
                href={`/dashboard/trips/${featured.id}`}
              />
              <m.div whileTap={{ scale: 0.98 }}>
                <Link
                  href={`${NEW_ENTRY_HREF}?viaje=${featured.id}`}
                  className="flex h-[52px] items-center justify-between rounded-xl bg-signal px-[18px] text-[15px] font-bold text-signal-foreground"
                >
                  {active ? "Registrar el día de hoy" : "Agregar una entrada"}
                  <ArrowRightIcon className="size-5" aria-hidden />
                </Link>
              </m.div>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed p-6">
              <AirplaneTakeoffIcon className="size-9 text-signal-text" aria-hidden />
              <h2 className="title-board text-3xl">Sin vuelos programados</h2>
              <p className="text-sm text-muted-foreground">
                {trips.length === 0
                  ? "Creá tu primer viaje y empezá a llenar su diario con lugares, fotos y lo que pasó cada día."
                  : "No tenés viajes en curso ni próximos. Planeá el siguiente."}
              </p>
              <TripFormDialog onSaved={reload} trigger={<Button className="mt-1 h-11 rounded-xl font-bold">Crear viaje</Button>} />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <StatTile value={trips.length} label="Viajes" />
            <StatTile value={places.length} label="Lugares" />
            <StatTile value={daysTraveled(trips, today)} label="Días fuera" />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="title-board text-2xl">Tablero</h2>
            <FilterChips label="Filtrar viajes" options={FILTERS} value={filter} onChange={setFilter} />
          </div>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : shownTrips.length === 0 ? (
            <p className="label-mono rounded-xl border border-dashed p-6 text-center text-muted-foreground">
              {trips.length === 0 ? "Sin viajes en el tablero" : "Ningún viaje con este estado"}
            </p>
          ) : (
            <DepartureBoard trips={shownTrips} places={places} photos={photos} />
          )}

          {upcoming && active && (
            <Link href={`/dashboard/trips/${upcoming.id}`} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted">
              <AirplaneTakeoffIcon className="size-6 shrink-0 text-signal-text" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="label-mono text-[10px] text-muted-foreground">
                  Próxima salida
                  {upcoming.start_date && ` · en ${plural(differenceInCalendarDays(parseDay(upcoming.start_date), today), "día", "días")}`}
                </span>
                <span className="truncate font-bold">
                  {upcoming.name}
                  {upcoming.start_date && ` · ${formatDay(upcoming.start_date)}`}
                </span>
              </span>
            </Link>
          )}

          {recentPhotos.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between">
                <h2 className="label-mono text-muted-foreground">Últimas fotos</h2>
                <Link href="/dashboard/photos" className="label-mono font-semibold text-signal-text">
                  Ver todas
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {recentPhotos.map((photo, i) => (
                  <m.div key={photo.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.05 }}>
                    <Link href={`/dashboard/photos?foto=${photo.id}`} aria-label="Ver foto">
                      <PhotoThumb photo={photo} alt="" className="aspect-square rounded-lg" sizes="120px" />
                    </Link>
                  </m.div>
                ))}
              </div>
            </div>
          )}

          <Link
            href="/dashboard/map"
            className="label-mono flex items-center justify-between rounded-xl border px-4 py-3.5 font-semibold transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-2.5">
              <MapTrifoldIcon className="size-5" aria-hidden />
              {plural(places.length, "lugar", "lugares")} en el mapa
            </span>
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </section>
      </div>
    </PageContainer>
  )
}
