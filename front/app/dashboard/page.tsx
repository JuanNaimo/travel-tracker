"use client"

import { useEffect, useState } from "react"
import { db, type Trip, type Place } from "@/lib/api-client"
import { TripCard } from "@/components/trip-card"
import { CreateTripDialog } from "@/components/create-trip-dialog"
import { Button } from "@/components/ui/button"
import { MapPin, LogOut } from "lucide-react"
import { auth } from "@/lib/api-client"
import Link from "next/link"

export default function DashboardPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)

  const loadTrips = async () => {
    setLoading(true)
    const [tripsResult, placesResult] = await Promise.all([db.trips.getAll(), db.places.getAll()])
    if (tripsResult.data) setTrips(tripsResult.data)
    if (placesResult.data) setPlaces(placesResult.data)
    setLoading(false)
  }

  useEffect(() => {
    loadTrips()
  }, [])

  const handleSignOut = async () => {
    await auth.signOut()
    window.location.href = "/"
  }

  const getPlacesCountForTrip = (tripId: string) => {
    return places.filter((p) => p.trip_id === tripId).length
  }

  const handleDeleteTrip = async (tripId: string) => {
    if (!confirm("¿Estás seguro de eliminar este viaje? Se eliminarán todos sus lugares.")) return

    await db.trips.delete(tripId)
    setTrips(trips.filter((t) => t.id !== tripId))
    setPlaces(places.filter((p) => p.trip_id !== tripId))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Travel Tracker</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard/map">
                <Button variant="outline">Ver Mapa</Button>
              </Link>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Mis Viajes</h2>
            <p className="text-muted-foreground">Organiza y revive tus aventuras alrededor del mundo</p>
          </div>
          <CreateTripDialog onTripCreated={loadTrips} />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Cargando viajes...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hay viajes todavía</h3>
            <p className="text-muted-foreground mb-6">Comienza creando tu primer viaje</p>
            <CreateTripDialog onTripCreated={loadTrips} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                placesCount={getPlacesCountForTrip(trip.id)}
                onDelete={() => handleDeleteTrip(trip.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
