import { getMissions, useGameStore } from "../store/gameStore";
import type { Mission } from "../types/missions";

const formatDomain = (d: string): string =>
  d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const DifficultyDots = ({
  difficulty,
}: {
  difficulty: number;
}): JSX.Element => (
  <span className="flex items-center gap-0.5" aria-label={`Difficulty ${difficulty} of 5`}>
    {Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={[
          "inline-block w-1.5 h-1.5 rounded-full",
          i < difficulty ? "bg-forge-warn" : "bg-forge-line",
        ].join(" ")}
      />
    ))}
  </span>
);

function MissionCard({ mission }: { mission: Mission }): JSX.Element {
  const startRun = useGameStore((s) => s.startRun);
  return (
    <div className="panel p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-forge-ink leading-snug">
          {mission.title}
        </h2>
        <span className="tag shrink-0">{formatDomain(mission.aiDomain)}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-forge-mute">
        <span className="uppercase tracking-wide">Difficulty</span>
        <DifficultyDots difficulty={mission.difficulty} />
      </div>
      <p className="text-sm text-forge-mute line-clamp-3">{mission.briefing}</p>
      <button
        className="btn-primary mt-auto"
        onClick={() => startRun(mission.id)}
      >
        Begin Mission
      </button>
    </div>
  );
}

export default function MissionSelect(): JSX.Element {
  const goto = useGameStore((s) => s.goto);
  const missions = getMissions();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-forge-mute">
            Strate-chic · Set Frame
          </div>
          <h1 className="text-3xl font-semibold text-forge-ink">
            Choose a Mission
          </h1>
        </div>
        <button className="btn" onClick={() => goto("MAIN_MENU")}>
          Back
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {missions.map((m) => (
          <MissionCard key={m.id} mission={m} />
        ))}
      </div>
    </div>
  );
}
