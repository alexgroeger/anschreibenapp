import { ResumeUpload } from "@/components/resume/ResumeUpload"
import { Breadcrumbs } from "@/components/Breadcrumbs"

export default function AdminResumePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={[
        { label: "Admin", href: "/admin" },
        { label: "Lebenslauf", href: "/admin/resume" }
      ]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Lebenslauf verwalten</h1>
        <p className="text-muted-foreground mt-2">
          Verwalten Sie Ihren Lebenslauf einmalig. Dieser wird automatisch bei jedem Matching und jeder Generierung verwendet.
        </p>
      </div>
      <ResumeUpload />
    </div>
  )
}


