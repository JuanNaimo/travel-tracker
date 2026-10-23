/** Código de barras decorativo, siempre igual para el mismo texto. */
export function Barcode({ seed, className }: { seed: string; className?: string }) {
  let hash = 2166136261
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)

  const bars: { x: number; w: number }[] = []
  let x = 0
  while (x < 86) {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
    const w = 1 + (Math.abs(hash) % 3)
    bars.push({ x, w })
    x += w + 1 + (Math.abs(hash >> 4) % 2)
  }

  return (
    <svg viewBox="0 0 88 30" className={className} aria-hidden>
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} width={bar.w} height="30" fill="currentColor" />
      ))}
    </svg>
  )
}
