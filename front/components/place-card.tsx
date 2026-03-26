"use client"

import type { Place } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StarRating } from "@/components/star-rating"
import { Calendar, DollarSign, MapPin, Pencil, Trash2, Tag } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface PlaceCardProps {
  place: Place
  onEdit?: () => void
  onDelete?: () => void
}

const CATEGORY_LABELS: Record<Place["category"], string> = {
  restaurante: "Restaurante",
  hotel: "Hotel",
  atraccion: "Atracción",
  museo: "Museo",
  naturaleza: "Naturaleza",
  compras: "Compras",
  otros: "Otros",
}

const CATEGORY_COLORS: Record<Place["category"], string> = {
  restaurante: "bg-orange-100 text-orange-700",
  hotel: "bg-purple-100 text-purple-700",
  atraccion: "bg-blue-100 text-blue-700",
  museo: "bg-amber-100 text-amber-700",
  naturaleza: "bg-green-100 text-green-700",
  compras: "bg-pink-100 text-pink-700",
  otros: "bg-gray-100 text-gray-700",
}

export function PlaceCard({ place, onEdit, onDelete }: PlaceCardProps) {
  const visitDate = place.visit_date ? new Date(place.visit_date) : null

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[place.category]}`}
              >
                <Tag className="w-3 h-3" />
                {CATEGORY_LABELS[place.category]}
              </span>
            </div>
            <CardTitle className="text-lg mb-1">{place.name}</CardTitle>
            {place.description && (
              <CardDescription className="line-clamp-2 text-balance">{place.description}</CardDescription>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {place.rating && (
          <div className="flex items-center gap-2">
            <StarRating rating={place.rating} size="sm" />
          </div>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>
              {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
            </span>
          </div>

          {visitDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{format(visitDate, "d 'de' MMMM, yyyy", { locale: es })}</span>
            </div>
          )}

          {place.expenses > 0 && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>${place.expenses.toFixed(2)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
