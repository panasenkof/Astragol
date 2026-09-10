/** Register the PWA worker so GitHub Pages deploys actually show up. */
export function registerPwa() {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
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
    })
    .catch(() => {
      /* single-file build or offline — no SW */
    });
}
