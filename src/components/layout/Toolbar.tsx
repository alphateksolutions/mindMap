import { List, Map, Plus } from "lucide-react";
import { differenceInCalendarDays, startOfDay, subDays } from "date-fns";
import toast from "react-hot-toast";
import { useStore } from "../../store/useStore";
import { cn } from "../../utils";
import { createId } from "../../utils/id";
import type { WorkNode } from "../../types";

const DAY_WIDTH = 320;
const COLUMN_TOP = 108;
const NODE_WIDTH: Record<WorkNode["type"], number> = {
  project: 280,
  task: 224,
  subtask: 208,
  step: 192,
};

function getNodeDisplayPosition(node: WorkNode, timelineStartDate: Date) {
  if (!node.startTime) {
    return node.mindmapPosition || { x: -120, y: COLUMN_TOP };
  }

  const dayIndex = differenceInCalendarDays(startOfDay(new Date(node.startTime)), timelineStartDate);
  const width = NODE_WIDTH[node.type] || NODE_WIDTH.step;

  return {
    x: dayIndex * DAY_WIDTH + (DAY_WIDTH - width) / 2,
    y: Math.max(COLUMN_TOP, node.mindmapPosition?.y || COLUMN_TOP),
  };
}

function AddButton({
  label,
  enabled,
  title,
  primary,
  onClick,
}: {
  label: string;
  enabled: boolean;
  title: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      title={title}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold shadow-sm transition",
        enabled && primary && "bg-indigo-600 text-white hover:bg-indigo-700",
        enabled && !primary && "border border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700",
        !enabled && "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 shadow-none"
      )}
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function Toolbar() {
  const { activeView, setActiveView, addNode, addEdge, activeProjectId, selectedNodeId, nodes, projects } = useStore();
  const project = projects.find(item => item.id === activeProjectId);
  const selectedNode = nodes.find(node => node.id === selectedNodeId);
  const timelineStartDate = subDays(startOfDay(project?.startDate ? new Date(project.startDate) : new Date()), 3);

  const canAddTask = !selectedNode || selectedNode.type === "project";
  const canAddSubtask = selectedNode?.type === "task";
  const canAddStep = selectedNode?.type === "subtask" || selectedNode?.type === "step";

  const handleAdd = (type: "task" | "subtask" | "step") => {
    if (!activeProjectId) return;

    let parentId: string | undefined | null = undefined;
    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    let edgeData: { type: string; source: string; sourceHandle: string; targetHandle: string } | null = null;
    let xOffset = 360;

    if (type === "subtask") {
      if (!selectedNode || selectedNode.type !== "task") {
        toast.error("Hay chon mot Task truoc khi tao Subtask");
        return;
      }
      parentId = selectedNode.id;
      edgeData = { type: "parent-child", source: selectedNode.id, sourceHandle: "source-right-center", targetHandle: "target-left-center" };
    } else if (type === "step") {
      if (!selectedNode || (selectedNode.type !== "subtask" && selectedNode.type !== "step")) {
        toast.error("Hay chon Subtask hoac Step truoc khi tao Step");
        return;
      }

      if (selectedNode.type === "step") {
        parentId = selectedNode.parentId;
        edgeData = { type: "next-step", source: selectedNode.id, sourceHandle: "source-right-center", targetHandle: "target-left-center" };
        xOffset = 260;
      } else {
        parentId = selectedNode.id;
        edgeData = { type: "parent-child", source: selectedNode.id, sourceHandle: "source-right-center", targetHandle: "target-left-center" };
      }
    } else if (type === "task") {
      if (selectedNode && selectedNode.type === "project") {
        parentId = selectedNode.id;
        edgeData = { type: "parent-child", source: selectedNode.id, sourceHandle: "source-right-center", targetHandle: "target-left-center" };
      } else {
        const projectRoot = nodes.find(n => n.projectId === activeProjectId && n.type === "project");
        if (projectRoot) {
          parentId = projectRoot.id;
          edgeData = { type: "parent-child", source: projectRoot.id, sourceHandle: "source-right-center", targetHandle: "target-left-center" };
        }
      }
    }

    const newNodeId = createId("node");
    const positionReferenceNode = selectedNode || nodes.find(n => n.id === parentId);
    const referencePosition = positionReferenceNode
      ? getNodeDisplayPosition(positionReferenceNode, timelineStartDate)
      : { x: -120, y: COLUMN_TOP };

    const siblings = nodes.filter(n => n.projectId === activeProjectId && n.parentId === parentId && !n.startTime);
    const siblingYOffset = siblings.length * 142;
    const posX = referencePosition.x + xOffset;
    const posY = referencePosition.y + siblingYOffset;

    addNode({
      id: newNodeId,
      projectId: activeProjectId,
      parentId,
      type,
      title: `New ${type}`,
      content: "",
      status: "todo",
      priority: "medium",
      tags: [],
      mindmapPosition: { x: posX, y: posY },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (edgeData) {
      addEdge({
        id: createId("edge"),
        projectId: activeProjectId,
        source: edgeData.source,
        target: newNodeId,
        sourceHandle: edgeData.sourceHandle,
        targetHandle: edgeData.targetHandle,
        type: edgeData.type,
      });
    }
  };

  const views = [
    { id: "mindmap", icon: <Map className="h-4 w-4" />, label: "Timeline Mind Map" },
    { id: "list", icon: <List className="h-4 w-4" />, label: "List" },
  ] as const;

  return (
    <div className="shrink-0 border-b border-slate-200 bg-slate-50/90 px-4 py-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-fit items-center rounded-xl bg-slate-200/70 p-1">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-all",
                activeView === view.id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              {view.icon}
              {view.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 hidden text-xs font-semibold text-slate-500 md:block">
            {selectedNode ? `Selected: ${selectedNode.type}` : "No node selected"}
          </div>
          <AddButton
            label="Task"
            primary
            enabled={canAddTask}
            title={canAddTask ? "Tao Task trong Project" : "Hay chon Project hoac bo chon node de tao Task"}
            onClick={() => handleAdd("task")}
          />
          <AddButton
            label="Subtask"
            enabled={canAddSubtask}
            title={canAddSubtask ? "Tao Subtask tu Task dang chon" : "Hay chon mot Task de tao Subtask"}
            onClick={() => handleAdd("subtask")}
          />
          <AddButton
            label="Step"
            enabled={canAddStep}
            title={canAddStep ? "Tao Step tu Subtask hoac Step dang chon" : "Hay chon mot Subtask de tao Step"}
            onClick={() => handleAdd("step")}
          />
        </div>
      </div>
    </div>
  );
}
