"use client"

import { cn } from "@/lib/utils"

interface FilterChipsProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  /** "solid" usa el color principal; "ink" el color del texto, para chips sobre el mapa. */
  tone?: "solid" | "ink"
  className?: string
}

export function FilterChips<T extends string>({ options, value, onChange, label, tone = "solid", className }: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 rounded-full border px-4 text-[13px] font-bold transition-colors",
              active
                ? tone === "solid"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-foreground bg-foreground text-background"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
