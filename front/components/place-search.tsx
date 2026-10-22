"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MapPin, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { mapOsmCategory, type PlaceCategory } from "@/lib/geocoding"

interface SearchResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  category: string
}

interface PlaceSearchProps {
  onSelectPlace: (place: { name: string; latitude: number; longitude: number; category: PlaceCategory }) => void
}

export function PlaceSearch({ onSelectPlace }: PlaceSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const searchPlaces = async () => {
    if (!query.trim()) return

    setLoading(true)
    setShowResults(true)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      )
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("[v0] Error searching places:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // El buscador puede estar dentro de un formulario: Enter busca, no envía
      e.preventDefault()
      searchPlaces()
    }
  }

  const handleSelectPlace = (result: SearchResult) => {
    const category = mapOsmCategory(result.type, result.category)
    onSelectPlace({
      name: result.display_name.split(",")[0],
      latitude: Number.parseFloat(result.lat),
      longitude: Number.parseFloat(result.lon),
      category,
    })
    setQuery("")
    setResults([])
    setShowResults(false)
  }

  return (
    <div className="relative space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar un lugar, ciudad o dirección"
            aria-label="Buscar un lugar"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="pl-9"
          />
        </div>
        <Button type="button" onClick={searchPlaces} disabled={loading} aria-label="Buscar">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {showResults && results.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 p-2 max-h-64 overflow-y-auto shadow-lg">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors flex items-start gap-2"
              onClick={() => handleSelectPlace(result)}
            >
              <MapPin className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{result.display_name.split(",")[0]}</div>
                <div className="text-xs text-muted-foreground truncate">{result.display_name}</div>
              </div>
            </button>
          ))}
        </Card>
      )}

      {showResults && !loading && results.length === 0 && query && (
        <Card className="absolute z-50 w-full mt-1 p-4 shadow-lg text-center text-sm text-muted-foreground">
          No se encontraron lugares. Intenta con otro término de búsqueda.
        </Card>
      )}
    </div>
  )
}
