"use client"

import { useEffect, useRef } from "react"
import type { Place, Trip } from "@/lib/api-client"
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet"

interface TravelMapProps {
  places: Place[]
  trips?: Trip[]
  center?: { lat: number; lng: number }
  zoom?: number
  onPlaceClick?: (place: Place) => void
  onMapClick?: (coordinates: { latitude: number; longitude: number }) => void
  enableAddMode?: boolean
  pendingLocation?: { latitude: number; longitude: number } | null
}

const TRIP_COLORS = [
  "#3B82F6", // blue-500
  "#EF4444", // red-500
  "#10B981", // green-500
  "#F59E0B", // amber-500
  "#8B5CF6", // purple-500
  "#EC4899", // pink-500
  "#14B8A6", // teal-500
  "#F97316", // orange-500
  "#6366F1", // indigo-500
  "#84CC16", // lime-500
  "#06B6D4", // cyan-500
  "#34D399", // emerald-500
  "#FACC15", // yellow-500
  "#D946EF", // fuchsia-500
  "#A855F7", // violet-500
  "#0EA5E9", // sky-500
  "#F43F5E", // rose-500
  "#64748B", // slate-500
  "#71717A", // zinc-500
  "#B45309", // amber-700 (marrón cálido)
]

const getTripColor = (tripId: string, trips: Trip[] = []): string => {
  const index = trips.findIndex((trip) => trip.id === tripId)
  return index >= 0 ? TRIP_COLORS[index % TRIP_COLORS.length] : "#3B82F6"
}

// Los popups de Leaflet se arman con HTML: escapar los datos ingresados por el usuario
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function TravelMap({
  places,
  trips = [],
  center = { lat: 20, lng: 0 },
  zoom = 2,
  onPlaceClick,
  onMapClick,
  enableAddMode = false,
  pendingLocation = null,
}: TravelMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<LeafletMap | null>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)
  const markersRef = useRef<Marker[]>([])
  const pendingMarkerRef = useRef<Marker | null>(null)
  const pendingLocationRef = useRef(pendingLocation)
  const onMapClickRef = useRef(onMapClick)

  useEffect(() => {
    pendingLocationRef.current = pendingLocation
    onMapClickRef.current = onMapClick
  })

  const drawPendingMarker = () => {
    const L = leafletRef.current
    const map = mapInstanceRef.current
    pendingMarkerRef.current?.remove()
    pendingMarkerRef.current = null
    const location = pendingLocationRef.current
    if (!L || !map || !location) return

    const icon = L.divIcon({
      className: "custom-marker",
      html: `<div class="w-8 h-8 bg-green-500 border-2 border-white rounded-full shadow-lg animate-pulse"></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
    pendingMarkerRef.current = L.marker([location.latitude, location.longitude], { icon }).addTo(map)
  }

  useEffect(() => {
    drawPendingMarker()
  }, [pendingLocation?.latitude, pendingLocation?.longitude])

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    const loadLeaflet = async () => {
      const L = (await import("leaflet")).default
      leafletRef.current = L

      if (!mapRef.current) return

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView([center.lat, center.lng], zoom)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current)

        if (enableAddMode) {
          mapInstanceRef.current.on("contextmenu", (e: LeafletMouseEvent) => {
            onMapClickRef.current?.({ latitude: e.latlng.lat, longitude: e.latlng.lng })
          })
        }
      }

      const map = mapInstanceRef.current

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      if (places.length > 0) {
        const bounds = L.latLngBounds([])

        places.forEach((place) => {
          const tripColor = getTripColor(place.trip_id, trips)

          const customIcon = L.divIcon({
            className: "custom-marker",
            html: `<div class="w-6 h-6 border-2 border-white rounded-full shadow-lg" style="background-color: ${tripColor};"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })

          const marker = L.marker([place.latitude, place.longitude], { icon: customIcon }).addTo(map)

          const popupContent = `
            <div class="p-2 min-w-[200px]">
              <div class="font-semibold text-base mb-1">${escapeHtml(place.name)}</div>
              ${place.description ? `<p class="text-sm text-gray-600 mb-2">${escapeHtml(place.description)}</p>` : ""}
              ${place.rating ? `<div class="flex gap-1 mb-2 text-yellow-500">${"★".repeat(place.rating)}${"☆".repeat(5 - place.rating)}</div>` : ""}
              ${place.expenses > 0 ? `<p class="text-sm"><strong>Gastos:</strong> $${place.expenses}</p>` : ""}
            </div>
          `

          marker.bindPopup(popupContent)

          marker.on("click", () => {
            map.flyTo([place.latitude, place.longitude], 12, {
              duration: 1.5,
            })

            if (onPlaceClick) {
              onPlaceClick(place)
            }
          })

          markersRef.current.push(marker)
          bounds.extend([place.latitude, place.longitude])
        })

        map.fitBounds(bounds, { padding: [50, 50] })
      }

      drawPendingMarker()
    }

    loadLeaflet()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [places, trips, enableAddMode])

  return <div ref={mapRef} className="w-full h-full rounded-lg" />
}
