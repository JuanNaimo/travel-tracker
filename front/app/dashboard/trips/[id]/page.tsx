"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { db, type Trip, type Place } from "@/lib/api-client"
import { PlaceCard } from "@/components/place-card"
import { AddPlaceDialog } from "@/components/add-place-dialog"
import { StarRating } from "@/components/star-rating"
import { Button } from "@/components/ui/button"
import { MapPin, ArrowLeft, Calendar, Map, Search, Filter } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TravelMap } from "@/components/travel-map"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function TripDetailPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [ratingFilter, setRatingFilter] = useState<string>("all")
  const [showMapDialog, setShowMapDialog] = useState(false)
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    loadTripData()
  }, [tripId])

  const loadTripData = async () => {
    setLoading(true)
    const [tripResult, placesResult] = await Promise.all([db.trips.getById(tripId), db.places.getByTripId(tripId)])

    if (tripResult.data) setTrip(tripResult.data)
    if (placesResult.data) setPlaces(placesResult.data)
    setLoading(false)
  }

  const handleDeletePlace = async (placeId: string) => {
    if (!confirm("¿Estás seguro de eliminar este lugar?")) return

    await db.places.delete(placeId)
    setPlaces(places.filter((p) => p.id !== placeId))
  }

  const handleMapClick = (coordinates: { latitude: number; longitude: number }) => {
    setSelectedCoordinates(coordinates)
    setShowMapDialog(false)
  }

  const filteredPlaces = places.filter((place) => {
    const matchesSearch =
      searchQuery === "" ||
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (place.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

    const matchesCategory = categoryFilter === "all" || place.category === categoryFilter

    const matchesRating =
      ratingFilter === "all" ||
      (ratingFilter === "5" && place.rating === 5) ||
      (ratingFilter === "4" && place.rating === 4) ||
      (ratingFilter === "3" && place.rating === 3) ||
      (ratingFilter === "1-2" && place.rating && place.rating <= 2)

    return matchesSearch && matchesCategory && matchesRating
  })

  const totalExpenses = places.reduce((sum, place) => sum + place.expenses, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Viaje no encontrado</p>
          <Link href="/dashboard">
            <Button>Volver al dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const startDate = trip.start_date ? new Date(trip.start_date) : null
  const endDate = trip.end_date ? new Date(trip.end_date) : null

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
              <h1 className="text-2xl font-bold">{trip.name}</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowMapDialog(true)}>
                <Map className="w-4 h-4 mr-2" />
                Agregar desde mapa
              </Button>
              <Link href="/dashboard/map">
                <Button variant="outline">
                  <Map className="w-4 h-4 mr-2" />
                  Ver todos en Mapa
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              {trip.description && <p className="text-muted-foreground mb-4 text-balance">{trip.description}</p>}

              <div className="flex flex-wrap gap-6 text-sm">
                {startDate && endDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(startDate, "d MMM", { locale: es })} - {format(endDate, "d MMM yyyy", { locale: es })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{places.length} lugares visitados</span>
                </div>
                {totalExpenses > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium">Gastos totales:</span>
                    <span>${totalExpenses.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {trip.rating && (
              <div className="flex flex-col items-end gap-2">
                <span className="text-sm font-medium text-muted-foreground">Calificación del viaje</span>
                <StarRating rating={trip.rating} size="lg" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Lugares visitados</h2>
            <p className="text-muted-foreground">Registra todos los lugares increíbles de este viaje</p>
          </div>
          <AddPlaceDialog
            tripId={tripId}
            onPlaceAdded={loadTripData}
            initialCoordinates={selectedCoordinates || undefined}
          />
        </div>

        {places.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    <SelectItem value="restaurante">Restaurantes</SelectItem>
                    <SelectItem value="hotel">Hoteles</SelectItem>
                    <SelectItem value="atraccion">Atracciones</SelectItem>
                    <SelectItem value="museo">Museos</SelectItem>
                    <SelectItem value="naturaleza">Naturaleza</SelectItem>
                    <SelectItem value="compras">Compras</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Calificación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="5">5 estrellas</SelectItem>
                    <SelectItem value="4">4 estrellas</SelectItem>
                    <SelectItem value="3">3 estrellas</SelectItem>
                    <SelectItem value="1-2">1-2 estrellas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(searchQuery || categoryFilter !== "all" || ratingFilter !== "all") && (
              <div className="mt-3 text-sm text-muted-foreground">
                Mostrando {filteredPlaces.length} de {places.length} lugares
              </div>
            )}
          </div>
        )}

        {places.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay lugares registrados</h3>
            <p className="text-muted-foreground mb-6">Comienza agregando el primer lugar que visitaste</p>
            <AddPlaceDialog tripId={tripId} onPlaceAdded={loadTripData} />
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No se encontraron lugares</h3>
            <p className="text-muted-foreground mb-4">Intenta ajustar tus filtros de búsqueda</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setCategoryFilter("all")
                setRatingFilter("all")
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} onDelete={() => handleDeletePlace(place.id)} />
            ))}
          </div>
        )}
      </main>

      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecciona un lugar en el mapa</DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full">
            <TravelMap
              places={places}
              center={places.length > 0 ? { lat: places[0].latitude, lng: places[0].longitude } : undefined}
              zoom={places.length > 0 ? 10 : 2}
              enableAddMode={true}
              onMapClick={handleMapClick}
            />
          </div>
          <p className="text-sm text-muted-foreground">Haz clic en el mapa donde quieras agregar un nuevo lugar</p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
