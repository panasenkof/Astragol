import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { cn } from "@/utils/cn";
import type { TouchScheme } from "@/game/types";

/** Height reserved for a touch control strip (excluding safe-area). */
export const TOUCH_STRIP_H = 152;

const DEADZONE = 0.15;

/** Map a screen-space stick vector (y down) to a field heading. */
export function screenAim(dx: number, dy: number, rotated: boolean) {
  // Rotated portrait: screen-up is field +x (toward the far / CPU goal).
  return rotated ? Math.atan2(dx, -dy) : Math.atan2(dy, dx);
}

export type TouchDir = "up" | "down" | "left" | "right";

function BoostGlyph({ active, color }: { active: boolean; color: string }) {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 42 42"
      fill="none"
      aria-hidden
      style={{ display: "block" }}
    >
      <path
        d="M21 4 L28 16 L21 13 L14 16 Z"
        fill={color}
        opacity={active ? 1 : 0.95}
      />
      <path
        d="M21 13 L29 26 L21 22.5 L13 26 Z"
        fill={color}
        opacity={active ? 0.85 : 0.7}
      />
      <path
        d="M21 22 L28 34 L21 30.5 L14 34 Z"
        fill={color}
        opacity={active ? 0.55 : 0.35}
      />
      <path
        d="M18.5 33 Q21 40 23.5 33"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={active ? 0.9 : 0.45}
      />
    </svg>
  );
}

function StripHud({
  color,
  label,
  myScore,
  theirScore,
  theirColor,
  elapsed,
  showPause,
  onPause,
  compact = false,
}: {
  color: string;
  label: string;
  myScore?: number;
  theirScore?: number;
  theirColor?: string;
  elapsed?: string;
  showPause?: boolean;
  onPause?: () => void;
  compact?: boolean;
}) {
  const pause = showPause && onPause && (
    <button
      type="button"
      onClick={onPause}
      className="rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-[10px] text-slate-200"
    >
      ❚❚
    </button>
  );

  if (compact) {
    return (
      <div className="flex min-w-0 items-center justify-center gap-1.5">
        <span
          className="text-[10px] font-bold tracking-widest"
          style={{ color }}
        >
          {label}
        </span>
        {pause}
        <span className="font-mono text-sm font-black" style={{ color }}>
          {myScore ?? 0}
        </span>
        <span className="text-[10px] text-slate-500">–</span>
        <span className="font-mono text-sm font-bold" style={{ color: theirColor }}>
          {theirScore ?? 0}
        </span>
        {elapsed != null && (
          <span className="font-mono text-[10px] text-cyan-200/70">{elapsed}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5">
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-bold tracking-widest"
          style={{ color }}
        >
          {label}
        </span>
        {pause}
      </div>
      <div className="flex items-baseline gap-2 font-mono">
        <span className="text-2xl font-black leading-none" style={{ color }}>
          {myScore ?? 0}
        </span>
        <span className="text-xs text-slate-500">–</span>
        <span
          className="text-lg font-bold leading-none"
          style={{ color: theirColor }}
        >
          {theirScore ?? 0}
        </span>
      </div>
      {elapsed != null && (
        <span className="font-mono text-[10px] text-cyan-200/70">
          {elapsed}
        </span>
      )}
    </div>
  );
}

function Chevron({ dir, size = 28 }: { dir: TouchDir; size?: number }) {
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      aria-hidden
      style={{ display: "block", transform: `rotate(${rot}deg)` }}
    >
      <path d="M11 3.2 L18.2 15.2 H13.2 V18.8 H8.8 V15.2 H3.8 Z" fill="currentColor" />
    </svg>
  );
}

function DirButton({
  dir,
  color,
  label,
  onHold,
  className,
}: {
  dir: TouchDir;
  color: string;
  label: string;
  onHold: (held: boolean) => void;
  className?: string;
}) {
  const ptr = useRef<number | null>(null);
  const onHoldRef = useRef(onHold);
  onHoldRef.current = onHold;
  const [active, setActive] = useState(false);

  const hold = (next: boolean) => {
    setActive(next);
    onHoldRef.current(next);
  };

  const release = (id: number) => {
    if (ptr.current !== id) return;
    ptr.current = null;
    hold(false);
  };

  useEffect(() => {
    return () => {
      if (ptr.current != null) onHoldRef.current(false);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[28px] border touch-none",
        className
      )}
      style={{
        color,
        borderColor: active ? color : `${color}66`,
        background: active ? `${color}3d` : "rgba(0,0,0,0.28)",
        boxShadow: active
          ? `0 0 18px -1px ${color}`
          : `inset 0 0 18px -8px ${color}`,
        transform: active ? "scale(0.96)" : "none",
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        ptr.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* not supported */
        }
        hold(true);
      }}
      onPointerUp={(e) => release(e.pointerId)}
      onPointerCancel={(e) => release(e.pointerId)}
      onLostPointerCapture={(e) => release(e.pointerId)}
    >
      <Chevron dir={dir} />
    </button>
  );
}

function ArrowPad({
  color,
  onDirection,
  hud,
}: {
  color: string;
  onDirection: (dir: TouchDir, held: boolean) => void;
  hud?: ReactNode;
}) {
  const { t } = useI18n();
  const heldRef = useRef<Record<TouchDir, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
  });
  const onDirRef = useRef(onDirection);
  onDirRef.current = onDirection;

  const setDir = (dir: TouchDir, held: boolean) => {
    heldRef.current[dir] = held;
    onDirRef.current(dir, held);
  };

  useEffect(() => {
    return () => {
      (Object.keys(heldRef.current) as TouchDir[]).forEach((dir) => {
        if (heldRef.current[dir]) onDirRef.current(dir, false);
      });
    };
  }, []);

  const labels: Record<TouchDir, string> = {
    up: t("thrust"),
    down: t("reverse"),
    left: t("turnLeft"),
    right: t("turnRight"),
  };

  const sideBtn = "h-[96px] w-[92px]";
  const midBtn = hud
    ? "h-[50px] w-[100px] rounded-2xl"
    : "h-[62px] w-[100px] rounded-2xl";

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <DirButton
        dir="left"
        color={color}
        label={labels.left}
        className={sideBtn}
        onHold={(held) => setDir("left", held)}
      />
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1">
        {hud}
        <DirButton
          dir="up"
          color={color}
          label={labels.up}
          className={midBtn}
          onHold={(held) => setDir("up", held)}
        />
        <DirButton
          dir="down"
          color={color}
          label={labels.down}
          className={midBtn}
          onHold={(held) => setDir("down", held)}
        />
      </div>
      <DirButton
        dir="right"
        color={color}
        label={labels.right}
        className={sideBtn}
        onHold={(held) => setDir("right", held)}
      />
    </div>
  );
}

type TouchControlProps = {
  color: string;
  label: string;
  myScore?: number;
  theirScore?: number;
  theirColor?: string;
  elapsed?: string;
  showHud?: boolean;
  showPause?: boolean;
  onPause?: () => void;
  onAim: (aim: number | null) => void;
  onThrust: (held: boolean) => void;
  onDirection: (dir: TouchDir, held: boolean) => void;
  scheme?: TouchScheme;
  headsUp: boolean;
};

function StickTouchControls({
  color,
  label,
  myScore,
  theirScore,
  theirColor,
  elapsed,
  showHud = false,
  showPause = false,
  onPause,
  onAim,
  onThrust,
  headsUp,
}: TouchControlProps) {
  const { t } = useI18n();
  const stickRef = useRef<HTMLDivElement>(null);
  const stickPtr = useRef<number | null>(null);
  const thrustPtr = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });
  const [thrusting, setThrusting] = useState(false);
  const aimingRef = useRef(false);
  const thrustingRef = useRef(false);
  const onAimRef = useRef(onAim);
  const onThrustRef = useRef(onThrust);
  onAimRef.current = onAim;
  onThrustRef.current = onThrust;

  useEffect(() => {
    return () => {
      if (aimingRef.current) onAimRef.current(null);
      if (thrustingRef.current) onThrustRef.current(false);
    };
  }, []);

  const applyStick = (clientX: number, clientY: number) => {
    const el = stickRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const max = Math.max(8, r.width / 2 - 10);
    const mag = Math.hypot(dx, dy);
    if (mag > max && mag > 0) {
      dx = (dx / mag) * max;
      dy = (dy / mag) * max;
    }
    setKnob({ x: dx, y: dy, active: true });
    const magT = mag / max;
    if (magT > DEADZONE) {
      aimingRef.current = true;
      onAim(screenAim(dx, dy, headsUp));
    }
  };

  const releaseStick = () => {
    stickPtr.current = null;
    setKnob({ x: 0, y: 0, active: false });
    aimingRef.current = false;
    onAim(null);
  };

  const capture = (el: HTMLElement, id: number) => {
    try {
      el.setPointerCapture(id);
    } catch {
      /* not supported */
    }
  };

  return (
    <div
      className="flex w-full items-center justify-between gap-2 px-3 py-2"
      data-scheme="stick"
      style={{ touchAction: "none", minHeight: TOUCH_STRIP_H }}
    >
      <div
        ref={stickRef}
        className="relative shrink-0 rounded-full border backdrop-blur-md"
        style={{
          width: 96,
          height: 96,
          borderColor: `${color}66`,
          background: "rgba(0,0,0,0.35)",
          boxShadow: `inset 0 0 22px -6px ${color}`,
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          stickPtr.current = e.pointerId;
          capture(e.currentTarget, e.pointerId);
          applyStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (stickPtr.current !== e.pointerId) return;
          e.preventDefault();
          applyStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (stickPtr.current === e.pointerId) releaseStick();
        }}
        onPointerCancel={(e) => {
          if (stickPtr.current === e.pointerId) releaseStick();
        }}
        onLostPointerCapture={(e) => {
          if (stickPtr.current === e.pointerId) releaseStick();
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: 36,
            height: 36,
            background: knob.active ? color : `${color}99`,
            boxShadow: knob.active ? `0 0 16px ${color}` : "none",
            transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          }}
        />
      </div>

      {showHud && (
        <StripHud
          color={color}
          label={label}
          myScore={myScore}
          theirScore={theirScore}
          theirColor={theirColor}
          elapsed={elapsed}
          showPause={showPause}
          onPause={onPause}
        />
      )}

      <button
        type="button"
        aria-label={t("boost")}
        className="flex shrink-0 items-center justify-center rounded-full border backdrop-blur-md"
        style={{
          width: 80,
          height: 80,
          color,
          borderColor: thrusting ? color : `${color}66`,
          background: thrusting ? `${color}33` : "rgba(0,0,0,0.35)",
          boxShadow: thrusting
            ? `0 0 22px -2px ${color}`
            : `inset 0 0 18px -6px ${color}`,
          transform: thrusting ? "scale(0.96)" : "scale(1)",
        }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          thrustPtr.current = e.pointerId;
          capture(e.currentTarget, e.pointerId);
          thrustingRef.current = true;
          setThrusting(true);
          onThrust(true);
        }}
        onPointerUp={(e) => {
          if (thrustPtr.current !== e.pointerId) return;
          thrustPtr.current = null;
          thrustingRef.current = false;
          setThrusting(false);
          onThrust(false);
        }}
        onPointerCancel={(e) => {
          if (thrustPtr.current !== e.pointerId) return;
          thrustPtr.current = null;
          thrustingRef.current = false;
          setThrusting(false);
          onThrust(false);
        }}
        onLostPointerCapture={(e) => {
          if (thrustPtr.current !== e.pointerId) return;
          thrustPtr.current = null;
          thrustingRef.current = false;
          setThrusting(false);
          onThrust(false);
        }}
      >
        <BoostGlyph active={thrusting} color={color} />
      </button>
    </div>
  );
}

function ArrowTouchControls({
  color,
  label,
  myScore,
  theirScore,
  theirColor,
  elapsed,
  showHud = false,
  showPause = false,
  onPause,
  onDirection,
}: TouchControlProps) {
  return (
    <div
      className="flex w-full items-center px-2 py-1.5"
      data-scheme="arrows"
      style={{ touchAction: "none", minHeight: TOUCH_STRIP_H }}
    >
      <ArrowPad
        color={color}
        onDirection={onDirection}
        hud={
          showHud ? (
            <StripHud
              compact
              color={color}
              label={label}
              myScore={myScore}
              theirScore={theirScore}
              theirColor={theirColor}
              elapsed={elapsed}
              showPause={showPause}
              onPause={onPause}
            />
          ) : undefined
        }
      />
    </div>
  );
}

export default function PlayerTouchControls(props: TouchControlProps) {
  if (props.scheme === "arrows") return <ArrowTouchControls {...props} />;
  return <StickTouchControls {...props} />;
}
