import React, { useState } from "react";
import { Plus, Download, Upload, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useStore } from "../../store/useStore";
import { calculateProjectProgress, countOverdueNodes } from "../../utils";
import { createId } from "../../utils/id";
import type { Project } from "../../types";

const defaultProjectForm = () => ({
  name: "",
  description: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  status: "planning" as Project["status"],
  color: "#6366f1",
});

export default function Dashboard() {
  const { projects, nodes, edges, setActiveProject, addProject, addNode, importData, deleteProject } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState(defaultProjectForm);
  const [errorMsg, setErrorMsg] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const ensureRootNode = (proj: Project) => {
    const existingRoot = nodes.find(n => n.projectId === proj.id && n.type === "project" && n.parentId == null);
    if (existingRoot) return;

    addNode({
      id: createId("node"),
      projectId: proj.id,
      parentId: null,
      type: "project",
      title: proj.name,
      content: proj.description || "",
      status: "todo",
      priority: "medium",
      startTime: proj.startDate ? new Date(proj.startDate).toISOString() : null,
      dueTime: proj.endDate ? new Date(proj.endDate).toISOString() : null,
      completedTime: null,
      estimatedHours: 0,
      actualHours: 0,
      delayReason: "",
      rescheduledTime: null,
      delayNote: "",
      tags: [],
      notes: "",
      links: [],
      mindmapPosition: { x: 100, y: 200 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleOpenProject = (projId: string) => {
    const proj = projects.find(p => p.id === projId);
    if (proj) ensureRootNode(proj);
    setActiveProject(projId);
  };

  const handleCreateSubmit = () => {
    if (!newProject.name.trim()) {
      setErrorMsg("Vui lòng nhập tên project");
      return;
    }

    const id = createId("project");
    const now = new Date().toISOString();
    const project: Project = {
      id,
      name: newProject.name.trim(),
      description: newProject.description.trim(),
      startDate: newProject.startDate ? new Date(newProject.startDate).toISOString() : "",
      endDate: newProject.endDate ? new Date(newProject.endDate).toISOString() : "",
      status: newProject.status,
      color: newProject.color,
      createdAt: now,
      updatedAt: now,
    };

    addProject(project);
    addNode({
      id: createId("node"),
      projectId: id,
      parentId: null,
      type: "project",
      title: project.name,
      content: project.description,
      status: "todo",
      priority: "medium",
      startTime: project.startDate || null,
      dueTime: project.endDate || null,
      completedTime: null,
      estimatedHours: 0,
      actualHours: 0,
      delayReason: "",
      rescheduledTime: null,
      delayNote: "",
      tags: [],
      notes: "",
      links: [],
      mindmapPosition: { x: 100, y: 200 },
      createdAt: now,
      updatedAt: now,
    });

    setShowModal(false);
    setNewProject(defaultProjectForm());
    setErrorMsg("");
    toast.success("Đã tạo project");
  };

  const handleExport = () => {
    const data = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      projects,
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindmap-timeline-export.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất toàn bộ dữ liệu");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());
      if ((!data.project && !data.projects) || !data.nodes) {
        throw new Error("Invalid file format");
      }

      importData(data);
      toast.success("Import thành công");
    } catch (err) {
      toast.error("File JSON không hợp lệ");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold font-sans tracking-tight text-slate-900 dark:text-slate-100">Mind Map + Timeline</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý không gian làm việc của bạn</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-2 transition-colors">
            <Upload className="w-4 h-4" /> Import
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={handleExport} className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Tạo Project
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(proj => {
            const projNodes = nodes.filter(n => n.projectId === proj.id);
            const taskCount = projNodes.filter(n => n.type === "task" || n.type === "subtask" || n.type === "step").length;
            const progress = calculateProjectProgress(proj.id, nodes);
            const overdue = countOverdueNodes(proj.id, nodes);

            return (
              <div
                key={proj.id}
                onClick={() => handleOpenProject(proj.id)}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: proj.color }}></div>
                      <h3 className="font-semibold text-lg truncate group-hover:text-indigo-600 dark:text-slate-100 transition-colors">{proj.name}</h3>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{proj.description}</p>
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setProjectToDelete(proj.id);
                    }}
                    className="shrink-0 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                    title="Xóa project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400 mb-6">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider text-slate-400">Trạng thái</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{proj.status}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider text-slate-400">Tasks</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{taskCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider text-slate-400">Quá hạn</span>
                    <span className={`font-medium ${overdue > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>{overdue}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Tiến độ</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })}
          {projects.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500">
              <p>Chưa có dự án nào.</p>
              <button onClick={() => setShowModal(true)} className="mt-4 text-indigo-600 font-medium hover:underline flex items-center gap-2">
                <Plus className="w-4 h-4" /> Tạo dự án đầu tiên
              </button>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-lg dark:text-white">Tạo project mới</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tên project *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={event => {
                    setNewProject({ ...newProject, name: event.target.value });
                    setErrorMsg("");
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  placeholder="Nhập tên project..."
                />
                {errorMsg && <p className="text-xs text-rose-500 mt-1">{errorMsg}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Mô tả</label>
                <textarea
                  value={newProject.description}
                  onChange={event => setNewProject({ ...newProject, description: event.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px] dark:text-white"
                  placeholder="Mô tả dự án..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={newProject.startDate}
                    onChange={event => setNewProject({ ...newProject, startDate: event.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={newProject.endDate}
                    onChange={event => setNewProject({ ...newProject, endDate: event.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Trạng thái</label>
                  <select
                    value={newProject.status}
                    onChange={event => setNewProject({ ...newProject, status: event.target.value as Project["status"] })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white capitalize"
                  >
                    <option value="planning">Planning</option>
                    <option value="doing">Doing</option>
                    <option value="paused">Paused</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Màu sắc</label>
                  <div className="flex items-center gap-2 mt-2">
                    {["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewProject({ ...newProject, color })}
                        className={`w-6 h-6 rounded-full border-2 ${newProject.color === color ? "border-slate-400 scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                Tạo project
              </button>
            </div>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h2 className="font-bold text-lg dark:text-white mb-2">Bạn có chắc muốn xóa project này không?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Toàn bộ task, subtask, step và roadmap của project cũng sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  deleteProject(projectToDelete);
                  setProjectToDelete(null);
                  toast.success("Đã xóa project");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
              >
                Xóa project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
