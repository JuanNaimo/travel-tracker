// Cliente de API para conectar con el backend PostgreSQL
// Reemplaza la implementación mock de Supabase

export type User = {
  id: string
  email: string
  name?: string
  user_metadata?: Record<string, any>
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

// Configuración del API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// Clase para manejar errores de API
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Helper para hacer requests con el token de sesión
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('session_token') : null

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.error || `Request failed with status ${response.status}`,
        response.status,
        errorData
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Network error or server unavailable')
  }
}

// Autenticación
export const auth = {
  async signIn(email: string, password: string) {
    try {
      const response = await apiRequest<{
        success: boolean
        sessionToken: string
        user: User
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })

      if (response.success && response.sessionToken) {
        localStorage.setItem('session_token', response.sessionToken)
        localStorage.setItem('user', JSON.stringify(response.user))
        return { user: response.user, error: null }
      }

      return { user: null, error: 'Login failed' }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Login failed'
      return { user: null, error: message }
    }
  },

  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    try {
      const response = await apiRequest<{
        success: boolean
        userId: string
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          metadata: metadata || {}
        }),
      })

      if (response.success) {
        // Auto-login después del registro
        return await this.signIn(email, password)
      }

      return { user: null, error: 'Registration failed' }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Registration failed'
      return { user: null, error: message }
    }
  },

  async signOut() {
    try {
      const token = localStorage.getItem('session_token')
      if (token) {
        await apiRequest('/auth/logout', {
          method: 'POST',
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('session_token')
      localStorage.removeItem('user')
    }
    return { error: null }
  },

  async getUser(): Promise<{ user: User | null; error: string | null }> {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        return { user: null, error: null }
      }

      // Validar que el token siga siendo válido
      const response = await apiRequest<{
        valid: boolean
        user: User
      }>('/auth/validate', {
        method: 'GET',
      })

      if (response.valid) {
        return { user: response.user, error: null }
      }

      // Si el token no es válido, limpiar
      localStorage.removeItem('session_token')
      localStorage.removeItem('user')
      return { user: null, error: 'Session expired' }
    } catch (error) {
      localStorage.removeItem('session_token')
      localStorage.removeItem('user')
      return { user: null, error: null }
    }
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }
}

// Base de datos - Trips
export const db = {
  trips: {
    async getAll() {
      try {
        const data = await apiRequest<Trip[]>('/trips')
        return { data, error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to fetch trips'
        return { data: null, error: message }
      }
    },

    async getById(id: string) {
      try {
        const data = await apiRequest<Trip>(`/trips/${id}`)
        return { data, error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to fetch trip'
        return { data: null, error: message }
      }
    },

    async create(trip: Omit<Trip, 'id' | 'created_at' | 'updated_at'>) {
      try {
        const data = await apiRequest<Trip>('/trips', {
          method: 'POST',
          body: JSON.stringify(trip),
        })
        return { data, error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to create trip'
        return { data: null, error: message }
      }
    },

    async update(id: string, updates: Partial<Trip>) {
      try {
        const data = await apiRequest<Trip>(`/trips/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        })
        return { data, error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to update trip'
        return { data: null, error: message }
      }
    },

    async delete(id: string) {
      try {
        await apiRequest(`/trips/${id}`, {
          method: 'DELETE',
        })
        return { error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to delete trip'
        return { error: message }
      }
    },
  },

  places: {
    async getAll() {
      try {
        const data = await apiRequest<Place[]>('/places')
        return { data, error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to fetch places'
        return { data: null, error: message }
      }
    },

    async getByTripId(tripId: string) {
      try {
        const data = await apiRequest<Place[]>(`/places?trip_id=${tripId}`)
        return { data, error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to fetch places'
        return { data: null, error: message }
      }
    },

    async getById(id: string) {
      try {
        const data = await apiRequest<Place>(`/places/${id}`)
        return { data, error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to fetch place'
        return { data: null, error: message }
      }
    },

    async create(place: Omit<Place, 'id' | 'created_at' | 'updated_at'>) {
      try {
        const data = await apiRequest<Place>('/places', {
          method: 'POST',
          body: JSON.stringify(place),
        })
        return { data, error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to create place'
        return { data: null, error: message }
      }
    },

    async update(id: string, updates: Partial<Place>) {
      try {
        const data = await apiRequest<Place>(`/places/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        })
        return { data, error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to update place'
        return { data: null, error: message }
      }
    },

    async delete(id: string) {
      try {
        await apiRequest(`/places/${id}`, {
          method: 'DELETE',
        })
        return { error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to delete place'
        return { error: message }
      }
    },
  },
}
