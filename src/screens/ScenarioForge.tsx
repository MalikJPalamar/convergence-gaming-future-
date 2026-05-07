import StageHeader from "../components/StageHeader";
import { useGameStore } from "../store/gameStore";

export default function ScenarioForge(): JSX.Element {
  const goto = useGameStore((s) => s.goto);
  return (
    <div className="flex flex-col gap-6">
      <StageHeader
        step="E"
        title="Scenario Forge"
        subtitle="Envision Futures · Generate scenarios across axes."
      />
      <div className="panel p-6 text-forge-mute">
        Coming in next milestone.
      </div>
      <button className="btn self-start" onClick={() => goto("MISSION_BRIEF")}>
        Back to Mission Brief
      </button>
    </div>
  );
}
