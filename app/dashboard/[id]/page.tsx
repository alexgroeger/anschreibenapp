import dynamicImport from "next/dynamic"
import { Suspense } from "react"

// Route segment config for performance
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ApplicationDetail = dynamicImport(
  () => import("@/components/applications/ApplicationDetail").then((mod) => ({ default: mod.ApplicationDetail })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    ),
    ssr: true,
  }
)

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <ApplicationDetail />
        </Suspense>
      </div>
    </main>
  )
}
