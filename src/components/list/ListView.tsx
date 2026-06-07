import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Search } from "lucide-react";
import { useStore } from "../../store/useStore";
import { getComputedStatus } from "../../utils";

const statusOptions = ["all", "todo", "doing", "paused", "done", "overdue"] as const;
const priorityOptions = ["all", "low", "medium", "high", "urgent"] as const;

export default function ListView() {
  const { nodes, activeProjectId, setSelectedNode, selectedNodeId } = useStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<typeof statusOptions[number]>("all");
  const [priorityFilter, setPriorityFilter] = useState<typeof priorityOptions[number]>("all");

  const projectNodes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return nodes
      .filter(node => node.projectId === activeProjectId)
      .filter(node => {
        const status = getComputedStatus(node);
        if (statusFilter !== "all" && status !== statusFilter) return false;
        if (priorityFilter !== "all" && node.priority !== priorityFilter) return false;
        if (!normalizedQuery) return true;

        return [
          node.title,
          node.content,
          node.notes,
          ...(node.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }, [activeProjectId, nodes, priorityFilter, query, statusFilter]);

  return (
    <div className="flex-1 w-full h-full p-6 overflow-auto bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">List View</h2>
            <p className="text-xs text-slate-500 mt-1">{projectNodes.length} item phù hợp</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Tìm theo tiêu đề, ghi chú, tag..."
                className="h-9 w-full sm:w-72 rounded-md border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </label>

            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value as typeof statusOptions[number])}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 capitalize"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>{status === "all" ? "Tất cả status" : status}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={event => setPriorityFilter(event.target.value as typeof priorityOptions[number])}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 capitalize"
            >
              {priorityOptions.map(priority => (
                <option key={priority} value={priority}>{priority === "all" ? "Tất cả priority" : priority}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Title</th>
                <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Type</th>
                <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Priority</th>
                <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Start Time</th>
                <th className="px-4 py-3 font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Due Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectNodes.map(node => {
                const status = getComputedStatus(node);
                return (
                  <tr
                    key={node.id}
                    onClick={() => setSelectedNode(node.id)}
                    className={"cursor-pointer transition-colors hover:bg-slate-50 " + (selectedNodeId === node.id ? "bg-indigo-50 hover:bg-indigo-50/80 ring-1 ring-inset ring-indigo-200" : "")}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[240px] truncate" title={node.title}>{node.title}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 uppercase tracking-wider text-[10px] rounded block w-fit bg-slate-100 font-bold text-slate-600">{node.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-slate-700 font-medium">{status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-slate-700 font-medium">{node.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {node.startTime ? format(parseISO(node.startTime), "dd/MM/yyyy HH:mm") : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                      {node.dueTime ? format(parseISO(node.dueTime), "dd/MM/yyyy HH:mm") : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {projectNodes.length === 0 && (
            <div className="p-8 text-center text-slate-400 font-medium">Không có item phù hợp.</div>
          )}
        </div>
      </div>
    </div>
  );
}
