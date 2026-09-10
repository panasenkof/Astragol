export type AiDifficulty = "easy" | "normal" | "hard";

export const AI_DIFFICULTY_OPTIONS: {
  id: AiDifficulty;
  label: string;
  blurb: string;
}[] = [
  {
    id: "easy",
    label: "Easy",
    blurb: "Slow to turn and often off-target — good for learning the feel.",
  },
  {
    id: "normal",
    label: "Normal",
    blurb: "A fair match. Reads the ball, but still leaves openings.",
  },
  {
    id: "hard",
    label: "Hard",
    blurb: "Snaps onto shots, predicts bounces, and covers its own gate.",
  },
];

export function isAiDifficulty(v: unknown): v is AiDifficulty {
  return v === "easy" || v === "normal" || v === "hard";
}

export interface Settings {
  musicVolume: number; // 0..1
  musicMuted: boolean;
  sfxVolume: number; // 0..1
  sfxMuted: boolean;
  shipWeight: number; // mass of each ship
  ballWeight: number; // mass of the ball
  restitution: number; // 0..1 collision elasticity
  downDisabled: boolean; // "down arrow does nothing"
  p1Color: string;
  p2Color: string;
  aiDifficulty: AiDifficulty;
}

export type GameMode = "1p" | "2p";

export interface ScoreEntry {
  id: string;
  mode: GameMode;
  result: string; // e.g. "P1" | "P2" | "CPU"
  s1: number;
  s2: number;
  margin: number;
  seconds: number;
  date: number;
}

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.5,
  musicMuted: false,
  sfxVolume: 0.7,
  sfxMuted: false,
  shipWeight: 3.2,
  ballWeight: 1,
  restitution: 0.9,
  downDisabled: false,
  p1Color: "#38bdf8",
  p2Color: "#fb5a4b",
  aiDifficulty: "normal",
};
