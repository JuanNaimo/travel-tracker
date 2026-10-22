"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Briefcase, Home, Image as ImageIcon, Map, MapPin, Plus, User } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/dashboard/trips", label: "Mis viajes", shortLabel: "Viajes", icon: Briefcase },
  { href: "/dashboard/map", label: "Mapa", icon: Map },
  { href: "/dashboard/photos", label: "Fotos", icon: ImageIcon },
  { href: "/dashboard/profile", label: "Perfil", icon: User },
]

// En el celular la barra inferior deja el centro para el botón de nueva entrada
const MOBILE_NAV = [NAV[0], NAV[1], null, NAV[2], NAV[4]]

export const NEW_ENTRY_HREF = "/dashboard/entries/new"

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // El formulario de entrada ocupa la pantalla completa, como en el diseño
  const focused = pathname.startsWith("/dashboard/entries")

  return (
    <div className="min-h-screen bg-background lg:flex">
      {!focused && (
        <aside className="hidden lg:flex w-60 shrink-0 flex-col gap-7 border-r bg-sidebar px-5 py-7 sticky top-0 h-screen">
          <Link href="/dashboard" className="flex items-center gap-2.5 text-foreground">
            <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary text-primary-foreground">
              <MapPin className="size-5" aria-hidden />
            </span>
            <span className="font-display text-[19px] font-bold">Travel Tracker</span>
          </Link>
          <nav aria-label="Navegación principal" className="flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors",
                    active
                      ? "bg-sidebar-accent font-bold text-sidebar-accent-foreground"
                      : "font-medium text-sidebar-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              )
            })}
          </nav>
          <Link
            href={NEW_ENTRY_HREF}
            className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-primary text-[15px] font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-[18px]" aria-hidden />
            Nueva entrada
          </Link>
        </aside>
      )}

      <div className={cn("min-w-0 flex-1", !focused && "pb-24 lg:pb-0")}>{children}</div>

      {!focused && (
        <nav
          aria-label="Navegación principal"
          className="fixed inset-x-0 bottom-0 z-40 flex h-[84px] items-start justify-around border-t bg-card px-2 pt-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {MOBILE_NAV.map((item) => {
            if (!item) {
              return (
                <Link
                  key="new"
                  href={NEW_ENTRY_HREF}
                  aria-label="Nueva entrada"
                  className="-mt-[22px] flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_rgba(11,110,88,0.3)]"
                >
                  <Plus className="size-[26px]" aria-hidden />
                </Link>
              )
            }
            const { href, label, shortLabel, icon: Icon } = item
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-16 flex-col items-center gap-1 pt-1 text-[11px]",
                  active ? "font-bold text-primary" : "font-medium text-muted-foreground",
                )}
              >
                <Icon className="size-[22px]" aria-hidden />
                {shortLabel ?? label}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto w-full max-w-[1120px] px-4 pt-6 pb-10 sm:px-6 lg:px-12 lg:pt-8", className)}>
      {children}
    </main>
  )
}
