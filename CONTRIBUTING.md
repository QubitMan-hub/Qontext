# Contributing

## Setup

```
npm ci
pip install -e './python[dev]' pytest playwright
python -m playwright install chromium
```

## Before you open a pull request

```
npm run check                 # lint, unit tests, build
npm run test:e2e              # browser tests against dist/
cd python && ruff check . && ruff format --check . && pytest
```

Commit the rebuilt `dist/` and `figma-plugin/dist/` files. CI fails when they are stale.

## Rules of the codebase

- Physics and color math live in `src/engine/` as pure functions with tests. UI code never re-implements them.
- Every classical limit shown in the UI must have an exhaustive-search test.
- Keep the engine dependency-free. The Studio has no runtime dependencies either.
- New UI must work at 390 px wide, in light and dark themes, and by keyboard.
- Change the pool format only together with `schema/qontext-pool.schema.json`, the Python validator
  and the JavaScript validator, and bump the format version.
