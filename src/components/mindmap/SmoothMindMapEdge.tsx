import {
  BaseEdge,
  EdgeProps,
} from "@xyflow/react";

type Point = {
  x: number;
  y: number;
};

type Rect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function roundedPolyline(points: Point[], radius = 18) {
  if (points.length < 2) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const incoming = { x: current.x - previous.x, y: current.y - previous.y };
    const outgoing = { x: next.x - current.x, y: next.y - current.y };
    const incomingLength = Math.hypot(incoming.x, incoming.y);
    const outgoingLength = Math.hypot(outgoing.x, outgoing.y);

    if (incomingLength < 1 || outgoingLength < 1) continue;

    const cornerRadius = Math.min(radius, incomingLength / 2, outgoingLength / 2);
    const beforeCorner = {
      x: current.x - (incoming.x / incomingLength) * cornerRadius,
      y: current.y - (incoming.y / incomingLength) * cornerRadius,
    };
    const afterCorner = {
      x: current.x + (outgoing.x / outgoingLength) * cornerRadius,
      y: current.y + (outgoing.y / outgoingLength) * cornerRadius,
    };

    path += ` L ${beforeCorner.x} ${beforeCorner.y} Q ${current.x} ${current.y} ${afterCorner.x} ${afterCorner.y}`;
  }

  const last = points[points.length - 1];
  return `${path} L ${last.x} ${last.y}`;
}

function verticalLaneHitsNode(x: number, y1: number, y2: number, nodeRects: Rect[]) {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const padding = 28;

  return nodeRects.some(rect => (
    x > rect.x - padding &&
    x < rect.x + rect.width + padding &&
    maxY > rect.y - padding &&
    minY < rect.y + rect.height + padding
  ));
}

function findClearTrunkX(initialX: number, direction: number, sourceY: number, targetY: number, nodeRects: Rect[]) {
  const candidates = [
    initialX,
    initialX + direction * 54,
    initialX - direction * 54,
    initialX + direction * 108,
    initialX - direction * 108,
  ];

  return candidates.find(candidate => !verticalLaneHitsNode(candidate, sourceY, targetY, nodeRects)) ?? initialX;
}

function buildSoftPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  routeOffset,
  nodeRects,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  routeOffset: number;
  nodeRects: Rect[];
}) {
  const dx = targetX - sourceX;

  if (Math.abs(dx) < 48) {
    const sideDirection = routeOffset >= 0 ? 1 : -1;
    const laneX = findClearTrunkX(
      sourceX + sideDirection * (62 + Math.abs(routeOffset) * 0.35),
      sideDirection,
      sourceY,
      targetY,
      nodeRects
    );

    return roundedPolyline([
      { x: sourceX, y: sourceY },
      { x: laneX, y: sourceY },
      { x: laneX, y: targetY },
      { x: targetX, y: targetY },
    ]);
  }

  const direction = dx >= 0 ? 1 : -1;
  const distance = Math.abs(dx);
  const stub = Math.max(44, Math.min(96, distance * 0.18));
  const sourceStubX = sourceX + direction * stub;
  const targetStubX = targetX - direction * stub;
  const trunkBaseX = (sourceStubX + targetStubX) / 2 + routeOffset * 0.72;
  const trunkX = findClearTrunkX(trunkBaseX, direction, sourceY, targetY, nodeRects);

  return roundedPolyline([
    { x: sourceX, y: sourceY },
    { x: sourceStubX, y: sourceY },
    { x: trunkX, y: sourceY },
    { x: trunkX, y: targetY },
    { x: targetStubX, y: targetY },
    { x: targetX, y: targetY },
  ]);
}

export default function SmoothMindMapEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps) {
  const edgeType = (data?.type as string) || "parent-child";
  const routeOffset = (data?.routeOffset as number) || 0;
  const nodeRects = (data?.nodeRects as Rect[]) || [];
  const edgePath = buildSoftPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    routeOffset,
    nodeRects,
  });

  const style =
    edgeType === "next-step"
      ? {
          stroke: "#7c3aed",
          strokeWidth: selected ? 3.4 : 2.2,
          strokeDasharray: "none",
        }
      : edgeType === "dependency"
        ? {
            stroke: "#f97316",
            strokeWidth: selected ? 3.4 : 2.2,
            strokeDasharray: "6 5",
          }
        : {
            stroke: "#4f46e5",
            strokeWidth: selected ? 3.4 : 2.2,
            strokeDasharray: "none",
          };

  return (
    <>
      <BaseEdge
        id={`${id}-halo`}
        path={edgePath}
        style={{
          stroke: "rgba(255,255,255,0.92)",
          strokeWidth: selected ? 8 : 5.5,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          opacity: selected ? 1 : 0.92,
          filter: selected ? "drop-shadow(0 2px 4px rgb(79 70 229 / 0.25))" : undefined,
        }}
      />
    </>
  );
}
