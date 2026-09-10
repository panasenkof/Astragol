import { audio } from "@/game/audio";
import { useFullscreen } from "@/hooks/useFullscreen";
import { cn } from "@/utils/cn";

function ExpandIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H3v5" />
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}

function CompressIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3v5H3" />
      <path d="M16 3v5h5" />
      <path d="M8 21v-5H3" />
      <path d="M16 21v-5h5" />
    </svg>
  );
}

export default function FullscreenButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { supported, active, toggle } = useFullscreen();
  if (!supported) return null;

  const label = active ? "Exit full screen" : "Full screen";

  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (F)`}
      onClick={() => {
        audio.click();
        void toggle();
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/40 text-slate-200 backdrop-blur-md transition hover:bg-black/60 hover:text-white",
        compact ? "h-10 w-10" : "h-10 px-3 text-sm",
        className
      )}
    >
      {active ? <CompressIcon /> : <ExpandIcon />}
      {!compact && <span className="font-semibold tracking-wide">{label}</span>}
    </button>
  );
}
