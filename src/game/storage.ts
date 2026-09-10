import { STORAGE_SCORES, STORAGE_SETTINGS } from "./constants";
import { isLocaleSetting } from "@/i18n";
import {
  DEFAULT_SETTINGS,
  isAiDifficulty,
  type ScoreEntry,
  type Settings,
} from "./types";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    if (!isAiDifficulty(merged.aiDifficulty)) {
      merged.aiDifficulty = DEFAULT_SETTINGS.aiDifficulty;
    }
    if (!isLocaleSetting(merged.locale)) {
      merged.locale = DEFAULT_SETTINGS.locale;
    }
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_SCORES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScoreEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Best entries sorted: most goals for the top player, then margin, then time. */
export function rankScores(scores: ScoreEntry[]): ScoreEntry[] {
  return [...scores]
    .sort((a, b) => {
      const aTop = Math.max(a.s1, a.s2);
      const bTop = Math.max(b.s1, b.s2);
      if (bTop !== aTop) return bTop - aTop;
      if (b.margin !== a.margin) return b.margin - a.margin;
      return a.seconds - b.seconds;
    })
    .slice(0, 10);
}

export function addScore(entry: ScoreEntry): ScoreEntry[] {
  const all = [...loadScores(), entry].slice(-40);
  try {
    localStorage.setItem(STORAGE_SCORES, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return all;
}

export function clearScores(): ScoreEntry[] {
  try {
    localStorage.removeItem(STORAGE_SCORES);
  } catch {
    /* ignore */
  }
  return [];
}
