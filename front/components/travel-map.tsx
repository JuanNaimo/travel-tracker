"use client"

import { useEffect, useRef } from "react"
import type { Place } from "@/lib/api-client"
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet"
import { cn } from "@/lib/utils"

type Coordinates = { latitude: number; longitude: number }

interface TravelMapProps {
  places: Place[]
  center?: { lat: number; lng: number }
  zoom?: number
  selectedPlaceId?: string | null
  /** Color del marcador de cada lugar; por defecto el color principal. */
  markerColor?: (place: Place) => string
  onPlaceClick?: (place: Place) => void
  /** Con esta función, el clic derecho (o mantener apretado en el celular) elige un punto. */
  onMapClick?: (coordinates: Coordinates) => void
  /** Elegir el punto también con un clic común, como en un selector de ubicación. */
  pickOnClick?: boolean
  pendingLocation?: Coordinates | null
  className?: string
}

/** Visitado: tinta con avión amarillo. Próximo: amarillo con tinta, como un cartel de embarque. */
export const MARKER_COLORS = { visited: "#101113", upcoming: "#FFC72C" }

const INK = "#101113"
const SIGNAL = "#FFC72C"

// Ícono Airplane de Phosphor (relleno); el marcador es HTML de Leaflet, no un componente de React
const PLANE_SVG = `<svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M240,136v32a8,8,0,0,1-8,8,7.61,7.61,0,0,1-1.57-.16L156,161v23.73l17.66,17.65A8,8,0,0,1,176,208v24a8,8,0,0,1-11,7.43l-37-14.81L91,239.43A8,8,0,0,1,80,232V208a8,8,0,0,1,2.34-5.66L100,184.69V161L25.57,175.84A7.61,7.61,0,0,1,24,176a8,8,0,0,1-8-8V136a8,8,0,0,1,4.42-7.16L100,89.06V44a28,28,0,0,1,56,0V89.06l79.58,39.78A8,8,0,0,1,240,136Z"/></svg>`

function pinHtml(color: string, selected: boolean) {
  const size = selected ? 44 : 32
  const ink = color === SIGNAL ? INK : SIGNAL
  const ring = selected ? `box-shadow:0 0 0 4px ${SIGNAL}66,0 4px 12px rgba(0,0,0,.35);` : "box-shadow:0 3px 8px rgba(0,0,0,.3);"
  return `<div style="width:${size}px;height:${size}px;border-radius:10px;transform:rotate(45deg);display:flex;align-items:center;justify-content:center;background:${color};color:${ink};border:2px solid ${INK};${ring}"><span style="transform:rotate(-45deg);display:flex">${PLANE_SVG}</span></div>`
}

export function TravelMap({
  places,
  center = { lat: 0, lng: -30 },
  zoom = 2,
  selectedPlaceId = null,
  markerColor = () => MARKER_COLORS.visited,
  onPlaceClick,
  onMapClick,
  pickOnClick = false,
  pendingLocation = null,
  className,
}: TravelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)
  const markersRef = useRef(new Map<string, Marker>())
  const pendingMarkerRef = useRef<Marker | null>(null)
  const callbacksRef = useRef({ onPlaceClick, onMapClick, markerColor, pickOnClick })
  const fittedRef = useRef(false)

  useEffect(() => {
    callbacksRef.current = { onPlaceClick, onMapClick, markerColor, pickOnClick }
  })

  // El mapa se crea una sola vez; los marcadores se actualizan en los efectos de abajo
  const initialView = useRef({ center, zoom })
  const readyRef = useRef<Promise<void> | null>(null)
  useEffect(() => {
    let cancelled = false
    readyRef.current = import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current) return
      leafletRef.current = L
      const { center, zoom } = initialView.current
      const map = L.map(containerRef.current, { worldCopyJump: true, zoomControl: false }).setView([center.lat, center.lng], zoom)
      // Abajo a la derecha, para no chocar con los filtros que van arriba del mapa
      L.control.zoom({ position: "bottomright" }).addTo(map)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      const pick = (e: LeafletMouseEvent) =>
        callbacksRef.current.onMapClick?.({ latitude: e.latlng.lat, longitude: e.latlng.lng })
      map.on("contextmenu", pick)
      map.on("click", (e: LeafletMouseEvent) => {
        if (callbacksRef.current.pickOnClick) pick(e)
      })
      mapRef.current = map
    })
    const markers = markersRef.current
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markers.clear()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    readyRef.current?.then(() => {
      const L = leafletRef.current
      const map = mapRef.current
      if (cancelled || !L || !map) return

      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current.clear()
      for (const place of places) {
        const selected = place.id === selectedPlaceId
        const icon = L.divIcon({
          className: "custom-marker",
          html: pinHtml(callbacksRef.current.markerColor(place), selected),
          iconSize: selected ? [44, 44] : [34, 34],
          iconAnchor: selected ? [22, 22] : [17, 17],
        })
        const marker = L.marker([place.latitude, place.longitude], {
          icon,
          title: place.name,
          zIndexOffset: selected ? 1000 : 0,
        }).addTo(map)
        marker.on("click", () => callbacksRef.current.onPlaceClick?.(place))
        markersRef.current.set(place.id, marker)
      }

      // Encuadrar todos los lugares la primera vez que hay datos
      if (!fittedRef.current && places.length > 0) {
        fittedRef.current = true
        if (places.length === 1) map.setView([places[0].latitude, places[0].longitude], 12)
        else map.fitBounds(L.latLngBounds(places.map((p) => [p.latitude, p.longitude])), { padding: [48, 48], maxZoom: 13 })
      }
    })
    return () => {
      cancelled = true
    }
  }, [places, selectedPlaceId])

  useEffect(() => {
    if (!selectedPlaceId) return
    readyRef.current?.then(() => {
      const place = places.find((p) => p.id === selectedPlaceId)
      const map = mapRef.current
      if (place && map) map.flyTo([place.latitude, place.longitude], Math.max(map.getZoom(), 11), { duration: 1 })
    })
    // Solo al cambiar la selección, no cada vez que se recargan los lugares
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlaceId])

  useEffect(() => {
    readyRef.current?.then(() => {
      const L = leafletRef.current
      const map = mapRef.current
      pendingMarkerRef.current?.remove()
      pendingMarkerRef.current = null
      if (!L || !map || !pendingLocation) return
      const icon = L.divIcon({
        className: "custom-marker",
        html: pinHtml(MARKER_COLORS.upcoming, true),
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      })
      pendingMarkerRef.current = L.marker([pendingLocation.latitude, pendingLocation.longitude], { icon }).addTo(map)
      map.setView([pendingLocation.latitude, pendingLocation.longitude], Math.max(map.getZoom(), 11))
    })
  }, [pendingLocation])

  return <div ref={containerRef} className={cn("h-full w-full", className)} />
}
