"use client"

import { m } from "motion/react"

/**
 * Cada pantalla entra con un fundido. Solo opacidad: un transform acá cambiaría la referencia
 * de los elementos fijos de la página (la barra de guardar del formulario, por ejemplo).
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      {children}
    </m.div>
  )
}
