import type { Place } from "@/lib/api-client"

export type PlaceCategory = Place["category"]

const OSM_CATEGORY_MAP: Record<string, PlaceCategory> = {
  restaurant: "restaurante",
  cafe: "restaurante",
  fast_food: "restaurante",
  bar: "restaurante",
  hotel: "hotel",
  motel: "hotel",
  hostel: "hotel",
  guest_house: "hotel",
  museum: "museo",
  gallery: "museo",
  attraction: "atraccion",
  viewpoint: "atraccion",
  monument: "atraccion",
  tourism: "atraccion",
  park: "naturaleza",
  beach: "naturaleza",
  peak: "naturaleza",
  nature_reserve: "naturaleza",
  natural: "naturaleza",
  shop: "compras",
  mall: "compras",
  marketplace: "compras",
}

export function mapOsmCategory(type: string, category: string): PlaceCategory {
  return OSM_CATEGORY_MAP[type] || OSM_CATEGORY_MAP[category] || "otros"
}

type ReverseResult = {
  name?: string
  display_name?: string
  type?: string
  category?: string
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<{ name: string; category: PlaceCategory } | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18`
  const response = await fetch(url, { signal, headers: { "Accept-Language": "es" } })
  if (!response.ok) return null

  const data: ReverseResult = await response.json()
  const name = data.name || data.display_name?.split(",")[0]?.trim()
  if (!name) return null
  return { name, category: mapOsmCategory(data.type ?? "", data.category ?? "") }
}
