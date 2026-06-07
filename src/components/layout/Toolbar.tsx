import { Plus, List, Map } from "lucide-react";
import { differenceInCalendarDays, startOfDay, subDays } from "date-fns";
import { useStore } from "../../store/useStore";
import { cn } from "../../utils";
import { createId } from "../../utils/id";
import toast from "react-hot-toast";
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

export default function Toolbar() {
  const { activeView, setActiveView, addNode, addEdge, activeProjectId, selectedNodeId, nodes, projects } = useStore();
  const project = projects.find(item => item.id === activeProjectId);
  const timelineStartDate = subDays(startOfDay(project?.startDate ? new Date(project.startDate) : new Date()), 3);

  const handleAdd = (type: "task" | "subtask" | "step") => {
    if (!activeProjectId) return;

    let parentId: string | undefined | null = undefined;
    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    let edgeData: { type: string; source: string; sourceHandle: string; targetHandle: string } | null = null;
    let xOffset = 360;

    if (type === "subtask") {
      if (!selectedNode || selectedNode.type !== "task") {
        toast.error("Hãy chọn một Task trước khi tạo Subtask");
        return;
      }
      parentId = selectedNode.id;
      edgeData = { type: "parent-child", source: selectedNode.id, sourceHandle: "right", targetHandle: "left" };
    } else if (type === "step") {
      if (!selectedNode || (selectedNode.type !== "subtask" && selectedNode.type !== "step")) {
        toast.error("Hãy chọn Subtask hoặc Step trước khi tạo Step");
        return;
      }

      if (selectedNode.type === "step") {
        parentId = selectedNode.parentId;
        edgeData = { type: "next-step", source: selectedNode.id, sourceHandle: "right", targetHandle: "left" };
        xOffset = 260;
      } else {
        parentId = selectedNode.id;
        edgeData = { type: "parent-child", source: selectedNode.id, sourceHandle: "right", targetHandle: "left" };
      }
    } else if (type === "task") {
      if (selectedNode && selectedNode.type === "project") {
        parentId = selectedNode.id;
        edgeData = { type: "parent-child", source: selectedNode.id, sourceHandle: "right", targetHandle: "left" };
      } else {
        const projectRoot = nodes.find(n => n.projectId === activeProjectId && n.type === "project");
        if (projectRoot) {
          parentId = projectRoot.id;
          edgeData = { type: "parent-child", source: projectRoot.id, sourceHandle: "right", targetHandle: "left" };
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
    { id: "mindmap", icon: <Map className="w-4 h-4" />, label: "Timeline Mind Map" },
    { id: "list", icon: <List className="w-4 h-4" />, label: "List" },
  ] as const;

  return (
    <div className="h-12 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center p-1 bg-slate-200/50 rounded-lg">
        {views.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
              activeView === view.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            )}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => handleAdd("task")} className="text-sm font-medium px-3 py-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm flex items-center gap-1.5 transition-colors">
          <Plus className="w-4 h-4" /> Task
        </button>
        <button onClick={() => handleAdd("subtask")} className="text-sm font-medium px-3 py-1.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md shadow-sm flex items-center gap-1.5 transition-colors">
          <Plus className="w-4 h-4" /> Subtask
        </button>
        <button onClick={() => handleAdd("step")} className="text-sm font-medium px-3 py-1.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md shadow-sm flex items-center gap-1.5 transition-colors">
          <Plus className="w-4 h-4" /> Step
        </button>
      </div>
    </div>
  );
}
