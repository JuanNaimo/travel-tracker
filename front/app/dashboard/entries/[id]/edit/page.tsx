"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { EntryForm } from "@/components/entry-form"
import { useTravelData } from "@/components/travel-data-provider"
import { Button } from "@/components/ui/button"

export default function EditEntryPage() {
  const { id } = useParams<{ id: string }>()
  const { places, loading } = useTravelData()
  if (loading) return null

  const place = places.find((p) => p.id === id)
  if (!place) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="font-display text-2xl font-bold">No encontramos esta entrada</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/trips">Volver a mis viajes</Link>
        </Button>
      </div>
    )
  }
  return <EntryForm place={place} />
}
