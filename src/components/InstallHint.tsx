import { useEffect, useState } from "react";

const STORAGE_KEY = "nebula-install-hint-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean(window.navigator.standalone)
  );
}

function isTouchDevice() {
  return (
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
    (typeof window !== "undefined" && "ontouchstart" in window)
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export default function InstallHint() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );

  useEffect(() => {
    if (isStandalone() || !isTouchDevice()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* private mode */
    }

    setIos(isIos());
    setVisible(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto mb-2 flex w-full max-w-lg items-start gap-3 rounded-2xl border border-cyan-300/25 bg-[#07061a]/90 px-4 py-3 text-sm text-slate-200 shadow-[0_0_32px_-8px_rgba(56,189,248,0.55)] backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <p className="font-semibold tracking-wide text-cyan-100">
            Add to Home Screen
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
            {ios
              ? "In Safari tap Share, then Add to Home Screen — play full-screen like an app."
              : deferred
                ? "Install Nebula Arena to open it from your home screen."
                : "Use your browser menu → Add to Home Screen / Install app."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {deferred && (
            <button
              type="button"
              onClick={() => void install()}
              className="rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-3 py-1.5 text-xs font-bold tracking-wide text-cyan-100"
            >
              Install
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="rounded-xl px-2 py-1.5 text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
