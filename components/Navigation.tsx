"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Briefcase,
  FileCheck,
  FolderOpen,
  Settings,
  Database,
  Code,
  BarChart3,
  Home,
  ChevronDown,
  Sparkles,
  Search,
} from "lucide-react"
import { useState, useEffect } from "react"

// Hauptbereich: Anschreiben erstellen
const mainNavItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: BarChart3,
    description: "Übersicht & Statistiken",
  },
  {
    href: "/bewerbungen",
    label: "Bewerbungen",
    icon: Search,
    description: "Suche & Filter",
  },
  {
    href: "/resume",
    label: "Lebenslauf",
    icon: Briefcase,
    description: "Lebenslauf verwalten",
  },
  {
    href: "/cover-letters",
    label: "Alte Anschreiben",
    icon: FolderOpen,
    description: "Historische Anschreiben",
  },
]

// Admin-Bereich
const adminNavItems = [
  {
    href: "/admin",
    label: "Übersicht",
    icon: Home,
    description: "Admin-Dashboard",
  },
  {
    href: "/admin/prompts",
    label: "Prompts",
    icon: Code,
    description: "KI-Prompts verwalten",
  },
  {
    href: "/admin/settings",
    label: "Einstellungen",
    icon: Settings,
    description: "System-Einstellungen",
  },
  {
    href: "/admin/generierung",
    label: "Generierung",
    icon: Sparkles,
    description: "Generierungs-Verwaltung",
  },
  {
    href: "/admin/database",
    label: "Datenbank",
    icon: Database,
    description: "Datenbank-Verwaltung",
  },
]

export function Navigation() {
  const pathname = usePathname()
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const isAdminPage = pathname?.startsWith("/admin")

  const isActive = (href: string) => {
    if (!mounted || !pathname) return false
    if (href === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <FileCheck className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">AI Cover Letter Architect</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            {/* Hauptbereich */}
            <div className="flex items-center space-x-1 mr-4 pr-4 border-r">
              {mainNavItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    title={item.description}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Admin-Bereich */}
            <div className="relative">
              <button
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                className={cn(
                  "inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isAdminPage
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Settings className="h-4 w-4 mr-2" />
                <span>Admin</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 ml-2 transition-transform",
                    adminMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Dropdown Menu */}
              {adminMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setAdminMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-popover border z-20">
                    <div className="py-1">
                      {adminNavItems.map((item) => {
                        const Icon = item.icon
                        const active = pathname === item.href
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setAdminMenuOpen(false)}
                            className={cn(
                              "flex items-center px-4 py-2 text-sm transition-colors",
                              active
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium">{item.label}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {/* Hauptbereich */}
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Anschreiben
          </div>
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-base font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 mr-3" />
                <div>
                  <div>{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </Link>
            )
          })}

          {/* Admin-Bereich */}
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
            Administration
          </div>
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-base font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 mr-3" />
                <div>
                  <div>{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
