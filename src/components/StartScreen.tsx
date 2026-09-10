import { useState, type ReactNode } from "react";
import StarField from "./StarField";
import { NeonButton, Panel, SectionTitle } from "./ui";
import type { GameMode, ScoreEntry } from "@/game/types";
import { rankScores } from "@/game/storage";

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
}: {
  onStart: (mode: GameMode) => void;
  onSettings: () => void;
  scores: ScoreEntry[];
}) {
  const [showHelp, setShowHelp] = useState(false);
  const top = rankScores(scores).slice(0, 5);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      <StarField />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-5xl flex-col items-center justify-center gap-8 px-5 py-10">
        <div className="text-center">
          <Logo />
          <h1 className="mt-6 bg-gradient-to-b from-white via-cyan-100 to-cyan-400/70 bg-clip-text text-5xl font-black tracking-[0.18em] text-transparent sm:text-6xl">
            NEBULA
          </h1>
          <h2 className="mt-1 text-2xl font-bold tracking-[0.5em] text-violet-300/90 sm:text-3xl">
            ARENA
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-400">
            Cosmic orb soccer. Fly your glowing ship, slam the metal sphere into
            the enemy gate. First to 5 goals wins.
          </p>
        </div>

        <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-[1.15fr_0.85fr]">
          <Panel className="p-6">
            <div className="grid gap-3">
              <NeonButton
                className="py-4 text-lg"
                onClick={() => onStart("1p")}
              >
                ▶ 1 Player&nbsp;&nbsp;
                <span className="text-xs font-bold opacity-70">
                  vs&nbsp;CPU
                </span>
              </NeonButton>
              <NeonButton
                variant="soft"
                className="py-4 text-lg"
                onClick={() => onStart("2p")}
              >
                👥 2 Players&nbsp;&nbsp;
                <span className="text-xs font-bold opacity-70">
                  local co-op
                </span>
              </NeonButton>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <NeonButton variant="ghost" onClick={onSettings}>
                  ⚙ Settings
                </NeonButton>
                <NeonButton
                  variant="ghost"
                  onClick={() => setShowHelp((v) => !v)}
                >
                  ? How to play
                </NeonButton>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <SectionTitle>Top Runs</SectionTitle>
            {top.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No matches yet — be the first.
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
                <SectionTitle>Player 1 (Blue)</SectionTitle>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  <li>
                    <Key>←</Key> <Key>→</Key> rotate your aim arrow
                  </li>
                  <li>
                    <Key>↑</Key> thrust toward the arrow
                  </li>
                  <li>
                    <Key>↓</Key> thrust opposite the arrow
                  </li>
                </ul>
              </div>
              <div>
                <SectionTitle>Player 2 (Red)</SectionTitle>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  <li>
                    <Key>A</Key> <Key>D</Key> rotate your aim arrow
                  </li>
                  <li>
                    <Key>W</Key> thrust toward the arrow
                  </li>
                  <li>
                    <Key>S</Key> thrust opposite the arrow
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-5 space-y-1.5 text-sm text-slate-400">
              <p>
                Holding a thrust key builds up <b className="text-slate-200">charge</b> —
                the longer you hold, the harder you accelerate. New thrust adds to your
                current velocity, so steer with momentum.
              </p>
              <p>
                <Key>P</Key> or <Key>Esc</Key> pause · <Key>R</Key> restart ·{" "}
                on touch devices use the two on-screen pads.
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
