import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import App from "../App";
import { useGameStore, getMissions } from "../store/gameStore";
import type { RunState } from "../types/game";
import type { TrendCandidate } from "../types/scoring";
import type { PlayerResources } from "../types/cards";

const defaultResources: PlayerResources = {
  attention: 5,
  credibility: 2,
  capital: 2,
  trust: 2,
  time: 5,
};

const makeTrend = (
  id: string,
  title: string,
  overrides: Partial<TrendCandidate> = {},
): TrendCandidate => {
  const humanNeedScore = overrides.humanNeedScore ?? 0;
  const persistenceScore = overrides.persistenceScore ?? 0;
  const convergenceScore = overrides.convergenceScore ?? 0;
  const evolutionScore = overrides.evolutionScore ?? 0;
  const validityScore =
    overrides.validityScore ??
    humanNeedScore + persistenceScore + convergenceScore + evolutionScore;
  return {
    id,
    title,
    signalIds: ["sig-a", "sig-b", "sig-c"],
    patternTags: ["clash", "edge"],
    humanNeedScore,
    persistenceScore,
    convergenceScore,
    evolutionScore,
    validityScore,
    isValidated: validityScore >= 7,
    ...overrides,
  };
};

const seedRunAtTrendValidation = (trends: TrendCandidate[]): void => {
  const missions = getMissions();
  const mission = missions[0]!;
  const run: RunState = {
    seed: "test-seed-trend-validation",
    missionId: mission.id,
    stage: "TREND_VALIDATION",
    timeHorizon: null,
    priorityStakeholders: [],
    resources: { ...defaultResources },
    deck: [],
    drawn: [],
    selected: [],
    domainDiscountUsed: 0,
    clusters: [],
    trendCandidates: trends,
    scenarios: [],
    preferredScenarioId: null,
    backcastItems: [],
    finalScore: null,
    log: [],
  };
  useGameStore.setState({
    lastRun: run,
    stage: "TREND_VALIDATION",
    menuStage: "MAIN_MENU",
    commitError: null,
  });
};

const resetStore = (): void => {
  useGameStore.setState({
    lastRun: null,
    stage: "MAIN_MENU",
    menuStage: "MAIN_MENU",
    commitError: null,
  });
};

describe("TrendValidation smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
    cleanup();
  });

  it("renders both trend candidates with their titles", () => {
    seedRunAtTrendValidation([
      makeTrend("trend_v", "Validated Trend", {
        humanNeedScore: 2,
        persistenceScore: 2,
        convergenceScore: 2,
        evolutionScore: 2,
      }),
      makeTrend("trend_f", "Fad Trend", {
        humanNeedScore: 1,
        persistenceScore: 1,
      }),
    ]);
    render(<App />);
    expect(useGameStore.getState().stage).toBe("TREND_VALIDATION");
    expect(
      screen.getByRole("heading", { name: /Authenticate Trends/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Validated Trend")).toBeInTheDocument();
    expect(screen.getByText("Fad Trend")).toBeInTheDocument();
    expect(screen.getByTestId("trend-panel-trend_v")).toBeInTheDocument();
    expect(screen.getByTestId("trend-panel-trend_f")).toBeInTheDocument();
  });

  it("clicking a 0..3 button updates the sub-score and derived band chip", () => {
    seedRunAtTrendValidation([
      makeTrend("trend_f", "Fad Trend", {
        humanNeedScore: 1,
        persistenceScore: 1,
        convergenceScore: 0,
        evolutionScore: 0,
      }),
    ]);
    render(<App />);
    // Initially band=fad (total=2) and the "needs 5 more" summary shows.
    expect(screen.getByTestId("trend-band-trend_f").textContent).toMatch(/fad/i);
    expect(screen.getByTestId("trend-validity-trend_f").textContent).toBe("2");

    // Click persistence -> 3, humanNeed -> 3, convergence -> 2 (total = 9, emerging)
    fireEvent.click(
      screen.getByTestId("score-trend_f-persistenceScore-3"),
    );
    fireEvent.click(screen.getByTestId("score-trend_f-humanNeedScore-3"));
    fireEvent.click(screen.getByTestId("score-trend_f-convergenceScore-2"));

    const run = useGameStore.getState().lastRun!;
    const t = run.trendCandidates.find((x) => x.id === "trend_f")!;
    expect(t.persistenceScore).toBe(3);
    expect(t.humanNeedScore).toBe(3);
    expect(t.convergenceScore).toBe(2);
    expect(t.validityScore).toBe(8);
    expect(screen.getByTestId("trend-validity-trend_f").textContent).toBe("8");
    expect(screen.getByTestId("trend-band-trend_f").textContent).toMatch(
      /emerging/i,
    );
  });

  it("Commit → Velocity Matrix advances stage when a validated trend exists", () => {
    seedRunAtTrendValidation([
      makeTrend("trend_v", "Validated Trend", {
        humanNeedScore: 2,
        persistenceScore: 2,
        convergenceScore: 2,
        evolutionScore: 2,
      }),
      makeTrend("trend_f", "Fad Trend", {
        humanNeedScore: 1,
        persistenceScore: 1,
      }),
    ]);
    render(<App />);
    const commit = screen.getByTestId("commit-trend") as HTMLButtonElement;
    expect(commit.disabled).toBe(false);
    fireEvent.click(commit);
    expect(useGameStore.getState().stage).toBe("VELOCITY_MATRIX");
  });

  it("Commit button is disabled when no trend is validated", () => {
    seedRunAtTrendValidation([
      makeTrend("trend_f1", "Fad One", { humanNeedScore: 1 }),
      makeTrend("trend_f2", "Fad Two", { persistenceScore: 2 }),
    ]);
    render(<App />);
    const commit = screen.getByTestId("commit-trend") as HTMLButtonElement;
    expect(commit.disabled).toBe(true);
  });

  it("adjusting a score clears a stale commitError", () => {
    seedRunAtTrendValidation([
      makeTrend("trend_f", "Fad Trend", { humanNeedScore: 1 }),
    ]);
    const { commitTrendValidation, setTrendScore, resetTrendScores } =
      useGameStore.getState();

    // Attempt to commit with no validated trend — should set commitError.
    commitTrendValidation();
    expect(useGameStore.getState().commitError).toMatch(/validated trend/i);

    // Any score mutation should clear the stale error.
    setTrendScore("trend_f", "humanNeedScore", 3);
    expect(useGameStore.getState().commitError).toBeNull();

    // And so should resetTrendScores.
    commitTrendValidation(); // re-arm the error (still not validated after reset would zero it)
    // Actually: trend_f now has humanNeed=3, others 0 → validity=3, still fad.
    // commit should fail again:
    expect(useGameStore.getState().commitError).toMatch(/validated trend/i);
    resetTrendScores("trend_f");
    expect(useGameStore.getState().commitError).toBeNull();
  });
});
