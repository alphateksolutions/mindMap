export type Project = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "planning" | "doing" | "paused" | "done";
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkNode = {
  id: string;
  projectId: string;
  parentId?: string | null;

  type: "project" | "task" | "subtask" | "step";

  title: string;
  content: string;

  status: "todo" | "doing" | "paused" | "done" | "overdue";
  priority: "low" | "medium" | "high" | "urgent";
  autoCompleted?: boolean;

  startTime?: string | null;
  dueTime?: string | null;
  completedTime?: string | null;

  estimatedHours?: number;
  actualHours?: number;

  delayReason?: string;
  rescheduledTime?: string | null;
  delayNote?: string;

  tags: string[];
  notes?: string;
  links?: string[];

  mindmapPosition: {
    x: number;
    y: number;
  };

  createdAt: string;
  updatedAt: string;
};

export type WorkEdge = {
  id: string;
  projectId: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type: "parent-child" | "dependency" | "next-step" | string;
  label?: string;
};

export type ViewType = "mindmap" | "list";
