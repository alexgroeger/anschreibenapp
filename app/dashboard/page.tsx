import { DashboardOverview } from "@/components/dashboard/DashboardOverview"

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <DashboardOverview />
      </div>
    </main>
  )
}
