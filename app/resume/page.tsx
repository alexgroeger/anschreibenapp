import { ResumeUpload } from "@/components/resume/ResumeUpload"

export default function ResumePage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Lebenslauf verwalten
        </h1>
        <ResumeUpload />
      </div>
    </main>
  )
}
