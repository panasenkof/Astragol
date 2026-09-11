import { useEffect, useId, useRef, useState } from "react";
import {
  LOCALES,
  LOCALE_META,
  useI18n,
  type LocaleSetting,
} from "@/i18n";
import { cn } from "@/utils/cn";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn(
        "shrink-0 text-cyan-200/90 transition-transform duration-150",
        open && "rotate-180"
      )}
    >
      <path
        d="M4 6.5 8 10.5 12 6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LanguageSelect({
  value,
  onChange,
}: {
  value: LocaleSetting;
  onChange: (next: LocaleSetting) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const options: { id: LocaleSetting; label: string; lang?: string }[] = [
    { id: "auto", label: t("languageDevice") },
    ...LOCALES.map((id) => ({
      id,
      label: LOCALE_META[id].nativeName,
      lang: LOCALE_META[id].htmlLang,
    })),
  ];
  const current = options.find((opt) => opt.id === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("language")}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition"
        style={{
          borderColor: open
            ? "rgba(56,189,248,0.7)"
            : "rgba(255,255,255,0.1)",
          background: open
            ? "rgba(56,189,248,0.16)"
            : "rgba(255,255,255,0.04)",
          boxShadow: open ? "0 0 22px -6px rgba(56,189,248,0.7)" : "none",
        }}
      >
        <span
          className="min-w-0 truncate text-sm font-bold text-cyan-100"
          lang={current.lang}
        >
          {current.label}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("language")}
          className="absolute z-30 mt-2 max-h-[min(20rem,70vh)] w-full overflow-auto rounded-2xl border border-cyan-300/25 bg-[#0a0c22]/95 py-1 shadow-[0_0_40px_-8px_rgba(56,189,248,0.55)] backdrop-blur-xl"
        >
          {options.map((opt) => {
            const selected = opt.id === value;
            return (
              <li key={opt.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  lang={opt.lang}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full min-w-0 items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-bold transition",
                    selected
                      ? "bg-cyan-400/15 text-cyan-100"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  <span className="min-w-0 truncate">{opt.label}</span>
                  {selected && <span className="shrink-0 text-cyan-300">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
