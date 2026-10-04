import { useMemo } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import StageHeader from "../components/StageHeader";
import ResourceBar from "../components/ResourceBar";
import { useGameStore } from "../store/gameStore";
import {
  PATTERN_MAX_CLUSTERS,
  PATTERN_MIN_CARDS_PER_CLUSTER,
  PATTERN_MIN_TAGS_PER_CLUSTER,
  validateClusters,
  type ClusterValidation,
} from "../engine/patternEngine";
import type { SignalCard, PatternTag } from "../types/cards";
import type { PatternCluster, RunState } from "../types/game";

const HAND_DROP_ID = "pattern-hand";

const formatTag = (t: string): string =>
  t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface DraggableCardProps {
  card: SignalCard;
  /** the cluster this card currently lives in, or null if in hand */
  fromClusterId: string | null;
}

function DraggableCard({ card, fromClusterId }: DraggableCardProps): JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `signal:${card.id}`,
    data: { signalId: card.id, fromClusterId },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-testid={`pattern-card-${card.id}`}
      className={[
        "panel p-2 flex flex-col gap-1 cursor-grab active:cursor-grabbing select-none",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
    >
      <div className="text-xs font-semibold text-forge-ink leading-snug">
        {card.title}
      </div>
      <div className="flex flex-wrap gap-1">
        {card.patternTags.map((t) => (
          <span key={t} className="tag">
            {formatTag(t)}
          </span>
        ))}
      </div>
    </div>
  );
}

interface ClusterPanelProps {
  cluster: PatternCluster;
  cards: SignalCard[];
  tags: PatternTag[];
  validation: ClusterValidation | undefined;
  onRename: (title: string) => void;
  onRemove: () => void;
}

function ClusterPanel({
  cluster,
  cards,
  tags,
  validation,
  onRename,
  onRemove,
}: ClusterPanelProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({
    id: `cluster:${cluster.id}`,
    data: { clusterId: cluster.id },
  });

  const valid = validation ? validation.ok : false;
  const issueText =
    validation && !validation.ok ? validation.reasons.join(" · ") : null;

  return (
    <section
      data-testid={`cluster-panel-${cluster.id}`}
      className={[
        "panel p-4 flex flex-col gap-3",
        isOver ? "border-forge-accent" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <input
          type="text"
          value={cluster.proposedTitle}
          placeholder="Name this pattern…"
          onChange={(e) => onRename(e.target.value)}
          className="bg-transparent border-b border-forge-line text-forge-ink text-sm font-semibold py-1 flex-1 focus:outline-none focus:border-forge-accent"
          aria-label={`Cluster ${cluster.id} title`}
        />
        <span
          data-testid={`cluster-validity-${cluster.id}`}
          className={[
            "tag shrink-0",
            valid
              ? "border-forge-accent/40 text-forge-accent"
              : "border-forge-danger/40 text-forge-danger",
          ].join(" ")}
        >
          {valid ? "valid" : "invalid"}
        </span>
        <button
          onClick={onRemove}
          className="text-forge-mute hover:text-forge-danger text-xs"
          aria-label="Remove cluster"
        >
          remove
        </button>
      </div>

      {!valid && issueText ? (
        <div
          data-testid={`cluster-reason-${cluster.id}`}
          className="text-xs text-forge-danger"
        >
          {issueText}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {tags.length === 0 ? (
          <span className="text-xs text-forge-mute italic">
            No pattern tags yet.
          </span>
        ) : (
          tags.map((t) => (
            <span key={t} className="tag border-forge-accent/30 text-forge-accent">
              {formatTag(t)}
            </span>
          ))
        )}
      </div>

      <div
        ref={setNodeRef}
        data-testid={`cluster-drop-${cluster.id}`}
        className={[
          "min-h-[5rem] rounded-md border border-dashed p-2 flex flex-col gap-2",
          isOver ? "border-forge-accent bg-forge-accent/5" : "border-forge-line",
        ].join(" ")}
      >
        {cards.length === 0 ? (
          <div className="text-xs text-forge-mute italic self-center my-auto">
            Drop signals here
          </div>
        ) : (
          cards.map((card) => (
            <DraggableCard
              key={card.id}
              card={card}
              fromClusterId={cluster.id}
            />
          ))
        )}
      </div>
    </section>
  );
}

interface HandRowProps {
  cards: SignalCard[];
}

function HandRow({ cards }: HandRowProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({
    id: HAND_DROP_ID,
    data: { hand: true },
  });
  return (
    <section
      ref={setNodeRef}
      data-testid="pattern-hand"
      className={[
        "panel p-4 flex flex-col gap-3",
        isOver ? "border-forge-accent" : "",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm uppercase tracking-widest text-forge-mute">
          Hand
        </h2>
        <span className="text-xs text-forge-mute">{cards.length} unassigned</span>
      </div>
      {cards.length === 0 ? (
        <div className="text-xs text-forge-mute italic">
          All signals assigned to clusters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {cards.map((card) => (
            <DraggableCard key={card.id} card={card} fromClusterId={null} />
          ))}
        </div>
      )}
    </section>
  );
}

const computeAssignedSet = (run: RunState): Set<string> => {
  const ids = new Set<string>();
  for (const c of run.clusters) {
    for (const id of c.signalIds) ids.add(id);
  }
  return ids;
};

export default function PatternBoard(): JSX.Element {
  const lastRun = useGameStore((s) => s.lastRun);
  const patternAddCluster = useGameStore((s) => s.patternAddCluster);
  const patternRemoveCluster = useGameStore((s) => s.patternRemoveCluster);
  const patternAddSignal = useGameStore((s) => s.patternAddSignal);
  const patternRemoveSignal = useGameStore((s) => s.patternRemoveSignal);
  const patternSetTitle = useGameStore((s) => s.patternSetTitle);
  const patternCommit = useGameStore((s) => s.patternCommit);
  const abandonRun = useGameStore((s) => s.abandonRun);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const signalsById = useMemo(() => {
    const map: Record<string, SignalCard> = {};
    if (lastRun) {
      for (const c of lastRun.selected) map[c.id] = c;
    }
    return map;
  }, [lastRun]);

  if (!lastRun) {
    return (
      <div className="panel p-6 text-forge-mute">
        No active run. Return to the main menu to start a mission.
      </div>
    );
  }

  const assigned = computeAssignedSet(lastRun);
  const handCards = lastRun.selected.filter((c) => !assigned.has(c.id));
  const validations = validateClusters(lastRun);
  const validationsById = new Map(
    validations.map((v) => [v.clusterId, v] as const),
  );
  const allValid =
    lastRun.clusters.length > 0 && validations.every((v) => v.ok);
  const atMaxClusters = lastRun.clusters.length >= PATTERN_MAX_CLUSTERS;

  const onDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over) return;
    const data = active.data.current as
      | { signalId: string; fromClusterId: string | null }
      | undefined;
    if (!data) return;
    const overData = over.data.current as
      | { clusterId?: string; hand?: boolean }
      | undefined;

    if (overData?.hand) {
      if (data.fromClusterId) {
        patternRemoveSignal(data.fromClusterId, data.signalId);
      }
      return;
    }
    if (overData?.clusterId) {
      if (overData.clusterId === data.fromClusterId) return;
      patternAddSignal(overData.clusterId, data.signalId);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-6">
        <ResourceBar resources={lastRun.resources} />

        <StageHeader
          step="R"
          title="Relate Patterns"
          subtitle={`Form 1–${PATTERN_MAX_CLUSTERS} clusters: each needs ≥${PATTERN_MIN_CARDS_PER_CLUSTER} signals and ≥${PATTERN_MIN_TAGS_PER_CLUSTER} distinct pattern tags.`}
        />

        <HandRow cards={handCards} />

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-widest text-forge-mute">
            Clusters
          </h2>
          <button
            className="btn text-sm"
            onClick={patternAddCluster}
            disabled={atMaxClusters}
            data-testid="add-cluster"
          >
            + Add cluster ({lastRun.clusters.length}/{PATTERN_MAX_CLUSTERS})
          </button>
        </div>

        {lastRun.clusters.length === 0 ? (
          <div className="panel p-6 text-forge-mute text-sm">
            No clusters yet. Add one to start grouping signals.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {lastRun.clusters.map((cluster) => {
              const cards = cluster.signalIds
                .map((id) => signalsById[id])
                .filter((c): c is SignalCard => Boolean(c));
              const tagSet = new Set<PatternTag>();
              for (const c of cards) {
                for (const t of c.patternTags) tagSet.add(t);
              }
              const tags = [...tagSet];
              return (
                <ClusterPanel
                  key={cluster.id}
                  cluster={cluster}
                  cards={cards}
                  tags={tags}
                  validation={validationsById.get(cluster.id)}
                  onRename={(title) => patternSetTitle(cluster.id, title)}
                  onRemove={() => patternRemoveCluster(cluster.id)}
                />
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className="btn" onClick={abandonRun}>
            Abandon Run
          </button>
          <button
            className="btn-primary"
            disabled={!allValid}
            onClick={() => patternCommit()}
            data-testid="commit-pattern"
          >
            Commit clusters → Trend Validation
          </button>
        </div>
      </div>
    </DndContext>
  );
}
