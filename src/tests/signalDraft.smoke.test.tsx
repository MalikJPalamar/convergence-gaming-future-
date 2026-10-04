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

const seedRunAtSignalDraft = (): void => {
  const missions = getMissions();
  const mission = missions[0]!;
  const store = useGameStore.getState();
  store.startRun(mission.id, "test-seed-signal-draft");
  // MISSION_BRIEF -> SIGNAL_DRAFT
  store.advance();
};

describe("SignalDraft smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
    cleanup();
  });

  it("renders SignalDraft when stage is SIGNAL_DRAFT and auto-fills 12 drawn cards", () => {
    seedRunAtSignalDraft();
    render(<App />);
    expect(useGameStore.getState().stage).toBe("SIGNAL_DRAFT");
    expect(
      screen.getByRole("heading", { name: /Track Signals/i }),
    ).toBeInTheDocument();
    const run = useGameStore.getState().lastRun;
    expect(run).not.toBeNull();
    expect(run!.drawn.length).toBe(12);
    expect(run!.selected.length).toBe(0);
  });

  it("clicking a drawn tile moves it to selected and updates the count", () => {
    seedRunAtSignalDraft();
    render(<App />);
    const before = useGameStore.getState().lastRun!;
    const firstId = before.drawn[0]!.id;
    const tile = screen.getByTestId(`draft-tile-${firstId}`);
    fireEvent.click(tile);
    const after = useGameStore.getState().lastRun!;
    expect(after.selected.length).toBe(1);
    expect(after.drawn.length).toBe(11);
    expect(after.selected[0]!.id).toBe(firstId);
  });

  it("commit button is disabled below 5 selections; enabled at 5; advances to PATTERN_BOARD", () => {
    seedRunAtSignalDraft();
    render(<App />);
    const commit = screen.getByRole("button", {
      name: /commit selection/i,
    }) as HTMLButtonElement;
    expect(commit.disabled).toBe(true);

    // Pick 5 cards.
    for (let i = 0; i < 5; i += 1) {
      const drawn = useGameStore.getState().lastRun!.drawn;
      fireEvent.click(screen.getByTestId(`draft-tile-${drawn[0]!.id}`));
    }
    expect(useGameStore.getState().lastRun!.selected.length).toBe(5);
    const commit2 = screen.getByRole("button", {
      name: /commit selection/i,
    }) as HTMLButtonElement;
    expect(commit2.disabled).toBe(false);

    fireEvent.click(commit2);
    expect(useGameStore.getState().stage).toBe("PATTERN_BOARD");
  });
});
