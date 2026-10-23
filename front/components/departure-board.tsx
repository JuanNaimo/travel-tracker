"use client"

import Link from "next/link"
import { AnimatePresence, m } from "motion/react"
import { CaretRightIcon } from "@phosphor-icons/react"
import type { Place, PlacePhoto, Trip } from "@/lib/api-client"
import { BOARD_STATUS, formatDay, plural, tripCover, tripRoute, tripStatus } from "@/lib/travel"
import { cn } from "@/lib/utils"
import { PhotoThumb } from "@/components/photo-thumb"

interface DepartureBoardProps {
  trips: Trip[]
  places: Place[]
  photos: PlacePhoto[]
  /** Con fotos, cada fila suma una miniatura de la portada. */
  withCovers?: boolean
}

const ROW = "grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[72px_minmax(0,1fr)_120px]"

/** Los viajes como un tablero de salidas de aeropuerto. */
export function DepartureBoard({ trips, places, photos, withCovers = false }: DepartureBoardProps) {
  return (
    <div className="flex flex-col font-mono">
      <div className={cn(ROW, "border-b pb-1.5 text-[10px] text-muted-foreground", withCovers && "sm:grid-cols-[72px_56px_minmax(0,1fr)_120px]")}>
        <span>FECHA</span>
        {withCovers && <span className="hidden sm:block" />}
        <span>DESTINO</span>
        <span className="text-right">ESTADO</span>
      </div>
      <ul>
        <AnimatePresence initial={false} mode="popLayout">
          {trips.map((trip, i) => {
            const status = tripStatus(trip)
            const count = places.filter((p) => p.trip_id === trip.id).length
            const route = tripRoute(trip, places)
            return (
              <m.li
                key={trip.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="border-b last:border-b-0"
              >
                <Link
                  href={`/dashboard/trips/${trip.id}`}
                  className={cn(
                    ROW,
                    "group py-3 text-[13px] transition-colors hover:bg-muted/60",
                    withCovers && "sm:grid-cols-[72px_56px_minmax(0,1fr)_120px]",
                  )}
                >
                  <span className="text-muted-foreground uppercase">{trip.start_date ? formatDay(trip.start_date) : "—"}</span>
                  {withCovers && (
                    <PhotoThumb photo={tripCover(trip.id, places, photos)} alt="" className="hidden size-14 rounded-md sm:block" sizes="56px" />
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-sans text-[15px] font-bold">{trip.name}</span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {route.from} → {route.to} · {plural(count, "entrada", "entradas")}
                    </span>
                  </span>
                  <span className="flex items-center justify-end gap-1.5">
                    <span
                      className={cn(
                        "text-[11px] uppercase",
                        status === "ongoing" || status === "upcoming" ? "font-bold text-signal-text" : "text-muted-foreground",
                      )}
                    >
                      {status === "ongoing" && <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-signal align-middle" />}
                      {BOARD_STATUS[status]}
                    </span>
                    <CaretRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </m.li>
            )
          })}
        </AnimatePresence>
      </ul>
    </div>
  )
}
