import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, Moon, Sun, Download, Upload, Save } from "lucide-react";
import { useStore } from "../../store/useStore";
import toast from "react-hot-toast";
import { format } from "date-fns";
import mindmapLogo from "../../../assets/mindmap-logo.svg";

export default function Header() {
  const { activeProjectId, projects, nodes, edges, setActiveProject, importData } = useStore();
  const project = projects.find(p => p.id === activeProjectId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark") ||
      localStorage.getItem("mindmap-theme") === "dark";
    if (isDark) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("mindmap-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("mindmap-theme", "light");
      }
      return next;
    });
  };

  if (!project) return null;

  const handleSave = () => {
    toast.success("Đã lưu thành công");
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
    toast.success("Đã xuất file dự án");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if ((!data.project && !data.projects) || !data.nodes) {
        throw new Error("Invalid file format");
      }

      importData(data);
      toast.success("Import thành công");
    } catch (err) {
      toast.error("File import không hợp lệ");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setActiveProject(null)}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          title="Quay lại Dashboard"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-indigo-950/20 ring-1 ring-white/20">
          <img src={mindmapLogo} alt="Mind Map Timeline" className="h-full w-full" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">{project.name}</h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{project.status}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Đã lưu cục bộ</span>
        </div>
        <button onClick={handleSave} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Lưu">
          <Save className="w-4 h-4" />
        </button>
        <button onClick={handleExport} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Export">
          <Download className="w-4 h-4" />
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Import">
          <Upload className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
        <button onClick={toggleTheme} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Đổi giao diện">
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
