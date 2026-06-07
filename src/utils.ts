import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInCalendarDays, parseISO, isBefore, isAfter, getHours, getMinutes, addMinutes, startOfDay } from "date-fns";
import type { WorkNode, Project } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getComputedStatus(node: WorkNode): WorkNode["status"] {
  if (!node) return "todo";
  if (node.status === "done" || node.completedTime) return "done";
  if (node.dueTime && isBefore(parseISO(node.dueTime), new Date())) {
    return "overdue";
  }
  return node.status;
}

export function getDescendantNodes(nodeId: string, nodes: WorkNode[]): WorkNode[] {
  const children = nodes.filter(node => node.parentId === nodeId);
  const descendants = [...children];
  children.forEach(child => {
    descendants.push(...getDescendantNodes(child.id, nodes));
  });
  return descendants;
}

export function calculateNodeProgress(nodeId: string, nodes: WorkNode[]): number {
  const descendants = getDescendantNodes(nodeId, nodes);
  
  if (descendants.length === 0) {
    const node = nodes.find(item => item.id === nodeId);
    if (!node) return 0;
    return getComputedStatus(node) === "done" ? 100 : 0;
  }

  const completed = descendants.filter(
    node => getComputedStatus(node) === "done"
  ).length;

  return Math.round((completed / descendants.length) * 100);
}

export function calculateProjectProgress(projectId: string, nodes: WorkNode[]): number {
  const workNodes = nodes.filter(
    node => node.projectId === projectId && node.type !== "project"
  );

  if (workNodes.length === 0) return 0;

  const completed = workNodes.filter(
    node => getComputedStatus(node) === "done"
  ).length;

  return Math.round((completed / workNodes.length) * 100);
}

export function countOverdueNodes(projectId: string, nodes: WorkNode[]): number {
  return nodes.filter(node => {
    if (node.projectId !== projectId) return false;
    if (node.type === "project") return false;
    if (getComputedStatus(node) === "done") return false;
    if (!node.dueTime) return false;

    return new Date(node.dueTime) < new Date();
  }).length;
}

// Roadmap grid calculations
export function getRoadmapBlockPosition({
  startTime,
  dueTime,
  timelineStartDate,
  dayColumnWidth,
  hourRowHeight,
  workdayStartHour,
}: {
  startTime: string;
  dueTime: string;
  timelineStartDate: Date;
  dayColumnWidth: number;
  hourRowHeight: number;
  workdayStartHour: number;
}) {
  const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  const end = typeof dueTime === 'string' ? parseISO(dueTime) : dueTime;

  const dayIndex = differenceInCalendarDays(startOfDay(start), startOfDay(timelineStartDate));
  const x = dayIndex * dayColumnWidth;

  const startHourDecimal = getHours(start) + getMinutes(start) / 60;
  const y = (startHourDecimal - workdayStartHour) * hourRowHeight;

  const endHourDecimal = getHours(end) + getMinutes(end) / 60;
  // If it crosses midnight or ends the next day, we just calculate raw height difference.
  // Real implementation for split days is slightly more complex, but MVP just does simple difference.
  const hoursDiff = differenceInCalendarDays(end, start) * 24 + endHourDecimal - startHourDecimal;
  const height = hoursDiff * hourRowHeight;

  return { x, y, width: dayColumnWidth - 20, height, dayIndex };
}

export function positionToDateTime({
  x,
  y,
  timelineStartDate,
  dayColumnWidth,
  hourRowHeight,
  workdayStartHour,
  snapMinutes,
}: {
  x: number;
  y: number;
  timelineStartDate: Date;
  dayColumnWidth: number;
  hourRowHeight: number;
  workdayStartHour: number;
  snapMinutes: number;
}) {
  const dayIndex = Math.floor(x / dayColumnWidth);
  let targetDate = new Date(timelineStartDate);
  targetDate.setDate(targetDate.getDate() + dayIndex);

  let hourDecimal = (y / hourRowHeight) + workdayStartHour;
  let totalMinutes = Math.round(hourDecimal * 60);

  // Snap to minutes
  totalMinutes = Math.round(totalMinutes / snapMinutes) * snapMinutes;

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  targetDate.setHours(h, m, 0, 0);
  return targetDate;
}
