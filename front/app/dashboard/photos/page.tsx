"use client"

import { Suspense, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AnimatePresence, m } from "motion/react"
import { ImagesIcon, MagnifyingGlassIcon, UploadSimpleIcon } from "@phosphor-icons/react"
import { useTravelData } from "@/components/travel-data-provider"
import { NEW_ENTRY_HREF, PageContainer } from "@/components/app-shell"
import { FilterChips } from "@/components/filter-chips"
import { PhotoThumb } from "@/components/photo-thumb"
import { PhotoDetails, PhotoDialog } from "@/components/photo-details"
import { SplitFlap } from "@/components/split-flap"
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

  const filters = [{ value: "all", label: "Todas" }, ...tripsWithPhotos.slice(0, 6).map((t) => ({ value: t.id, label: t.name }))]

  const onDeleted = async () => {
    setSelectedId(null)
    await reload()
  }

  return (
    <PageContainer className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="label-mono text-muted-foreground">
            {plural(photos.length, "foto", "fotos")} · {plural(tripsWithPhotos.length, "viaje", "viajes")}
          </span>
          <h1 className="title-board text-[54px] lg:text-[72px]">
            <SplitFlap text="FOTOS" />
          </h1>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border bg-card px-3.5 text-muted-foreground focus-within:border-ring sm:w-[260px] sm:flex-none">
            <MagnifyingGlassIcon className="size-[18px]" aria-hidden />
            <span className="sr-only">Buscar fotos</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Lugar o viaje"
              className="min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <Button asChild className="h-11 rounded-xl font-bold">
            <Link href={NEW_ENTRY_HREF}>
              <UploadSimpleIcon aria-hidden />
              Subir
            </Link>
          </Button>
        </div>
      </header>

      {filters.length > 2 && <FilterChips label="Filtrar por viaje" options={filters} value={tripFilter} onChange={setTripFilter} />}

      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <ImagesIcon className="size-12 text-muted-foreground" aria-hidden />
          <p className="label-mono max-w-sm text-muted-foreground">Todavía no subiste fotos. Agregalas cuando escribas una entrada.</p>
          <Button asChild className="rounded-xl font-bold">
            <Link href={NEW_ENTRY_HREF}>Nueva entrada</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-7">
            {groups.length === 0 && <p className="label-mono rounded-xl border border-dashed p-6 text-center text-muted-foreground">Ninguna foto coincide</p>}
            {groups.map(({ trip, photos: list }) => (
              <section key={trip.id} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3 border-b pb-2">
                  <h2 className="title-board text-2xl">
                    <Link href={`/dashboard/trips/${trip.id}`}>{trip.name}</Link>
                  </h2>
                  <span className="label-mono text-[10px] text-muted-foreground">
                    {[formatTripDates(trip), plural(list.length, "foto", "fotos")].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <div className="grid auto-rows-[110px] grid-flow-dense grid-cols-3 gap-1.5 sm:auto-rows-[140px] sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:gap-2">
                  <AnimatePresence initial={false}>
                    {list.map((photo, i) => (
                      <m.button
                        key={photo.id}
                        layout
                        type="button"
                        onClick={() => setSelectedId(photo.id)}
                        aria-label={photo.caption ?? placeById.get(photo.place_id)?.name ?? "Foto"}
                        aria-pressed={isDesktop ? photo.id === selected?.id : undefined}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1, transition: { delay: Math.min(i, 12) * 0.03 } }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={cn(
                          "overflow-hidden rounded-md outline-offset-2",
                          i === 0 && "col-span-2 row-span-2",
                          isDesktop && photo.id === selected?.id && "outline-3 outline-signal",
                        )}
                      >
                        <PhotoThumb photo={photo} alt="" className="h-full w-full" sizes="(max-width: 640px) 33vw, 280px" />
                      </m.button>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>

          {isDesktop && selected && (
            <aside className="w-[320px] shrink-0 overflow-hidden rounded-xl bg-ticket text-ticket-foreground lg:sticky lg:top-8">
              <AnimatePresence mode="wait">
                <m.div key={selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <PhotoDetails photo={selected} place={selectedPlace} trip={selectedTrip} onDeleted={onDeleted} />
                </m.div>
              </AnimatePresence>
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
