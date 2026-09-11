/** Register the PWA worker so GitHub Pages deploys actually show up. */

let reloadPending = false;
let reloading = false;

function inMatch() {
  return document.documentElement.dataset.pwaLock === "1";
}

function reloadWhenIdle() {
  if (reloading) return;
  if (inMatch()) {
    reloadPending = true;
    return;
  }
  reloading = true;
  window.location.reload();
}

/** Call when the app leaves a match so a waiting deploy can reload. */
export function flushPwaReload() {
  if (reloadPending && !inMatch()) reloadWhenIdle();
}

export function registerPwa() {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // First install has no previous worker — don't bounce the first visit.
    if (!hadController) return;
    reloadWhenIdle();
  });

  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  void navigator.serviceWorker
    .register(swUrl, { updateViaCache: "none" })
    .then((reg) => {
      const ping = () => {
        void reg.update();
      };
      ping();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") ping();
      });
      window.addEventListener("pageshow", ping);
      window.addEventListener("focus", ping);
      window.setInterval(ping, 60_000);
    })
    .catch(() => {
      /* single-file build or offline — no SW */
    });
}
