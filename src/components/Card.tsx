import type { SignalCard } from "../types/cards";

interface CardProps {
  signal: SignalCard;
  selected?: boolean;
  onClick?: () => void;
}

const Pip = ({
  filled,
  tone,
}: {
  filled: boolean;
  tone: "accent" | "warn";
}): JSX.Element => (
  <span
    className={[
      "inline-block w-1.5 h-1.5 rounded-full mr-0.5",
      filled
        ? tone === "accent"
          ? "bg-forge-accent"
          : "bg-forge-warn"
        : "bg-forge-line",
    ].join(" ")}
  />
);

const renderPips = (count: number, tone: "accent" | "warn"): JSX.Element[] =>
  Array.from({ length: 5 }, (_, i) => (
    <Pip key={i} filled={i < count} tone={tone} />
  ));

const formatForce = (f: string): string =>
  f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Card({
  signal,
  selected = false,
  onClick,
}: CardProps): JSX.Element {
  const interactive = typeof onClick === "function";
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={[
        "panel p-3 flex flex-col gap-2",
        interactive ? "cursor-pointer hover:border-forge-accent/40" : "",
        selected ? "border-forge-accent ring-1 ring-forge-accent/40" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-forge-ink leading-snug">
          {signal.title}
        </h3>
        <span className="tag shrink-0">{formatForce(signal.primaryForce)}</span>
      </div>
      <p className="text-xs text-forge-mute line-clamp-3">
        {signal.description}
      </p>
      <div className="flex items-center justify-between text-[10px] text-forge-mute pt-1 border-t border-forge-line">
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-wide">Evidence</span>
          <span className="flex">{renderPips(signal.evidence, "accent")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-wide">Impact</span>
          <span className="flex">{renderPips(signal.impact, "warn")}</span>
        </div>
      </div>
    </div>
  );
}
