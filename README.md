# Meowdoku — Find the Hidden Cats

A mobile-first, 120fps-optimized pastel logic puzzle web game inspired by Meowdoku. Combine colorful regions, Sudoku-inspired deduction, and adorable expressive cats.

## Rules

1. **One cat per colored region** — Each pastel area hides exactly one cat.
2. **One cat per row & column** — Every horizontal row and vertical column contains exactly one cat.
3. **Cats never touch** — No two cats may occupy neighboring cells, including diagonals.

## Highlights

- **24 Pre-Baked Unique-Solution Levels** (`6×6` & `8×8`) + **Daily Kitty 8×8 Challenge**
- **120fps GPU Tile Engine & HTML5 Canvas Particles** — zero per-second timer re-renders, strict primitive cell memoization, and 0%-idle-CPU canvas sparkles, hearts & confetti
- **Pro Mobile Controls** — drag-to-paint `×` marks, Smart Auto-× assist, luminous row/col/neighbor sightlines, logical hints, and atomic undo/redo
- **8 Studio-Grade Custom SVG Cat Breeds** with living eye-blink animations and celebration waves
- **PWA-Ready** with offline service worker, Web Audio synthesizer, Vibration API haptics, and schema-validated LocalStorage persistence

## Development

```bash
npm install
npm run dev
```

## Testing & Build

```bash
npm test
npm run build
```
