import type { LocaleSetting } from "@/i18n/locales";

export type AiDifficulty = "easy" | "normal" | "hard";

export const AI_DIFFICULTY_OPTIONS: { id: AiDifficulty }[] = [
  { id: "easy" },
  { id: "normal" },
  { id: "hard" },
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
  p1Color: string;
  p2Color: string;
  aiDifficulty: AiDifficulty;
  /** `"auto"` follows the device language; otherwise a locked locale. */
  locale: LocaleSetting;
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
  p1Color: "#38bdf8",
  p2Color: "#fb5a4b",
  aiDifficulty: "normal",
  locale: "auto",
};
