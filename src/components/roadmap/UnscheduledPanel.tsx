import { useState } from "react";
import { useStore } from "../../store/useStore";
import { PlusCircle, Edit } from "lucide-react";

export default function UnscheduledPanel() {
  const { nodes, activeProjectId, updateNode, setSelectedNode } = useStore();
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(60);

  const unscheduledNodes = nodes.filter(
    node =>
      node.projectId === activeProjectId &&
      (node.type === "step" || node.type === "subtask" || node.type === "task") &&
      (!node.startTime || !node.dueTime)
  );

  const handleSchedule = (nodeId: string) => {
    const start = new Date(`${scheduleDate}T${scheduleTime}:00`);
    const due = new Date(start);
    due.setMinutes(due.getMinutes() + durationMinutes);

    updateNode(nodeId, {
      startTime: start.toISOString(),
      dueTime: due.toISOString(),
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 border-r border-slate-200 w-64 shrink-0">
      <div className="p-4 border-b border-slate-200 space-y-3">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
          Chưa lên lịch
          <span className="bg-slate-200 px-1.5 rounded text-slate-500">{unscheduledNodes.length}</span>
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase">
            Ngày
            <input
              type="date"
              value={scheduleDate}
              onChange={event => setScheduleDate(event.target.value)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
          <label className="text-[10px] font-bold text-slate-400 uppercase">
            Giờ
            <input
              type="time"
              value={scheduleTime}
              step={900}
              onChange={event => setScheduleTime(event.target.value)}
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </label>
        </div>

        <label className="block text-[10px] font-bold text-slate-400 uppercase">
          Thời lượng
          <select
            value={durationMinutes}
            onChange={event => setDurationMinutes(Number(event.target.value))}
            className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={30}>30 phút</option>
            <option value={60}>1 giờ</option>
            <option value={90}>1 giờ 30 phút</option>
            <option value={120}>2 giờ</option>
            <option value={180}>3 giờ</option>
            <option value={240}>4 giờ</option>
          </select>
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {unscheduledNodes.map(node => {
          const parent = nodes.find(n => n.id === node.parentId);
          return (
            <div
              key={node.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("nodeId", node.id);
              }}
              className="group bg-white p-2.5 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 cursor-grab active:cursor-grabbing hover:border-slate-400 transition-colors shadow-sm"
            >
              <div className="font-bold text-slate-700 truncate mb-1">{node.title}</div>
              {parent && (
                <div className="text-[10px] text-slate-400 truncate mb-2">Thuộc: {parent.title}</div>
              )}
              <div className="flex items-center gap-1.5 mb-3">
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] uppercase font-bold">{node.status}</span>
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] uppercase font-bold">{node.priority}</span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleSchedule(node.id)}
                  className="flex-1 text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 py-1 rounded font-medium flex items-center justify-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" />
                  Lên lịch
                </button>
                <button
                  onClick={() => setSelectedNode(node.id)}
                  className="p-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded"
                  title="Chỉnh sửa"
                >
                  <Edit className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
        {unscheduledNodes.length === 0 && (
          <div className="text-[10px] text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded">
            Không còn item chưa lên lịch.
          </div>
        )}
      </div>
    </div>
  );
}
