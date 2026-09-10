import { useEffect, useRef, useState, type ReactNode } from "react";
import { Game, type GameEvent, type PadInput } from "@/game/engine";
import { audio } from "@/game/audio";
import { addScore } from "@/game/storage";
import { FIELD_H, FIELD_W, TARGET_SCORE } from "@/game/constants";
import type { GameMode, Settings } from "@/game/types";
import { NeonButton } from "./ui";

interface Hud {
  s1: number;
  s2: number;
  phase: Game["phase"];
  elapsed: number;
  count: number;
  go: boolean;
  scorer: 0 | 1;
}

interface OverInfo {
  winner: 0 | 1;
  s1: number;
  s2: number;
  seconds: number;
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function GameScreen({
  settings,
  mode,
  onExit,
  onScoresChanged,
}: {
  settings: Settings;
  mode: GameMode;
  onExit: () => void;
  onScoresChanged: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const pausedRef = useRef(false);
  const hudSnap = useRef<Hud>({
    s1: 0,
    s2: 0,
    phase: "countdown",
    elapsed: 0,
    count: 3,
    go: false,
    scorer: 0,
  });
  const settingsRef = useRef(settings);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<Hud>(hudSnap.current);
  const [over, setOver] = useState<OverInfo | null>(null);
  const [isTouch, setIsTouch] = useState(false);

  settingsRef.current = settings;

  const overRef = useRef(false);
  overRef.current = over !== null;
  const overRefActive = () => overRef.current;

  const togglePause = () => {
    const g = gameRef.current;
    if (!g || g.phase === "over" || overRef.current) return;
    audio.click();
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    if (pausedRef.current) {
      g.input.p1 = emptyPadLocal();
      g.input.p2 = emptyPadLocal();
    }
  };

  const restart = () => {
    const g = gameRef.current;
    if (!g) return;
    audio.click();
    g.reset();
    pausedRef.current = false;
    setPaused(false);
    setOver(null);
    hudSnap.current = {
      s1: 0,
      s2: 0,
      phase: "countdown",
      elapsed: 0,
      count: 3,
      go: false,
      scorer: 0,
    };
    setHud(hudSnap.current);
  };

  const setTouch = (who: 0 | 1, k: keyof PadInput, v: boolean) => {
    const g = gameRef.current;
    if (!g) return;
    if (who === 0) g.input.p1[k] = v;
    else g.input.p2[k] = v;
  };

  useEffect(() => {
    setIsTouch(
      typeof window !== "undefined" &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0)
    );
  }, []);

  // ---- main loop -----------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = new Game(settingsRef.current, mode, TARGET_SCORE);
    gameRef.current = game;

    game.onEvent = (e: GameEvent) => {
      switch (e.type) {
        case "wall":
          audio.wall(e.intensity);
          break;
        case "hit":
          audio.shipHit(e.intensity);
          break;
        case "goal":
          audio.goal();
          break;
        case "countdown":
          audio.whistle(e.final);
          break;
        case "matchEnd": {
          audio.whistle(true);
          const seconds = Math.round(game.matchTime);
          const entry = {
            id:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : String(Date.now()),
            mode,
            result: e.winner === 0 ? (mode === "1p" ? "YOU" : "P1") : (mode === "1p" ? "CPU" : "P2"),
            s1: game.scores[0],
            s2: game.scores[1],
            margin: Math.abs(game.scores[0] - game.scores[1]),
            seconds,
            date: Date.now(),
          };
          addScore(entry);
          onScoresChanged();
          setOver({
            winner: e.winner,
            s1: game.scores[0],
            s2: game.scores[1],
            seconds,
          });
          break;
        }
      }
    };

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const pw = Math.max(1, Math.floor(w * dpr));
      const ph = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      return { w, h };
    };

    const computeView = (w: number, h: number) => {
      const padTop = 84;
      const padBottom =
        "ontouchstart" in window || navigator.maxTouchPoints > 0 ? 142 : 12;
      const availW = w - 20;
      const availH = h - padTop - padBottom;
      const scale = Math.max(
        0.12,
        Math.min(availW / FIELD_W, availH / FIELD_H)
      );
      const ox = (w - FIELD_W * scale) / 2;
      const oy = padTop + (availH - FIELD_H * scale) / 2;
      return { scale, ox, oy, w, h, dpr };
    };

    const FIXED = 1 / 120;
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const syncHud = () => {
      const count =
        game.phase === "countdown" ? Math.max(0, Math.ceil(game.phaseT)) : 0;
      const go = game.phase === "play" && game.elapsed < 0.7;
      const next: Hud = {
        s1: game.scores[0],
        s2: game.scores[1],
        phase: game.phase,
        elapsed: Math.floor(game.matchTime),
        count,
        go,
        scorer: game.lastScorer,
      };
      const p = hudSnap.current;
      if (
        p.s1 !== next.s1 ||
        p.s2 !== next.s2 ||
        p.phase !== next.phase ||
        p.elapsed !== next.elapsed ||
        p.count !== next.count ||
        p.go !== next.go ||
        p.scorer !== next.scorer
      ) {
        hudSnap.current = next;
        setHud(next);
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      if (!pausedRef.current) {
        acc += dt;
        let steps = 0;
        while (acc >= FIXED && steps < 12) {
          game.update(FIXED);
          acc -= FIXED;
          steps++;
        }
        if (steps >= 12) acc = 0;
      } else {
        acc = 0;
      }

      const { w, h } = resize();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      game.render(ctx, computeView(w, h));
      syncHud();
    };
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ---- push settings changes into the running game -------------------------
  useEffect(() => {
    gameRef.current?.applySettings(settings);
  }, [settings]);

  // ---- keyboard ------------------------------------------------------------
  useEffect(() => {
    const gameKeys = new Set([
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "KeyA",
      "KeyD",
      "KeyW",
      "KeyS",
      "Space",
    ]);
    const onKeyDown = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (gameKeys.has(e.code)) e.preventDefault();
      if (!g) return;
      if (e.repeat) return;
      switch (e.code) {
        case "ArrowLeft":
          g.input.p1.left = true;
          break;
        case "ArrowRight":
          g.input.p1.right = true;
          break;
        case "ArrowUp":
          g.input.p1.up = true;
          break;
        case "ArrowDown":
          g.input.p1.down = true;
          break;
        case "KeyA":
          g.input.p2.left = true;
          break;
        case "KeyD":
          g.input.p2.right = true;
          break;
        case "KeyW":
          g.input.p2.up = true;
          break;
        case "KeyS":
          g.input.p2.down = true;
          break;
        case "KeyP":
        case "Escape":
          togglePause();
          break;
        case "KeyR":
          restart();
          break;
        case "Enter":
        case "Space":
          if (overRefActive()) restart();
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) return;
      switch (e.code) {
        case "ArrowLeft":
          g.input.p1.left = false;
          break;
        case "ArrowRight":
          g.input.p1.right = false;
          break;
        case "ArrowUp":
          g.input.p1.up = false;
          break;
        case "ArrowDown":
          g.input.p1.down = false;
          break;
        case "KeyA":
          g.input.p2.left = false;
          break;
        case "KeyD":
          g.input.p2.right = false;
          break;
        case "KeyW":
          g.input.p2.up = false;
          break;
        case "KeyS":
          g.input.p2.down = false;
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const p1 = settings.p1Color;
  const p2 = settings.p2Color;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#04030d] select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
      />

      {/* ---- scoreboard ---- */}
      <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
        <div className="flex items-stretch gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 backdrop-blur-md">
          <TeamCard
            name={mode === "1p" ? "YOU" : "P1"}
            score={hud.s1}
            color={p1}
            target={TARGET_SCORE}
            mirror={false}
          />
          <div className="flex flex-col items-center justify-center px-3">
            <span className="text-[10px] font-bold tracking-[0.3em] text-slate-400">
              VS
            </span>
            <span className="mt-0.5 font-mono text-xs text-cyan-200/80">
              {fmtTime(hud.elapsed)}
            </span>
          </div>
          <TeamCard
            name={mode === "1p" ? "CPU" : "P2"}
            score={hud.s2}
            color={p2}
            target={TARGET_SCORE}
            mirror
          />
        </div>
      </div>

      {/* pause button */}
      {!paused && !over && (
        <button
          onClick={togglePause}
          className="absolute right-3 top-3 z-30 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 backdrop-blur-md transition hover:bg-black/60"
        >
          ❚❚
        </button>
      )}

      {/* ---- countdown ---- */}
      {hud.phase === "countdown" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div
            key={hud.count}
            className="animate-[pop_0.5s_ease-out] text-[22vw] font-black leading-none text-white/90 drop-shadow-[0_0_40px_rgba(120,200,255,0.8)] sm:text-[140px]"
          >
            {hud.count === 0 ? "GO!" : hud.count}
          </div>
        </div>
      )}
      {hud.go && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="animate-[pop_0.6s_ease-out] text-[18vw] font-black text-cyan-200 drop-shadow-[0_0_40px_rgba(120,200,255,0.9)] sm:text-[120px]">
            GO!
          </div>
        </div>
      )}

      {/* ---- control hint during the countdown ---- */}
      {hud.phase === "countdown" && (
        <div className="pointer-events-none absolute left-1/2 top-24 z-10 -translate-x-1/2 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-center text-[11px] text-slate-300 backdrop-blur-md sm:text-xs">
          <div>
            <span className="font-bold" style={{ color: p1 }}>
              {mode === "1p" ? "YOU" : "P1"}
            </span>{" "}
            <Kbd>←</Kbd>
            <Kbd>→</Kbd> aim · <Kbd>↑</Kbd> thrust · <Kbd>↓</Kbd> reverse
          </div>
          {mode === "2p" && (
            <div className="mt-1">
              <span className="font-bold" style={{ color: p2 }}>
                P2
              </span>{" "}
              <Kbd>A</Kbd>
              <Kbd>D</Kbd> aim · <Kbd>W</Kbd> thrust · <Kbd>S</Kbd> reverse
            </div>
          )}
        </div>
      )}

      {/* ---- goal banner ---- */}
      {hud.phase === "scored" && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2">
          <div
            key={hud.s1 + "-" + hud.s2}
            className="animate-[pop_0.45s_ease-out] text-[15vw] font-black italic tracking-wider sm:text-[104px]"
            style={{
              color: hud.scorer === 0 ? p1 : p2,
              textShadow: `0 0 55px ${hud.scorer === 0 ? p1 : p2}`,
            }}
          >
            GOAL!
          </div>
          <div className="text-sm font-bold tracking-[0.4em] text-white/70">
            {hud.scorer === 0
              ? mode === "1p"
                ? "YOU SCORE"
                : "PLAYER 1 SCORES"
              : mode === "1p"
                ? "CPU SCORES"
                : "PLAYER 2 SCORES"}
          </div>
        </div>
      )}

      {/* ---- touch pads ---- */}
      {isTouch && !paused && !over && (
        <>
          <TouchPad
            color={p1}
            side="left"
            label={mode === "1p" ? "YOU" : "P1"}
            downEnabled={!settings.downDisabled}
            onSet={(k, v) => setTouch(0, k, v)}
          />
          {mode === "2p" && (
            <TouchPad
              color={p2}
              side="right"
              label="P2"
              downEnabled={!settings.downDisabled}
              onSet={(k, v) => setTouch(1, k, v)}
            />
          )}
        </>
      )}

      {/* ---- pause overlay ---- */}
      {paused && (
        <Overlay>
          <h2 className="text-center text-4xl font-black tracking-[0.2em] text-cyan-100">
            PAUSED
          </h2>
          <div className="mt-7 grid w-full gap-3">
            <NeonButton onClick={togglePause}>▶ Resume</NeonButton>
            <NeonButton variant="soft" onClick={restart}>
              ↺ Restart match
            </NeonButton>
            <NeonButton variant="ghost" onClick={onExit}>
              ⌂ Main menu
            </NeonButton>
          </div>
        </Overlay>
      )}

      {/* ---- game over overlay ---- */}
      {over && (
        <Overlay>
          <p className="text-center text-xs font-bold tracking-[0.4em] text-slate-400">
            MATCH OVER
          </p>
          <h2
            className="mt-2 text-center text-4xl font-black tracking-wide"
            style={{ color: over.winner === 0 ? p1 : p2 }}
          >
            {over.winner === 0
              ? mode === "1p"
                ? "YOU WIN!"
                : "PLAYER 1 WINS!"
              : mode === "1p"
                ? "CPU WINS"
                : "PLAYER 2 WINS!"}
          </h2>
          <div className="mt-4 flex items-center justify-center gap-4 font-mono text-3xl">
            <span style={{ color: p1 }}>{over.s1}</span>
            <span className="text-slate-500">–</span>
            <span style={{ color: p2 }}>{over.s2}</span>
          </div>
          <p className="mt-2 text-center text-sm text-slate-400">
            Match time {fmtTime(over.seconds)}
          </p>
          <div className="mt-7 grid w-full gap-3">
            <NeonButton onClick={restart}>↺ Play again</NeonButton>
            <NeonButton variant="ghost" onClick={onExit}>
              ⌂ Main menu
            </NeonButton>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function emptyPadLocal(): PadInput {
  return { left: false, right: false, up: false, down: false };
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex min-w-5 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-400/10 px-1 py-0.5 text-[10px] font-bold text-cyan-100">
      {children}
    </kbd>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="w-[min(90vw,380px)] rounded-3xl border border-cyan-300/20 bg-[#0a0c22]/85 p-7 shadow-[0_0_60px_-10px_rgba(80,150,255,0.6)]">
        {children}
      </div>
    </div>
  );
}

function TeamCard({
  name,
  score,
  color,
  target,
  mirror,
}: {
  name: string;
  score: number;
  color: string;
  target: number;
  mirror: boolean;
}) {
  return (
    <div
      className={`flex w-[92px] flex-col ${
        mirror ? "items-end" : "items-start"
      } px-2 py-1`}
    >
      <div className="flex items-center gap-2">
        {!mirror && (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 10px ${color}` }}
          />
        )}
        <span
          className="text-xs font-bold tracking-widest"
          style={{ color }}
        >
          {name}
        </span>
        {mirror && (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 10px ${color}` }}
          />
        )}
      </div>
      <div
        className={`font-mono text-3xl font-black leading-tight text-white ${
          mirror ? "text-right" : ""
        }`}
      >
        {score}
      </div>
      <div className={`flex gap-1 ${mirror ? "flex-row-reverse" : ""}`}>
        {Array.from({ length: target }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: i < score ? color : "rgba(255,255,255,0.15)",
              boxShadow: i < score ? `0 0 6px ${color}` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TouchPad({
  color,
  side,
  label,
  downEnabled,
  onSet,
}: {
  color: string;
  side: "left" | "right";
  label: string;
  downEnabled: boolean;
  onSet: (k: keyof PadInput, v: boolean) => void;
}) {
  const Btn = ({
    k,
    glyph,
    disabled,
  }: {
    k: keyof PadInput;
    glyph: string;
    disabled?: boolean;
  }) => (
    <button
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          /* not supported — fine */
        }
        onSet(k, true);
      }}
      onPointerUp={() => onSet(k, false)}
      onPointerCancel={() => onSet(k, false)}
      onLostPointerCapture={() => onSet(k, false)}
      className="flex items-center justify-center rounded-2xl border text-lg font-bold backdrop-blur-md transition active:scale-95 disabled:opacity-25"
      style={{
        color,
        borderColor: `${color}55`,
        background: "rgba(255,255,255,0.06)",
        boxShadow: `inset 0 0 18px -6px ${color}`,
      }}
    >
      {glyph}
    </button>
  );

  return (
    <div
      className={`absolute bottom-4 z-30 flex flex-col items-center ${
        side === "left" ? "left-4" : "right-4"
      }`}
      style={{ touchAction: "none" }}
    >
      <span
        className="mb-1 text-[10px] font-bold tracking-widest"
        style={{ color }}
      >
        {label}
      </span>
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: "repeat(3, 46px)",
          gridTemplateRows: "repeat(2, 46px)",
        }}
      >
        <Btn k="left" glyph="◀" />
        <Btn k="up" glyph="▲" />
        <Btn k="right" glyph="▶" />
        <div />
        <Btn k="down" glyph="▼" disabled={!downEnabled} />
        <div />
      </div>
    </div>
  );
}
