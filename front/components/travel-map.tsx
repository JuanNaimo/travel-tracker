"use client"

import { useEffect, useRef } from "react"
import type { Place, Trip } from "@/lib/api-client"

interface TravelMapProps {
  places: Place[]
  trips?: Trip[]
  center?: { lat: number; lng: number }
  zoom?: number
  onPlaceClick?: (place: Place) => void
  onMapClick?: (coordinates: { latitude: number; longitude: number }) => void
  enableAddMode?: boolean
}

// Paleta de colores vibrantes para los viajes
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

// Función para obtener el color de un viaje basado en su ID
const getTripColor = (tripId: string, trips: Trip[] = []): string => {
  const index = trips.findIndex((trip) => trip.id === tripId)
  return index >= 0 ? TRIP_COLORS[index % TRIP_COLORS.length] : "#3B82F6"
}

export function TravelMap({
  places,
  trips = [],
  center = { lat: 20, lng: 0 },
  zoom = 2,
  onPlaceClick,
  onMapClick,
  enableAddMode = false,
}: TravelMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const tempMarkerRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    const loadLeaflet = async () => {
      const L = (await import("leaflet")).default

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current!).setView([center.lat, center.lng], zoom)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current)

        if (enableAddMode && onMapClick) {
          mapInstanceRef.current.on("contextmenu", (e: any) => {
            const { lat, lng } = e.latlng

            // Remove previous temporary marker
            if (tempMarkerRef.current) {
              tempMarkerRef.current.remove()
            }

            // Create temporary marker
            const tempIcon = L.divIcon({
              className: "custom-marker",
              html: `<div class="w-8 h-8 bg-green-500 border-2 border-white rounded-full shadow-lg animate-pulse"></div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })

            tempMarkerRef.current = L.marker([lat, lng], { icon: tempIcon }).addTo(mapInstanceRef.current)

            tempMarkerRef.current.bindPopup("Nuevo lugar - Completa el formulario para guardar").openPopup()

            onMapClick({ latitude: lat, longitude: lng })
          })
        }
      }

      // Limpiar marcadores existentes
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []

      // Crear nuevos marcadores
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

          const marker = L.marker([place.latitude, place.longitude], { icon: customIcon }).addTo(mapInstanceRef.current)

          const popupContent = `
            <div class="p-2 min-w-[200px]">
              <div class="font-semibold text-base mb-1">${place.name}</div>
              ${place.description ? `<p class="text-sm text-gray-600 mb-2">${place.description}</p>` : ""}
              ${place.rating ? `<div class="flex gap-1 mb-2 text-yellow-500">${"★".repeat(place.rating)}${"☆".repeat(5 - place.rating)}</div>` : ""}
              ${place.expenses > 0 ? `<p class="text-sm"><strong>Gastos:</strong> $${place.expenses}</p>` : ""}
            </div>
          `

          marker.bindPopup(popupContent)

          marker.on("click", () => {
            // Centrar el mapa en el marcador con animación suave
            mapInstanceRef.current.flyTo([place.latitude, place.longitude], 12, {
              duration: 1.5,
            })

            if (onPlaceClick) {
              onPlaceClick(place)
            }
          })

          markersRef.current.push(marker)
          bounds.extend([place.latitude, place.longitude])
        })

        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
      }
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
