"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type WorkflowStep = 'upload' | 'extraction' | 'matching' | 'generation' | 'decision' | 'saved'

interface Step {
  id: WorkflowStep
  label: string
  description: string
}

// Nur die Schritte, die im Stepper angezeigt werden sollen
const visibleSteps: WorkflowStep[] = ['upload', 'extraction', 'matching', 'decision']

const stepDefinitions: Record<WorkflowStep, { label: string; description: string }> = {
  upload: { label: 'Upload', description: 'Datei oder URL hochladen' },
  extraction: { label: 'Extraktion', description: 'Inhalte extrahieren' },
  matching: { label: 'Matching', description: 'Abgleich durchführen' },
  generation: { label: 'Generierung', description: 'Anschreiben erstellen' }, // Nicht sichtbar, aber für interne Logik
  decision: { label: 'Auswahl', description: 'Bewerbung speichern?' },
  saved: { label: 'Gespeichert', description: 'Fertig' }, // Nicht sichtbar, aber für interne Logik
}

const steps = visibleSteps.map(id => ({
  id,
  ...stepDefinitions[id]
}))

interface WorkflowStepperProps {
  currentStep: WorkflowStep
  className?: string
}

export function WorkflowStepper({ currentStep, className }: WorkflowStepperProps) {
  // Map internal steps to visible steps for display
  const getVisibleStep = (step: WorkflowStep): WorkflowStep => {
    if (step === 'generation') return 'decision' // Generation wird als decision angezeigt
    if (step === 'saved') return 'decision' // Saved wird als decision angezeigt
    return step
  }
  
  const visibleStep = getVisibleStep(currentStep)
  const currentStepIndex = steps.findIndex(step => step.id === visibleStep)
  
  // If step is not in visible steps, find the closest visible step
  const effectiveStepIndex = currentStepIndex >= 0 ? currentStepIndex : steps.length - 1

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === visibleStep
          const isCompleted = index < effectiveStepIndex
          const isUpcoming = index > effectiveStepIndex

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isActive && !isCompleted && "border-primary bg-primary/10 text-primary",
                    isUpcoming && "border-muted-foreground/30 bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-[10px] font-semibold">{index + 1}</span>
                  )}
                </div>
                <div className="mt-1 text-center">
                  <p
                    className={cn(
                      "text-[10px] font-medium",
                      isActive && "text-primary",
                      !isActive && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 -mt-3",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

