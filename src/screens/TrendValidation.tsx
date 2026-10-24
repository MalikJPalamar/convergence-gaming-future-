import StageHeader from "../components/StageHeader";
import ResourceBar from "../components/ResourceBar";
import { useGameStore } from "../store/gameStore";
import type { TrendCandidate, TrendBand } from "../types/scoring";

type ScoreField =
  | "humanNeedScore"
  | "persistenceScore"
  | "convergenceScore"
  | "evolutionScore";

const SCORE_FIELDS: Array<{ key: ScoreField; label: string }> = [
  { key: "humanNeedScore", label: "Human Need" },
  { key: "persistenceScore", label: "Persistence" },
  { key: "convergenceScore", label: "Convergence" },
  { key: "evolutionScore", label: "Cross-sector Evolution" },
];

const VALID_THRESHOLD = 7;

const formatTag = (t: string): string =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const classifyBand = (score: number): TrendBand => {
  if (score >= 10) return "major";
  if (score >= 7) return "emerging";
  if (score >= 4) return "weak";
  return "fad";
};

const BAND_CLASS: Record<TrendBand, string> = {
  fad: "border-forge-danger/40 text-forge-danger",
  weak: "border-forge-warn/40 text-forge-warn",
  emerging: "border-forge-accent/40 text-forge-accent",
  major: "border-forge-accent text-forge-accent ring-1 ring-forge-accent/40",
};

interface ScoreRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  testIdPrefix: string;
}

function ScoreRow({
  label,
  value,
  onChange,
  testIdPrefix,
}: ScoreRowProps): JSX.Element {
  const current = Math.max(0, Math.min(3, Math.round(value)));
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-xs text-forge-mute uppercase tracking-wide">
        {label}
      </span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex rounded-md border border-forge-line overflow-hidden"
      >
        {[0, 1, 2, 3].map((n) => {
          const active = n === current;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              data-testid={`${testIdPrefix}-${n}`}
              aria-pressed={active}
              className={[
                "px-3 py-1 text-xs font-mono transition-colors",
                active
                  ? "bg-forge-accent/15 text-forge-accent"
                  : "bg-forge-panel text-forge-mute hover:bg-forge-line",
              ].join(" ")}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TrendPanelProps {
  trend: TrendCandidate;
  onSetScore: (field: ScoreField, value: number) => void;
  onReset: () => void;
}

function TrendPanel({
  trend,
  onSetScore,
  onReset,
}: TrendPanelProps): JSX.Element {
  // Compute validity client-side so the UI reflects edits immediately,
  // even if the engine's recompute lags one render.
  const validityScore =
    trend.humanNeedScore +
    trend.persistenceScore +
    trend.convergenceScore +
    trend.evolutionScore;
  const band = classifyBand(validityScore);
  const validated = validityScore >= VALID_THRESHOLD;
  const signalPreview = trend.signalIds.slice(0, 4).join(", ");
  const signalMore =
    trend.signalIds.length > 4 ? `, +${trend.signalIds.length - 4} more` : "";

  return (
    <section
      data-testid={`trend-panel-${trend.id}`}
      className="panel p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-forge-ink leading-snug">
            {trend.title}
          </h2>
          <p className="text-xs text-forge-mute mt-1">
            {trend.signalIds.length} signals
            {signalPreview ? `: ${signalPreview}${signalMore}` : ""}
          </p>
        </div>
        <span
          data-testid={`trend-band-${trend.id}`}
          className={["tag shrink-0 uppercase", BAND_CLASS[band]].join(" ")}
        >
          {band}
        </span>
      </div>

      {trend.patternTags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {trend.patternTags.map((t) => (
            <span key={t} className="tag border-forge-accent/30 text-forge-accent">
              {formatTag(t)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-forge-line pt-3">
        {SCORE_FIELDS.map(({ key, label }) => (
          <ScoreRow
            key={key}
            label={label}
            value={trend[key]}
            onChange={(v) => onSetScore(key, v)}
            testIdPrefix={`score-${trend.id}-${key}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-forge-line pt-3">
        <div className="text-xs text-forge-mute">
          Validity:{" "}
          <span
            data-testid={`trend-validity-${trend.id}`}
            className="font-mono text-forge-ink"
          >
            {validityScore}
          </span>
          <span className="text-forge-mute"> / 12</span>
          {validated ? (
            <span className="ml-2 text-forge-accent">validated</span>
          ) : (
            <span className="ml-2 text-forge-mute">
              needs {VALID_THRESHOLD - validityScore} more
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="btn text-xs"
          data-testid={`trend-reset-${trend.id}`}
        >
          Reset
        </button>
      </div>
    </section>
  );
}

export default function TrendValidation(): JSX.Element {
  const lastRun = useGameStore((s) => s.lastRun);
  const setTrendScore = useGameStore((s) => s.setTrendScore);
  const resetTrendScores = useGameStore((s) => s.resetTrendScores);
  const commitTrendValidation = useGameStore((s) => s.commitTrendValidation);
  const abandonRun = useGameStore((s) => s.abandonRun);
  const commitError = useGameStore((s) => s.commitError);

  if (!lastRun) {
    return (
      <div className="panel p-6 text-forge-mute">
        No active run. Return to the main menu to start a mission.
      </div>
    );
  }

  const trends = lastRun.trendCandidates;
  const validatedCount = trends.filter((t) => {
    const total =
      t.humanNeedScore +
      t.persistenceScore +
      t.convergenceScore +
      t.evolutionScore;
    return total >= VALID_THRESHOLD;
  }).length;
  const canCommit = validatedCount > 0;

  return (
    <div className="flex flex-col gap-6">
      <ResourceBar resources={lastRun.resources} />

      <StageHeader
        step="A"
        title="Authenticate Trends"
        subtitle="Score each trend on four dimensions. A trend validates at ≥ 7."
      />

      {trends.length === 0 ? (
        <div className="panel p-6 text-forge-mute text-sm">
          No trend candidates on this run. Return to Pattern Board to form
          clusters.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {trends.map((trend) => (
            <TrendPanel
              key={trend.id}
              trend={trend}
              onSetScore={(field, value) =>
                setTrendScore(trend.id, field, value)
              }
              onReset={() => resetTrendScores(trend.id)}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div
          data-testid="trend-validation-summary"
          className="text-xs text-forge-mute"
        >
          {validatedCount} of {trends.length} trends validated (≥ {VALID_THRESHOLD}).
        </div>

        {commitError ? (
          <div
            data-testid="trend-commit-error"
            className="panel p-3 text-sm text-forge-danger border-forge-danger/40"
          >
            {commitError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="btn"
            onClick={abandonRun}
          >
            Abandon Run
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canCommit}
            onClick={() => commitTrendValidation()}
            data-testid="commit-trend"
          >
            Commit → Velocity Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
