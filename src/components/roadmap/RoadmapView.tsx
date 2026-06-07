import RoadmapGrid from "./RoadmapGrid";
import UnscheduledPanel from "./UnscheduledPanel";

export default function RoadmapView() {
  return (
    <div className="flex-1 flex overflow-hidden">
      <UnscheduledPanel />
      <div className="flex-1 overflow-hidden">
        <RoadmapGrid />
      </div>
    </div>
  );
}
