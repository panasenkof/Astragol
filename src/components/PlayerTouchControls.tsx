import { useRef, useState } from "react";
import { useI18n } from "@/i18n";

/** Height reserved for a touch control strip (excluding safe-area). */
export const TOUCH_STRIP_H = 124;

const DEADZONE = 0.15;

/** Map a screen-space stick vector (y down) to a field heading. */
export function screenAim(dx: number, dy: number, rotated: boolean) {
  // Rotated portrait: screen-up is field +x (toward the far / CPU goal).
  return rotated ? Math.atan2(dx, -dy) : Math.atan2(dy, dx);
}

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

export default function PlayerTouchControls({
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
}: {
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
  headsUp: boolean;
}) {
  const { t } = useI18n();
  const stickRef = useRef<HTMLDivElement>(null);
  const stickPtr = useRef<number | null>(null);
  const thrustPtr = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });
  const [thrusting, setThrusting] = useState(false);

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
    if (magT > DEADZONE) onAim(screenAim(dx, dy, headsUp));
  };

  const releaseStick = () => {
    stickPtr.current = null;
    setKnob({ x: 0, y: 0, active: false });
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
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold tracking-widest"
              style={{ color }}
            >
              {label}
            </span>
            {showPause && onPause && (
              <button
                type="button"
                onClick={onPause}
                className="rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-[10px] text-slate-200"
              >
                ❚❚
              </button>
            )}
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
          setThrusting(true);
          onThrust(true);
        }}
        onPointerUp={(e) => {
          if (thrustPtr.current !== e.pointerId) return;
          thrustPtr.current = null;
          setThrusting(false);
          onThrust(false);
        }}
        onPointerCancel={(e) => {
          if (thrustPtr.current !== e.pointerId) return;
          thrustPtr.current = null;
          setThrusting(false);
          onThrust(false);
        }}
        onLostPointerCapture={(e) => {
          if (thrustPtr.current !== e.pointerId) return;
          thrustPtr.current = null;
          setThrusting(false);
          onThrust(false);
        }}
      >
        <BoostGlyph active={thrusting} color={color} />
      </button>
    </div>
  );
}
