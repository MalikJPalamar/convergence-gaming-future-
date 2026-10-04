import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import App from "../App";
import { useGameStore, getMissions } from "../store/gameStore";

const resetStore = (): void => {
  useGameStore.setState({
    lastRun: null,
    stage: "MAIN_MENU",
    menuStage: "MAIN_MENU",
  });
};

const seedRunAtPatternBoard = (): void => {
  const missions = getMissions();
  const mission = missions[0]!;
  const store = useGameStore.getState();
  store.startRun(mission.id, "test-seed-pattern-board");
  // MISSION_BRIEF -> SIGNAL_DRAFT
  store.advance();
  // populate drawn so we can pick
  store.draftStart();
  // Pick 5 cards from drawn so commit is legal.
  for (let i = 0; i < 5; i += 1) {
    const run = useGameStore.getState().lastRun!;
    store.draftPick(run.drawn[0]!.id);
  }
  store.draftCommit();
};

describe("PatternBoard smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
    cleanup();
  });

  it("renders PatternBoard when stage is PATTERN_BOARD", () => {
    seedRunAtPatternBoard();
    render(<App />);
    expect(useGameStore.getState().stage).toBe("PATTERN_BOARD");
    expect(
      screen.getByRole("heading", { name: /Relate Patterns/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("pattern-hand")).toBeInTheDocument();
  });

  it("Add cluster makes one appear and disables at 3", () => {
    seedRunAtPatternBoard();
    render(<App />);
    const addBtn = screen.getByTestId("add-cluster") as HTMLButtonElement;
    expect(addBtn.disabled).toBe(false);

    fireEvent.click(addBtn);
    let clusters = useGameStore.getState().lastRun!.clusters;
    expect(clusters.length).toBe(1);
    expect(
      screen.getByTestId(`cluster-panel-${clusters[0]!.id}`),
    ).toBeInTheDocument();

    fireEvent.click(addBtn);
    fireEvent.click(addBtn);
    clusters = useGameStore.getState().lastRun!.clusters;
    expect(clusters.length).toBe(3);

    const addBtn2 = screen.getByTestId("add-cluster") as HTMLButtonElement;
    expect(addBtn2.disabled).toBe(true);
  });

  it("commit is disabled when no cluster meets the rules; reason is shown", () => {
    seedRunAtPatternBoard();
    render(<App />);
    const commit = screen.getByTestId("commit-pattern") as HTMLButtonElement;
    expect(commit.disabled).toBe(true);

    // Add an empty cluster — it should be invalid (too_few_cards).
    fireEvent.click(screen.getByTestId("add-cluster"));
    const cluster = useGameStore.getState().lastRun!.clusters[0]!;
    expect(
      screen.getByTestId(`cluster-validity-${cluster.id}`).textContent,
    ).toMatch(/invalid/i);
    expect(
      screen.getByTestId(`cluster-reason-${cluster.id}`).textContent,
    ).toMatch(/Need/i);

    const commit2 = screen.getByTestId("commit-pattern") as HTMLButtonElement;
    expect(commit2.disabled).toBe(true);
  });
});
