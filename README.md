# Nebula Arena

Cosmic orb soccer in the browser. First to 5 goals wins.

## Play on a phone (PWA)

After GitHub Pages is enabled, open:

**https://panasenkof.github.io/Astragol/**

- **Android (Chrome):** menu → **Install app** / **Add to Home Screen**.
- **iPhone:** use **Safari** → Share → **Add to Home Screen**. Chrome on iOS cannot install a standalone PWA.

You need HTTPS for the install prompt. Until Pages is live, you can still play on the same Wi‑Fi:

```bash
npm install
npm run dev -- --host
```

Then open the printed `Network` URL on your phone. That session is a website, not an installed app.

Repo Settings → Pages → Source: **GitHub Actions** (once).

If the URL shows **404**, the first Pages deploy likely failed. Open
[Actions → Deploy GitHub Pages](https://github.com/panasenkof/Astragol/actions)
and run **Re-run failed jobs**, or merge a new commit to `main`. Wait a minute
and refresh `https://panasenkof.github.io/Astragol/`.

## Updating the installed PWA

GitHub Pages only publishes from `main`. A green deploy on a pull request does
**not** update https://panasenkof.github.io/Astragol/ until that PR is merged.

The installed app is served by a service worker cache, so a successful Pages
deploy does not appear until the worker picks up the new `sw.js` and the page
reloads. After a merge to `main`:

1. Wait about a minute for Pages.
2. Fully quit the app (on iPhone: swipe it away in the app switcher; on
   Android: close the PWA / all site tabs).
3. Open it again. The new worker should activate and reload on the menu
   (not in the middle of a match).

If it is still the old UI, force the first new worker once:

- **Safari / iPhone:** open the site **in Safari** (not the Home Screen icon),
  pull to refresh, then reopen from Home Screen.
- **Chrome / Android:** site settings → **Clear & reset**, or Chrome →
  Application/Site settings → Service workers → Unregister, then reopen.
- **Desktop:** hard refresh (`Ctrl`/`⌘` + `Shift` + `R`).

`npm run dev` has no service worker. Use `npm run build && npm run preview`
to test the installed-app update path locally.

## Scripts

```bash
npm install
npm run dev          # local development
npm run build        # PWA production build → dist/
npm run preview      # serve dist/
npm run build:file   # single HTML file (no service worker)
```
