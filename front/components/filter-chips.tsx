"use client"

import { m } from "motion/react"
import { useId } from "react"
import { cn } from "@/lib/utils"

interface FilterChipsProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

/** Filtros como teclas de tablero; el resaltado se desliza hasta la opción elegida. */
export function FilterChips<T extends string>({ options, value, onChange, label, className }: FilterChipsProps<T>) {
  const group = useId()
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative h-9 rounded-md border px-3.5 font-mono text-[11px] font-semibold tracking-wider uppercase transition-colors",
              active ? "border-transparent text-signal-foreground" : "bg-card text-foreground hover:bg-muted",
            )}
          >
            {active && (
              <m.span
                layoutId={`chip-${group}`}
                className="absolute inset-0 rounded-md bg-signal"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
