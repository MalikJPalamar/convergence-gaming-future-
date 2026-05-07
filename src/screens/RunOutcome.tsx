import { useGameStore } from "../store/gameStore";

export default function RunOutcome(): JSX.Element {
  const goto = useGameStore((s) => s.goto);
  const abandonRun = useGameStore((s) => s.abandonRun);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-forge-mute">
            Run Outcome
          </div>
          <h1 className="text-3xl font-semibold text-forge-ink">
            Future Readiness Score
          </h1>
        </div>
      </header>
      <div className="panel p-6 text-forge-mute">
        Coming in next milestone.
      </div>
      <div className="flex gap-3">
        <button className="btn" onClick={() => goto("MISSION_BRIEF")}>
          Back to Mission Brief
        </button>
        <button className="btn" onClick={abandonRun}>
          Return to Main Menu
        </button>
      </div>
    </div>
  );
}
