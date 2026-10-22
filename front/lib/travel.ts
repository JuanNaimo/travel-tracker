import { differenceInCalendarDays, format, isSameMonth, isSameYear, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import type { Place, PlacePhoto, Trip } from "@/lib/api-client"

export type TripStatus = "upcoming" | "ongoing" | "past" | "undated"

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  upcoming: "Próximo",
  ongoing: "En curso",
  past: "Terminado",
  undated: "Sin fechas",
}

export const CATEGORY_LABELS: Record<Place["category"], string> = {
  restaurante: "Comida",
  hotel: "Alojamiento",
  atraccion: "Atracción",
  museo: "Cultura",
  naturaleza: "Naturaleza",
  compras: "Compras",
  otros: "Otros",
}

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Place["category"][]

// La calificación del lugar se presenta como "¿Cómo estuvo el día?"
export const MOODS = [
  { rating: 5, label: "Increíble" },
  { rating: 4, label: "Muy bien" },
  { rating: 3, label: "Normal" },
  { rating: 2, label: "Cansador" },
  { rating: 1, label: "Difícil" },
] as const

export function moodLabel(rating: number | null): string | null {
  return MOODS.find((m) => m.rating === rating)?.label ?? null
}

export const parseDay = (day: string) => parseISO(day.slice(0, 10))

export function tripStatus(trip: Trip, today = new Date()): TripStatus {
  if (!trip.start_date) return "undated"
  const start = parseDay(trip.start_date)
  const end = trip.end_date ? parseDay(trip.end_date) : start
  if (differenceInCalendarDays(today, start) < 0) return "upcoming"
  if (differenceInCalendarDays(today, end) > 0) return "past"
  return "ongoing"
}

/** Cantidad de días del viaje, contando el primero y el último. */
export function tripLength(trip: Trip): number | null {
  if (!trip.start_date) return null
  const end = trip.end_date ?? trip.start_date
  return differenceInCalendarDays(parseDay(end), parseDay(trip.start_date)) + 1
}

/** Número de día (desde 1) de `day` dentro del viaje. */
export function dayOfTrip(trip: Trip, day: string | Date): number | null {
  if (!trip.start_date) return null
  const date = typeof day === "string" ? parseDay(day) : day
  return differenceInCalendarDays(date, parseDay(trip.start_date)) + 1
}

/** Días pasados de viaje hasta hoy (los viajes futuros no suman). */
export function daysTraveled(trips: Trip[], today = new Date()): number {
  return trips.reduce((total, trip) => {
    const status = tripStatus(trip, today)
    if (status === "past") return total + (tripLength(trip) ?? 0)
    if (status === "ongoing") return total + (dayOfTrip(trip, today) ?? 0)
    return total
  }, 0)
}

export const formatDay = (day: string) => format(parseDay(day), "d MMM", { locale: es })
export const formatDate = (day: string) => format(parseDay(day), "d MMM yyyy", { locale: es })
export const formatLongDate = (day: string) => format(parseDay(day), "EEEE d 'de' MMMM", { locale: es })

export function formatTripDates(trip: Trip): string | null {
  if (!trip.start_date) return null
  const start = parseDay(trip.start_date)
  const end = trip.end_date ? parseDay(trip.end_date) : start
  if (differenceInCalendarDays(end, start) === 0) return formatDate(trip.start_date)
  if (!isSameYear(start, end)) return `${formatDate(trip.start_date)} – ${format(end, "d MMM yyyy", { locale: es })}`
  if (!isSameMonth(start, end)) return `${formatDay(trip.start_date)} – ${format(end, "d MMM yyyy", { locale: es })}`
  return `${format(start, "d")}–${format(end, "d MMM yyyy", { locale: es })}`
}

export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("es-AR")} ${n === 1 ? one : many}`
}

export const formatMoney = (value: number) =>
  value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })

/** Lugares ordenados como un diario: por fecha de visita y luego por creación. */
export function sortByVisit(places: Place[]): Place[] {
  return [...places].sort((a, b) => {
    const da = a.visit_date ?? "9999"
    const dbb = b.visit_date ?? "9999"
    if (da !== dbb) return da < dbb ? -1 : 1
    return a.created_at < b.created_at ? -1 : 1
  })
}

export type DiaryDay = { date: string | null; places: Place[] }

/** Agrupa los lugares por día, del más reciente al más antiguo; los sin fecha van al final. */
export function groupByDay(places: Place[]): DiaryDay[] {
  const days = new Map<string, Place[]>()
  for (const place of sortByVisit(places)) {
    const key = place.visit_date ?? ""
    days.set(key, [...(days.get(key) ?? []), place])
  }
  return [...days.entries()]
    .map(([date, list]) => ({ date: date || null, places: list }))
    .sort((a, b) => {
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date < b.date ? 1 : -1
    })
}

/** Primera foto del lugar más antiguo del viaje: la portada. */
export function tripCover(tripId: string, places: Place[], photos: PlacePhoto[]): PlacePhoto | null {
  const placeOrder = sortByVisit(places.filter((p) => p.trip_id === tripId)).map((p) => p.id)
  for (const placeId of placeOrder) {
    const photo = photos.find((ph) => ph.place_id === placeId)
    if (photo) return photo
  }
  return null
}

/** Viaje en curso, o el que empezó más recientemente si hay varios. */
export function currentTrip(trips: Trip[], today = new Date()): Trip | null {
  const ongoing = trips.filter((t) => tripStatus(t, today) === "ongoing")
  return ongoing.sort((a, b) => ((a.start_date ?? "") < (b.start_date ?? "") ? 1 : -1))[0] ?? null
}

export function nextTrip(trips: Trip[], today = new Date()): Trip | null {
  const upcoming = trips.filter((t) => tripStatus(t, today) === "upcoming")
  return upcoming.sort((a, b) => ((a.start_date ?? "") < (b.start_date ?? "") ? -1 : 1))[0] ?? null
}

/** Viajes con fecha primero (del más reciente al más viejo), luego los sin fecha. */
export function sortTrips(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    if (!a.start_date && !b.start_date) return a.created_at < b.created_at ? 1 : -1
    if (!a.start_date) return 1
    if (!b.start_date) return -1
    return a.start_date < b.start_date ? 1 : -1
  })
}

export function tripYear(trip: Trip): string | null {
  return trip.start_date ? trip.start_date.slice(0, 4) : null
}
