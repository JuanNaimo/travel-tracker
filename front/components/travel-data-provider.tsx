"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { auth, db, type Place, type PlacePhoto, type Trip, type User } from "@/lib/api-client"

type TravelData = {
  user: User | null
  trips: Trip[]
  places: Place[]
  photos: PlacePhoto[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const TravelDataContext = createContext<TravelData | null>(null)

export function TravelDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [places, setPlaces] = useState<Place[]>([])
  const [photos, setPhotos] = useState<PlacePhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [tripsResult, placesResult, photosResult] = await Promise.all([
      db.trips.getAll(),
      db.places.getAll(),
      db.photos.getAll(),
    ])
    setError(tripsResult.error ?? placesResult.error ?? photosResult.error)
    if (tripsResult.data) setTrips(tripsResult.data)
    if (placesResult.data) setPlaces(placesResult.data)
    setPhotos(photosResult.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    const current = auth.getCurrentUser()
    if (!current) {
      window.location.href = "/"
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos remotos
    setUser(current)
    reload()
    auth.getUser().then(({ user, error }) => {
      if (user) setUser(user)
      // Sin conexión se sigue con el usuario guardado; solo una sesión vencida vuelve al login
      else if (!error || error === "Session expired") window.location.href = "/"
    })
  }, [reload])

  return (
    <TravelDataContext.Provider value={{ user, trips, places, photos, loading, error, reload }}>
      {children}
    </TravelDataContext.Provider>
  )
}

export function useTravelData(): TravelData {
  const value = useContext(TravelDataContext)
  if (!value) throw new Error("useTravelData debe usarse dentro de TravelDataProvider")
  return value
}
