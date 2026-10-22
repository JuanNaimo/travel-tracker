"use client"

import { useEffect, useMemo, useState } from "react"
import { db, type Place, type Trip } from "@/lib/api-client"
import { TravelMap } from "@/components/travel-map"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StarRating } from "@/components/star-rating"
import { AddPlaceDialog } from "@/components/add-place-dialog"
import { toast } from "sonner"

export default function MapPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [selectedTripId, setSelectedTripId] = useState<string>("all")
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [showAddPlaceDialog, setShowAddPlaceDialog] = useState(false)

  const loadData = async () => {
    const [tripsResult, placesResult] = await Promise.all([db.trips.getAll(), db.places.getAll()])

    if (tripsResult.data) setTrips(tripsResult.data)
    if (placesResult.data) setPlaces(placesResult.data)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos remotos
    loadData()
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    document.head.appendChild(link)

    link.onload = () => setMapReady(true)
  }, [])

  const filteredPlaces = useMemo(
    () => (selectedTripId === "all" ? places : places.filter((p) => p.trip_id === selectedTripId)),
    [selectedTripId, places]
  )

  const handleMapClick = (coordinates: { latitude: number; longitude: number }) => {
    setSelectedCoordinates(coordinates)
    setShowAddPlaceDialog(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Mapa de Viajes</h1>
            </div>
            <p className="text-sm text-muted-foreground">Clic derecho en el mapa para agregar un lugar</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <Select value={selectedTripId} onValueChange={setSelectedTripId}>
              <SelectTrigger className="w-full max-w-xs bg-white">
                <SelectValue placeholder="Filtrar por viaje" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los viajes</SelectItem>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredPlaces.length} {filteredPlaces.length === 1 ? "lugar" : "lugares"}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden lg:col-span-2 h-[600px]">
            {mapReady ? (
              <TravelMap
                places={filteredPlaces}
                trips={trips}
                onPlaceClick={setSelectedPlace}
                enableAddMode={true}
                onMapClick={handleMapClick}
                pendingLocation={showAddPlaceDialog ? selectedCoordinates : null}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
                  <p className="text-muted-foreground">Cargando mapa...</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {selectedPlace ? (
              <Card>
                <CardHeader>
                  <CardTitle>Detalles del lugar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{selectedPlace.name}</h3>
                    {selectedPlace.description && (
                      <p className="text-sm text-muted-foreground mb-3">{selectedPlace.description}</p>
                    )}
                  </div>

                  {selectedPlace.rating && (
                    <div>
                      <p className="text-sm font-medium mb-1">Calificación</p>
                      <StarRating rating={selectedPlace.rating} />
                    </div>
                  )}

                  {selectedPlace.visit_date && (
                    <div>
                      <p className="text-sm font-medium mb-1">Fecha de visita</p>
                      <p className="text-sm text-muted-foreground">{selectedPlace.visit_date}</p>
                    </div>
                  )}

                  {selectedPlace.expenses > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Gastos</p>
                      <p className="text-sm text-muted-foreground">${selectedPlace.expenses}</p>
                    </div>
                  )}

                  <Button className="w-full bg-transparent" variant="outline" onClick={() => setSelectedPlace(null)}>
                    Cerrar
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Haz clic en un marcador del mapa para ver los detalles</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedTripId === "all" && trips.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Leyenda de viajes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {trips.map((trip, index) => {
                      const colors = [
                        "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
                        "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"
                      ]
                      const color = colors[index % colors.length]
                      const tripPlacesCount = places.filter(p => p.trip_id === trip.id).length

                      return (
                        <div key={trip.id} className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border-2 border-white shadow-md flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{trip.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tripPlacesCount} {tripPlacesCount === 1 ? 'lugar' : 'lugares'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lugares visitados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredPlaces.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay lugares para mostrar</p>
                  ) : (
                    filteredPlaces.map((place) => (
                      <button
                        key={place.id}
                        onClick={() => setSelectedPlace(place)}
                        className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border"
                      >
                        <p className="font-medium text-sm">{place.name}</p>
                        {place.rating && (
                          <div className="mt-1">
                            <StarRating rating={place.rating} size="sm" />
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <AddPlaceDialog
          trips={trips}
          defaultTripId={selectedTripId !== "all" ? selectedTripId : undefined}
          initialCoordinates={selectedCoordinates ?? undefined}
          open={showAddPlaceDialog}
          onOpenChange={(open) => {
            setShowAddPlaceDialog(open)
            if (!open) setSelectedCoordinates(null)
          }}
          onPlaceAdded={(place) => {
            if (selectedTripId !== "all" && selectedTripId !== place.trip_id) setSelectedTripId(place.trip_id)
            setSelectedPlace(place)
            setSelectedCoordinates(null)
            loadData()
            toast.success(`"${place.name}" agregado al viaje.`)
          }}
        />
      </main>
    </div>
  )
}
