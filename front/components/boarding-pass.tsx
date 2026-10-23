"use client"

import Link from "next/link"
import { m } from "motion/react"
import { AirplaneTiltIcon } from "@phosphor-icons/react"
import type { Place, PlacePhoto, Trip } from "@/lib/api-client"
import { dayOfTrip, formatDay, tripLength, tripRoute, tripStatus, BOARD_STATUS } from "@/lib/travel"
import { cn } from "@/lib/utils"
import { PhotoThumb } from "@/components/photo-thumb"
import { Barcode } from "@/components/barcode"

interface BoardingPassProps {
  trip: Trip
  places: Place[]
  photoCount: number
  cover: PlacePhoto | null
  /** Con href, toda la tarjeta lleva al viaje. */
  href?: string
  className?: string
}

const pad = (n: number) => String(n).padStart(2, "0")

/** El viaje como tarjeta de embarque: origen y destino, troquelado y datos en mono. */
export function BoardingPass({ trip, places, photoCount, cover, href, className }: BoardingPassProps) {
  const route = tripRoute(trip, places)
  const status = tripStatus(trip)
  const length = tripLength(trip)
  const day = dayOfTrip(trip, new Date())
  const entries = places.filter((p) => p.trip_id === trip.id).length

  const badge =
    status === "ongoing" && day && length
      ? `Día ${pad(Math.min(day, length))}/${pad(length)}`
      : BOARD_STATUS[status]

  const body = (
    <>
      <div className="relative">
        <PhotoThumb photo={cover} alt={trip.name} className="h-[120px] sm:h-[150px] lg:h-[190px]" sizes="(max-width: 1024px) 100vw, 640px" />
        <span className="absolute top-3 left-3.5 rounded-[4px] bg-signal px-2 py-1 font-mono text-[11px] font-bold text-signal-foreground uppercase">
          {badge}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3 @lg:px-6">
        <div className="flex min-w-0 flex-col">
          <span className="font-mono text-[10px] text-ticket-muted">DESDE</span>
          <span className="font-display text-[38px] leading-none @lg:text-[48px]">{route.from}</span>
          <span className="truncate text-xs">{route.fromName}</span>
        </div>
        <div className="flex flex-1 items-center gap-1 text-ticket-foreground" aria-hidden>
          <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-current" />
          <AirplaneTiltIcon className="size-5" weight="fill" />
          <span className="h-0 flex-1 border-t-[1.5px] border-dashed border-current" />
        </div>
        <div className="flex min-w-0 flex-col items-end text-right">
          <span className="font-mono text-[10px] text-ticket-muted">HACIA</span>
          <span className="font-display text-[38px] leading-none @lg:text-[48px]">{route.to}</span>
          <span className="truncate text-xs">{route.toName}</span>
        </div>
      </div>

      {/* Troquelado: línea punteada con dos muescas del color del fondo */}
      <div className="relative mx-3.5 border-t-2 border-dashed border-perforation" aria-hidden>
        <span className="absolute top-[-12px] -left-[26px] size-[22px] rounded-full bg-background" />
        <span className="absolute top-[-12px] -right-[26px] size-[22px] rounded-full bg-background" />
      </div>

      {/* Se mide contra el ancho de la tarjeta: en la columna lateral es angosta aunque la pantalla sea grande */}
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_60px] items-end gap-2 px-4 pt-3 pb-3.5 font-mono @sm:grid-cols-[repeat(3,minmax(0,1fr))_88px] @lg:px-6">
        <div className="flex flex-col">
          <span className="text-[9px] text-ticket-muted">ENTRADAS</span>
          <span className="text-base font-bold @sm:text-lg">{pad(entries)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-ticket-muted">FOTOS</span>
          <span className="text-base font-bold @sm:text-lg">{pad(photoCount)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-ticket-muted">{status === "upcoming" ? "SALIDA" : "VUELTA"}</span>
          <span className="text-base font-bold whitespace-nowrap uppercase @sm:text-lg">
            {status === "upcoming" ? (trip.start_date ? formatDay(trip.start_date) : "—") : trip.end_date ? formatDay(trip.end_date) : "—"}
          </span>
        </div>
        <Barcode seed={trip.id} className="h-[30px] w-[60px] @sm:w-[88px]" />
      </div>
    </>
  )

  const classes = cn("@container block overflow-hidden rounded-2xl bg-ticket text-ticket-foreground ring-1 ring-black/10", href && "transition-transform hover:-translate-y-0.5", className)

  // Entra como si saliera de la impresora del mostrador
  return (
    <m.div
      initial={{ clipPath: "inset(0 0 100% 0)", y: -10 }}
      animate={{ clipPath: "inset(0 0 0% 0)", y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {href ? (
        <Link href={href} className={classes} aria-label={`${trip.name}: ${badge}`}>
          {body}
        </Link>
      ) : (
        <div className={classes}>{body}</div>
      )}
    </m.div>
  )
}
