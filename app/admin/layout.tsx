"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Code, Settings, Database, Sparkles, Briefcase } from "lucide-react"

const adminNavItems = [
  {
    href: "/admin",
    label: "Übersicht",
    icon: Home,
  },
  {
    href: "/admin/resume",
    label: "Lebenslauf",
    icon: Briefcase,
  },
  {
    href: "/admin/prompts",
    label: "Prompts",
    icon: Code,
  },
  {
    href: "/admin/settings",
    label: "Einstellungen",
    icon: Settings,
  },
  {
    href: "/admin/generierung",
    label: "Generierung",
    icon: Sparkles,
  },
  {
    href: "/admin/database",
    label: "Datenbank",
    icon: Database,
  },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-muted/40 p-4">
        <div className="space-y-1">
          <div className="px-3 py-2 mb-4">
            <h2 className="text-lg font-semibold">Administration</h2>
            <p className="text-sm text-muted-foreground">
              System-Verwaltung
            </p>
          </div>
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 mr-3" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  )
}

