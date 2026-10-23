"use client"

import type React from "react"

import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { ShieldCheckIcon, SpinnerGapIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { auth, mfa } from "@/lib/api-client"

type Step =
  | { kind: "loading" }
  | { kind: "disabled" }
  | { kind: "setup"; secret: string; otpauthUrl: string }
  | { kind: "recovery"; codes: string[] }
  | { kind: "enabled" }

const errorText: Record<string, string> = {
  "Invalid code": "Código incorrecto.",
  "Invalid password": "Contraseña incorrecta.",
  "Too many attempts, try again later": "Demasiados intentos. Prueba de nuevo más tarde.",
}

interface MfaSettingsDialogProps {
  trigger?: React.ReactNode
  /** Se llama cuando se activa o desactiva la verificación. */
  onChanged?: () => void
}

export function MfaSettingsDialog({ trigger, onChanged }: MfaSettingsDialogProps = {}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>({ kind: "loading" })
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setCode("")
    setPassword("")
    setError(null)
  }

  const handleOpenChange = async (next: boolean) => {
    setOpen(next)
    reset()
    if (!next) return
    setStep({ kind: "loading" })
    const { user, error } = await auth.getUser()
    if (error || !user) {
      setError(error ?? "No se pudo cargar tu cuenta.")
      setStep({ kind: "disabled" })
      return
    }
    setStep({ kind: user.mfa_enabled ? "enabled" : "disabled" })
  }

  const startSetup = async () => {
    setBusy(true)
    setError(null)
    const { data, error } = await mfa.setup()
    setBusy(false)
    if (error || !data) {
      setError(error ?? "No se pudo iniciar la configuración.")
      return
    }
    setStep({ kind: "setup", secret: data.secret, otpauthUrl: data.otpauth_url })
  }

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { data, error } = await mfa.enable(code.trim())
    setBusy(false)
    if (error || !data) {
      setError(errorText[error ?? ""] ?? error ?? "No se pudo activar.")
      return
    }
    reset()
    setStep({ kind: "recovery", codes: data.recovery_codes })
    toast.success("Verificación en dos pasos activada.")
    onChanged?.()
  }

  const disable = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await mfa.disable(password, code.trim())
    setBusy(false)
    if (error) {
      setError(errorText[error] ?? error)
      return
    }
    reset()
    setStep({ kind: "disabled" })
    toast.success("Verificación en dos pasos desactivada.")
    onChanged?.()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost">
            <ShieldCheckIcon className="w-4 h-4 mr-2" />
            Seguridad
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verificación en dos pasos</DialogTitle>
          <DialogDescription>
            Protege tu cuenta pidiendo un código de una app autenticadora (Google Authenticator, Authy, 1Password…)
            además de tu contraseña.
          </DialogDescription>
        </DialogHeader>

        {step.kind === "loading" && (
          <div className="flex justify-center py-6">
            <SpinnerGapIcon className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {step.kind === "disabled" && (
          <DialogFooter>
            <Button onClick={startSetup} disabled={busy}>
              {busy && <SpinnerGapIcon className="w-4 h-4 mr-2 animate-spin" />}
              Activar
            </Button>
          </DialogFooter>
        )}

        {step.kind === "setup" && (
          <form onSubmit={confirmSetup} className="space-y-4">
            <p className="text-sm">1. Escanea este código QR con tu app autenticadora:</p>
            <div className="flex justify-center rounded-md bg-white p-4">
              <QRCodeSVG value={step.otpauthUrl} size={180} />
            </div>
            <p className="text-xs text-muted-foreground">
              ¿No puedes escanearlo? Ingresa esta clave manualmente:
              <code className="mt-1 block break-all rounded bg-muted px-2 py-1 font-mono">{step.secret}</code>
            </p>
            <div className="space-y-2">
              <Label htmlFor="mfa-setup-code">2. Ingresa el código de 6 dígitos que muestra la app</Label>
              <Input
                id="mfa-setup-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                {busy && <SpinnerGapIcon className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar
              </Button>
            </DialogFooter>
          </form>
        )}

        {step.kind === "recovery" && (
          <div className="space-y-4">
            <p className="text-sm">
              Guarda estos códigos de recuperación en un lugar seguro. Cada uno sirve <strong>una sola vez</strong> si
              pierdes acceso a tu app autenticadora. No se volverán a mostrar.
            </p>
            <ul className="grid grid-cols-2 gap-2 rounded-md bg-muted p-3 font-mono text-sm">
              {step.codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(step.codes.join("\n"))
                  toast.success("Códigos copiados.")
                }}
              >
                Copiar
              </Button>
              <Button onClick={() => setStep({ kind: "enabled" })}>Ya los guardé</Button>
            </DialogFooter>
          </div>
        )}

        {step.kind === "enabled" && (
          <form onSubmit={disable} className="space-y-4">
            <p className="text-sm text-green-700">La verificación en dos pasos está activa.</p>
            <p className="text-sm">Para desactivarla, confirma tu contraseña y un código actual (o de recuperación).</p>
            <div className="space-y-2">
              <Label htmlFor="mfa-disable-password">Contraseña</Label>
              <Input
                id="mfa-disable-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mfa-disable-code">Código</Label>
              <Input
                id="mfa-disable-code"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={busy}>
                {busy && <SpinnerGapIcon className="w-4 h-4 mr-2 animate-spin" />}
                Desactivar
              </Button>
            </DialogFooter>
          </form>
        )}

        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
      </DialogContent>
    </Dialog>
  )
}
