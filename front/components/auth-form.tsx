"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/api-client"
import { AirplaneTiltIcon, ShieldCheckIcon } from "@phosphor-icons/react"

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-2xl border bg-card shadow-none">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-xl bg-signal text-signal-foreground">
            {mfaToken ? <ShieldCheckIcon className="size-7" weight="fill" aria-hidden /> : <AirplaneTiltIcon className="size-7" weight="fill" aria-hidden />}
          </div>
          <CardTitle className="title-board text-[44px]">{mfaToken ? "Verificación en dos pasos" : "Travel Tracker"}</CardTitle>
          <CardDescription>
            {mfaToken
              ? "Ingresa el código de 6 dígitos de tu app autenticadora o un código de recuperación"
              : isLogin
                ? "El diario de tus viajes: lugares, fotos y todo lo que viviste"
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

              {error && <div role="alert" className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

              <Button type="submit" className="h-11 w-full rounded-xl font-bold" disabled={loading}>
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

                {error && <div role="alert" className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

                <Button type="submit" className="h-11 w-full rounded-xl font-bold" disabled={loading}>
                  {loading ? "Cargando..." : isLogin ? "Iniciar sesión" : "Crear cuenta"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="label-mono font-semibold text-signal-text hover:underline"
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
