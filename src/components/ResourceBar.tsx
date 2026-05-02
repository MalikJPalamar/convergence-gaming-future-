import type { PlayerResources } from "../types/cards";

interface ResourceBarProps {
  resources: PlayerResources;
}

const ITEMS: Array<{ key: keyof PlayerResources; label: string }> = [
  { key: "attention", label: "Attention" },
  { key: "credibility", label: "Credibility" },
  { key: "capital", label: "Capital" },
  { key: "trust", label: "Trust" },
  { key: "time", label: "Time" },
];

export default function ResourceBar({
  resources,
}: ResourceBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map(({ key, label }) => (
        <div
          key={key}
          className="panel px-3 py-1.5 flex items-center gap-2 text-xs"
        >
          <span className="text-forge-mute uppercase tracking-wide">
            {label}
          </span>
          <span className="text-forge-ink font-mono font-semibold">
            {resources[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
