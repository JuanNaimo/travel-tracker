export type User = {
  id: string
  email: string
  name?: string
  user_metadata?: Record<string, unknown>
  mfa_enabled: boolean
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

export type PlacePhotoGroup = {
  place: Place
  photos: PlacePhoto[]
}

export type PhotoMapTarget = {
  place: Place
  photo: PlacePhoto
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_KEY = 'user'

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_at: string
  user: User
}

type MfaChallenge = {
  mfa_required: true
  mfa_token: string
}

type LoginResponse = TokenResponse | MfaChallenge

export type SignInResult =
  | { user: User; mfaToken: null; error: null }
  | { user: null; mfaToken: string; error: null }
  | { user: null; mfaToken: null; error: string }

const isBrowser = () => typeof window !== 'undefined'

function storeSession(response: TokenResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token)
  localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token)
  localStorage.setItem(USER_KEY, JSON.stringify(response.user))
}

function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

async function rawRequest<T>(endpoint: string, options: RequestInit, accessToken: string | null): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })
  } catch {
    throw new ApiError('Network error or server unavailable')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData
    )
  }

  return await response.json()
}

// Un solo refresh en curso aunque varias requests reciban 401 a la vez
let refreshPromise: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return false

  refreshPromise ??= rawRequest<TokenResponse>(
    '/auth/refresh',
    { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) },
    null
  )
    .then((response) => {
      storeSession(response)
      return true
    })
    .catch(() => {
      clearSession()
      return false
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = isBrowser() ? localStorage.getItem(ACCESS_TOKEN_KEY) : null

  try {
    return await rawRequest<T>(endpoint, options, token)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !isBrowser()) throw error
    if (!(await refreshSession())) throw error
    return await rawRequest<T>(endpoint, options, localStorage.getItem(ACCESS_TOKEN_KEY))
  }
}

export const auth = {
  async signIn(email: string, password: string): Promise<SignInResult> {
    try {
      const response = await rawRequest<LoginResponse>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
        null
      )

      if ('mfa_required' in response) {
        return { user: null, mfaToken: response.mfa_token, error: null }
      }

      storeSession(response)
      return { user: response.user, mfaToken: null, error: null }
    } catch (error) {
      return { user: null, mfaToken: null, error: errorMessage(error, 'Login failed') }
    }
  },

  async verifyMfa(mfaToken: string, code: string) {
    try {
      const response = await rawRequest<TokenResponse>(
        '/auth/mfa/verify',
        { method: 'POST', body: JSON.stringify({ mfa_token: mfaToken, code }) },
        null
      )
      storeSession(response)
      return { user: response.user, error: null }
    } catch (error) {
      return { user: null, error: errorMessage(error, 'Verification failed') }
    }
  },

  async signUp(email: string, password: string, metadata?: Record<string, unknown>): Promise<SignInResult> {
    try {
      await rawRequest<{ success: boolean; userId: string }>(
        '/auth/register',
        { method: 'POST', body: JSON.stringify({ email, password, metadata: metadata || {} }) },
        null
      )
      return await this.signIn(email, password)
    } catch (error) {
      return { user: null, mfaToken: null, error: errorMessage(error, 'Registration failed') }
    }
  },

  async signOut() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    try {
      if (refreshToken) {
        await rawRequest('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) }, null)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearSession()
    }
    return { error: null }
  },

  async getUser(): Promise<{ user: User | null; error: string | null }> {
    if (!localStorage.getItem(REFRESH_TOKEN_KEY)) {
      return { user: null, error: null }
    }
    try {
      const user = await apiRequest<User>('/auth/me')
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      return { user, error: null }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession()
        return { user: null, error: 'Session expired' }
      }
      return { user: null, error: errorMessage(error, 'Failed to fetch user') }
    }
  },

  getCurrentUser(): User | null {
    if (!isBrowser()) return null
    const userStr = localStorage.getItem(USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  },
}

export const mfa = {
  async setup() {
    try {
      const data = await apiRequest<{ secret: string; otpauth_url: string }>('/auth/mfa/setup', { method: 'POST' })
      return { data, error: null }
    } catch (error) {
      return { data: null, error: errorMessage(error, 'Failed to start MFA setup') }
    }
  },

  async enable(code: string) {
    try {
      const data = await apiRequest<{ recovery_codes: string[] }>('/auth/mfa/enable', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      return { data, error: null }
    } catch (error) {
      return { data: null, error: errorMessage(error, 'Failed to enable MFA') }
    }
  },

  async disable(password: string, code: string) {
    try {
      await apiRequest('/auth/mfa/disable', { method: 'POST', body: JSON.stringify({ password, code }) })
      return { error: null }
    } catch (error) {
      return { error: errorMessage(error, 'Failed to disable MFA') }
    }
  },
}

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

  photos: {
    async getByTripId(tripId: string) {
      try {
        const data = await apiRequest<PlacePhoto[]>(`/trips/${tripId}/photos`)
        return { data, error: null }
      } catch (error) {
        return { data: [] as PlacePhoto[], error: errorMessage(error, 'Failed to fetch photos') }
      }
    },
    async getByPlaceId(placeId: string) {
      try {
        const data = await apiRequest<PlacePhoto[]>(`/places/${placeId}/photos`)
        return { data, error: null }
      } catch (error) {
        return { data: [] as PlacePhoto[], error: errorMessage(error, 'Failed to fetch photos') }
      }
    },
    async create(photo: { place_id: string; photo_url: string; caption?: string | null }) {
      try {
        const data = await apiRequest<PlacePhoto>(`/places/${photo.place_id}/photos`, {
          method: 'POST',
          body: JSON.stringify({ photo_url: photo.photo_url, caption: photo.caption }),
        })
        return { data, error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to create photo'
        return { data: null, error: message }
      }
    },
    async delete(id: string) {
      try {
        await apiRequest(`/photos/${id}`, { method: 'DELETE' })
        return { error: null }
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Failed to delete photo'
        return { error: message }
      }
    },
  },
}
