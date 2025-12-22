import { ApplicationDashboard } from "@/components/applications/ApplicationDashboard"

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Bewerbungs-Dashboard
        </h1>
        <ApplicationDashboard />
      </div>
    </main>
  )
}
