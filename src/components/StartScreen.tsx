import { useState, type ReactNode } from "react";
import StarField from "./StarField";
import FullscreenButton from "./FullscreenButton";
import { NeonButton, Panel, SectionTitle } from "./ui";
import {
  type AiDifficulty,
  type GameMode,
  type ScoreEntry,
} from "@/game/types";
import { rankScores } from "@/game/storage";
import { AI_LABEL_KEYS, Trans, useI18n } from "@/i18n";

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function Logo() {
  return (
    <div className="relative mx-auto h-24 w-24">
      <div className="absolute inset-0 animate-pulse rounded-full bg-sky-500/30 blur-2xl" />
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-white via-slate-300 to-slate-600 shadow-[0_0_40px_-4px_rgba(120,200,255,0.9)]">
        <div className="absolute left-4 top-4 h-6 w-6 rounded-full bg-white/80 blur-[2px]" />
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div className="absolute -left-4 top-1/2 h-2 w-32 -translate-y-1/2 rotate-[25deg] bg-white/25" />
        </div>
      </div>
      <div className="absolute -inset-6 rounded-full border border-cyan-300/20" />
      <div className="absolute -inset-12 rounded-full border border-violet-400/10" />
    </div>
  );
}

export default function StartScreen({
  onStart,
  onSettings,
  scores,
  aiDifficulty,
}: {
  onStart: (mode: GameMode) => void;
  onSettings: () => void;
  scores: ScoreEntry[];
  aiDifficulty: AiDifficulty;
}) {
  const { t, locale } = useI18n();
  const [showHelp, setShowHelp] = useState(false);
  const top = rankScores(scores).slice(0, 5);
  const titleTrack =
    locale === "zh" || locale === "hi" || locale === "ar"
      ? "tracking-normal"
      : "tracking-[0.18em]";
  const subtitleTrack =
    locale === "zh" || locale === "hi" || locale === "ar"
      ? "tracking-[0.2em]"
      : "tracking-[0.5em]";
  const difficulty = t(AI_LABEL_KEYS[aiDifficulty]);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      <StarField />
      <div className="absolute right-3 top-[max(0.75rem,calc(env(safe-area-inset-top)+0.5rem))] z-20">
        <FullscreenButton compact />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-5xl flex-col items-center justify-center gap-8 px-5 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1rem))] pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+5.5rem))]">
        <div className="text-center">
          <Logo />
          <h1
            className={`mt-6 bg-gradient-to-b from-white via-cyan-100 to-cyan-400/70 bg-clip-text text-5xl font-black text-transparent sm:text-6xl ${titleTrack}`}
          >
            NEBULA
          </h1>
          <h2
            className={`mt-1 text-2xl font-bold text-violet-300/90 sm:text-3xl ${subtitleTrack}`}
          >
            ARENA
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-400">
            {t("tagline")}
          </p>
        </div>

        <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-[1.15fr_0.85fr]">
          <Panel className="p-6">
            <div className="grid gap-3">
              <NeonButton
                className="flex w-full flex-col gap-1 py-4 text-lg sm:flex-row sm:items-center sm:justify-center sm:gap-3"
                onClick={() => onStart("1p")}
              >
                <span>▶ {t("play1Player")}</span>
                <span className="text-xs font-bold opacity-70">
                  {t("vsCpu", { difficulty })}
                </span>
              </NeonButton>
              <NeonButton
                variant="soft"
                className="flex w-full flex-col gap-1 py-4 text-lg sm:flex-row sm:items-center sm:justify-center sm:gap-3"
                onClick={() => onStart("2p")}
              >
                <span>👥 {t("play2Players")}</span>
                <span className="text-xs font-bold opacity-70">
                  {t("sitOpposite")}
                </span>
              </NeonButton>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <NeonButton
                  variant="ghost"
                  className="w-full px-2.5 text-sm sm:px-5 sm:text-base"
                  onClick={onSettings}
                >
                  ⚙ {t("settings")}
                </NeonButton>
                <NeonButton
                  variant="ghost"
                  className="w-full px-2.5 text-sm sm:px-5 sm:text-base"
                  onClick={() => setShowHelp((v) => !v)}
                >
                  ? {t("howToPlay")}
                </NeonButton>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle>{t("topRuns")}</SectionTitle>
            {top.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {t("noMatches")}
              </p>
            ) : (
              <ol className="space-y-2">
                {top.map((e, i) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="w-4 font-mono text-cyan-300/80">
                      {i + 1}
                    </span>
                    <span className="flex-1 font-mono text-slate-200">
                      {e.s1}
                      <span className="text-slate-500"> – </span>
                      {e.s2}
                    </span>
                    <span className="text-xs text-slate-400">
                      {e.mode === "1p" ? "1P" : "2P"}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      {fmtTime(e.seconds)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        {showHelp && (
          <Panel className="w-full max-w-2xl p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <SectionTitle>{t("helpOnPhone")}</SectionTitle>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  <li>{t("helpPhone1")}</li>
                  <li>{t("helpPhone2")}</li>
                  <li>{t("helpPhone3")}</li>
                </ul>
              </div>
              <div>
                <SectionTitle>{t("helpKeyboard")}</SectionTitle>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  <li>
                    {t("p1")} <Key>←</Key> <Key>→</Key> {t("aim")} ·{" "}
                    <Key>↑</Key> {t("thrust")} · <Key>↓</Key> {t("reverse")}
                  </li>
                  <li>
                    {t("p2")} <Key>A</Key> <Key>D</Key> {t("aim")} ·{" "}
                    <Key>W</Key> {t("thrust")} · <Key>S</Key> {t("reverse")}
                  </li>
                  <li>
                    <Key>F</Key> {t("helpFullscreenCorner")}
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-5 space-y-1.5 text-sm text-slate-400">
              <p>
                <Trans
                  k="helpCharge"
                  values={{
                    charge: (
                      <b className="text-slate-200">{t("charge")}</b>
                    ),
                  }}
                />
              </p>
              <p>
                <Key>P</Key> {t("or")} <Key>Esc</Key> {t("pause")} ·{" "}
                <Key>R</Key> {t("restart")} · <Key>F</Key> {t("fullScreen")}
              </p>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex min-w-6 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-400/10 px-1.5 py-0.5 text-xs font-bold text-cyan-100">
      {children}
    </kbd>
  );
}
