"use client"

import { useState, useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { m } from "motion/react"
import { CaretRightIcon, DownloadSimpleIcon, MoonIcon, ShieldCheckIcon, SignOutIcon, SunIcon, CircleHalfIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { auth } from "@/lib/api-client"
import { useTravelData } from "@/components/travel-data-provider"
import { PageContainer } from "@/components/app-shell"
import { StatTile } from "@/components/stat-tile"
import { MfaSettingsDialog } from "@/components/mfa-settings-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Barcode } from "@/components/barcode"
import { CATEGORIES, CATEGORY_LABELS, daysTraveled, formatDate, formatMoney, plural, tripLength, tripYear } from "@/lib/travel"

const THEMES = [
  { value: "dark", label: "Noche", icon: MoonIcon },
  { value: "light", label: "Día", icon: SunIcon },
  { value: "system", label: "Auto", icon: CircleHalfIcon },
]

export default function ProfilePage() {
  const { user, trips, places, photos } = useTravelData()
  const { theme: storedTheme, setTheme } = useTheme()
  // El tema guardado solo se conoce en el navegador
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const theme = mounted ? storedTheme : undefined
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null)
  const [exporting, setExporting] = useState(false)

  const metaName = user?.user_metadata?.name
  const name = typeof metaName === "string" && metaName ? metaName : (user?.email.split("@")[0] ?? "")
  const initials = name.slice(0, 2).toUpperCase()
  const expenses = places.reduce((sum, p) => sum + p.expenses, 0)

  const byYear = [...new Set(trips.map(tripYear).filter((y): y is string => !!y))]
    .sort()
    .reverse()
    .map((year) => {
      const list = trips.filter((t) => tripYear(t) === year)
      return { year, trips: list.length, days: list.reduce((sum, t) => sum + (tripLength(t) ?? 0), 0) }
    })
  const byCategory = CATEGORIES.map((c) => ({ category: c, count: places.filter((p) => p.category === c).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)

  const exportData = () => {
    setExporting(true)
    try {
      const backup = { exported_at: new Date().toISOString(), user: user?.email, trips, places, photos }
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }))
      const link = document.createElement("a")
      link.href = url
      link.download = `travel-tracker-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      toast.success("Descargaste una copia de tus viajes.")
    } finally {
      setExporting(false)
    }
  }

  const signOut = async () => {
    await auth.signOut()
    window.location.href = "/"
  }

  const mfaOn = mfaEnabled ?? user?.mfa_enabled ?? false

  return (
    <PageContainer className="flex flex-col gap-6">
      <span className="label-mono text-muted-foreground">Pasajero frecuente</span>

      {/* La cuenta como una tarjeta de pasajero */}
      <m.section
        initial={{ opacity: 0, rotateX: -12, y: 12 }}
        animate={{ opacity: 1, rotateX: 0, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="grid overflow-hidden rounded-2xl bg-ticket text-ticket-foreground sm:grid-cols-[minmax(0,1fr)_200px]"
      >
        <div className="flex items-center gap-5 p-5 lg:p-7">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-[#101113] font-display text-4xl text-[#ffc72c] lg:size-24 lg:text-5xl">
            {initials}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-mono text-[10px] text-ticket-muted">PASAJERO</span>
            <h1 className="title-board truncate text-[40px] lg:text-[52px]">{name}</h1>
            <span className="truncate font-mono text-xs">{user?.email}</span>
            {user?.created_at && <span className="font-mono text-[10px] text-ticket-muted uppercase">Desde {formatDate(user.created_at)}</span>}
          </div>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t-2 border-dashed border-perforation p-5 sm:border-t-0 sm:border-l-2">
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="flex flex-col">
              <span className="text-[9px] text-ticket-muted">MILLAS*</span>
              <span className="text-lg font-bold">{(daysTraveled(trips) * 100).toLocaleString("es-AR")}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-ticket-muted">CATEGORÍA</span>
              <span className="text-lg font-bold">{trips.length >= 10 ? "ORO" : trips.length >= 4 ? "PLATA" : "BASE"}</span>
            </div>
          </div>
          <Barcode seed={user?.id ?? name} className="h-9 w-full" />
          <span className="font-mono text-[9px] text-ticket-muted">*100 por día de viaje</span>
        </div>
      </m.section>

      <section aria-label="Totales" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile value={trips.length} label="Viajes" />
        <StatTile value={places.length} label="Lugares" />
        <StatTile value={daysTraveled(trips)} label="Días fuera" />
        <StatTile value={photos.length} label="Fotos" />
        <StatTile value={`$${formatMoney(expenses)}`} label="Gastos" />
      </section>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <section className="flex min-w-0 flex-1 flex-col gap-6 rounded-xl border bg-card p-5">
          <div className="flex flex-col gap-2">
            <h2 className="title-board text-2xl">Viajes por año</h2>
            {byYear.length === 0 ? (
              <p className="label-mono text-muted-foreground">Cuando cargues viajes con fechas, aparecen acá</p>
            ) : (
              <ul className="flex flex-col font-mono">
                {byYear.map((row) => (
                  <li key={row.year} className="grid min-h-12 grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 border-b last:border-b-0">
                    <span className="font-display text-2xl text-signal-text">{row.year}</span>
                    <span className="text-sm">{plural(row.trips, "viaje", "viajes")}</span>
                    <span className="text-xs text-muted-foreground">{plural(row.days, "día", "días")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {byCategory.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="title-board text-2xl">Qué visitás</h2>
              <ul className="flex flex-col gap-3">
                {byCategory.map(({ category, count }, i) => (
                  <li key={category} className="flex flex-col gap-1.5">
                    <div className="flex justify-between font-mono text-[11px] uppercase">
                      <span className="font-semibold">{CATEGORY_LABELS[category]}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-[2px] bg-muted">
                      <m.div
                        className="h-full bg-signal"
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / byCategory[0].count) * 100}%` }}
                        transition={{ duration: 0.6, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl border bg-card p-5">
          <h2 className="title-board mb-3 text-2xl">Ajustes</h2>

          <div className="flex flex-col gap-2 border-b pb-4">
            <span className="label-mono font-semibold">Tema</span>
            <div role="group" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={theme === value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "relative flex h-10 items-center justify-center gap-1.5 rounded-md font-mono text-[11px] font-semibold tracking-wider uppercase",
                    theme === value ? "text-signal-foreground" : "text-muted-foreground",
                  )}
                >
                  {theme === value && <m.span layoutId="theme-active" className="absolute inset-0 rounded-md bg-signal" />}
                  <Icon className="relative size-4" weight={theme === value ? "fill" : "bold"} aria-hidden />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <MfaSettingsDialog
            onChanged={() => setMfaEnabled((prev) => !(prev ?? user?.mfa_enabled ?? false))}
            trigger={
              <button type="button" className="flex min-h-[64px] items-center justify-between gap-3 border-b text-left">
                <span className="flex items-center gap-3">
                  <ShieldCheckIcon className="size-6 text-signal-text" weight={mfaOn ? "fill" : "bold"} aria-hidden />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">Verificación en dos pasos</span>
                    <span className="label-mono text-[10px] text-muted-foreground">{mfaOn ? "Activada" : "Desactivada"}</span>
                  </span>
                </span>
                <CaretRightIcon className="size-[18px] text-muted-foreground" aria-hidden />
              </button>
            }
          />

          <div className="flex flex-wrap gap-2 pt-4">
            <Button variant="outline" className="h-11 rounded-xl bg-card" onClick={exportData} disabled={exporting}>
              <DownloadSimpleIcon aria-hidden />
              Exportar mis datos
            </Button>
            <Button variant="outline" className="h-11 rounded-xl bg-card text-destructive hover:text-destructive" onClick={signOut}>
              <SignOutIcon aria-hidden />
              Cerrar sesión
            </Button>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
