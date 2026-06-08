import { useEffect } from "react";
import { useStore } from "../../store/useStore";
import Header from "./Header";
import Toolbar from "./Toolbar";
import RightPanel from "../editor/RightPanel";

import MindMapView from "../mindmap/MindMapView";
import ListView from "../list/ListView";

export default function AppShell() {
  const { activeView, undo } = useStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        Boolean(target?.isContentEditable);

      if (isEditable) return;
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans">
      <Header />
      <Toolbar />
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F8FAFC]">
          {activeView === "mindmap" && <MindMapView />}
          {activeView === "list" && <ListView />}
        </main>
        <RightPanel />
      </div>
      {/* Footer Status Bar */}
      <footer className="h-6 bg-white border-t border-slate-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <p className="text-[9px] text-slate-400 font-medium">Sync Status: <span className="text-emerald-600">Local Save Complete</span></p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[9px] text-slate-400 font-medium">Workspace Active</p>
        </div>
      </footer>
    </div>
  );
}
