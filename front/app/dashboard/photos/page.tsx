"use client"

import { Suspense, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ImageIcon, Search, Upload } from "lucide-react"
import { useTravelData } from "@/components/travel-data-provider"
import { NEW_ENTRY_HREF, PageContainer } from "@/components/app-shell"
import { FilterChips } from "@/components/filter-chips"
import { PhotoThumb } from "@/components/photo-thumb"
import { PhotoDetails, PhotoDialog } from "@/components/photo-details"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatTripDates, plural, sortTrips } from "@/lib/travel"

const DESKTOP = "(min-width: 1024px)"

function subscribeDesktop(callback: () => void) {
  const query = window.matchMedia(DESKTOP)
  query.addEventListener("change", callback)
  return () => query.removeEventListener("change", callback)
}

function PhotosView() {
  const params = useSearchParams()
  const { trips, places, photos, loading, reload } = useTravelData()
  const [tripFilter, setTripFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(params.get("foto"))
  const isDesktop = useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP).matches, () => true)

  const placeById = new Map(places.map((p) => [p.id, p]))
  const tripsWithPhotos = sortTrips(trips).filter((t) => photos.some((ph) => placeById.get(ph.place_id)?.trip_id === t.id))

  const q = query.trim().toLocaleLowerCase("es")
  const matches = (text: string | null | undefined) => !!text && text.toLocaleLowerCase("es").includes(q)
  const groups = tripsWithPhotos
    .filter((t) => tripFilter === "all" || t.id === tripFilter)
    .map((trip) => ({
      trip,
      photos: photos.filter((ph) => {
        const place = placeById.get(ph.place_id)
        if (place?.trip_id !== trip.id) return false
        return !q || matches(ph.caption) || matches(place.name) || matches(trip.name)
      }),
    }))
    .filter((g) => g.photos.length > 0)

  const selected = photos.find((ph) => ph.id === selectedId) ?? groups[0]?.photos[0] ?? null
  const selectedPlace = selected ? placeById.get(selected.place_id) : undefined
  const selectedTrip = selectedPlace ? trips.find((t) => t.id === selectedPlace.trip_id) : undefined

  const filters = [
    { value: "all", label: "Todas" },
    ...tripsWithPhotos.slice(0, 6).map((t) => ({ value: t.id, label: t.name })),
  ]

  const onDeleted = async () => {
    setSelectedId(null)
    await reload()
  }

  return (
    <PageContainer className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-[28px] font-bold tracking-tight lg:text-[34px]">Fotos</h1>
          <span className="text-sm text-muted-foreground lg:text-[15px]">
            {plural(photos.length, "foto", "fotos")} en {plural(tripsWithPhotos.length, "viaje", "viajes")}
          </span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border bg-card px-3.5 text-muted-foreground sm:w-[260px] sm:flex-none">
            <Search className="size-[18px]" aria-hidden />
            <span className="sr-only">Buscar fotos</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por lugar o viaje"
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <Button asChild className="h-11 rounded-xl font-bold">
            <Link href={NEW_ENTRY_HREF}>
              <Upload aria-hidden />
              Subir fotos
            </Link>
          </Button>
        </div>
      </header>

      {filters.length > 2 && <FilterChips label="Filtrar por viaje" options={filters} value={tripFilter} onChange={setTripFilter} />}

      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] bg-card p-10 text-center">
          <ImageIcon className="size-12 text-muted-foreground" aria-hidden />
          <p className="max-w-sm text-sm text-muted-foreground">Todavía no subiste fotos. Agregalas cuando escribas una entrada del diario.</p>
          <Button asChild className="rounded-xl font-bold">
            <Link href={NEW_ENTRY_HREF}>Nueva entrada</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {groups.length === 0 && <p className="rounded-[18px] bg-card p-6 text-center text-sm text-muted-foreground">No hay fotos que coincidan.</p>}
            {groups.map(({ trip, photos: list }) => (
              <section key={trip.id} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-xl font-bold">
                    <Link href={`/dashboard/trips/${trip.id}`}>{trip.name}</Link>
                  </h2>
                  <span className="text-[13px] text-muted-foreground">
                    {[formatTripDates(trip), plural(list.length, "foto", "fotos")].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <div className="grid auto-rows-[110px] grid-flow-dense grid-cols-3 gap-1.5 sm:auto-rows-[140px] sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-2">
                  {list.map((photo, i) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setSelectedId(photo.id)}
                      aria-label={photo.caption ?? placeById.get(photo.place_id)?.name ?? "Foto"}
                      aria-pressed={isDesktop ? photo.id === selected?.id : undefined}
                      className={cn(
                        "overflow-hidden rounded-[10px] outline-offset-2 sm:rounded-xl",
                        i === 0 && "col-span-2 row-span-2",
                        isDesktop && photo.id === selected?.id && "outline-3 outline-primary",
                      )}
                    >
                      <PhotoThumb photo={photo} alt="" className="h-full w-full" sizes="(max-width: 640px) 33vw, 280px" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {isDesktop && selected && (
            <aside className="w-[320px] shrink-0 overflow-hidden rounded-[20px] bg-card lg:sticky lg:top-8">
              <PhotoDetails key={selected.id} photo={selected} place={selectedPlace} trip={selectedTrip} onDeleted={onDeleted} />
            </aside>
          )}
        </div>
      )}

      {!isDesktop && selected && selectedId && (
        <PhotoDialog
          open
          onOpenChange={(open) => !open && setSelectedId(null)}
          photo={selected}
          place={selectedPlace}
          trip={selectedTrip}
          onDeleted={onDeleted}
        />
      )}
    </PageContainer>
  )
}

export default function PhotosPage() {
  return (
    <Suspense>
      <PhotosView />
    </Suspense>
  )
}
