# Windows XP–style UI sounds + Vijcarta startup jingle

Date: 2026-07-09
Status: Approved (autonomous session — decisions documented here and in the PR/commit)

## Goal

Give the XP desktop shell an era-correct sound layer (startup chime, window
open/close/minimize/restore, menu pop, navigation click, error ding, sleep), and
give Vijcarta '26 an Encarta-style boot: CD-ROM spin-up during the DOS autorun
phase and a warm multimedia-encyclopedia jingle over the splash screen.

## Non-goals

- No sounds inside app content (blog posts, labs, finance inputs). Sounds are
  OS-chrome only; Vijcarta's boot is the one "application" exception.
- No volume slider UI — a single tray mute toggle is enough.
- No use of Microsoft's actual audio files.

## Approach decision

**Chosen: synthesize everything with the Web Audio API** in one module.

- Bundled WAV/MP3 rips of XP/Encarta sounds are Microsoft-copyrighted and add
  binary weight to the repo — rejected.
- "Free lookalike" sample packs still add ~100s of KB and provenance questions —
  rejected.
- Synthesis fits this codebase's style (globes and icons are hand-drawn SVG,
  boot screens are CSS/JS): zero assets, tiny code, tweakable, and legally clean
  "inspired-by" sounds.

## Architecture

New module `src/lib/sounds.ts` (client-only, framework-free):

- **Lazy singleton `AudioContext`** created on first need; `null` when
  unavailable (SSR, jsdom, old browsers) so every public function no-ops safely.
- **Graph:** each sound → `master` GainNode (~0.35) → destination, with a
  parallel send into a generated-impulse `ConvolverNode` (short noise-burst IR,
  ~0.8 s exponential decay) for a subtle shared reverb. No audio assets — the IR
  is synthesized too.
- **Mute:** `isMuted()` / `setMuted(v)` / `toggleMuted()`; persisted to
  `localStorage["sound.muted"]` (try/catch — jsdom's localStorage is flaky).
  Mute drives `master.gain`, so muting mid-jingle silences immediately; sounds
  are also not scheduled while muted.
- **Autoplay policy:** `initSounds()` (called once from `HomeClient`) installs
  one-time capture listeners for `pointerdown`/`keydown` that create/resume the
  context on the first real gesture. `requestStartupChime()` plays immediately
  if the context is running, else queues the chime to fire on that first
  gesture, expiring after 30 s so a late click doesn't chime out of context.
  When the queued chime fires, other UI sounds are suppressed for ~0.7 s to
  avoid a same-gesture pile-up.
- Sounds that accompany animations (`playCdInsert`, `playVijcartaJingle`)
  return a `stop()` handle and only schedule when the context is actually
  running, so a deep-linked (gesture-less) boot stays silent rather than
  blaring later, and skipping the splash cuts the audio.

## Sound palette (all synthesized, XP-inspired but original)

| Name | Character | Trigger |
|---|---|---|
| `startup` | ~3.5 s rising pad + glassy 4-note motif | desktop appears (queued until first gesture) |
| `openWindow` | quick two-blip ascent | window opens |
| `closeWindow` | quick two-blip descent | window closes |
| `minimize` / `restore` | short downward / upward swoosh | minimize, un-minimize, maximize toggle |
| `menuPop` | soft 40 ms pluck | Start menu opens |
| `click` | damped high tick | Start-menu social links, external desktop icons, unmute |
| `error` | two-tone "ding-dong" exclamation | finance unsaved-changes dialog |
| `sleep` | two descending soft tones | Sleep from Start menu |
| CD insert | filtered-noise drive spin-up + seek ticks | Vijcarta autorun phase |
| Vijcarta jingle | ~3 s warm add9 pad + celesta arpeggio + shimmer | Vijcarta splash phase |

## Wiring map

- `HomeClient.tsx` — `initSounds()` + `requestStartupChime()` on desktop phase;
  open/close/minimize/restore/maximize sounds in the existing handlers
  (close sound only after the close-guard passes); sleep sound in `handleSleep`;
  `menuPop` when the Start menu toggles open.
- `Taskbar.tsx` — new tray speaker icon (inline SVG, XP-gray) left of the clock;
  click toggles mute; muted state shows a red slash and swaps `aria-label`.
- `Desktop.tsx` — `click` for external (social) icon double-clicks.
- `StartMenu.tsx` — `click` on social links (internal items already get the
  window-open sound).
- `FinancePlanner.tsx` — `error` when the unsaved-changes dialog appears.
- `BootSplash.tsx` (Vijcarta) — CD spin-up on mount, jingle when the splash
  phase starts, both cancelled on skip/unmount.

## Testing

- `src/lib/__tests__/sounds.test.ts` — contract tests in jsdom (no
  AudioContext): every public function no-ops without throwing; mute persists
  and survives localStorage failure; with a minimal fake AudioContext the
  queued startup chime fires exactly once on first gesture and expires after
  30 s.
- `src/components/__tests__/Taskbar.test.tsx` — tray toggle renders and flips
  mute state/aria-label.
- Baseline: 12 pre-existing vitest failures (Window/BlogList areas) — new work
  must not add to them.
- Manual/browser verification: drive the dev server, confirm AudioContext
  starts after first gesture, sounds schedule without console errors, Vijcarta
  boot plays spin-up → jingle, mute kills audio and persists across reload.
