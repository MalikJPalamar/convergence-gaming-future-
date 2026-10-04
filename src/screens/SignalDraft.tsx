import { useEffect } from "react";
import StageHeader from "../components/StageHeader";
import ResourceBar from "../components/ResourceBar";
import { getMission, useGameStore } from "../store/gameStore";
import {
  DRAFT_MIN_PICKS,
  DRAFT_MAX_PICKS,
  previewPick,
} from "../engine/draftEngine";
import type { SignalCard } from "../types/cards";
import type { Mission } from "../types/missions";

const formatDomain = (d: string): string =>
  d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const formatForce = (f: string): string =>
  f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface DraftTileProps {
  card: SignalCard;
  mission: Mission;
  attentionCost: number;
  credibilityBonus: number;
  willGetDomainDiscount: boolean;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function DraftTile({
  card,
  mission,
  attentionCost,
  credibilityBonus,
  willGetDomainDiscount,
  selected,
  disabled = false,
  onClick,
}: DraftTileProps): JSX.Element {
  const isDomainMatch = card.aiDomain === mission.aiDomain;
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      data-testid={`draft-tile-${card.id}`}
      onClick={() => {
        if (!disabled) onClick();
      }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={[
        "panel p-3 flex flex-col gap-2 transition-colors",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:border-forge-accent/40",
        selected ? "border-forge-accent ring-1 ring-forge-accent/40" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-forge-ink leading-snug">
          {card.title}
        </h3>
        <span className="tag shrink-0">{formatForce(card.primaryForce)}</span>
      </div>
      <p className="text-xs text-forge-mute line-clamp-2">{card.description}</p>
      <div className="flex flex-wrap gap-1 pt-1">
        <span
          className={[
            "tag",
            attentionCost === 0
              ? "border-forge-accent/40 text-forge-accent"
              : "",
          ].join(" ")}
          title="Attention cost"
        >
          {attentionCost === 0
            ? willGetDomainDiscount
              ? "0 attn (domain)"
              : "0 attn"
            : `${attentionCost} attn`}
        </span>
        {credibilityBonus > 0 ? (
          <span
            className="tag border-forge-warn/40 text-forge-warn"
            title="Credibility bonus"
          >
            +{credibilityBonus} cred
          </span>
        ) : null}
        {isDomainMatch ? (
          <span className="tag border-forge-accent/30 text-forge-accent">
            domain
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function SignalDraft(): JSX.Element {
  const lastRun = useGameStore((s) => s.lastRun);
  const draftStart = useGameStore((s) => s.draftStart);
  const draftPick = useGameStore((s) => s.draftPick);
  const draftUnpick = useGameStore((s) => s.draftUnpick);
  const draftCommit = useGameStore((s) => s.draftCommit);
  const abandonRun = useGameStore((s) => s.abandonRun);

  useEffect(() => {
    if (lastRun && lastRun.drawn.length === 0 && lastRun.selected.length === 0) {
      draftStart();
    }
  }, [lastRun, draftStart]);

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

  const selectedCount = lastRun.selected.length;
  const canCommit =
    selectedCount >= DRAFT_MIN_PICKS && selectedCount <= DRAFT_MAX_PICKS;
  const atMaxPicks = selectedCount >= DRAFT_MAX_PICKS;

  return (
    <div className="flex flex-col gap-6">
      <ResourceBar resources={lastRun.resources} />

      <StageHeader
        step="T"
        title="Track Signals"
        subtitle={`Pick ${DRAFT_MIN_PICKS}–${DRAFT_MAX_PICKS} signals from the 12 drawn.`}
      />

      <p className="text-sm text-forge-mute">
        First 3 picks matching the mission's domain (
        <span className="text-forge-accent">
          {formatDomain(mission.aiDomain)}
        </span>
        ) cost 0 attention. Cards whose primary force is required by the mission
        grant +1 credibility.
      </p>

      <section className="panel p-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm uppercase tracking-widest text-forge-mute">
            Selected
          </h2>
          <span className="text-xs text-forge-mute">
            {selectedCount} / {DRAFT_MIN_PICKS}–{DRAFT_MAX_PICKS}
          </span>
        </div>
        {selectedCount === 0 ? (
          <div className="text-xs text-forge-mute italic">
            No signals tracked yet. Pick at least {DRAFT_MIN_PICKS}.
          </div>
        ) : (
          <div
            data-testid="selected-list"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {lastRun.selected.map((card) => {
              const credibilityBonus = mission.requiredForces.includes(
                card.primaryForce,
              )
                ? 1
                : 0;
              return (
                <DraftTile
                  key={card.id}
                  card={card}
                  mission={mission}
                  attentionCost={0}
                  credibilityBonus={credibilityBonus}
                  willGetDomainDiscount={false}
                  selected
                  onClick={() => draftUnpick(card.id)}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="panel p-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm uppercase tracking-widest text-forge-mute">
            Drawn
          </h2>
          <span className="text-xs text-forge-mute">
            {lastRun.drawn.length} available
          </span>
        </div>
        {lastRun.drawn.length === 0 ? (
          <div className="text-xs text-forge-mute italic">
            No cards drawn.
          </div>
        ) : (
          <div
            data-testid="drawn-list"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {lastRun.drawn.map((card) => {
              const preview = previewPick(lastRun, card.id, mission);
              const disabled = atMaxPicks || !preview.legal;
              return (
                <DraftTile
                  key={card.id}
                  card={card}
                  mission={mission}
                  attentionCost={preview.attentionCost}
                  credibilityBonus={preview.credibilityBonus}
                  willGetDomainDiscount={preview.willGetDomainDiscount}
                  selected={false}
                  disabled={disabled}
                  onClick={() => draftPick(card.id)}
                />
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className="btn" onClick={abandonRun}>
          Abandon Run
        </button>
        <button
          className="btn-primary"
          disabled={!canCommit}
          onClick={() => draftCommit()}
        >
          Commit selection → Pattern Board
        </button>
      </div>
    </div>
  );
}
