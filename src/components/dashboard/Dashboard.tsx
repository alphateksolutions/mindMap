import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  FolderKanban,
  FolderOpen,
  MoreVertical,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
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

const statusLabels: Record<string, string> = {
  all: "Tat ca",
  planning: "Planning",
  doing: "Doing",
  paused: "Paused",
  done: "Done",
  overdue: "Overdue",
};

const statusBadgeClass: Record<string, string> = {
  planning: "bg-indigo-50 text-indigo-700 border-indigo-200",
  doing: "bg-sky-50 text-sky-700 border-sky-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
};

type StatusFilter = "all" | Project["status"] | "overdue";
type SortMode = "newest" | "deadline" | "progress-desc" | "progress-asc";

function isProjectOverdue(project: Project, overdueCount: number) {
  if (overdueCount > 0) return true;
  if (!project.endDate || project.status === "done") return false;
  return new Date(project.endDate).getTime() < Date.now();
}

function formatProjectDate(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ProjectStats({
  total,
  doing,
  done,
  overdue,
}: {
  total: number;
  doing: number;
  done: number;
  overdue: number;
}) {
  const items = [
    { label: "Tong Project", value: total, icon: FolderKanban, className: "bg-indigo-50 text-indigo-700 ring-indigo-100" },
    { label: "Dang lam", value: doing, icon: Activity, className: "bg-sky-50 text-sky-700 ring-sky-100" },
    { label: "Hoan thanh", value: done, icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
    { label: "Qua han", value: overdue, icon: AlertTriangle, className: "bg-rose-50 text-rose-700 ring-rose-100" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(item => {
        const Icon = item.icon;

        return (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p>
              </div>
              <div className={`rounded-xl p-2.5 ring-1 ${item.className}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectToolbar({
  query,
  statusFilter,
  sortMode,
  onQueryChange,
  onStatusChange,
  onSortChange,
}: {
  query: string;
  statusFilter: StatusFilter;
  sortMode: SortMode;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onSortChange: (value: SortMode) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <label className="relative block w-full lg:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={event => onQueryChange(event.target.value)}
          placeholder="Tim project theo ten hoac mo ta..."
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={statusFilter}
          onChange={event => onStatusChange(event.target.value as StatusFilter)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          {(["all", "planning", "doing", "paused", "done", "overdue"] as const).map(status => (
            <option key={status} value={status}>{statusLabels[status]}</option>
          ))}
        </select>

        <select
          value={sortMode}
          onChange={event => onSortChange(event.target.value as SortMode)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="newest">Moi nhat</option>
          <option value="deadline">Deadline gan nhat</option>
          <option value="progress-desc">Tien do cao nhat</option>
          <option value="progress-asc">Tien do thap nhat</option>
        </select>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  taskCount,
  progress,
  overdue,
  onOpen,
  onDelete,
}: {
  project: Project;
  taskCount: number;
  progress: number;
  overdue: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const overdueProject = isProjectOverdue(project, overdue);
  const statusKey = overdueProject ? "overdue" : project.status;
  const endDateLabel = formatProjectDate(project.endDate);
  const startDateLabel = formatProjectDate(project.startDate);

  return (
    <article
      onClick={onOpen}
      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full ring-4 ring-slate-100" style={{ backgroundColor: project.color }} />
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadgeClass[statusKey]}`}>
              {statusLabels[statusKey] ?? statusKey}
            </span>
          </div>
          <h3 className="truncate text-lg font-bold text-slate-950 transition-colors group-hover:text-indigo-700">{project.name}</h3>
          <p className="mt-1 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500">
            {project.description || "Chua co mo ta cho project nay."}
          </p>
        </div>

        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="rounded-lg border border-transparent p-2 text-slate-400 opacity-70 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
          title="Xoa project"
          aria-label="Xoa project"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tasks</p>
          <p className="mt-1 font-bold text-slate-800">{taskCount}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Qua han</p>
          <p className={`mt-1 font-bold ${overdue > 0 ? "text-rose-600" : "text-slate-800"}`}>{overdue}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tien do</p>
          <p className="mt-1 font-bold text-slate-800">{progress}%</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>{startDateLabel && endDateLabel ? `${startDateLabel} - ${endDateLabel}` : "Chua dat thoi gian"}</span>
          {overdueProject && <span className="text-rose-600">Can xu ly</span>}
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { projects, nodes, edges, setActiveProject, addProject, addNode, importData, deleteProject } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState(defaultProjectForm);
  const [errorMsg, setErrorMsg] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const projectMeta = useMemo(() => (
    projects.map(project => {
      const projectNodes = nodes.filter(node => node.projectId === project.id);
      const taskCount = projectNodes.filter(node => node.type === "task" || node.type === "subtask" || node.type === "step").length;
      const progress = calculateProjectProgress(project.id, nodes);
      const overdue = countOverdueNodes(project.id, nodes);

      return { project, taskCount, progress, overdue };
    })
  ), [nodes, projects]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...projectMeta]
      .filter(item => {
        const matchesQuery = !normalizedQuery || [item.project.name, item.project.description].join(" ").toLowerCase().includes(normalizedQuery);
        if (!matchesQuery) return false;
        if (statusFilter === "all") return true;
        if (statusFilter === "overdue") return isProjectOverdue(item.project, item.overdue);
        return item.project.status === statusFilter;
      })
      .sort((a, b) => {
        if (sortMode === "deadline") {
          const aTime = a.project.endDate ? new Date(a.project.endDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bTime = b.project.endDate ? new Date(b.project.endDate).getTime() : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        }
        if (sortMode === "progress-desc") return b.progress - a.progress;
        if (sortMode === "progress-asc") return a.progress - b.progress;
        return new Date(b.project.createdAt).getTime() - new Date(a.project.createdAt).getTime();
      });
  }, [projectMeta, query, sortMode, statusFilter]);

  const stats = useMemo(() => ({
    total: projects.length,
    doing: projects.filter(project => project.status === "doing").length,
    done: projects.filter(project => project.status === "done").length,
    overdue: projectMeta.reduce((total, item) => total + item.overdue, 0),
  }), [projectMeta, projects]);

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
      setErrorMsg("Vui long nhap ten project");
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
    toast.success("Da tao project");
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
    toast.success("Da xuat toan bo du lieu");
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
      toast.success("Import thanh cong");
    } catch (err) {
      toast.error("File JSON khong hop le");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950 px-6 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mind Map + Timeline</h1>
            <p className="mt-1 text-sm text-slate-400">Quan ly project, timeline va node graph trong mot workspace.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800" title="Nhap du lieu">
              <Upload className="h-4 w-4" /> Import
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <button onClick={handleExport} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800" title="Xuat du lieu">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">
              <Plus className="h-4 w-4" /> Tao Project
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <ProjectStats {...stats} />
        <ProjectToolbar
          query={query}
          statusFilter={statusFilter}
          sortMode={sortMode}
          onQueryChange={setQuery}
          onStatusChange={setStatusFilter}
          onSortChange={setSortMode}
        />

        {projects.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mb-4 rounded-2xl bg-indigo-50 p-4 text-indigo-600">
              <FolderOpen className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-950">Chua co project nao</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500">Tao project dau tien de bat dau lap mindmap, chia task va gan timeline.</p>
            <button onClick={() => setShowModal(true)} className="mt-5 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Tao project dau tien
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-medium text-slate-500 shadow-sm">
            Khong co project phu hop voi bo loc hien tai.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map(({ project, taskCount, progress, overdue }) => (
              <ProjectCard
                key={project.id}
                project={project}
                taskCount={taskCount}
                progress={progress}
                overdue={overdue}
                onOpen={() => handleOpenProject(project.id)}
                onDelete={() => setProjectToDelete(project.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-950">Tao project moi</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Dong">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Ten project *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={event => {
                    setNewProject({ ...newProject, name: event.target.value });
                    setErrorMsg("");
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Nhap ten project..."
                />
                {errorMsg && <p className="mt-1 text-xs text-rose-500">{errorMsg}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Mo ta</label>
                <textarea
                  value={newProject.description}
                  onChange={event => setNewProject({ ...newProject, description: event.target.value })}
                  className="min-h-[84px] w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Mo ta ngan ve project..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Bat dau</label>
                  <input
                    type="date"
                    value={newProject.startDate}
                    onChange={event => setNewProject({ ...newProject, startDate: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Ket thuc</label>
                  <input
                    type="date"
                    value={newProject.endDate}
                    onChange={event => setNewProject({ ...newProject, endDate: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Trang thai</label>
                  <select
                    value={newProject.status}
                    onChange={event => setNewProject({ ...newProject, status: event.target.value as Project["status"] })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="planning">Planning</option>
                    <option value="doing">Doing</option>
                    <option value="paused">Paused</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Mau sac</label>
                  <div className="mt-2 flex items-center gap-2">
                    {["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"].map(color => (
                      <button
                        key={color}
                        onClick={() => setNewProject({ ...newProject, color })}
                        className={`h-6 w-6 rounded-full border-2 transition ${newProject.color === color ? "scale-110 border-slate-500" : "border-transparent"}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button onClick={() => setShowModal(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200">
                Huy
              </button>
              <button onClick={handleCreateSubmit} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
                Tao project
              </button>
            </div>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="p-6">
              <div className="mb-4 w-fit rounded-xl bg-rose-50 p-3 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-950">Xoa project nay?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Toan bo task, subtask, step va timeline cua project se bi xoa vinh vien. Hanh dong nay khong the hoan tac.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button onClick={() => setProjectToDelete(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200">
                Huy
              </button>
              <button
                onClick={() => {
                  deleteProject(projectToDelete);
                  setProjectToDelete(null);
                  toast.success("Da xoa project");
                }}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                Xoa project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
