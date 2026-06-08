import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge as rfAddEdge,
  Connection,
  Node as RFNode,
  Edge as RFEdge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { addDays, differenceInCalendarDays, format, isToday, startOfDay, startOfMonth, subDays } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Home, LocateFixed, MapPinned, Maximize2 } from "lucide-react";
import { useStore } from "../../store/useStore";
import { createId } from "../../utils/id";
import { cn } from "../../utils";
import type { WorkEdge, WorkNode } from "../../types";
import CustomNode from "./CustomNode";
import SmoothMindMapEdge, { calculateAllConnectorRoutes, type ConnectorRoute } from "./SmoothMindMapEdge";

const DEFAULT_VIEWPORT = { x: 360, y: 170, zoom: 1.15 };
const DAY_WIDTH = 320;
const DAYS_VISIBLE = 21;
const NODE_GAP_Y = 34;
const COLUMN_TOP = 108;
const FREE_NODE_X = 40;

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  smoothMindMap: SmoothMindMapEdge,
};

const NODE_SIZE: Record<WorkNode["type"], { width: number; height: number }> = {
  project: { width: 280, height: 178 },
  task: { width: 224, height: 138 },
  subtask: { width: 208, height: 130 },
  step: { width: 192, height: 120 },
};

type Rect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function getNodeSize(node: WorkNode) {
  return NODE_SIZE[node.type] || NODE_SIZE.step;
}

function getNodeDepth(node: WorkNode, nodes: WorkNode[]) {
  let depth = 0;
  let parentId = node.parentId;

  while (parentId) {
    const parent = nodes.find(item => item.id === parentId);
    if (!parent) break;
    depth += 1;
    parentId = parent.parentId;
  }

  return depth;
}

function getNodeSortRank(node: WorkNode) {
  if (node.type === "project") return 0;
  if (node.type === "task") return 1;
  if (node.type === "subtask") return 2;
  return 3;
}

function centerXForDay(dayIndex: number, width: number) {
  return dayIndex * DAY_WIDTH + (DAY_WIDTH - width) / 2;
}

function dayIndexForNode(node: WorkNode, timelineStartDate: Date) {
  if (!node.startTime) return -1;
  return differenceInCalendarDays(startOfDay(new Date(node.startTime)), startOfDay(timelineStartDate));
}

type HandleSide = "top" | "right" | "bottom" | "left";

function getHandleId(kind: "source" | "target", side: HandleSide) {
  return `${kind}-${side}-center`;
}

function getDesiredPosition(node: WorkNode, timelineStartDate: Date) {
  const size = getNodeSize(node);
  const dayIndex = dayIndexForNode(node, timelineStartDate);

  if (dayIndex >= 0) {
    return {
      x: centerXForDay(dayIndex, size.width),
      y: COLUMN_TOP,
    };
  }

  return {
    x: node.mindmapPosition?.x ?? FREE_NODE_X,
    y: Math.max(COLUMN_TOP, node.mindmapPosition?.y ?? COLUMN_TOP),
  };
}

function rectsOverlap(a: Rect, b: Rect, gapX = 18, gapY = NODE_GAP_Y) {
  return (
    a.x < b.x + b.width + gapX &&
    a.x + a.width + gapX > b.x &&
    a.y < b.y + b.height + gapY &&
    a.y + a.height + gapY > b.y
  );
}

function resolveCollision(rect: Rect, placed: Rect[]) {
  let hit = placed.find(candidate => rectsOverlap(rect, candidate));
  let guard = 0;

  while (hit && guard < 160) {
    rect.y = hit.y + hit.height + NODE_GAP_Y;
    hit = placed.find(candidate => rectsOverlap(rect, candidate));
    guard += 1;
  }

  return rect;
}

function resolveLayout(nodes: WorkNode[], timelineStartDate: Date) {
  const placed: Rect[] = [];
  const positions = new Map<string, { x: number; y: number }>();
  const scheduledGroups = new Map<number, WorkNode[]>();
  const freeNodes: WorkNode[] = [];

  nodes.forEach(node => {
    const dayIndex = dayIndexForNode(node, timelineStartDate);
    if (dayIndex >= 0) {
      scheduledGroups.set(dayIndex, [...(scheduledGroups.get(dayIndex) || []), node]);
    } else {
      freeNodes.push(node);
    }
  });

  [...scheduledGroups.entries()].sort(([a], [b]) => a - b).forEach(([, groupNodes]) => {
    const sortedGroup = [...groupNodes].sort((a, b) => {
      const rankDiff = getNodeSortRank(a) - getNodeSortRank(b);
      if (rankDiff !== 0) return rankDiff;
      const depthDiff = getNodeDepth(a, nodes) - getNodeDepth(b, nodes);
      if (depthDiff !== 0) return depthDiff;
      return new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime();
    });

    let nextY = COLUMN_TOP;

    sortedGroup.forEach(node => {
      const size = getNodeSize(node);
      const desired = getDesiredPosition(node, timelineStartDate);
      const y = Math.max(nextY, desired.y);
      const rect = {
        id: node.id,
        x: desired.x,
        y,
        width: size.width,
        height: size.height,
      };

      placed.push(rect);
      positions.set(node.id, { x: rect.x, y: rect.y });
      nextY = y + size.height + NODE_GAP_Y;
    });
  });

  const sortedFreeNodes = [...freeNodes].sort((a, b) => {
    const aY = a.mindmapPosition?.y ?? COLUMN_TOP;
    const bY = b.mindmapPosition?.y ?? COLUMN_TOP;
    if (Math.abs(aY - bY) > 8) return aY - bY;
    const aX = a.mindmapPosition?.x ?? 0;
    const bX = b.mindmapPosition?.x ?? 0;
    if (Math.abs(aX - bX) > 8) return aX - bX;
    const rankDiff = getNodeSortRank(a) - getNodeSortRank(b);
    if (rankDiff !== 0) return rankDiff;
    return getNodeDepth(a, nodes) - getNodeDepth(b, nodes);
  });

  sortedFreeNodes.forEach(node => {
    const size = getNodeSize(node);
    const desired = getDesiredPosition(node, timelineStartDate);
    const rect = resolveCollision({
      id: node.id,
      x: desired.x,
      y: desired.y,
      width: size.width,
      height: size.height,
    }, placed);

    placed.push(rect);
    positions.set(node.id, { x: rect.x, y: rect.y });
  });

  return {
    positions,
    rects: placed,
  };
}

function createMindMapEdge(edge: WorkEdge, nodeRects: Rect[], connectorRoutes: Map<string, ConnectorRoute>, selectedNodeId?: string | null) {
  const relationType = edge.type || "parent-child";
  const route = connectorRoutes.get(edge.id);
  const sourceSide = route?.sourceSide ?? "right";
  const targetSide = route?.targetSide ?? "left";

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: getHandleId("source", sourceSide),
    targetHandle: getHandleId("target", targetSide),
    type: "smoothMindMap",
    data: {
      type: relationType,
      nodeRects,
      routePath: route?.path,
      busX: route?.busX,
      usedSegments: route?.segments ?? [],
      selectedNodeId,
    },
    animated: relationType === "next-step",
  };
}

function TimelineColumnsBackdrop({
  timelineStartDate,
  viewport,
}: {
  timelineStartDate: Date;
  viewport: { x: number; y: number; zoom: number };
}) {
  const [surfaceWidth, setSurfaceWidth] = useState(() => (typeof window === "undefined" ? 1920 : window.innerWidth));

  useEffect(() => {
    const syncSurfaceWidth = () => setSurfaceWidth(window.innerWidth);
    syncSurfaceWidth();
    window.addEventListener("resize", syncSurfaceWidth);
    return () => window.removeEventListener("resize", syncSurfaceWidth);
  }, []);

  const zoom = Math.max(0.05, viewport.zoom);
  const dayWidth = DAY_WIDTH * zoom;
  const firstVisibleIndex = Math.floor(-viewport.x / dayWidth) - 3;
  const columnCount = Math.ceil(surfaceWidth / dayWidth) + 7;
  const visibleDayIndexes = Array.from({ length: columnCount }, (_, index) => firstVisibleIndex + index);
  const toScreenX = (dayIndex: number) => dayIndex * dayWidth + viewport.x;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-slate-100 text-slate-400">
      {visibleDayIndexes.map(dayIndex => {
        const day = addDays(timelineStartDate, dayIndex);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

        return (
          <div
            key={`column-${dayIndex}`}
            className={cn(
              "absolute bottom-0 top-0 border-r border-slate-200/80",
              isToday(day) ? "bg-indigo-50/75" : isWeekend ? "bg-slate-100/80" : dayIndex % 2 === 0 ? "bg-white" : "bg-slate-50/85"
            )}
            style={{ left: toScreenX(dayIndex), width: dayWidth }}
          />
        );
      })}

      {visibleDayIndexes.map(dayIndex => {
        const day = addDays(timelineStartDate, dayIndex);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

        return (
          <div
            key={`label-${dayIndex}`}
            className={cn(
              "absolute flex h-11 flex-col items-center justify-center rounded-t-md border border-slate-200 bg-white/95 shadow-sm",
              isToday(day) ? "border-indigo-200 bg-indigo-50 text-indigo-700" : isWeekend ? "bg-slate-100 text-slate-500" : "text-slate-600"
            )}
            style={{ left: toScreenX(dayIndex), top: 0, width: dayWidth }}
          >
            <span className="text-[10px] font-bold uppercase">{format(day, "EEE")}</span>
            <span className="text-xs font-bold">{format(day, "dd/MM")}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function MindMapView() {
  const { projects, nodes, edges, activeProjectId, selectedNodeId, updateNode, deleteNode, deleteEdge, addEdge, setSelectedNode } = useStore();
  const project = projects.find(item => item.id === activeProjectId);
  const [baseDate, setBaseDate] = useState<Date>(() => startOfDay(new Date()));
  const [flowInstance, setFlowInstance] = useState<any>(null);
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const initialFocusProjectId = useRef<string | null>(null);

  useEffect(() => {
    if (project?.startDate) {
      setBaseDate(startOfDay(new Date(project.startDate)));
    }
  }, [project?.id, project?.startDate]);

  const timelineStartDate = useMemo(() => subDays(baseDate, 3), [baseDate]);
  const projectNodes = useMemo(() => nodes.filter(node => node.projectId === activeProjectId), [nodes, activeProjectId]);
  const projectEdges = useMemo(() => edges.filter(edge => edge.projectId === activeProjectId), [edges, activeProjectId]);
  const projectRoot = useMemo(() => projectNodes.find(node => node.type === "project" && node.parentId == null), [projectNodes]);
  const layout = useMemo(() => resolveLayout(projectNodes, timelineStartDate), [projectNodes, timelineStartDate]);
  const connectorRoutes = useMemo(() => calculateAllConnectorRoutes({
    nodeRects: layout.rects,
    edges: projectEdges,
  }), [layout.rects, projectEdges]);

  const [rfNodes, setRfNodes] = useNodesState([]);
  const [rfEdges, setRfEdges] = useEdgesState([]);
  const dragFrameRef = useRef<number | null>(null);

  const focusProjectRoot = useCallback(() => {
    if (!flowInstance || !projectRoot) return;
    const position = layout.positions.get(projectRoot.id) || projectRoot.mindmapPosition || { x: 0, y: 0 };
    const size = getNodeSize(projectRoot);
    setSelectedNode(projectRoot.id);
    flowInstance.setCenter(position.x + size.width / 2, position.y + size.height / 2, {
      zoom: 1.25,
      duration: 500,
    });
  }, [flowInstance, layout.positions, projectRoot, setSelectedNode]);

  const fitMindMap = useCallback(() => {
    if (!flowInstance || projectNodes.length === 0) return;
    flowInstance.fitView({
      padding: 0.24,
      duration: 500,
    });
  }, [flowInstance, projectNodes.length]);

  useEffect(() => {
    if (!activeProjectId || !flowInstance || !projectRoot) return;
    if (initialFocusProjectId.current === activeProjectId) return;
    initialFocusProjectId.current = activeProjectId;
    window.setTimeout(focusProjectRoot, 120);
  }, [activeProjectId, flowInstance, focusProjectRoot, projectRoot]);

  useEffect(() => {
    setRfNodes(projectNodes.map(node => ({
      id: node.id,
      type: "custom",
      position: layout.positions.get(node.id) || node.mindmapPosition || { x: 0, y: 0 },
      data: { label: node.title, node, zoom: viewport.zoom },
      draggable: node.type !== "project" && !node.startTime,
      deletable: node.type !== "project",
    })));
  }, [layout.positions, projectNodes, setRfNodes, viewport.zoom]);

  const syncDraggingEdgeRects = useCallback((nextNodes: RFNode[]) => {
    if (dragFrameRef.current != null) {
      window.cancelAnimationFrame(dragFrameRef.current);
    }

    dragFrameRef.current = window.requestAnimationFrame(() => {
      const nextRects = nextNodes.map(node => {
        const workNode = projectNodes.find(item => item.id === node.id);
        const size = workNode ? getNodeSize(workNode) : { width: Number(node.width) || 0, height: Number(node.height) || 0 };

        return {
          id: node.id,
          x: node.position.x,
          y: node.position.y,
          width: size.width,
          height: size.height,
        };
      });
      const connectorRoutes = calculateAllConnectorRoutes({
        nodeRects: nextRects,
        edges: projectEdges,
      });
      const nextEdgeById = new Map(
        projectEdges.map(edge => [edge.id, createMindMapEdge(edge, nextRects, connectorRoutes, selectedNodeId)])
      );

      setRfEdges(currentEdges => currentEdges.map(edge => ({
        ...edge,
        ...(nextEdgeById.get(edge.id) ?? {}),
        data: nextEdgeById.get(edge.id)?.data ?? {
          ...edge.data,
          nodeRects: nextRects,
        },
      })));
    });
  }, [projectEdges, projectNodes, selectedNodeId, setRfEdges]);

  useEffect(() => (
    () => {
      if (dragFrameRef.current != null) {
        window.cancelAnimationFrame(dragFrameRef.current);
      }
    }
  ), []);

  useEffect(() => {
    setRfEdges(projectEdges.map(edge => createMindMapEdge(edge, layout.rects, connectorRoutes, selectedNodeId)));
  }, [connectorRoutes, layout.rects, projectEdges, selectedNodeId, setRfEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setRfNodes(currentNodes => {
      const nextNodes = applyNodeChanges(changes, currentNodes);
      if (changes.some(change => change.type === "position")) {
        syncDraggingEdgeRects(nextNodes);
      }
      return nextNodes;
    }),
    [setRfNodes, syncDraggingEdgeRects]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setRfEdges(currentEdges => applyEdgeChanges(changes, currentEdges)),
    [setRfEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: any = {
        ...params,
        type: "smoothMindMap",
        data: { type: "next-step", nodeRects: layout.rects },
        animated: true,
        sourceHandle: params.sourceHandle || getHandleId("source", "right"),
        targetHandle: params.targetHandle || getHandleId("target", "left"),
      };
      setRfEdges(currentEdges => rfAddEdge(newEdge, currentEdges));

      if (params.source && params.target && activeProjectId) {
        addEdge({
          id: createId("edge"),
          projectId: activeProjectId,
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle || getHandleId("source", "right"),
          targetHandle: params.targetHandle || getHandleId("target", "left"),
          type: "next-step",
        });
      }
    },
    [activeProjectId, addEdge, layout.rects, setRfEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: RFNode) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: RFNode) => {
      const workNode = projectNodes.find(item => item.id === node.id);
      if (!workNode || workNode.type === "project") return;

      const size = getNodeSize(workNode);
      const previousPosition = layout.positions.get(node.id) || workNode.mindmapPosition || node.position;
      let nextPosition = { ...node.position };

      if (workNode.startTime) {
        updateNode(node.id, { mindmapPosition: previousPosition });
        return;
      }

      nextPosition = {
        x: node.position.x,
        y: Math.max(COLUMN_TOP, node.position.y),
      };

      const movingRect: Rect = {
        id: workNode.id,
        x: nextPosition.x,
        y: nextPosition.y,
        width: size.width,
        height: size.height,
      };
      const resolved = resolveCollision(movingRect, layout.rects.filter(rect => rect.id !== workNode.id));

      updateNode(node.id, {
        mindmapPosition: { x: resolved.x, y: resolved.y },
      });
    },
    [layout.positions, layout.rects, projectNodes, updateNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onNodesDelete = useCallback((deletedNodes: RFNode[]) => {
    deletedNodes.forEach(node => {
      const workNode = projectNodes.find(item => item.id === node.id);
      if (workNode?.type !== "project") {
        deleteNode(node.id);
      }
    });
  }, [deleteNode, projectNodes]);

  const onEdgesDelete = useCallback((deletedEdges: RFEdge[]) => {
    deletedEdges.forEach(edge => {
      deleteEdge(edge.id);
    });
  }, [deleteEdge]);

  const onBeforeDelete = useCallback(async ({ nodes: nodesToDelete, edges: edgesToDelete }: { nodes: RFNode[]; edges: RFEdge[] }) => {
    const blockedNodeIds = new Set(
      nodesToDelete
        .filter(node => projectNodes.find(item => item.id === node.id)?.type === "project")
        .map(node => node.id)
    );

    if (blockedNodeIds.size === 0) {
      return { nodes: nodesToDelete, edges: edgesToDelete };
    }

    const allowedNodes = nodesToDelete.filter(node => !blockedNodeIds.has(node.id));
    const allowedNodeIds = new Set(allowedNodes.map(node => node.id));
    const allowedEdges = edgesToDelete.filter(edge => {
      if (allowedNodeIds.has(edge.source) || allowedNodeIds.has(edge.target)) return true;
      return !blockedNodeIds.has(edge.source) && !blockedNodeIds.has(edge.target);
    });

    return {
      nodes: allowedNodes,
      edges: allowedEdges,
    };
  }, [projectNodes]);

  return (
    <div className="flex-1 w-full h-full relative bg-[#F8FAFC]">
      <TimelineColumnsBackdrop timelineStartDate={timelineStartDate} viewport={viewport} />
      <div className="absolute bottom-5 left-1/2 z-30 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-2 py-2 shadow-xl shadow-slate-200/80 backdrop-blur">
        <button
          onClick={focusProjectRoot}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-700"
          title="Về node project"
        >
          <Home className="h-3.5 w-3.5" />
          Project
        </button>
        <button
          onClick={fitMindMap}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          title="Fit toàn bộ mindmap"
          aria-label="Fit toàn bộ mindmap"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Fit Nodes
        </button>
        <button
          onClick={() => setBaseDate(startOfDay(new Date()))}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          Hôm nay
        </button>
        <button
          onClick={() => setBaseDate(startOfDay(new Date()))}
          className="h-8 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          title="Tuan nay"
        >
          Week
        </button>
        <button
          onClick={() => setBaseDate(startOfMonth(new Date()))}
          className="h-8 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          title="Thang nay"
        >
          Month
        </button>
        <div className="flex h-8 overflow-hidden rounded-lg border border-slate-200">
          <button
            onClick={() => setBaseDate(previous => subDays(previous, 7))}
            className="border-r border-slate-200 px-2 text-slate-500 transition hover:bg-slate-50"
            title="Tuần trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setBaseDate(previous => addDays(previous, 7))}
            className="px-2 text-slate-500 transition hover:bg-slate-50"
            title="Tuần sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setShowMiniMap(previous => !previous)}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          title={showMiniMap ? "An mini map" : "Hien mini map"}
        >
          <MapPinned className="h-3.5 w-3.5" />
          Map
        </button>
        <div className="ml-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          {format(timelineStartDate, "dd/MM")} - {format(addDays(timelineStartDate, DAYS_VISIBLE - 1), "dd/MM/yyyy")}
        </div>
      </div>

      <ReactFlow
        className="relative z-10 bg-transparent"
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={setFlowInstance}
        onMove={(_, nextViewport) => setViewport(nextViewport)}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onBeforeDelete={onBeforeDelete}
        minZoom={0.5}
        maxZoom={1.8}
        deleteKeyCode={["Backspace", "Delete"]}
        defaultViewport={DEFAULT_VIEWPORT}
      >
        <Controls position="bottom-left" className="!rounded-xl !border !border-slate-200 !bg-white !shadow-lg !shadow-slate-200/70" />
        {showMiniMap && (
          <MiniMap
            className="!rounded-xl !border !border-slate-200 !bg-white !shadow-lg !shadow-slate-200/70"
            maskColor="rgba(15, 23, 42, 0.08)"
            nodeColor="#6366F1"
            pannable
            zoomable
          />
        )}
      </ReactFlow>
    </div>
  );
}
