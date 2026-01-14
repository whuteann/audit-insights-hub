import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
}

export function WizardStepper({ steps, currentStep }: WizardStepperProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <li
              key={step.id}
              className={cn("relative flex-1", index !== steps.length - 1 && "pr-8")}
            >
              <div className="flex items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    isComplete && "bg-wizard-complete text-accent-foreground",
                    isCurrent && "bg-wizard-active text-accent-foreground",
                    isPending && "bg-wizard-pending text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {index !== steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 ml-4",
                      isComplete ? "bg-wizard-complete" : "bg-wizard-pending"
                    )}
                  />
                )}
              </div>
              <div className="mt-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
