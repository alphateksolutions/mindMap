import {
  BaseEdge,
  EdgeProps,
} from "@xyflow/react";

type Point = {
  x: number;
  y: number;
};

export type ConnectorRect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ConnectorEdgeLike = {
  id: string;
  source: string;
  target: string;
};

export type ConnectorSide = "left" | "right";

export type ConnectorSegment = {
  edgeId: string;
  parentId: string;
  orientation: "horizontal" | "vertical";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type ConnectorRoute = {
  edgeId: string;
  parentId: string;
  path: string;
  busX: number;
  sourceSide: ConnectorSide;
  targetSide: ConnectorSide;
  segments: ConnectorSegment[];
};

const MIN_ROUTE_GAP = 14;
const PARENT_LANE_GAP = 22;
const NODE_PADDING = 16;
const CORNER_RADIUS = 16;
const MIN_STUB = 40;
const MAX_LANE_ATTEMPTS = 80;

function roundedPolyline(points: Point[], radius = CORNER_RADIUS) {
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

function rectWithPadding(rect: ConnectorRect, padding = NODE_PADDING) {
  return {
    ...rect,
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function rangesOverlap(a1: number, a2: number, b1: number, b2: number) {
  return Math.max(Math.min(a1, a2), Math.min(b1, b2)) <= Math.min(Math.max(a1, a2), Math.max(b1, b2));
}

function verticalLaneHitsNode(x: number, y1: number, y2: number, nodeRects: ConnectorRect[]) {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  return nodeRects.some(rect => {
    const padded = rectWithPadding(rect);
    return x > padded.x && x < padded.x + padded.width && maxY > padded.y && minY < padded.y + padded.height;
  });
}

function horizontalLaneHitsNode(y: number, x1: number, x2: number, nodeRects: ConnectorRect[]) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  return nodeRects.some(rect => {
    const padded = rectWithPadding(rect);
    return y > padded.y && y < padded.y + padded.height && maxX > padded.x && minX < padded.x + padded.width;
  });
}

function routeSegments(points: Point[], parentId: string, edgeId: string): ConnectorSegment[] {
  const segments: ConnectorSegment[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (Math.abs(previous.x - current.x) < 0.5 && Math.abs(previous.y - current.y) >= 0.5) {
      segments.push({
        edgeId,
        parentId,
        orientation: "vertical",
        x1: previous.x,
        y1: previous.y,
        x2: current.x,
        y2: current.y,
      });
    } else if (Math.abs(previous.y - current.y) < 0.5 && Math.abs(previous.x - current.x) >= 0.5) {
      segments.push({
        edgeId,
        parentId,
        orientation: "horizontal",
        x1: previous.x,
        y1: previous.y,
        x2: current.x,
        y2: current.y,
      });
    }
  }

  return segments;
}

export function detectSegmentOverlap(a: ConnectorSegment, b: ConnectorSegment, minRouteGap = MIN_ROUTE_GAP) {
  if (a.parentId === b.parentId) return false;
  if (a.orientation !== b.orientation) return false;

  if (a.orientation === "vertical") {
    return Math.abs(a.x1 - b.x1) < minRouteGap && rangesOverlap(a.y1, a.y2, b.y1, b.y2);
  }

  return Math.abs(a.y1 - b.y1) < minRouteGap && rangesOverlap(a.x1, a.x2, b.x1, b.x2);
}

function overlapsUsedSegments(segments: ConnectorSegment[], usedSegments: ConnectorSegment[]) {
  return segments.some(segment => usedSegments.some(existing => detectSegmentOverlap(segment, existing)));
}

function segmentsHitNodes(segments: ConnectorSegment[], nodeRects: ConnectorRect[]) {
  return segments.some(segment => (
    segment.orientation === "vertical"
      ? verticalLaneHitsNode(segment.x1, segment.y1, segment.y2, nodeRects)
      : horizontalLaneHitsNode(segment.y1, segment.x1, segment.x2, nodeRects)
  ));
}

function findClearBusX(
  initialX: number,
  direction: number,
  sourceY: number,
  targetY: number,
  nodeRects: ConnectorRect[]
) {
  const candidates = [
    initialX,
    initialX + direction * 48,
    initialX - direction * 48,
    initialX + direction * 96,
    initialX - direction * 96,
    initialX + direction * 144,
    initialX - direction * 144,
  ];

  return candidates.find(candidate => !verticalLaneHitsNode(candidate, sourceY, targetY, nodeRects)) ?? initialX;
}

function getAnchoredRects(nodeRects: ConnectorRect[], sourceNodeId?: string, targetNodeId?: string) {
  return nodeRects.filter(rect => rect.id !== sourceNodeId && rect.id !== targetNodeId);
}

export function calculateConnectorPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceNodeId,
  targetNodeId,
  parentId,
  edgeId = "edge",
  nodeRects,
  usedSegments = [],
  preferredBusX,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceNodeId?: string;
  targetNodeId?: string;
  parentId?: string;
  edgeId?: string;
  nodeRects: ConnectorRect[];
  usedSegments?: ConnectorSegment[];
  preferredBusX?: number;
}) {
  const dx = targetX - sourceX;
  const direction = dx >= 0 ? 1 : -1;
  const routeParentId = parentId ?? sourceNodeId ?? edgeId;
  const routableRects = getAnchoredRects(nodeRects, sourceNodeId, targetNodeId);
  const busBaseX = preferredBusX ?? sourceX + direction * Math.max(MIN_STUB, Math.abs(dx) * 0.45);
  const busX = findClearBusX(busBaseX, direction, sourceY, targetY, routableRects);

  const directPoints = [
    { x: sourceX, y: sourceY },
    { x: busX, y: sourceY },
    { x: busX, y: targetY },
    { x: targetX, y: targetY },
  ];
  const directSegments = routeSegments(directPoints, routeParentId, edgeId);

  if (!segmentsHitNodes(directSegments, routableRects) && !overlapsUsedSegments(directSegments, usedSegments)) {
    return {
      path: roundedPolyline(directPoints),
      busX,
      segments: directSegments,
    };
  }

  const yDirection = targetY >= sourceY ? 1 : -1;
  const yCandidates = [1, -1, 2, -2, 3, -3, 4, -4].map(multiplier => targetY + yDirection * multiplier * (NODE_PADDING + MIN_ROUTE_GAP));

  for (const midY of yCandidates) {
    const detourPoints = [
      { x: sourceX, y: sourceY },
      { x: busX, y: sourceY },
      { x: busX, y: midY },
      { x: targetX - direction * MIN_STUB, y: midY },
      { x: targetX - direction * MIN_STUB, y: targetY },
      { x: targetX, y: targetY },
    ];

    const segments = routeSegments(detourPoints, routeParentId, edgeId);
    if (!segmentsHitNodes(segments, routableRects) && !overlapsUsedSegments(segments, usedSegments)) {
      return {
        path: roundedPolyline(detourPoints),
        busX,
        segments,
      };
    }
  }

  return {
    path: roundedPolyline(directPoints),
    busX,
    segments: directSegments,
  };
}

type ParentRouteEdge = {
  edge: ConnectorEdgeLike;
  targetRect: ConnectorRect;
};

type ParentRouteGroup = {
  id: string;
  parentId: string;
  direction: 1 | -1;
  sourceSide: ConnectorSide;
  targetSide: ConnectorSide;
  parentRect: ConnectorRect;
  childEdges: ParentRouteEdge[];
  corridorKey: string;
};

function rectCenterX(rect: ConnectorRect) {
  return rect.x + rect.width / 2;
}

function rectCenterY(rect: ConnectorRect) {
  return rect.y + rect.height / 2;
}

function anchorPoint(rect: ConnectorRect, side: ConnectorSide) {
  return {
    x: side === "right" ? rect.x + rect.width : rect.x,
    y: rect.y + rect.height / 2,
  };
}

function getCorridorKey(parentRect: ConnectorRect, targetRect: ConnectorRect, direction: 1 | -1) {
  const bandSize = 260;
  const fromBand = Math.round((direction > 0 ? parentRect.x + parentRect.width : parentRect.x) / bandSize);
  const toBand = Math.round((direction > 0 ? targetRect.x : targetRect.x + targetRect.width) / bandSize);
  return `${direction}:${fromBand}:${toBand}`;
}

export function groupEdgesByParent(edges: ConnectorEdgeLike[], nodeRects: ConnectorRect[]) {
  const rectById = new Map(nodeRects.map(rect => [rect.id, rect]));
  const groups = new Map<string, ParentRouteGroup>();

  edges.forEach(edge => {
    const parentRect = rectById.get(edge.source);
    const targetRect = rectById.get(edge.target);
    if (!parentRect || !targetRect) return;

    const direction: 1 | -1 = rectCenterX(targetRect) >= rectCenterX(parentRect) ? 1 : -1;
    const sourceSide: ConnectorSide = direction > 0 ? "right" : "left";
    const targetSide: ConnectorSide = direction > 0 ? "left" : "right";
    const groupId = `${edge.source}:${direction}`;
    const corridorKey = getCorridorKey(parentRect, targetRect, direction);
    const group = groups.get(groupId) ?? {
      id: groupId,
      parentId: edge.source,
      direction,
      sourceSide,
      targetSide,
      parentRect,
      childEdges: [],
      corridorKey,
    };

    group.childEdges.push({ edge, targetRect });
    groups.set(groupId, group);
  });

  return [...groups.values()].map(group => ({
    ...group,
    childEdges: [...group.childEdges].sort((a, b) => rectCenterY(a.targetRect) - rectCenterY(b.targetRect)),
  }));
}

export function calculateParentLane(groups: ParentRouteGroup[]) {
  const laneByGroup = new Map<string, number>();
  const groupsByCorridor = new Map<string, ParentRouteGroup[]>();

  groups.forEach(group => {
    groupsByCorridor.set(group.corridorKey, [...(groupsByCorridor.get(group.corridorKey) || []), group]);
  });

  groupsByCorridor.forEach(corridorGroups => {
    [...corridorGroups]
      .sort((a, b) => (
        rectCenterY(a.parentRect) - rectCenterY(b.parentRect) ||
        rectCenterX(a.parentRect) - rectCenterX(b.parentRect) ||
        a.parentId.localeCompare(b.parentId)
      ))
      .forEach((group, index) => {
        laneByGroup.set(group.id, index);
      });
  });

  return laneByGroup;
}

export function calculateBusX(group: ParentRouteGroup, laneIndex: number) {
  const source = anchorPoint(group.parentRect, group.sourceSide);
  const targetEdgeX = group.direction > 0
    ? Math.min(...group.childEdges.map(child => child.targetRect.x))
    : Math.max(...group.childEdges.map(child => child.targetRect.x + child.targetRect.width));
  const availableGap = Math.abs(targetEdgeX - source.x);
  const baseOffset = Math.max(MIN_STUB, Math.min(150, availableGap * 0.45));

  return source.x + group.direction * (baseOffset + laneIndex * PARENT_LANE_GAP);
}

export function createRoundedOrthogonalPath(points: Point[]) {
  return roundedPolyline(points);
}

function createRouteForEdge(
  parentId: string,
  edge: ConnectorEdgeLike,
  parentRect: ConnectorRect,
  targetRect: ConnectorRect,
  sourceSide: ConnectorSide,
  targetSide: ConnectorSide,
  busX: number,
  nodeRects: ConnectorRect[],
  usedSegments: ConnectorSegment[]
): ConnectorRoute {
  const source = anchorPoint(parentRect, sourceSide);
  const target = anchorPoint(targetRect, targetSide);
  const route = calculateConnectorPath({
    sourceX: source.x,
    sourceY: source.y,
    targetX: target.x,
    targetY: target.y,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    parentId,
    edgeId: edge.id,
    nodeRects,
    usedSegments,
    preferredBusX: busX,
  });

  return {
    edgeId: edge.id,
    parentId,
    path: route.path,
    busX: route.busX,
    sourceSide,
    targetSide,
    segments: route.segments,
  };
}

function routeHitsNode(route: ConnectorRoute, edge: ConnectorEdgeLike, nodeRects: ConnectorRect[]) {
  return segmentsHitNodes(route.segments, getAnchoredRects(nodeRects, edge.source, edge.target));
}

function buildGroupRoutes(
  group: ParentRouteGroup,
  busX: number,
  nodeRects: ConnectorRect[],
  usedSegments: ConnectorSegment[]
) {
  return group.childEdges.map(({ edge, targetRect }) => ({
    edge,
    route: createRouteForEdge(
      group.parentId,
      edge,
      group.parentRect,
      targetRect,
      group.sourceSide,
      group.targetSide,
      busX,
      nodeRects,
      usedSegments
    ),
  }));
}

function groupRoutesAreBlocked(
  routes: Array<{ edge: ConnectorEdgeLike; route: ConnectorRoute }>,
  nodeRects: ConnectorRect[],
  usedSegments: ConnectorSegment[]
) {
  return routes.some(({ edge, route }) => (
    routeHitsNode(route, edge, nodeRects) || overlapsUsedSegments(route.segments, usedSegments)
  ));
}

export function calculateAllConnectorRoutes({
  nodeRects,
  edges,
}: {
  nodeRects: ConnectorRect[];
  edges: ConnectorEdgeLike[];
}) {
  const routes = new Map<string, ConnectorRoute>();
  const usedSegments: ConnectorSegment[] = [];
  const groups = groupEdgesByParent(edges, nodeRects);
  const laneByGroup = calculateParentLane(groups);

  [...groups]
    .sort((a, b) => (
      rectCenterY(a.parentRect) - rectCenterY(b.parentRect) ||
      rectCenterX(a.parentRect) - rectCenterX(b.parentRect) ||
      a.parentId.localeCompare(b.parentId)
    ))
    .forEach(group => {
      const laneIndex = laneByGroup.get(group.id) ?? 0;
      let busX = calculateBusX(group, laneIndex);
      let groupRoutes = buildGroupRoutes(group, busX, nodeRects, usedSegments);
      let guard = 0;

      while (groupRoutesAreBlocked(groupRoutes, nodeRects, usedSegments) && guard < MAX_LANE_ATTEMPTS) {
        busX += group.direction * PARENT_LANE_GAP;
        groupRoutes = buildGroupRoutes(group, busX, nodeRects, usedSegments);
        guard += 1;
      }

      groupRoutes.forEach(({ route }) => {
        routes.set(route.edgeId, route);
        usedSegments.push(...route.segments);
      });
    });

  return routes;
}

export default function SmoothMindMapEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps) {
  const edgeType = (data?.type as string) || "parent-child";
  const routePath = data?.routePath as string | undefined;
  const nodeRects = (data?.nodeRects as ConnectorRect[]) || [];
  const usedSegments = (data?.usedSegments as ConnectorSegment[]) || [];
  const preferredBusX = data?.busX as number | undefined;
  const selectedNodeId = data?.selectedNodeId as string | undefined;
  const isRelatedToSelection = !selectedNodeId || selectedNodeId === source || selectedNodeId === target;
  const { path: fallbackPath } = calculateConnectorPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceNodeId: source,
    targetNodeId: target,
    parentId: source,
    edgeId: id,
    nodeRects,
    usedSegments,
    preferredBusX,
  });
  const edgePath = routePath || fallbackPath;

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
            stroke: "#6366F1",
            strokeWidth: selected ? 3.4 : 2.4,
            strokeDasharray: "none",
          };

  return (
    <>
      <BaseEdge
        id={`${id}-halo`}
        path={edgePath}
        style={{
          stroke: "rgba(255,255,255,0.92)",
          strokeWidth: selected || isRelatedToSelection ? 8 : 4,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          opacity: isRelatedToSelection ? 1 : 0.25,
        }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          opacity: isRelatedToSelection ? selected ? 1 : 0.92 : 0.22,
          filter: selected || (selectedNodeId && isRelatedToSelection) ? "drop-shadow(0 2px 4px rgb(79 70 229 / 0.25))" : undefined,
        }}
      />
    </>
  );
}
