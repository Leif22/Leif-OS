import type { StatusChipTone } from "@/components/ui/status-chip";
import type { TaskDerivedStatus, TaskPriority } from "@/lib/tasks/types";

export function taskStatusChipTone(status: TaskDerivedStatus): StatusChipTone {
  switch (status) {
    case "erledigt":
      return "success";
    case "geplant":
      return "primary";
    case "inbox":
    default:
      return "muted";
  }
}

export function taskPriorityChipTone(priority: TaskPriority): StatusChipTone {
  switch (priority) {
    case "high":
      return "warning";
    case "normal":
      return "neutral";
    case "low":
    default:
      return "muted";
  }
}
