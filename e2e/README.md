# End-to-End Browser Tests

Playwright-based smoke and regression suite targeting the built production app served via `vite preview`.

## Setup

First time:

```bash
npx playwright install chromium
```

## Running

```bash
npm run e2e
```

This builds the app (`npm run build`), serves `dist/` on `http://localhost:4173`, runs every `e2e/specs/*.spec.mjs` in alphabetical order, and exits with a non-zero code if any check fails.
