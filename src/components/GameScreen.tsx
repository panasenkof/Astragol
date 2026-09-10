import { useEffect, useRef, useState, type ReactNode } from "react";
import { Game, emptyPad, type GameEvent, type Viewport } from "@/game/engine";
import { audio } from "@/game/audio";
import { addScore } from "@/game/storage";
import { FIELD_H, FIELD_W, TARGET_SCORE } from "@/game/constants";
import type { GameMode, Settings } from "@/game/types";
import { NeonButton } from "./ui";
import PlayerTouchControls, { TOUCH_STRIP_H } from "./PlayerTouchControls";
import { localeUsesWideTracking, useI18n, type Translate } from "@/i18n";

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

function isCoarsePointer() {
  return (
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
    (typeof window !== "undefined" && "ontouchstart" in window)
  );
}

function computeView(
  w: number,
  h: number,
  dpr: number,
  headsUp: boolean,
  touch: boolean
): Viewport {
  if (headsUp) {
    const padTop = TOUCH_STRIP_H + 8;
    const padBottom = TOUCH_STRIP_H + 8;
    const availW = Math.max(1, w - 16);
    const availH = Math.max(1, h - padTop - padBottom);
    const scale = Math.max(
      0.12,
      Math.min(availW / FIELD_H, availH / FIELD_W)
    );
    const cx = w / 2;
    const cy = padTop + availH / 2;
    return {
      scale,
      ox: cx - (FIELD_W * scale) / 2,
      oy: cy - (FIELD_H * scale) / 2,
      cx,
      cy,
      rotate: -Math.PI / 2,
      w,
      h,
      dpr,
    };
  }
  const padTop = 84;
  const padBottom = touch ? TOUCH_STRIP_H + 16 : 12;
  const availW = w - 20;
  const availH = h - padTop - padBottom;
  const scale = Math.max(0.12, Math.min(availW / FIELD_W, availH / FIELD_H));
  const ox = (w - FIELD_W * scale) / 2;
  const oy = padTop + (availH - FIELD_H * scale) / 2;
  return {
    scale,
    ox,
    oy,
    cx: ox + (FIELD_W * scale) / 2,
    cy: oy + (FIELD_H * scale) / 2,
    rotate: 0,
    w,
    h,
    dpr,
  };
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
  const [isTouch, setIsTouch] = useState(() =>
    typeof window !== "undefined" ? isCoarsePointer() : false
  );
  const [portrait, setPortrait] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight >= window.innerWidth : true
  );
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1100 : true
  );
  const { t, locale, rtl } = useI18n();
  const overlayDir = rtl ? "rtl" : "ltr";
  const titleTrack = localeUsesWideTracking(locale)
    ? "tracking-[0.2em]"
    : "tracking-normal";

  settingsRef.current = settings;

  const overRef = useRef(false);
  overRef.current = over !== null;
  const overRefActive = () => overRef.current;

  const headsUp = mode === "2p" && isTouch && narrow;
  const headsUpRef = useRef(headsUp);
  const touchRef = useRef(isTouch);
  headsUpRef.current = headsUp;
  touchRef.current = isTouch;

  const togglePause = () => {
    const g = gameRef.current;
    if (!g || g.phase === "over" || overRef.current) return;
    audio.click();
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    if (pausedRef.current) {
      g.input.p1 = emptyPad();
      g.input.p2 = emptyPad();
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

  const setAim = (who: 0 | 1, aim: number | null) => {
    const g = gameRef.current;
    if (!g) return;
    if (who === 0) g.input.p1.aimStick = aim;
    else g.input.p2.aimStick = aim;
  };

  const setThrust = (who: 0 | 1, held: boolean) => {
    const g = gameRef.current;
    if (!g) return;
    if (who === 0) g.input.p1.up = held;
    else g.input.p2.up = held;
  };

  useEffect(() => {
    const sync = () => {
      setIsTouch(isCoarsePointer());
      setPortrait(window.innerHeight >= window.innerWidth);
      setNarrow(window.innerWidth < 1100);
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    if (!headsUp) return;
    const orient = screen.orientation as
      | { lock?: (o: string) => Promise<void>; unlock?: () => void }
      | undefined;
    void orient?.lock?.("portrait").catch(() => {});
    let sentinel: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock
      ?.request("screen")
      .then((s) => {
        sentinel = s;
      })
      .catch(() => {});
    return () => {
      orient?.unlock?.();
      void sentinel?.release();
    };
  }, [headsUp]);

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
            result:
              e.winner === 0
                ? mode === "1p"
                  ? "YOU"
                  : "P1"
                : mode === "1p"
                  ? "CPU"
                  : "P2",
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
      game.render(
        ctx,
        computeView(w, h, dpr, headsUpRef.current, touchRef.current)
      );
      syncHud();
    };
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    gameRef.current?.applySettings(settings);
  }, [settings]);

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
  const showRotate = headsUp && !portrait;
  const touchActive = isTouch && !paused && !over;

  const youLabel = mode === "1p" ? t("you") : t("p1");
  const foeLabel = mode === "1p" ? t("cpu") : t("p2");

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-[#04030d] select-none"
      dir="ltr"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
      />

      {!headsUp && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
            <div className="flex items-stretch gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 backdrop-blur-md">
              <TeamCard
                name={youLabel}
                score={hud.s1}
                color={p1}
                target={TARGET_SCORE}
                mirror={false}
              />
              <div className="flex flex-col items-center justify-center px-3">
                <span className="text-[10px] font-bold tracking-[0.3em] text-slate-400">
                  {t("vs")}
                </span>
                <span className="mt-0.5 font-mono text-xs text-cyan-200/80">
                  {fmtTime(hud.elapsed)}
                </span>
              </div>
              <TeamCard
                name={foeLabel}
                score={hud.s2}
                color={p2}
                target={TARGET_SCORE}
                mirror
              />
            </div>
          </div>
          {!paused && !over && (
            <button
              onClick={togglePause}
              className="absolute right-3 top-3 z-30 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-200 backdrop-blur-md transition hover:bg-black/60"
            >
              ❚❚
            </button>
          )}
        </>
      )}

      {hud.phase === "countdown" && (
        <DualFace headsUp={headsUp}>
          {(who) => (
            <div className="flex flex-col items-center gap-2">
              <div
                key={`${who}-${hud.count}`}
                className="text-[18vw] font-black leading-none text-white/90 drop-shadow-[0_0_40px_rgba(120,200,255,0.8)] sm:text-[120px]"
              >
                {hud.count === 0 ? t("go") : hud.count}
              </div>
              {headsUp && (
                <div
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-center text-[10px] tracking-wide text-slate-300"
                  dir={overlayDir}
                >
                  {t("headsUpHint")}
                </div>
              )}
            </div>
          )}
        </DualFace>
      )}
      {hud.go && (
        <DualFace headsUp={headsUp}>
          {() => (
            <div className="text-[16vw] font-black text-cyan-200 drop-shadow-[0_0_40px_rgba(120,200,255,0.9)] sm:text-[100px]">
              {t("go")}
            </div>
          )}
        </DualFace>
      )}

      {hud.phase === "countdown" && !isTouch && (
        <div
          className="pointer-events-none absolute left-1/2 top-24 z-10 -translate-x-1/2 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-center text-[11px] text-slate-300 backdrop-blur-md sm:text-xs"
          dir={overlayDir}
        >
          <div>
            <span className="font-bold" style={{ color: p1 }}>
              {youLabel}
            </span>{" "}
            <Kbd>←</Kbd>
            <Kbd>→</Kbd> {t("aim")} · <Kbd>↑</Kbd> {t("thrust")} · <Kbd>↓</Kbd>{" "}
            {t("reverse")}
          </div>
          {mode === "2p" && (
            <div className="mt-1">
              <span className="font-bold" style={{ color: p2 }}>
                {t("p2")}
              </span>{" "}
              <Kbd>A</Kbd>
              <Kbd>D</Kbd> {t("aim")} · <Kbd>W</Kbd> {t("thrust")} ·{" "}
              <Kbd>S</Kbd> {t("reverse")}
            </div>
          )}
        </div>
      )}
      {hud.phase === "scored" && (
        <DualFace headsUp={headsUp}>
          {(who) => (
            <div className="flex flex-col items-center gap-1">
              <div
                key={`${who}-${hud.s1}-${hud.s2}`}
                className="animate-[pop_0.45s_ease-out] text-[14vw] font-black italic tracking-wider sm:text-[96px]"
                style={{
                  color: hud.scorer === 0 ? p1 : p2,
                  textShadow: `0 0 55px ${hud.scorer === 0 ? p1 : p2}`,
                }}
              >
                {t("goal")}
              </div>
              <div className="text-xs font-bold tracking-[0.3em] text-white/70">
                {goalCaption(mode, hud.scorer, who, headsUp, t)}
              </div>
            </div>
          )}
        </DualFace>
      )}

      {touchActive && headsUp && (
        <>
          <div className="absolute inset-x-0 top-0 z-30 pt-[env(safe-area-inset-top)]">
            <div className="rotate-180">
              <PlayerTouchControls
                color={p2}
                label={t("p2")}
                myScore={hud.s2}
                theirScore={hud.s1}
                theirColor={p1}
                elapsed={fmtTime(hud.elapsed)}
                showHud
                showPause
                onPause={togglePause}
                onAim={(a) => setAim(1, a)}
                onThrust={(v) => setThrust(1, v)}
                headsUp
              />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]">
            <PlayerTouchControls
              color={p1}
              label={t("p1")}
              myScore={hud.s1}
              theirScore={hud.s2}
              theirColor={p2}
              elapsed={fmtTime(hud.elapsed)}
              showHud
              showPause
              onPause={togglePause}
              onAim={(a) => setAim(0, a)}
              onThrust={(v) => setThrust(0, v)}
              headsUp
            />
          </div>
        </>
      )}

      {touchActive && !headsUp && (
        <div className="absolute inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]">
          <PlayerTouchControls
            color={p1}
            label={youLabel}
            onAim={(a) => setAim(0, a)}
            onThrust={(v) => setThrust(0, v)}
            headsUp={false}
          />
        </div>
      )}

      {paused && (
        <DualMenu
          headsUp={headsUp}
          p1={
            <PauseCard
              titleTrack={titleTrack}
              dir={overlayDir}
              onResume={togglePause}
              onRestart={restart}
              onExit={onExit}
            />
          }
        />
      )}

      {over && (
        <DualMenu
          headsUp={headsUp}
          p1={
            <OverCard
              winner={over.winner}
              me={0}
              headsUp={headsUp}
              mode={mode}
              s1={over.s1}
              s2={over.s2}
              seconds={over.seconds}
              p1={p1}
              p2={p2}
              dir={overlayDir}
              onRestart={restart}
              onExit={onExit}
            />
          }
          p2={
            <OverCard
              winner={over.winner}
              me={1}
              headsUp={headsUp}
              mode={mode}
              s1={over.s1}
              s2={over.s2}
              seconds={over.seconds}
              p1={p1}
              p2={p2}
              dir={overlayDir}
              onRestart={restart}
              onExit={onExit}
            />
          }
        />
      )}

      {showRotate && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 px-8 text-center">
          <p
            className="max-w-sm text-lg font-bold tracking-wide text-cyan-100"
            dir={overlayDir}
          >
            {t("rotatePhone")}
          </p>
        </div>
      )}
    </div>
  );
}

function goalCaption(
  mode: GameMode,
  scorer: 0 | 1,
  who: 0 | 1,
  headsUp: boolean,
  t: Translate
) {
  if (headsUp) return scorer === who ? t("youScore") : t("theyScore");
  if (scorer === 0) return mode === "1p" ? t("youScore") : t("player1Scores");
  return mode === "1p" ? t("cpuScores") : t("player2Scores");
}

function DualFace({
  headsUp,
  children,
}: {
  headsUp: boolean;
  children: (who: 0 | 1) => ReactNode;
}) {
  if (!headsUp) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        {children(0)}
      </div>
    );
  }
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-[20%] z-20 flex justify-center rotate-180">
        {children(1)}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-[20%] z-20 flex justify-center">
        {children(0)}
      </div>
    </>
  );
}

function DualMenu({
  headsUp,
  p1,
  p2,
}: {
  headsUp: boolean;
  p1: ReactNode;
  p2?: ReactNode;
}) {
  const card = (node: ReactNode) => (
    <div className="w-[min(92vw,360px)] rounded-3xl border border-cyan-300/20 bg-[#0a0c22]/90 p-6 shadow-[0_0_60px_-10px_rgba(80,150,255,0.6)]">
      {node}
    </div>
  );
  if (!headsUp) {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm">
        {card(p1)}
      </div>
    );
  }
  return (
    <div className="absolute inset-0 z-40 bg-black/55 backdrop-blur-sm">
      <div className="absolute left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] -translate-x-1/2 rotate-180">
        {card(p2 ?? p1)}
      </div>
      <div className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2">
        {card(p1)}
      </div>
    </div>
  );
}

function PauseCard({
  titleTrack,
  dir,
  onResume,
  onRestart,
  onExit,
}: {
  titleTrack: string;
  dir: "ltr" | "rtl";
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  return (
    <div dir={dir}>
      <h2
        className={`text-center text-3xl font-black text-cyan-100 ${titleTrack}`}
      >
        {t("paused")}
      </h2>
      <div className="mt-5 grid w-full gap-3">
        <NeonButton onClick={onResume}>▶ {t("resume")}</NeonButton>
        <NeonButton variant="soft" onClick={onRestart}>
          ↺ {t("restartMatch")}
        </NeonButton>
        <NeonButton variant="ghost" onClick={onExit}>
          ⌂ {t("mainMenu")}
        </NeonButton>
      </div>
    </div>
  );
}

function OverCard({
  winner,
  me,
  headsUp,
  mode,
  s1,
  s2,
  seconds,
  p1,
  p2,
  dir,
  onRestart,
  onExit,
}: {
  winner: 0 | 1;
  me: 0 | 1;
  headsUp: boolean;
  mode: GameMode;
  s1: number;
  s2: number;
  seconds: number;
  p1: string;
  p2: string;
  dir: "ltr" | "rtl";
  onRestart: () => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  let title: string;
  if (headsUp) title = winner === me ? t("youWin") : t("youLose");
  else if (winner === 0) title = mode === "1p" ? t("youWin") : t("player1Wins");
  else title = mode === "1p" ? t("cpuWins") : t("player2Wins");
  const titleColor = winner === 0 ? p1 : p2;
  return (
    <div dir={dir}>
      <p className="text-center text-xs font-bold tracking-[0.4em] text-slate-400">
        {t("matchOver")}
      </p>
      <h2
        className="mt-2 text-center text-3xl font-black tracking-wide"
        style={{ color: titleColor }}
      >
        {title}
      </h2>
      <div className="mt-4 flex items-center justify-center gap-4 font-mono text-3xl">
        <span style={{ color: p1 }}>{s1}</span>
        <span className="text-slate-500">–</span>
        <span style={{ color: p2 }}>{s2}</span>
      </div>
      <p className="mt-2 text-center text-sm text-slate-400">
        {t("matchTime", { time: fmtTime(seconds) })}
      </p>
      <div className="mt-6 grid w-full gap-3">
        <NeonButton onClick={onRestart}>↺ {t("playAgain")}</NeonButton>
        <NeonButton variant="ghost" onClick={onExit}>
          ⌂ {t("mainMenu")}
        </NeonButton>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex min-w-5 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-400/10 px-1 py-0.5 text-[10px] font-bold text-cyan-100">
      {children}
    </kbd>
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
        <span className="text-xs font-bold tracking-widest" style={{ color }}>
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
