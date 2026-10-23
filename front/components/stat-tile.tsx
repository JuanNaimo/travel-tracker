import { cn } from "@/lib/utils"

export function StatTile({ value, label, className }: { value: string | number; label: string; className?: string }) {
  const text = typeof value === "number" ? value.toLocaleString("es-AR") : value
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-3.5 py-3 lg:px-4 lg:py-3.5", className)}>
      <span className="label-mono truncate text-[10px] text-muted-foreground">{label}</span>
      {/* Los montos largos achican la letra para entrar en tarjetas angostas */}
      <span className={cn("truncate font-mono font-bold tabular-nums", text.length > 6 ? "text-lg lg:text-xl" : "text-2xl lg:text-[28px]")}>
        {text}
      </span>
    </div>
  )
}
