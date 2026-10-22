import "leaflet/dist/leaflet.css"
import { AppShell } from "@/components/app-shell"
import { TravelDataProvider } from "@/components/travel-data-provider"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TravelDataProvider>
      <AppShell>{children}</AppShell>
    </TravelDataProvider>
  )
}
