import { ResumeUpload } from "@/components/resume/ResumeUpload"
import { UserProfileForm } from "@/components/user-profile/UserProfileForm"
import { Breadcrumbs } from "@/components/Breadcrumbs"

export default function AdminResumePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={[
        { label: "Admin", href: "/admin" },
        { label: "Profil", href: "/admin/resume" }
      ]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profil verwalten</h1>
        <p className="text-muted-foreground mt-2">
          Verwalten Sie Ihren Lebenslauf und Ihre persönlichen Informationen. Diese werden automatisch bei jedem Matching und jeder Generierung verwendet.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResumeUpload />
        <UserProfileForm />
      </div>
    </div>
  )
}


