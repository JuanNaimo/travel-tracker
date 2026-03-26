"use client"

import type { Trip } from "@/lib/api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StarRating } from "@/components/star-rating"
import { Calendar, MapPin, Pencil, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

interface TripCardProps {
  trip: Trip
  placesCount?: number
  onEdit?: () => void
  onDelete?: () => void
}

export function TripCard({ trip, placesCount = 0, onEdit, onDelete }: TripCardProps) {
  const startDate = trip.start_date ? new Date(trip.start_date) : null
  const endDate = trip.end_date ? new Date(trip.end_date) : null

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{trip.name}</CardTitle>
            {trip.description && (
              <CardDescription className="line-clamp-2 text-balance">{trip.description}</CardDescription>
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
      <CardContent className="space-y-4">
        {trip.rating && (
          <div className="flex items-center gap-2">
            <StarRating rating={trip.rating} />
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {startDate && endDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {format(startDate, "d MMM", { locale: es })} - {format(endDate, "d MMM yyyy", { locale: es })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{placesCount} lugares</span>
          </div>
        </div>

        <Link href={`/dashboard/trips/${trip.id}`}>
          <Button className="w-full bg-transparent" variant="outline">
            Ver detalles
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
