import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import App from "../App";
import { useGameStore } from "../store/gameStore";

const resetStore = (): void => {
  useGameStore.setState({
    lastRun: null,
    stage: "MAIN_MENU",
    menuStage: "MAIN_MENU",
  });
};

describe("App smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
    cleanup();
  });

  it("boots to the Main Menu", () => {
    render(<App />);
    expect(screen.getByText(/Signal Forge/i)).toBeInTheDocument();
    expect(screen.getByText(/Future of AI/i)).toBeInTheDocument();
  });

  it("navigates Main Menu → Mission Select", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /new run/i }));
    expect(useGameStore.getState().stage).toBe("MISSION_SELECT");
  });

  it("starts a run from a mission and lands on Mission Brief", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /new run/i }));
    const beginButtons = screen.getAllByRole("button", { name: /begin mission/i });
    expect(beginButtons.length).toBeGreaterThan(0);
    fireEvent.click(beginButtons[0]);
    expect(useGameStore.getState().stage).toBe("MISSION_BRIEF");
    expect(useGameStore.getState().lastRun).not.toBeNull();
  });
});
