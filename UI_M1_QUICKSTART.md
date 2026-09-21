# Try UI M1 in this assembled source

This folder continues the existing Datapass repository. Read UI_M1_ASSEMBLY.json
for the pinned base, source-file guards and exact change list. No dependency
installation, build, GitHub push or deployment was performed during assembly.

For a quick no-install demonstration, open `ui-m1-preview/index.html`. It uses
compiled new desktop components in an offline compatibility harness. Its fixtures
are labelled; Run/Submit are disabled. It is not a production app build.

For the actual React/Vite UI-only route:

```sh
npm ci
npm run typecheck
npm run build
```

On Windows run `START_UI_M1.cmd`. Alternatively:

```sh
npm exec --no --workspace apps/web -- vite --host 127.0.0.1 --open "/?preview=1"
```

Use the original `python start.py` procedure and token URL for connected execution;
there is no changed runtime setup in this pass.

UI qualification without Python or cloud:

```sh
node --test tests/ui-m1-model.test.cjs
npx playwright install chromium
npx playwright test --config playwright.ui-m1.config.ts
```

Connected test, after preparing the existing Python environment:

```sh
npx playwright test tests/browser/ui-m1-connected.spec.ts
npx playwright test --grep "V1 playground launcher"
```

These full-app checks remain pending until run on your machine or CI. Read
`architecture/06_UI_M1.md`. Do not call this candidate production-ready based on
the prior baseline's CI results. Continue the existing branch; do not create a
separate application or repository.
