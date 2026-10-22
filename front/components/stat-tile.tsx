import { cn } from "@/lib/utils"

export function StatTile({ value, label, className }: { value: string | number; label: string; className?: string }) {
  const text = typeof value === "number" ? value.toLocaleString("es-AR") : value
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5 rounded-2xl bg-card px-4 py-3.5 lg:px-5 lg:py-4", className)}>
      {/* Los montos largos achican la letra para entrar en tarjetas angostas */}
      <span className={cn("truncate font-display font-bold", text.length > 6 ? "text-lg lg:text-2xl" : "text-2xl lg:text-[30px]")}>
        {text}
      </span>
      <span className="text-xs text-muted-foreground lg:text-[13px]">{label}</span>
    </div>
  )
}
