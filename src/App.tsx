import { useGameStore } from "./store/gameStore";
import MainMenu from "./screens/MainMenu";
import MissionSelect from "./screens/MissionSelect";
import MissionBrief from "./screens/MissionBrief";
import SignalDraft from "./screens/SignalDraft";
import PatternBoard from "./screens/PatternBoard";
import TrendValidation from "./screens/TrendValidation";
import VelocityMatrix from "./screens/VelocityMatrix";
import ScenarioForge from "./screens/ScenarioForge";
import BackcastTimeline from "./screens/BackcastTimeline";
import RunOutcome from "./screens/RunOutcome";
import Archive from "./screens/Archive";
import type { RunStage } from "./types/game";

const screens: Record<RunStage, () => JSX.Element> = {
  MAIN_MENU: MainMenu,
  MISSION_SELECT: MissionSelect,
  MISSION_BRIEF: MissionBrief,
  SIGNAL_DRAFT: SignalDraft,
  PATTERN_BOARD: PatternBoard,
  TREND_VALIDATION: TrendValidation,
  VELOCITY_MATRIX: VelocityMatrix,
  SCENARIO_FORGE: ScenarioForge,
  BACKCAST_TIMELINE: BackcastTimeline,
  RUN_OUTCOME: RunOutcome,
  ARCHIVE: Archive,
};

export default function App(): JSX.Element {
  const stage = useGameStore((s) => s.stage);
  const Screen = screens[stage] ?? MainMenu;
  return (
    <div className="min-h-full max-w-5xl mx-auto p-6 sm:p-8">
      <Screen />
    </div>
  );
}
