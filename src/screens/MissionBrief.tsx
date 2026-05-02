import { getMission, useGameStore } from "../store/gameStore";
import ResourceBar from "../components/ResourceBar";
import StageHeader from "../components/StageHeader";
import type { TimeHorizon } from "../types/missions";

const HORIZON_LABELS: Record<TimeHorizon, string> = {
  near_1_2_years: "Near · 1–2 yrs",
  mid_3_5_years: "Mid · 3–5 yrs",
  long_5_10_years: "Long · 5–10 yrs",
  far_10_plus_years: "Far · 10+ yrs",
};

const formatStakeholder = (s: string): string =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function MissionBrief(): JSX.Element {
  const lastRun = useGameStore((s) => s.lastRun);
  const setTimeHorizon = useGameStore((s) => s.setTimeHorizon);
  const togglePriorityStakeholder = useGameStore(
    (s) => s.togglePriorityStakeholder,
  );
  const advance = useGameStore((s) => s.advance);
  const abandonRun = useGameStore((s) => s.abandonRun);

  if (!lastRun) {
    return (
      <div className="panel p-6 text-forge-mute">
        No active run. Return to the main menu to start a mission.
      </div>
    );
  }

  const mission = getMission(lastRun.missionId);
  if (!mission) {
    return (
      <div className="panel p-6 text-forge-danger">
        Mission "{lastRun.missionId}" not found.
      </div>
    );
  }

  const selectedStakeholders = lastRun.priorityStakeholders;
  const canAdvance =
    lastRun.timeHorizon !== null && selectedStakeholders.length === 3;

  const onToggleStakeholder = (s: string): void => {
    togglePriorityStakeholder(s);
  };

  return (
    <div className="flex flex-col gap-6">
      <ResourceBar resources={lastRun.resources} />

      <StageHeader
        step="S"
        title={mission.title}
        subtitle="Set Frame · Define horizon and priority stakeholders."
      />

      <section className="panel p-5 flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-widest text-forge-mute">
          Briefing
        </h2>
        <p className="text-forge-ink leading-relaxed">{mission.briefing}</p>
        <div className="border-t border-forge-line pt-3">
          <div className="text-xs uppercase tracking-widest text-forge-mute mb-1">
            Core Question
          </div>
          <p className="text-forge-accent italic">{mission.coreQuestion}</p>
        </div>
      </section>

      <section className="panel p-5 flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-widest text-forge-mute">
          Time Horizon
        </h2>
        <div className="flex flex-wrap gap-2">
          {mission.timeHorizons.map((h) => {
            const active = lastRun.timeHorizon === h;
            return (
              <button
                key={h}
                onClick={() => setTimeHorizon(h)}
                className={[
                  "btn text-sm",
                  active
                    ? "border-forge-accent text-forge-accent bg-forge-accent/10"
                    : "",
                ].join(" ")}
                aria-pressed={active}
              >
                {HORIZON_LABELS[h]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel p-5 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm uppercase tracking-widest text-forge-mute">
            Priority Stakeholders
          </h2>
          <span className="text-xs text-forge-mute">
            {selectedStakeholders.length} / 3
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {mission.defaultStakeholders.map((s) => {
            const active = selectedStakeholders.includes(s);
            const disabled = !active && selectedStakeholders.length >= 3;
            return (
              <button
                key={s}
                onClick={() => onToggleStakeholder(s)}
                disabled={disabled}
                className={[
                  "tag cursor-pointer",
                  active
                    ? "border-forge-accent text-forge-accent bg-forge-accent/10"
                    : "hover:border-forge-accent/40",
                  disabled ? "opacity-40 cursor-not-allowed" : "",
                ].join(" ")}
                aria-pressed={active}
              >
                {formatStakeholder(s)}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className="btn" onClick={abandonRun}>
          Abandon Run
        </button>
        <button
          className="btn-primary"
          disabled={!canAdvance}
          onClick={() => advance()}
        >
          Begin Signal Draft
        </button>
      </div>
    </div>
  );
}
