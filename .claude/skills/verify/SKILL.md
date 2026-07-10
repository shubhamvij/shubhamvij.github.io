---
name: verify
description: Build, serve, and drive this site's static export to verify changes end-to-end in a real browser
---

# Verifying shubhamvij.github.io changes

Next.js static export of a Windows XP desktop simulation. Deploy builds from
master via CI; `out/` is gitignored.

## Build & serve

```bash
npm run build            # next build + static export to out/
npx serve out -l 4173 --no-clipboard   # run in background
```

## Drive it

Playwright MCP may be locked by another session ("Browser is already in use").
Fallback that always works: `npm install playwright` in the scratchpad, then a
script with `chromium.launchPersistentContext(tmpProfile, { channel: 'chrome',
headless: true })` — uses installed Google Chrome, no browser download, no
profile collision.

## Gotchas

- **Screensaver:** the desktop sleeps after 30s without input
  (content/settings.yaml) and a three.js canvas then swallows all clicks —
  Playwright actionability checks will spin forever instead of waking it.
  Sprinkle `page.mouse.move(...)` between waits; any locator failure that
  retries >30s cascades into this. Keep `page.setDefaultTimeout(6000)`.
- **Autoplay policy is untestable under automation:** CDP grants sticky user
  activation (`navigator.userActivation.hasBeenActive === true` on a fresh
  page, even headed, even with `--autoplay-policy=user-gesture-required`).
  AudioContexts therefore start `running` with zero gestures. The
  suspended-until-gesture path can only be covered by the unit tests in
  `src/lib/sounds.test.ts` (gesture-gated fake).
- **Web Audio evidence:** you can't hear headless audio. Instrument with
  `page.addInitScript` wrapping `BaseAudioContext.prototype.createOscillator`
  / `createBufferSource` counters — sound palette node counts are
  deterministic (startup chime = 17 osc, jingle = 15 osc + 1 noise).
  `addInitScript` on the *page* does not apply to other pages in the context.
- **First visit vs return:** `localStorage.clear()` + reload replays the DOS
  boot (`bootSeen` key). Cookie-restored windows can reopen on load — clear
  cookies for determinism.
- **Pre-existing failures:** 12 vitest failures at baseline (11
  `src/app/__tests__/navigation.test.tsx`, 1 `Window.test.tsx` maximize) and a
  404 for `/images/xp-bliss.jpg` (wallpaper never committed; CSS gradient
  fallback renders). Don't chase these as regressions.
