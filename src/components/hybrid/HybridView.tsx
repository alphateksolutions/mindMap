import MindMapView from "../mindmap/MindMapView";
import RoadmapView from "../roadmap/RoadmapView";

export default function HybridView() {
  return (
    <div className="flex-1 flex w-full h-full divide-x divide-slate-200 bg-white">
      <div className="flex-1 overflow-hidden relative">
        <MindMapView />
      </div>
      <div className="flex-1 overflow-hidden relative">
        <RoadmapView />
      </div>
    </div>
  );
}
