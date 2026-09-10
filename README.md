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

## Scripts

```bash
npm install
npm run dev          # local development
npm run build        # PWA production build → dist/
npm run preview      # serve dist/
npm run build:file   # single HTML file (no service worker)
```
