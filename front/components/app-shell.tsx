"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { m } from "motion/react"
import {
  AirplaneTiltIcon,
  HouseIcon,
  ImagesIcon,
  MapTrifoldIcon,
  PlusIcon,
  SuitcaseRollingIcon,
  UserIcon,
  type Icon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string; short: string; icon: Icon }

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Hoy", short: "Hoy", icon: HouseIcon },
  { href: "/dashboard/trips", label: "Mis viajes", short: "Viajes", icon: SuitcaseRollingIcon },
  { href: "/dashboard/map", label: "Mapa", short: "Mapa", icon: MapTrifoldIcon },
  { href: "/dashboard/photos", label: "Fotos", short: "Fotos", icon: ImagesIcon },
  { href: "/dashboard/profile", label: "Perfil", short: "Yo", icon: UserIcon },
]

// En el celular la barra deja el centro para el botón de nueva entrada
const MOBILE_NAV = [NAV[0], NAV[1], null, NAV[2], NAV[4]]

export const NEW_ENTRY_HREF = "/dashboard/entries/new"

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href)
}

const SPRING = { type: "spring", stiffness: 500, damping: 40 } as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // El formulario de entrada ocupa la pantalla completa, como en el diseño
  const focused = pathname.startsWith("/dashboard/entries")

  return (
    <div className="min-h-screen bg-background lg:flex">
      {!focused && (
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-8 border-r bg-sidebar px-4 py-7 lg:flex">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-2 text-foreground">
            <span className="flex size-9 items-center justify-center rounded-lg bg-signal text-signal-foreground">
              <AirplaneTiltIcon className="size-5" weight="fill" aria-hidden />
            </span>
            <span className="title-board text-[22px]">Travel Tracker</span>
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
                    "relative flex h-11 items-center gap-3 rounded-lg px-3 font-mono text-[12px] font-semibold tracking-wider uppercase transition-colors",
                    active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-muted",
                  )}
                >
                  {active && <m.span layoutId="sidebar-active" className="absolute inset-0 rounded-lg bg-sidebar-accent" transition={SPRING} />}
                  <Icon className="relative size-5" weight={active ? "fill" : "bold"} aria-hidden />
                  <span className="relative">{label}</span>
                </Link>
              )
            })}
          </nav>
          <Link
            href={NEW_ENTRY_HREF}
            className="mt-auto flex h-12 items-center justify-between rounded-xl bg-signal px-4 text-[15px] font-bold text-signal-foreground transition-transform hover:-translate-y-0.5"
          >
            Nueva entrada
            <PlusIcon className="size-5" aria-hidden />
          </Link>
        </aside>
      )}

      <div className={cn("min-w-0 flex-1", !focused && "pb-28 lg:pb-0")}>{children}</div>

      {!focused && (
        <nav
          aria-label="Navegación principal"
          className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex h-16 items-center justify-around rounded-[20px] bg-[#1c1d21] px-1 text-[#a3a6ad] shadow-[0_10px_30px_rgba(0,0,0,0.35)] lg:hidden"
        >
          {MOBILE_NAV.map((item) => {
            if (!item) {
              return (
                <Link
                  key="new"
                  href={NEW_ENTRY_HREF}
                  aria-label="Nueva entrada"
                  className="flex size-12 items-center justify-center rounded-[14px] bg-signal text-signal-foreground transition-transform active:scale-95"
                >
                  <PlusIcon className="size-6" aria-hidden />
                </Link>
              )
            }
            const { href, short, icon: Icon } = item
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex w-16 flex-col items-center gap-1 py-1.5 font-mono text-[10px] font-semibold tracking-wider uppercase",
                  active && "text-[#ffc72c]",
                )}
              >
                <Icon className="size-[22px]" weight={active ? "fill" : "bold"} aria-hidden />
                {short}
                {active && <m.span layoutId="tabbar-active" className="absolute -bottom-1 h-[3px] w-6 rounded-full bg-[#ffc72c]" transition={SPRING} />}
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
    <main className={cn("mx-auto w-full max-w-[1120px] px-[18px] pt-6 pb-10 sm:px-6 lg:px-12 lg:pt-9", className)}>{children}</main>
  )
}
