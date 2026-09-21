# Cloudflare Workers build configuration

The existing Cloudflare Worker is `ducklabms-code`, connected to
`julian-passebecq/ducklabms_code`. Both Wrangler entrypoints target that Worker;
the root entrypoint supports local commands and this directory isolates the
hosted build from automatic installation of the local Python runtime.

Settings inspected through the Cloudflare plugin on 2026-09-21:

| Setting | Value |
| --- | --- |
| Build root | `cloudflare` |
| Build command | `cd .. && npm ci && npm run build` |
| Production branch | `main` |
| Production deploy command | `npx wrangler deploy` |
| Non-production branches | All except `main` |
| Non-production command | `npx wrangler versions upload` |

Build and deploy commands start separately in the configured build root. Assets
resolve relative to the Wrangler file: `../apps/web/dist` here and
`./apps/web/dist` in the root config. Keep the Worker name, API routing and asset
behavior synchronized between the two files.

## Investigation evidence

- The earlier main retry `6e1e9647-375a-4ff5-b3c8-c65976daa6ae` built the frontend,
  then failed because `/opt/buildhome/repo/wrangler.jsonc` was absent.
- Release commit `a9f6fce4c34b1876ec81a027f6d1a169a107ec2b` succeeded in build
  `9c432b08-cbb9-4133-8acd-8a1bc65730da`, including TypeScript, Vite and upload of
  180 assets. It uploaded version `c8c8eafa-0a51-4035-b7e8-0201b590a7f4`.
- That successful build used the previous root `/` and `npm run build` settings.
  It does not independently validate the current isolated build settings above.
- Uploading a release-branch version does not promote it to production. The
  active deployment at inspection still referenced dashboard-created version
  `76e83c67-0e08-44b6-aa78-df3c35980a76`.
- Both workers.dev and preview URLs were disabled at inspection. A successful
  version upload alone therefore does not establish a reachable public preview.

This hosting layer serves the UI only. `/api` and `/api/*` deliberately return
503 JSON with `runtime_not_connected`; Python, DuckDB and other execution stay
in the local application. PR #6 remains unmerged during this investigation.

## Verification

For a local packaging check after building the frontend, run from repository root:

```sh
npm ci
npm run build
npx wrangler deploy --dry-run --config cloudflare/wrangler.jsonc
```

Broad product checks are **DEFERRED TO EXTERNAL QA**:

```sh
npm run verify
npm run test:v1:browser
npm run test:v1:native
```

After an explicitly requested promotion or preview enablement, verify the actual
URL serves the shell and SPA routes, and that `/api` and `/api/health` return the
disconnected JSON response rather than HTML. Deployment success is not native
runtime qualification.
