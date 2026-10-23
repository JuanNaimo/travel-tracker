import type React from "react"
import type { Metadata } from "next"
import { Anton, Inter_Tight, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { UiProviders } from "@/components/ui-providers"
import "./globals.css"

const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" })
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" })
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-jetbrains" })

export const metadata: Metadata = {
  title: "Travel Tracker - Organiza tus viajes",
  description: "Llevá el diario de tus viajes: lugares, fotos, descripciones y el mapa de todo lo que recorriste.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${interTight.variable} ${anton.variable} ${jetbrains.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <UiProviders>
            {children}
            <Toaster richColors position="top-center" />
          </UiProviders>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
