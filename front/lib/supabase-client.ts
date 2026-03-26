// Cliente de Supabase para uso en componentes del lado del cliente
// Por ahora usará datos mock hasta que se conecte Supabase

export type User = {
  id: string
  email: string
  name?: string
}

export type Trip = {
  id: string
  user_id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  rating: number | null
  created_at: string
  updated_at: string
}

export type Place = {
  id: string
  trip_id: string
  user_id: string
  name: string
  description: string | null
  category: "restaurante" | "hotel" | "atraccion" | "museo" | "naturaleza" | "compras" | "otros"
  latitude: number
  longitude: number
  rating: number | null
  visit_date: string | null
  expenses: number
  created_at: string
  updated_at: string
}

export type PlacePhoto = {
  id: string
  place_id: string
  photo_url: string
  caption: string | null
  created_at: string
}

// Mock data para demostración
const MOCK_USER: User = {
  id: "demo-user-123",
  email: "demo@traveltracker.com",
  name: "Usuario Demo",
}

const MOCK_TRIPS: Trip[] = [
  {
    id: "trip-1",
    user_id: "demo-user-123",
    name: "Europa 2024",
    description: "Gran recorrido por capitales europeas",
    start_date: "2024-06-01",
    end_date: "2024-06-15",
    rating: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "trip-2",
    user_id: "demo-user-123",
    name: "Japón",
    description: "Experiencia cultural increíble",
    start_date: "2024-03-10",
    end_date: "2024-03-25",
    rating: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const MOCK_PLACES: Place[] = [
  {
    id: "place-1",
    trip_id: "trip-1",
    user_id: "demo-user-123",
    name: "Torre Eiffel",
    description: "Increíble vista desde la cima",
    category: "atraccion",
    latitude: 48.8584,
    longitude: 2.2945,
    rating: 5,
    visit_date: "2024-06-05",
    expenses: 150.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "place-2",
    trip_id: "trip-1",
    user_id: "demo-user-123",
    name: "Coliseo Romano",
    description: "Historia antigua impresionante",
    category: "atraccion",
    latitude: 41.8902,
    longitude: 12.4922,
    rating: 5,
    visit_date: "2024-06-10",
    expenses: 85.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "place-3",
    trip_id: "trip-2",
    user_id: "demo-user-123",
    name: "Templo Senso-ji",
    description: "Templo budista más antiguo de Tokio",
    category: "atraccion",
    latitude: 35.7148,
    longitude: 139.7967,
    rating: 5,
    visit_date: "2024-03-15",
    expenses: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "place-4",
    trip_id: "trip-2",
    user_id: "demo-user-123",
    name: "Monte Fuji",
    description: "Vista espectacular del icónico volcán",
    category: "naturaleza",
    latitude: 35.3606,
    longitude: 138.7278,
    rating: 5,
    visit_date: "2024-03-20",
    expenses: 120.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "place-5",
    trip_id: "trip-1",
    user_id: "demo-user-123",
    name: "Le Jules Verne",
    description: "Restaurante gourmet en la Torre Eiffel",
    category: "restaurante",
    latitude: 48.8583,
    longitude: 2.2945,
    rating: 4,
    visit_date: "2024-06-05",
    expenses: 280.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "place-6",
    trip_id: "trip-1",
    user_id: "demo-user-123",
    name: "Hotel Ritz Paris",
    description: "Hotel de lujo en el corazón de París",
    category: "hotel",
    latitude: 48.8683,
    longitude: 2.3286,
    rating: 5,
    visit_date: "2024-06-03",
    expenses: 650.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "place-7",
    trip_id: "trip-2",
    user_id: "demo-user-123",
    name: "Sukiyabashi Jiro",
    description: "Famoso restaurante de sushi con 3 estrellas Michelin",
    category: "restaurante",
    latitude: 35.6717,
    longitude: 139.7632,
    rating: 5,
    visit_date: "2024-03-16",
    expenses: 420.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// Simulación de autenticación
let currentUser: User | null = MOCK_USER
let tripsData: Trip[] = [...MOCK_TRIPS]
let placesData: Place[] = [...MOCK_PLACES]

export const auth = {
  async signIn(email: string, password: string) {
    // Mock sign in
    await new Promise((resolve) => setTimeout(resolve, 500))
    currentUser = MOCK_USER
    return { user: MOCK_USER, error: null }
  },

  async signUp(email: string, password: string) {
    // Mock sign up
    await new Promise((resolve) => setTimeout(resolve, 500))
    currentUser = MOCK_USER
    return { user: MOCK_USER, error: null }
  },

  async signOut() {
    currentUser = null
    return { error: null }
  },

  async getUser() {
    return { user: currentUser, error: null }
  },
}

export const db = {
  trips: {
    async getAll() {
      await new Promise((resolve) => setTimeout(resolve, 300))
      return { data: tripsData, error: null }
    },

    async getById(id: string) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      const trip = tripsData.find((t) => t.id === id)
      return { data: trip || null, error: trip ? null : "Trip not found" }
    },

    async create(trip: Omit<Trip, "id" | "created_at" | "updated_at">) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const newTrip: Trip = {
        ...trip,
        id: `trip-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      tripsData = [...tripsData, newTrip]
      return { data: newTrip, error: null }
    },

    async update(id: string, updates: Partial<Trip>) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const index = tripsData.findIndex((t) => t.id === id)
      if (index === -1) return { data: null, error: "Trip not found" }

      tripsData[index] = {
        ...tripsData[index],
        ...updates,
        updated_at: new Date().toISOString(),
      }
      return { data: tripsData[index], error: null }
    },

    async delete(id: string) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      tripsData = tripsData.filter((t) => t.id !== id)
      placesData = placesData.filter((p) => p.trip_id !== id)
      return { error: null }
    },
  },

  places: {
    async getAll() {
      await new Promise((resolve) => setTimeout(resolve, 300))
      return { data: placesData, error: null }
    },

    async getByTripId(tripId: string) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      const places = placesData.filter((p) => p.trip_id === tripId)
      return { data: places, error: null }
    },

    async getById(id: string) {
      await new Promise((resolve) => setTimeout(resolve, 200))
      const place = placesData.find((p) => p.id === id)
      return { data: place || null, error: place ? null : "Place not found" }
    },

    async create(place: Omit<Place, "id" | "created_at" | "updated_at">) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const newPlace: Place = {
        ...place,
        id: `place-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      placesData = [...placesData, newPlace]
      return { data: newPlace, error: null }
    },

    async update(id: string, updates: Partial<Place>) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const index = placesData.findIndex((p) => p.id === id)
      if (index === -1) return { data: null, error: "Place not found" }

      placesData[index] = {
        ...placesData[index],
        ...updates,
        updated_at: new Date().toISOString(),
      }
      return { data: placesData[index], error: null }
    },

    async delete(id: string) {
      await new Promise((resolve) => setTimeout(resolve, 300))
      placesData = placesData.filter((p) => p.id !== id)
      return { error: null }
    },
  },
}
