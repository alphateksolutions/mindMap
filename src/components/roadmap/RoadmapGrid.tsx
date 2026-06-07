import React, { useRef, useState, useEffect } from "react";
import { format, addDays, startOfDay, isToday, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useStore } from "../../store/useStore";
import { getRoadmapBlockPosition, positionToDateTime, cn } from "../../utils";
import RoadmapBlock from "./RoadmapBlock";

const DAY_WIDTH = 180;
const HOUR_HEIGHT = 48;
const TIME_COLUMN_WIDTH = 56;
const START_HOUR = 0;
const END_HOUR = 24;
const HOURS_COUNT = END_HOUR - START_HOUR;

export default function RoadmapGrid() {
  const { projects, activeProjectId, nodes, updateNode, setSelectedNode } = useStore();
  const project = projects.find(p => p.id === activeProjectId);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeLabelsRef = useRef<HTMLDivElement>(null);
  const [baseDate, setBaseDate] = useState<Date>(startOfDay(new Date()));

  useEffect(() => {
    if (containerRef.current && timeLabelsRef.current) {
      const now = new Date();
      const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
      const targetScrollY = Math.max(0, (currentHourDecimal - 1) * HOUR_HEIGHT);
      containerRef.current.scrollTop = targetScrollY;
      timeLabelsRef.current.scrollTop = targetScrollY;
    }
  }, []);

  if (!project) return null;

  const timelineStartDate = subDays(baseDate, 3);
  const days = Array.from({ length: 21 }).map((_, index) => addDays(timelineStartDate, index));
  const hours = Array.from({ length: HOURS_COUNT }).map((_, index) => START_HOUR + index);
  const scheduledNodes = nodes.filter(node => node.projectId === activeProjectId && node.startTime && node.dueTime);

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const nodeId = event.dataTransfer.getData("nodeId");
    if (!nodeId || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, event.clientX - rect.left + containerRef.current.scrollLeft - TIME_COLUMN_WIDTH);
    const y = event.clientY - rect.top + containerRef.current.scrollTop;

    const newStart = positionToDateTime({
      x,
      y,
      timelineStartDate,
      dayColumnWidth: DAY_WIDTH,
      hourRowHeight: HOUR_HEIGHT,
      workdayStartHour: START_HOUR,
      snapMinutes: 30,
    });

    const newEnd = new Date(newStart);
    newEnd.setHours(newEnd.getHours() + 1);

    updateNode(nodeId, {
      startTime: newStart.toISOString(),
      dueTime: newEnd.toISOString(),
    });
  };

  const renderCurrentTimeLine = () => {
    const now = new Date();
    const start = timelineStartDate.getTime();
    const end = addDays(timelineStartDate, days.length).getTime();

    if (now.getTime() < start || now.getTime() > end) return null;
    if (now.getHours() < START_HOUR || now.getHours() >= END_HOUR) return null;

    const position = getRoadmapBlockPosition({
      startTime: now.toISOString(),
      dueTime: now.toISOString(),
      timelineStartDate,
      dayColumnWidth: DAY_WIDTH,
      hourRowHeight: HOUR_HEIGHT,
      workdayStartHour: START_HOUR,
    });

    return (
      <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: position.y }}>
        <div className="absolute left-0 right-0 h-px bg-rose-500/60" />
        <div
          className="absolute flex items-center -translate-y-[calc(50%+1px)]"
          style={{ left: position.x }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm border-[2px] border-white -ml-1 flex-shrink-0" />
          <div className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 shadow-sm opacity-90">
            {format(now, "HH:mm")}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-white flex flex-col relative w-full h-full">
      <div className="h-10 border-b border-slate-200 bg-white flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBaseDate(startOfDay(new Date()))}
            className="text-xs font-semibold px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            Hôm nay
          </button>
          <div className="flex items-center rounded border border-slate-200 overflow-hidden ml-2">
            <button
              onClick={() => setBaseDate(prev => subDays(prev, 7))}
              className="p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-r border-slate-200"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setBaseDate(prev => addDays(prev, 7))}
              className="p-1 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              title="Tuần sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm font-medium text-slate-600 ml-4 flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            {format(timelineStartDate, "MMMM yyyy")}
          </span>
        </div>
      </div>

      <div className="flex border-b border-slate-200 shrink-0 h-12 bg-slate-50/50">
        <div className="w-14 border-r border-slate-200 shrink-0 bg-slate-50 z-20"></div>
        <div
          className="flex-1 flex overflow-hidden relative"
          ref={(element) => {
            if (element && containerRef.current) {
              element.scrollLeft = containerRef.current.scrollLeft;
            }
          }}
          id="days-header-container"
        >
          {days.map((day, index) => (
            <div
              key={index}
              className={cn(
                "border-r border-slate-200 flex flex-col justify-center text-center shrink-0 h-full",
                isToday(day) ? "bg-indigo-50/30 ring-1 ring-indigo-100 ring-inset" : ""
              )}
              style={{ width: DAY_WIDTH }}
            >
              <p className={cn("text-[10px] font-bold uppercase", isToday(day) ? "text-indigo-500" : "text-slate-400")}>{format(day, "E")}</p>
              <p className={cn("text-xs font-bold", isToday(day) ? "text-indigo-700" : "text-slate-700")}>{format(day, "dd/MM")}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex bg-slate-50/20">
        <div className="absolute top-0 left-0 w-14 h-full bg-slate-50 border-r border-slate-200 z-20">
          <div ref={timeLabelsRef} className="h-full overflow-hidden w-full hidden-scrollbar pointer-events-none" id="time-labels-container">
            {hours.map(hour => (
              <div
                key={hour}
                className="border-b border-slate-100 flex items-center justify-center text-[10px] font-mono text-slate-400 shrink-0"
                style={{ height: HOUR_HEIGHT }}
              >
                {hour.toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-auto relative custom-scrollbar inset-0 absolute"
          onScroll={(event) => {
            const timeLabels = document.getElementById("time-labels-container");
            if (timeLabels) timeLabels.scrollTop = event.currentTarget.scrollTop;
            const daysHeader = document.getElementById("days-header-container");
            if (daysHeader) daysHeader.scrollLeft = event.currentTarget.scrollLeft;
          }}
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedNode(null);
          }}
        >
          <div
            className="relative ml-14"
            style={{
              width: days.length * DAY_WIDTH,
              height: HOURS_COUNT * HOUR_HEIGHT,
            }}
          >
            {days.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "absolute top-0 bottom-0 border-r border-slate-100 pointer-events-none",
                  isToday(days[index]) ? "bg-indigo-50/20" : ""
                )}
                style={{ left: index * DAY_WIDTH, width: DAY_WIDTH }}
              />
            ))}

            {hours.map((_, index) => (
              <React.Fragment key={index}>
                <div
                  className="absolute left-0 right-0 h-px bg-slate-200 pointer-events-none z-10"
                  style={{ top: index * HOUR_HEIGHT }}
                />
                <div
                  className="absolute left-0 right-0 h-px bg-slate-100 pointer-events-none border-dashed border-t"
                  style={{ top: index * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                />
              </React.Fragment>
            ))}

            <div
              className="absolute left-0 right-0 h-px bg-slate-200 pointer-events-none z-10"
              style={{ top: HOURS_COUNT * HOUR_HEIGHT }}
            />

            {renderCurrentTimeLine()}

            {scheduledNodes.map(node => {
              const position = getRoadmapBlockPosition({
                startTime: node.startTime!,
                dueTime: node.dueTime!,
                timelineStartDate,
                dayColumnWidth: DAY_WIDTH,
                hourRowHeight: HOUR_HEIGHT,
                workdayStartHour: START_HOUR,
              });

              return (
                <RoadmapBlock
                  key={node.id}
                  node={node}
                  position={position}
                  containerRef={containerRef}
                  timelineStartDate={timelineStartDate}
                  dayColumnWidth={DAY_WIDTH}
                  hourRowHeight={HOUR_HEIGHT}
                  workdayStartHour={START_HOUR}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
