interface StageHeaderProps {
  step: string; // S/T/R/A/T/E/C
  title: string;
  subtitle?: string;
}

const STEP_NAMES: Record<string, string> = {
  S: "Set Frame",
  T: "Track Signals",
  R: "Relate Patterns",
  A: "Authenticate Trends",
  E: "Envision Futures",
  C: "Commit Backcast",
};

export default function StageHeader({
  step,
  title,
  subtitle,
}: StageHeaderProps): JSX.Element {
  const stepName = STEP_NAMES[step.toUpperCase()];
  return (
    <header className="flex items-start gap-3 mb-4">
      <div className="panel w-12 h-12 flex items-center justify-center shrink-0">
        <span className="font-mono text-xl text-forge-accent font-bold">
          {step.toUpperCase()}
        </span>
      </div>
      <div className="min-w-0">
        {stepName ? (
          <div className="text-[10px] uppercase tracking-widest text-forge-mute">
            Strate-chic · {stepName}
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold text-forge-ink leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-forge-mute mt-0.5">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}
