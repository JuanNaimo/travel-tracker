"use client"

import type React from "react"
import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { StarRating } from "@/components/star-rating"
import { Loader2, MapPin, Plus } from "lucide-react"
import { db, type Place, type Trip } from "@/lib/api-client"
import { reverseGeocode } from "@/lib/geocoding"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlaceSearch } from "@/components/place-search"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Coordinates = { latitude: number; longitude: number }

interface AddPlaceDialogProps {
  trips: Trip[]
  defaultTripId?: string
  onPlaceAdded?: (place: Place) => void
  initialCoordinates?: Coordinates
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const NEW_TRIP = "__new__"

const emptyForm = (coordinates?: Coordinates) => ({
  name: "",
  description: "",
  category: "otros" as Place["category"],
  latitude: coordinates?.latitude.toFixed(6) ?? "",
  longitude: coordinates?.longitude.toFixed(6) ?? "",
  rating: 0,
  visit_date: "",
  expenses: "",
})

export function AddPlaceDialog({
  trips,
  defaultTripId,
  onPlaceAdded,
  initialCoordinates,
  open: controlledOpen,
  onOpenChange,
}: AddPlaceDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [formData, setFormData] = useState(() => emptyForm(initialCoordinates))
  const [tripChoice, setTripChoice] = useState(defaultTripId ?? trips[0]?.id ?? NEW_TRIP)
  const [newTripName, setNewTripName] = useState("")

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  // Ajuste de estado durante el render cuando cambian las coordenadas del mapa
  const [prevCoordinates, setPrevCoordinates] = useState(initialCoordinates)
  if (initialCoordinates !== prevCoordinates) {
    setPrevCoordinates(initialCoordinates)
    if (initialCoordinates) {
      setFormData(emptyForm(initialCoordinates))
      setTripChoice(defaultTripId ?? trips[0]?.id ?? NEW_TRIP)
      setError(null)
    }
  }

  useEffect(() => {
    if (!initialCoordinates) return
    const controller = new AbortController()
    const lookup = async () => {
      setGeocoding(true)
      try {
        const result = await reverseGeocode(
          initialCoordinates.latitude,
          initialCoordinates.longitude,
          controller.signal
        )
        if (result) {
          setFormData((prev) => (prev.name ? prev : { ...prev, name: result.name, category: result.category }))
        }
      } catch {
        // Sin conexión con OpenStreetMap: el usuario escribe el nombre
      } finally {
        if (!controller.signal.aborted) setGeocoding(false)
      }
    }
    lookup()
    return () => controller.abort()
  }, [initialCoordinates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const latitude = Number.parseFloat(formData.latitude)
    const longitude = Number.parseFloat(formData.longitude)
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError("Elegí un lugar en el mapa, buscalo o ingresá las coordenadas.")
      return
    }
    if (tripChoice === NEW_TRIP && !newTripName.trim()) {
      setError("Ingresá el nombre del nuevo viaje.")
      return
    }

    setLoading(true)
    try {
      let tripId = tripChoice
      if (tripChoice === NEW_TRIP) {
        const created = await db.trips.create({
          name: newTripName.trim(),
          description: null,
          start_date: null,
          end_date: null,
          rating: null,
        })
        if (created.error || !created.data) {
          setError(created.error ?? "No se pudo crear el viaje.")
          return
        }
        tripId = created.data.id
      }

      const { data, error } = await db.places.create({
        trip_id: tripId,
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        latitude,
        longitude,
        rating: formData.rating || null,
        visit_date: formData.visit_date || null,
        expenses: formData.expenses ? Number.parseFloat(formData.expenses) : 0,
      })
      if (error || !data) {
        setError(error ?? "No se pudo agregar el lugar.")
        return
      }

      setOpen(false)
      setNewTripName("")
      onPlaceAdded?.(data)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceSelected = (place: {
    name: string
    latitude: number
    longitude: number
    category: string
  }) => {
    setFormData({
      ...formData,
      name: place.name,
      latitude: place.latitude.toString(),
      longitude: place.longitude.toString(),
      category: place.category as typeof formData.category,
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Lugar
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar nuevo lugar</DialogTitle>
          <DialogDescription>
            {initialCoordinates
              ? "Completa los datos del lugar que marcaste en el mapa y elige el viaje."
              : "Busca un lugar o ingresa las coordenadas manualmente."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip">Viaje *</Label>
            <Select value={tripChoice} onValueChange={setTripChoice} disabled={loading}>
              <SelectTrigger id="trip">
                <SelectValue placeholder="Selecciona un viaje" />
              </SelectTrigger>
              <SelectContent>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {trip.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_TRIP}>+ Crear viaje nuevo</SelectItem>
              </SelectContent>
            </Select>
            {tripChoice === NEW_TRIP && (
              <Input
                id="new-trip-name"
                placeholder="Nombre del nuevo viaje"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                disabled={loading}
              />
            )}
          </div>

          {initialCoordinates && (
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-green-600" />
              <span>
                Ubicación seleccionada: {formData.latitude}, {formData.longitude}
              </span>
            </div>
          )}

          <Tabs defaultValue={initialCoordinates ? "manual" : "search"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">Buscar lugar</TabsTrigger>
              <TabsTrigger value="manual">Coordenadas</TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Buscar en OpenStreetMap</Label>
                <PlaceSearch onSelectPlace={handlePlaceSelected} />
              </div>
            </TabsContent>
            <TabsContent value="manual" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitud *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="ej: 48.8584"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitud *</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="ej: 2.2945"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="place-name" className="flex items-center gap-2">
              Nombre del lugar *
              {geocoding && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </Label>
            <Input
              id="place-name"
              placeholder={geocoding ? "Buscando el nombre del lugar..." : "ej: Torre Eiffel"}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value as typeof formData.category })}
              disabled={loading}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restaurante">Restaurante</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="atraccion">Atracción turística</SelectItem>
                <SelectItem value="museo">Museo</SelectItem>
                <SelectItem value="naturaleza">Naturaleza</SelectItem>
                <SelectItem value="compras">Compras</SelectItem>
                <SelectItem value="otros">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="place-description">Descripción</Label>
            <Textarea
              id="place-description"
              placeholder="Describe tu experiencia..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Calificación</Label>
            <StarRating
              rating={formData.rating}
              interactive
              onChange={(rating) => setFormData({ ...formData, rating })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-date">Fecha de visita</Label>
            <Input
              id="visit-date"
              type="date"
              value={formData.visit_date}
              onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expenses">Gastos (opcional)</Label>
            <Input
              id="expenses"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.expenses}
              onChange={(e) => setFormData({ ...formData, expenses: e.target.value })}
              disabled={loading}
            />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Agregando..." : "Agregar lugar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
