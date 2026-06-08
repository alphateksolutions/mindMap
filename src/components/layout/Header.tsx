import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, Download, FolderKanban, Moon, Save, Sun, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useStore } from "../../store/useStore";
import mindmapLogo from "../../../assets/mindmap-logo.svg";

export default function Header() {
  const { activeProjectId, projects, nodes, edges, setActiveProject, importData } = useStore();
  const project = projects.find(p => p.id === activeProjectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark") || localStorage.getItem("mindmap-theme") === "dark";
    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("mindmap-theme", next ? "dark" : "light");
      return next;
    });
  };

  if (!project) return null;

  const statusClass: Record<string, string> = {
    planning: "border-indigo-400/40 bg-indigo-400/10 text-indigo-200",
    doing: "border-sky-400/40 bg-sky-400/10 text-sky-200",
    paused: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    done: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  };

  const handleSave = () => {
    toast.success("Da luu thay doi");
  };

  const handleExport = () => {
    const projectNodes = nodes.filter(n => n.projectId === project.id);
    const projectEdges = edges.filter(e => e.projectId === project.id);

    const data = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      project,
      nodes: projectNodes,
      edges: projectEdges,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindmap-timeline-${project.name.toLowerCase().replace(/[\s\W-]+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Da xuat file project");
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if ((!data.project && !data.projects) || !data.nodes) {
        throw new Error("Invalid file format");
      }

      importData(data);
      toast.success("Import thanh cong");
    } catch (err) {
      toast.error("File import khong hop le");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <header className="h-16 shrink-0 border-b border-slate-800 bg-slate-950 px-4 text-white shadow-sm sm:px-6">
      <div className="flex h-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setActiveProject(null)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Quay lai Dashboard"
            aria-label="Quay lai Dashboard"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="hidden h-9 w-9 overflow-hidden rounded-xl shadow-lg shadow-indigo-950/20 ring-1 ring-white/20 sm:block">
            <img src={mindmapLogo} alt="Mind Map Timeline" className="h-full w-full" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <FolderKanban className="h-4 w-4 shrink-0 text-indigo-300" />
              <h1 className="truncate text-sm font-bold text-slate-100 sm:text-base">{project.name}</h1>
              <span className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-flex ${statusClass[project.status] || statusClass.planning}`}>
                {project.status}
              </span>
            </div>
            <p className="mt-0.5 hidden text-[11px] font-medium text-slate-400 sm:block">Timeline Mind Map workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.16)]" />
            <span className="text-xs font-semibold text-slate-300">Da luu cuc bo</span>
          </div>
          <button onClick={handleSave} className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white" title="Luu thay doi" aria-label="Luu thay doi">
            <Save className="h-4 w-4" />
          </button>
          <button onClick={handleExport} className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white" title="Xuat du lieu" aria-label="Xuat du lieu">
            <Download className="h-4 w-4" />
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button onClick={() => fileInputRef.current?.click()} className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white" title="Nhap du lieu" aria-label="Nhap du lieu">
            <Upload className="h-4 w-4" />
          </button>
          <div className="mx-1 h-5 w-px bg-slate-700" />
          <button onClick={toggleTheme} className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white" title="Doi giao dien" aria-label="Doi giao dien">
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
