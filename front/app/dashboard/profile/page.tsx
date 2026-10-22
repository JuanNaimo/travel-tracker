"use client"

import { useState, useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { ChevronRight, Download, LogOut, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { auth } from "@/lib/api-client"
import { useTravelData } from "@/components/travel-data-provider"
import { PageContainer } from "@/components/app-shell"
import { StatTile } from "@/components/stat-tile"
import { MfaSettingsDialog } from "@/components/mfa-settings-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CATEGORIES, CATEGORY_LABELS, daysTraveled, formatDate, formatMoney, plural, tripLength, tripYear } from "@/lib/travel"

const THEMES = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Automático" },
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
    <PageContainer className="flex flex-col gap-5">
      <section className="flex flex-wrap items-center gap-5 rounded-3xl bg-card p-6 lg:gap-6 lg:p-7">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-warm-soft font-display text-3xl font-bold text-warm-foreground lg:size-[104px] lg:text-4xl">
          {initials}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="truncate font-display text-[28px] font-bold tracking-tight lg:text-[32px]">{name}</h1>
          <span className="truncate text-[15px] text-muted-foreground">{user?.email}</span>
          {user?.created_at && <span className="text-sm text-muted-foreground">Viajando con nosotros desde el {formatDate(user.created_at)}</span>}
        </div>
      </section>

      <section aria-label="Totales" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile value={trips.length} label="viajes" />
        <StatTile value={places.length} label="lugares" />
        <StatTile value={daysTraveled(trips)} label="días de viaje" />
        <StatTile value={photos.length} label="fotos" />
        <StatTile value={`$${formatMoney(expenses)}`} label="gastos registrados" />
      </section>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <section className="flex min-w-0 flex-1 flex-col gap-5 rounded-[20px] bg-card p-[22px]">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-bold">Viajes por año</h2>
            {byYear.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cuando cargues viajes con fechas, los vas a ver acá.</p>
            ) : (
              <ul className="flex flex-col">
                {byYear.map((row) => (
                  <li key={row.year} className="flex min-h-[52px] items-center gap-3 border-b last:border-b-0">
                    <span className="w-14 font-display text-lg font-bold">{row.year}</span>
                    <span className="flex-1 text-[15px]">{plural(row.trips, "viaje", "viajes")}</span>
                    <span className="text-[13px] text-muted-foreground">{plural(row.days, "día", "días")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {byCategory.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-xl font-bold">Qué tipo de lugares visitás</h2>
              <ul className="flex flex-col gap-2.5">
                {byCategory.map(({ category, count }) => (
                  <li key={category} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{CATEGORY_LABELS[category]}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(count / byCategory[0].count) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-[20px] bg-card p-[22px]">
          <h2 className="mb-2 font-display text-xl font-bold">Ajustes</h2>

          <div className="flex flex-col gap-2 border-b pt-2.5 pb-3.5">
            <span className="text-sm font-bold">Tema</span>
            <div role="group" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={theme === t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "h-10 rounded-[9px] text-[13px] font-bold",
                    theme === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <MfaSettingsDialog
            onChanged={() => setMfaEnabled((prev) => !(prev ?? user?.mfa_enabled ?? false))}
            trigger={
              <button type="button" className="flex min-h-[60px] items-center justify-between gap-3 border-b text-left">
                <span className="flex items-center gap-3">
                  <ShieldCheck className="size-5 text-primary" aria-hidden />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold">Verificación en dos pasos</span>
                    <span className="text-[13px] text-muted-foreground">{mfaOn ? "Activada" : "Desactivada"}</span>
                  </span>
                </span>
                <ChevronRight className="size-[18px] text-muted-foreground" aria-hidden />
              </button>
            }
          />

          <div className="flex flex-wrap gap-2.5 pt-3.5">
            <Button variant="outline" className="h-11 rounded-xl font-bold" onClick={exportData} disabled={exporting}>
              <Download aria-hidden />
              Exportar mis datos
            </Button>
            <Button variant="outline" className="h-11 rounded-xl font-bold text-destructive hover:text-destructive" onClick={signOut}>
              <LogOut aria-hidden />
              Cerrar sesión
            </Button>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
