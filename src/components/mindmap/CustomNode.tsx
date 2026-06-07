import React from "react";
import { Handle, Position } from "@xyflow/react";
import { cn, getComputedStatus, calculateNodeProgress, calculateProjectProgress, countOverdueNodes, getDescendantNodes } from "../../utils";
import { PlayCircle, CheckCircle2, AlertCircle, PauseCircle, Clock, CalendarIcon, PlusCircle, Check, Lock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useStore } from "../../store/useStore";
import { createId } from "../../utils/id";

type HandleSide = "top" | "right" | "bottom" | "left";

const SIDE_HANDLE_OFFSETS = [16, 26, 36, 46, 56, 66, 76, 86];
const HORIZONTAL_HANDLE_OFFSETS = [18, 34, 50, 66, 82];
const laneHandleClass = "!w-2 !h-2 !bg-indigo-400 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity";

function getLaneHandleStyle(side: HandleSide, offset: number) {
  return side === "left" || side === "right" ? { top: `${offset}%` } : { left: `${offset}%` };
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  return format(parseISO(value), "dd/MM/yyyy HH:mm");
}

function formatCompactDateTime(value?: string | null) {
  if (!value) return null;
  return format(parseISO(value), "dd/MM HH:mm");
}

export default function CustomNode({ data, selected }: any) {
  const node = data.node;
  const nodes = useStore(state => state.nodes);
  const status = getComputedStatus(node) as string;
  const updateNode = useStore(state => state.updateNode);
  const addNode = useStore(state => state.addNode);
  const addEdge = useStore(state => state.addEdge);

  const typeConfig: Record<string, string> = {
    project: "w-[280px] min-h-[166px] rounded-xl",
    task: "w-56 min-h-[126px] rounded-lg",
    subtask: "w-52 min-h-[118px] rounded-lg",
    step: "w-48 min-h-[108px] rounded-md",
  };

  const statusColors: Record<string, { bg: string; border: string; text: string }> = {
    todo: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-600" },
    doing: { bg: "bg-blue-50", border: "border-blue-500", text: "text-blue-700" },
    paused: { bg: "bg-amber-50", border: "border-amber-500", text: "text-amber-700" },
    done: { bg: "bg-emerald-50", border: "border-emerald-500", text: "text-emerald-700" },
    overdue: { bg: "bg-rose-50", border: "border-rose-500", text: "text-rose-700" },
  };

  const priorityColors: Record<string, string> = {
    low: "bg-slate-100 text-slate-500",
    medium: "bg-sky-100 text-sky-600",
    high: "bg-amber-100 text-amber-600",
    urgent: "bg-rose-100 text-rose-600",
  };

  const colors = statusColors[status] || statusColors.todo;
  const startTimeLabel = formatDateTime(node.startTime);
  const dueTimeLabel = formatDateTime(node.dueTime);
  const compactTimeLabel = formatCompactDateTime(node.startTime);

  const handleAddToRoadmap = (event: React.MouseEvent) => {
    event.stopPropagation();
    const start = new Date();
    const roundedMinutes = start.getMinutes() < 30 ? 30 : 60;
    if (roundedMinutes === 60) {
      start.setHours(start.getHours() + 1, 0, 0, 0);
    } else {
      start.setMinutes(30, 0, 0);
    }

    const due = new Date(start);
    due.setHours(due.getHours() + 1);

    updateNode(node.id, {
      startTime: start.toISOString(),
      dueTime: due.toISOString(),
    });
  };

  const toggleDone = (event: React.MouseEvent) => {
    event.stopPropagation();
    const isDone = node.status === "done" || node.completedTime != null;
    updateNode(node.id, {
      status: isDone ? "todo" : "done",
      completedTime: isDone ? null : new Date().toISOString(),
    });
  };

  let progress = 0;
  if (node.type === "project") {
    progress = calculateProjectProgress(node.projectId, nodes);
  } else if (node.type === "task" || node.type === "subtask") {
    progress = calculateNodeProgress(node.id, nodes);
  }

  let overdueCount = 0;
  let descendantCount = 0;
  if (node.type === "project") {
    overdueCount = countOverdueNodes(node.projectId, nodes);
    descendantCount = nodes.filter(n => n.projectId === node.projectId && n.type !== "project").length;
  } else {
    const descendants = getDescendantNodes(node.id, nodes);
    descendantCount = descendants.length;
  }

  const renderLaneHandles = (side: HandleSide, position: Position, offsets: number[]) => (
    offsets.map((offset, index) => (
      <React.Fragment key={`${side}-${index}`}>
        <Handle
          type="source"
          position={position}
          className={laneHandleClass}
          id={`source-${side}-${index}`}
          style={getLaneHandleStyle(side, offset)}
        />
        <Handle
          type="target"
          position={position}
          className={laneHandleClass}
          id={`target-${side}-${index}`}
          style={getLaneHandleStyle(side, offset)}
        />
      </React.Fragment>
    ))
  );

  return (
    <div
      className={cn(
        "border shadow-sm relative group transition-all flex flex-col text-slate-800",
        typeConfig[node.type] || typeConfig.step,
        colors.bg,
        selected ? `ring-2 ring-indigo-500 ring-offset-1 ${colors.border}` : colors.border
      )}
    >
      {renderLaneHandles("top", Position.Top, HORIZONTAL_HANDLE_OFFSETS)}
      {renderLaneHandles("right", Position.Right, SIDE_HANDLE_OFFSETS)}
      {renderLaneHandles("bottom", Position.Bottom, HORIZONTAL_HANDLE_OFFSETS)}
      {renderLaneHandles("left", Position.Left, SIDE_HANDLE_OFFSETS)}

      <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
        <button
          onClick={toggleDone}
          className={cn("p-1.5 rounded-full shadow-md text-white transition-colors", status === "done" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-300 hover:bg-emerald-500")}
          title={status === "done" ? "Bỏ hoàn thành" : "Đánh dấu hoàn thành"}
        >
          <Check className="w-3 h-3" strokeWidth={3} />
        </button>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-b border-black/5 shrink-0">
        <span className={cn("text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", colors.text)}>
          {node.type}
        </span>
        <div className="flex items-center gap-1">
          {node.startTime && (
            <span className="inline-flex items-center rounded bg-slate-200/70 px-1 py-0.5 text-slate-500" title="Đã khóa theo ngày trong Timeline">
              <Lock className="h-2.5 w-2.5" />
            </span>
          )}
          {node.priority && (
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold uppercase", priorityColors[node.priority])}>{node.priority}</span>
          )}
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col justify-center">
        <div className={cn("font-bold leading-tight", node.type === "project" ? "text-lg" : "text-sm")}>{data.label}</div>
        {node.content && (
          <div className="text-[10px] text-slate-500 mt-1.5 line-clamp-2 leading-tight">{node.content}</div>
        )}

        {node.type === "project" && (
          <div className="text-[10px] mt-2 font-medium flex items-center justify-between">
            <div>
              <span className="text-slate-500">{descendantCount} công việc</span>
              {overdueCount > 0 && <span className="text-rose-500 ml-1">· {overdueCount} quá hạn</span>}
            </div>

            <button
              onClick={(event) => {
                event.stopPropagation();

                const siblings = nodes.filter(n => n.projectId === node.projectId && n.parentId === node.id && n.type === "task");
                let siblingYOffset = 0;
                if (siblings.length > 0) {
                  const maxY = Math.max(...siblings.map(s => s.mindmapPosition?.y || 0));
                  const refY = node.mindmapPosition?.y || 0;
                  siblingYOffset = Math.max(0, (maxY - refY) + 120);
                }

                const newNodeId = createId("node");
                addNode({
                  id: newNodeId,
                  projectId: node.projectId,
                  parentId: node.id,
                  type: "task",
                  title: "New task",
                  content: "",
                  status: "todo",
                  priority: "medium",
                  tags: [],
                  mindmapPosition: {
                    x: (node.mindmapPosition?.x || 0) + 360,
                    y: (node.mindmapPosition?.y || 0) + siblingYOffset,
                  },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });

                addEdge({
                  id: createId("edge"),
                  projectId: node.projectId,
                  source: node.id,
                  target: newNodeId,
                  sourceHandle: "right",
                  targetHandle: "left",
                  type: "parent-child",
                });
              }}
              className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
            >
              + Task
            </button>
          </div>
        )}

        {(node.type === "project" || node.type === "task" || node.type === "subtask") && descendantCount > 0 && (
          <div className="mt-3 w-full">
            <div className="flex justify-between items-center text-[9px] mb-1">
              <span className="font-semibold opacity-70">Tiến độ</span>
              <span className="font-bold opacity-80">{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
              <div className="h-full bg-current opacity-60 transition-all rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}

        {(startTimeLabel || dueTimeLabel) && (
          <div className="mt-2 space-y-1 rounded-md bg-white/55 px-2 py-1.5 text-[9px] font-semibold leading-tight text-slate-500">
            {startTimeLabel && (
              <div className="flex items-center justify-between gap-2">
                <span className="shrink-0 text-slate-400">Bắt đầu</span>
                <span className="text-right text-slate-600">{startTimeLabel}</span>
              </div>
            )}
            {dueTimeLabel && (
              <div className="flex items-center justify-between gap-2">
                <span className="shrink-0 text-slate-400">Hạn</span>
                <span className="text-right text-slate-600">{dueTimeLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={cn("px-3 py-2 flex items-center justify-between shrink-0 text-[10px] font-medium border-t border-black/5 bg-white/40 group-hover:bg-white/60 transition-colors", colors.text)}>
        <div className="flex items-center gap-1.5 capitalize">
          {status === "doing" && <PlayCircle className="w-3 h-3" />}
          {status === "done" && <CheckCircle2 className="w-3 h-3" />}
          {status === "paused" && <PauseCircle className="w-3 h-3" />}
          {status === "overdue" && <AlertCircle className="w-3 h-3" />}
          {status === "todo" && <Clock className="w-3 h-3" />}
          {status}
        </div>
        {compactTimeLabel ? (
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3 opacity-70" />
            <span className="opacity-90">{compactTimeLabel}</span>
          </div>
        ) : node.type === "step" ? (
          <button
            onClick={handleAddToRoadmap}
            className="flex items-center gap-1 opacity-80 hover:opacity-100 hover:text-indigo-600 transition-colors"
            title="Thêm vào Timeline"
          >
            <span className="uppercase text-[9px] font-bold bg-slate-200/50 px-1 rounded">Chưa lên lịch</span>
            <PlusCircle className="w-3 h-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
