"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { EntryForm } from "@/components/entry-form"
import { useTravelData } from "@/components/travel-data-provider"
import { currentTrip } from "@/lib/travel"

function NewEntry() {
  const params = useSearchParams()
  const { trips, loading } = useTravelData()
  if (loading) return null

  const lat = Number.parseFloat(params.get("lat") ?? "")
  const lng = Number.parseFloat(params.get("lng") ?? "")
  const initialLocation = Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : undefined
  const tripId = params.get("viaje") ?? currentTrip(trips)?.id

  return <EntryForm defaultTripId={tripId} initialLocation={initialLocation} />
}

export default function NewEntryPage() {
  return (
    <Suspense>
      <NewEntry />
    </Suspense>
  )
}
