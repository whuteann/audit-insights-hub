import { Check, Circle, CircleDot, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type StageStatus = "done" | "in_progress" | "locked" | "todo";

interface WizardStage {
  id: string;
  title: string;
  status: StageStatus;
}

interface WizardSection {
  id: string;
  title: string;
  completionPct: number;
  stages: WizardStage[];
}

interface WizardStepperProps {
  sections: WizardSection[];
  currentStageId: string;
  onSelectStage: (id: string) => void;
}

function statusIcon(status: StageStatus) {
  switch (status) {
    case "done":
      return <Check className="h-4 w-4" />;
    case "in_progress":
      return <CircleDot className="h-4 w-4" />;
    case "locked":
      return <Lock className="h-4 w-4" />;
    default:
      return <Circle className="h-3 w-3" />;
  }
}

export function WizardStepper({ sections, currentStageId, onSelectStage }: WizardStepperProps) {
  return (
    <nav aria-label="Section navigation" className="space-y-6">
      {sections.map((section) => (
        <div key={section.id} className="space-y-3">
          {section.title ? (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold tracking-wide uppercase">{section.title}</span>
              <span>{section.completionPct}%</span>
            </div>
          ) : null}
          <div className="space-y-1">
            {section.stages.map((stage) => {
              const isCurrent = stage.id === currentStageId;
              const isLocked = stage.status === "locked";

              console.log(stage.title, stage.status);
              return (
                <button
                  key={stage.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => onSelectStage(stage.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left text-sm transition",
                    "hover:bg-muted/30",
                    isCurrent && "border-primary/60 bg-primary/5",
                    isLocked && "cursor-not-allowed opacity-60"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                        stage.status === "done" && "border-emerald-500/40 text-emerald-600",
                        stage.status === "in_progress" && "border-amber-400/40 text-amber-600",
                        stage.status === "locked" && "border-muted-foreground/30 text-muted-foreground",
                        stage.status === "todo" && "border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {statusIcon(stage.status)}
                    </span>
                    <div>
                      <p className={cn("font-medium", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                        {stage.title}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {stage.status.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
