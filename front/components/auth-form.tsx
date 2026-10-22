"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/api-client"
import { MapPin, ShieldCheck } from "lucide-react"

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mfaToken, setMfaToken] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = isLogin ? await auth.signIn(email, password) : await auth.signUp(email, password)

      if (result.error) {
        setError(result.error)
      } else if (result.mfaToken) {
        setMfaToken(result.mfaToken)
      } else {
        window.location.href = "/dashboard"
      }
    } catch {
      setError("Ha ocurrido un error. Por favor intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaToken) return
    setLoading(true)
    setError(null)

    const result = await auth.verifyMfa(mfaToken, code.trim())
    setLoading(false)

    if (result.error) {
      setError(result.error === "Invalid code" ? "Código incorrecto." : result.error)
      return
    }
    window.location.href = "/dashboard"
  }

  const backToLogin = () => {
    setMfaToken(null)
    setCode("")
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-teal-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-2">
            {mfaToken ? <ShieldCheck className="w-6 h-6 text-white" /> : <MapPin className="w-6 h-6 text-white" />}
          </div>
          <CardTitle className="text-2xl">{mfaToken ? "Verificación en dos pasos" : "Travel Tracker"}</CardTitle>
          <CardDescription>
            {mfaToken
              ? "Ingresa el código de 6 dígitos de tu app autenticadora o un código de recuperación"
              : isLogin
                ? "Inicia sesión para ver tus viajes"
                : "Crea tu cuenta para comenzar"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mfaToken ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Código</Label>
                <Input
                  id="mfa-code"
                  inputMode="text"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verificando..." : "Verificar"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={backToLogin} disabled={loading}>
                Volver
              </Button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isLogin ? undefined : 8}
                    maxLength={72}
                    disabled={loading}
                  />
                </div>

                {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Cargando..." : isLogin ? "Iniciar sesión" : "Crear cuenta"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-600 hover:underline"
                  disabled={loading}
                >
                  {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
