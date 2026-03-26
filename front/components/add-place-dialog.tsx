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
import { Plus } from "lucide-react"
import { db, auth } from "@/lib/api-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlaceSearch } from "@/components/place-search"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AddPlaceDialogProps {
  tripId: string
  onPlaceAdded?: () => void
  initialCoordinates?: { latitude: number; longitude: number }
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AddPlaceDialog({
  tripId,
  onPlaceAdded,
  initialCoordinates,
  open: controlledOpen,
  onOpenChange,
}: AddPlaceDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "otros" as const,
    latitude: initialCoordinates?.latitude.toString() || "",
    longitude: initialCoordinates?.longitude.toString() || "",
    rating: 0,
    visit_date: "",
    expenses: "",
  })

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  useEffect(() => {
    if (initialCoordinates) {
      setFormData((prev) => ({
        ...prev,
        latitude: initialCoordinates.latitude.toString(),
        longitude: initialCoordinates.longitude.toString(),
      }))
    }
  }, [initialCoordinates])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const user = auth.getCurrentUser()
      if (!user) {
        console.error("No user logged in")
        return
      }

      await db.places.create({
        trip_id: tripId,
        user_id: user.id,
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        latitude: Number.parseFloat(formData.latitude),
        longitude: Number.parseFloat(formData.longitude),
        rating: formData.rating || null,
        visit_date: formData.visit_date || null,
        expenses: formData.expenses ? Number.parseFloat(formData.expenses) : 0,
      })

      setOpen(false)
      setFormData({
        name: "",
        description: "",
        category: "otros",
        latitude: "",
        longitude: "",
        rating: 0,
        visit_date: "",
        expenses: "",
      })
      onPlaceAdded?.()
    } catch (error) {
      console.error("[v0] Error creating place:", error)
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
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Lugar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar nuevo lugar</DialogTitle>
          <DialogDescription>Busca un lugar o ingresa las coordenadas manualmente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="search" className="w-full">
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
            <Label htmlFor="place-name">Nombre del lugar *</Label>
            <Input
              id="place-name"
              placeholder="ej: Torre Eiffel"
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
