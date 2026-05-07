import { useGameStore } from "../store/gameStore";

export default function Archive(): JSX.Element {
  const goto = useGameStore((s) => s.goto);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-forge-mute">
            Meta-progression
          </div>
          <h1 className="text-3xl font-semibold text-forge-ink">Archive</h1>
        </div>
        <button className="btn" onClick={() => goto("MAIN_MENU")}>
          Back
        </button>
      </header>
      <div className="panel p-6 text-forge-mute">
        Coming in next milestone.
      </div>
    </div>
  );
}
