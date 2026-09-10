import { cn } from "@/utils/cn";
import { localeUsesWideTracking, useI18n } from "@/i18n";
import type { CSSProperties, ReactNode } from "react";

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-3xl border border-cyan-300/15 bg-[#0a0c22]/70 backdrop-blur-xl",
        "shadow-[0_0_60px_-12px_rgba(80,150,255,0.55)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.06] to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

type BtnVariant = "primary" | "ghost" | "danger" | "soft";

export function NeonButton({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
  glow,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  className?: string;
  disabled?: boolean;
  glow?: string;
}) {
  const base =
    "relative select-none rounded-2xl px-5 py-3 font-semibold tracking-wide transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100";
  const styles: Record<BtnVariant, string> = {
    primary:
      "text-[#04101f] bg-gradient-to-b from-cyan-300 to-sky-500 shadow-[0_0_28px_-4px_rgba(56,189,248,0.9)] hover:from-cyan-200 hover:to-sky-400",
    soft: "text-cyan-100 bg-cyan-400/10 border border-cyan-300/30 hover:bg-cyan-400/20 hover:border-cyan-300/50",
    ghost:
      "text-slate-200 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20",
    danger:
      "text-rose-50 bg-rose-500/15 border border-rose-400/30 hover:bg-rose-500/25",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={glow ? { boxShadow: `0 0 30px -6px ${glow}` } : undefined}
      className={cn(base, styles[variant], className)}
    >
      {children}
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  display,
  accent = "#38bdf8",
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: string;
  accent?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("space-y-2", disabled && "opacity-40")}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-cyan-200/90">
          {display ?? value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 outline-none
          [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/80
          [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/80"
        style={
          {
            background: `linear-gradient(to right, ${accent} ${
              ((value - min) / (max - min)) * 100
            }%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%)`,
            accentColor: accent,
          } as CSSProperties
        }
      />
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  accent = "#38bdf8",
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.08]"
    >
      <span className="text-sm text-slate-200">{label}</span>
      <span
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{
          background: checked ? accent : "rgba(255,255,255,0.15)",
          boxShadow: checked ? `0 0 16px -2px ${accent}` : "none",
        }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? "22px" : "2px" }}
        />
      </span>
    </button>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const tracking = localeUsesWideTracking(locale)
    ? "tracking-[0.25em] uppercase"
    : "tracking-wide";
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className={`text-xs font-bold text-cyan-300/80 ${tracking}`}>
        {children}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/40 to-transparent" />
    </div>
  );
}
