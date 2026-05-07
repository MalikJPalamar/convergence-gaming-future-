import { useGameStore } from "../store/gameStore";

export default function MainMenu(): JSX.Element {
  const lastRun = useGameStore((s) => s.lastRun);
  const goto = useGameStore((s) => s.goto);
  const resetSave = useGameStore((s) => s.resetSave);

  const onContinue = (): void => {
    if (!lastRun) return;
    goto(lastRun.stage);
  };

  const onReset = (): void => {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "Reset save? This wipes meta-progression, the active run, and all unlocks.",
      )
    ) {
      resetSave();
    }
  };

  return (
    <div className="flex flex-col items-center text-center gap-8 pt-12">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-forge-mute">
          Future of AI
        </div>
        <h1 className="text-5xl font-semibold text-forge-ink mt-2">
          Signal Forge
        </h1>
        <p className="text-forge-mute mt-3 max-w-md">
          A card-strategy roguelite using the Strate-chic Method.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          className="btn-primary"
          onClick={() => goto("MISSION_SELECT")}
        >
          New Run
        </button>
        <button
          className="btn"
          disabled={lastRun === null}
          onClick={onContinue}
        >
          Continue Run
        </button>
        <button className="btn" onClick={() => goto("ARCHIVE")}>
          Archive
        </button>
        <button className="btn" onClick={onReset}>
          Reset Save
        </button>
      </div>

      <footer className="text-xs text-forge-mute mt-12 max-w-md">
        <span className="font-mono tracking-widest">S · T · R · A · T · E · C</span>
        <div className="mt-1">
          Set Frame · Track Signals · Relate Patterns · Authenticate Trends ·
          Trace Velocity · Envision Futures · Commit Backcast
        </div>
      </footer>
    </div>
  );
}
