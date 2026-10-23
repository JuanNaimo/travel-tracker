"use client"

import { IconContext, type IconProps } from "@phosphor-icons/react"
import { domMax, LazyMotion, MotionConfig } from "motion/react"

const ICONS: IconProps = { weight: "bold", size: "1em" }

/** Íconos en trazo grueso por defecto y animaciones que respetan "reducir movimiento". */
export function UiProviders({ children }: { children: React.ReactNode }) {
  return (
    <IconContext.Provider value={ICONS}>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </IconContext.Provider>
  )
}
