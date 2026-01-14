import { cn } from "@/lib/utils";

type StatusType = "draft" | "generated" | "processing";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-status-draft/20 text-status-draft",
  },
  generated: {
    label: "Generated",
    className: "bg-status-generated text-status-generated-foreground",
  },
  processing: {
    label: "Processing",
    className: "bg-status-processing text-status-processing-foreground",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
