# KanaFlow か

An interactive web app for learning Japanese **Hiragana & Katakana**, built around an Anki-style spaced repetition system (SM-2) and eight game-like practice modes. Everything runs in the browser — no backend, no account: all progress is saved to `localStorage`.

## Features

- **Complete kana dataset** — 208 cards: 46 gojūon, dakuten, handakuten and yōon combinations, in both scripts, plus ~100 real kana words for Word Mode
- **Anki-style SRS** — learning steps (1m → 10m), graduating/easy intervals, ease factor with Again/Hard/Good/Easy buttons, lapses & relearning, ±5% interval fuzz, configurable new cards/day. Wrong answers in *any* practice mode pull that card's next review earlier
- **9 study modes** — Review (SRS flashcards with 3D flip & interval previews), Quiz, Typing, Matching, Time Attack, Kana Rain (arcade), Memory Flip, Listening, Word Mode
- **Progress tracking** — dashboard with due/new/streak/mastered/accuracy, GitHub-style activity heatmap, reviews-per-day chart, and a full kana chart color-coded by card maturity (mature kana get a vermilion hanko seal ○)
- **Audio** — native `speechSynthesis` with a `ja-JP` voice
- **Settings** — script & group toggles, daily new-card limit, lenient romaji input (shi/si, chi/ti, tsu/tu, fu/hu, ja/jya…), full JSON export/import of progress
- **Design** — calm Japanese minimalism on washi cream, Zen Maru Gothic kana, Framer Motion micro-interactions, fully responsive & one-hand friendly on mobile, keyboard shortcuts on desktop (Space = flip, 1–4 = rate), respects `prefers-reduced-motion`
- **Dark mode** — a warm "sumi night" variant of the cream theme; follows the system setting or toggle it manually in Settings
- **Installable PWA** — add it to your home screen and the whole app (including stroke data) works fully offline
- **Level & XP** — reviews and games earn XP; level up through Japanese-flavored ranks (新人 → 仮名仙人) with a progress bar on the dashboard
- **Stroke order** — tap any kana in the chart to watch its strokes drawn in order (data from [KanjiVG](https://kanjivg.tagaini.net) © Ulrich Apel, CC BY-SA 3.0)

## Development

```bash
npm install
npm run dev        # start dev server
npm test           # run the SRS engine unit tests (Vitest)
npm run build      # typecheck + production build to dist/
```

## Deploy

The app is a static SPA — any static host works. SPA rewrites are already configured for both Vercel (`vercel.json`) and Netlify (`netlify.toml`).

### Vercel (recommended, ~2 minutes)

1. Go to [vercel.com/new](https://vercel.com/new) and import this GitHub repository
2. Framework preset: **Vite** (auto-detected) — no other settings needed
3. Deploy. Done — open the URL on your phone and add it to your home screen

Or from the CLI: `npx vercel --prod`

### Netlify

[app.netlify.com/start](https://app.netlify.com/start) → import the repo → build command and publish dir are picked up from `netlify.toml`.

## Tech stack

React 18 · Vite · TypeScript (strict) · Tailwind CSS · Framer Motion · Zustand (persist) · Vitest

## Project structure

```
src/
  data/        kana dataset (gojūon/dakuten/handakuten/yōon × 2 scripts) + words
  lib/         SRS engine (pure, unit-tested), romaji matching, audio, dates
  stores/      Zustand store with versioned localStorage persistence
  components/  shared UI (layout, hanko seal, confetti, modal, …)
  pages/       dashboard, review, 8 practice modes, kana chart, settings
```
