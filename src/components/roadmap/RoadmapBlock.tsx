import React, { useRef, useState } from "react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import type { WorkNode } from "../../types";
import { useStore } from "../../store/useStore";
import { cn, getComputedStatus, positionToDateTime } from "../../utils";

interface Props {
  key?: string;
  node: WorkNode;
  position: { x: number; y: number; width: number; height: number };
  containerRef: React.RefObject<HTMLDivElement | null>;
  timelineStartDate: Date;
  dayColumnWidth: number;
  hourRowHeight: number;
  workdayStartHour: number;
}

export default function RoadmapBlock({ 
  node, 
  position, 
  containerRef, 
  timelineStartDate, 
  dayColumnWidth, 
  hourRowHeight, 
  workdayStartHour 
}: Props) {
  const { updateNode, selectedNodeId, setSelectedNode } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [localPos, setLocalPos] = useState(position);
  
  const dragStartPos = useRef({ x: 0, y: 0, initX: 0, initY: 0 });
  const blockRef = useRef<HTMLDivElement>(null);

  const status = getComputedStatus(node);
  
  const statusStyles = {
    todo: "bg-slate-50 border-slate-200 text-slate-700",
    doing: "bg-blue-100 border-blue-300 text-blue-900",
    paused: "bg-amber-100 border-amber-300 text-amber-900 ring-2 ring-amber-400/20",
    done: "bg-emerald-50 border-emerald-200 text-emerald-800",
    overdue: "bg-rose-100 border-rose-300 text-rose-900",
  };

  const statusBadgeStyles = {
    todo: "bg-slate-200 text-slate-700",
    doing: "bg-blue-200 text-blue-700",
    paused: "bg-amber-200 text-amber-700",
    done: "bg-emerald-200 text-emerald-700",
    overdue: "bg-rose-200 text-rose-700",
  };

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setIsDragging(true);
    setSelectedNode(node.id);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      initX: localPos.x,
      initY: localPos.y
    };
    
    document.addEventListener('pointermove', handlePointerMoveDrag);
    document.addEventListener('pointerup', handlePointerUpDrag);
    document.body.style.userSelect = 'none';
  };

  const handlePointerMoveDrag = (e: PointerEvent) => {
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    setLocalPos(prev => ({
      ...prev,
      x: dragStartPos.current.initX + dx,
      y: dragStartPos.current.initY + dy
    }));
  };

  const handlePointerUpDrag = (e: PointerEvent) => {
    setIsDragging(false);
    document.removeEventListener('pointermove', handlePointerMoveDrag);
    document.removeEventListener('pointerup', handlePointerUpDrag);
    document.body.style.userSelect = '';

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    const finalX = dragStartPos.current.initX + dx;
    const finalY = dragStartPos.current.initY + dy;

    applyNewPosition(finalX, finalY, localPos.height);
  };

  const handlePointerDownResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setIsResizing(true);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      initX: 0,
      initY: localPos.height
    };
    document.addEventListener('pointermove', handlePointerMoveResize);
    document.addEventListener('pointerup', handlePointerUpResize);
    document.body.style.userSelect = 'none';
  };

  const handlePointerMoveResize = (e: PointerEvent) => {
    const dy = e.clientY - dragStartPos.current.y;
    let newHeight = Math.max(16, dragStartPos.current.initY + dy); // min 15 mins
    setLocalPos(prev => ({ ...prev, height: newHeight }));
  };

  const handlePointerUpResize = (e: PointerEvent) => {
    setIsResizing(false);
    document.removeEventListener('pointermove', handlePointerMoveResize);
    document.removeEventListener('pointerup', handlePointerUpResize);
    document.body.style.userSelect = '';

    const dy = e.clientY - dragStartPos.current.y;
    let newHeight = Math.max(16, dragStartPos.current.initY + dy);

    applyNewPosition(localPos.x, localPos.y, newHeight);
  };

  const applyNewPosition = (x: number, y: number, height: number) => {
    const newStart = positionToDateTime({
      x, y, timelineStartDate, dayColumnWidth, hourRowHeight, workdayStartHour, snapMinutes: 30
    });

    const hoursDuration = height / hourRowHeight;
    const newEnd = new Date(newStart);
    newEnd.setMinutes(newEnd.getMinutes() + Math.round(hoursDuration * 60));

    updateNode(node.id, {
      startTime: newStart.toISOString(),
      dueTime: newEnd.toISOString()
    });
  };

  if (!isDragging && !isResizing && (localPos.x !== position.x || localPos.y !== position.y || localPos.height !== position.height)) {
    setLocalPos(position);
  }

  const isSelected = selectedNodeId === node.id;
  const startFormat = node.startTime ? format(parseISO(node.startTime), "HH:mm") : "";
  const endFormat = node.dueTime ? format(parseISO(node.dueTime), "HH:mm") : "";

  return (
    <div
      ref={blockRef}
      className={cn(
        "absolute rounded-md p-2 text-xs overflow-hidden transition-all group select-none flex flex-col border shadow-sm",
        statusStyles[status],
        isSelected ? "ring-2 ring-indigo-500 shadow-md z-20 opacity-100" : "z-10 opacity-90 hover:opacity-100 hover:shadow-md",
        isDragging ? "cursor-grabbing opacity-80" : "cursor-pointer"
      )}
      style={{
        left: `${localPos.x + 4}px`,
        top: `${localPos.y}px`,
        width: `${localPos.width - 8}px`,
        height: `${localPos.height - 2}px`,
        margin: "1px 0"
      }}
      onPointerDown={handlePointerDownDrag}
    >
      <div className="flex justify-between items-start mb-0.5">
        <span className={cn(
            "text-[9px] font-bold uppercase",
            status === 'overdue' ? 'text-rose-800' : 'text-blue-800'
        )}>{node.type}</span>
        <span className={cn("text-[8px] px-1 rounded", statusBadgeStyles[status])}>{startFormat}</span>
      </div>
      <p className="text-[10px] font-bold mt-0.5 truncate">{node.title}</p>
      
      {localPos.height > 50 && (
         <div className="flex gap-1 mt-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", node.priority === 'urgent' ? 'bg-rose-500' : 'bg-slate-300')}></div>
         </div>
      )}

      {/* Resize handle */}
      {isSelected && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center hover:bg-black/10 group-hover:bg-black/5"
          onPointerDown={handlePointerDownResize}
        >
          <div className="w-4 h-0.5 bg-black/20 rounded-full" />
        </div>
      )}
    </div>
  );
}
