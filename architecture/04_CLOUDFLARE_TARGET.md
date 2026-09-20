# Cloudflare deployment target

## Decision

Cloudflare is the next web deployment target.

For a new deployment, prefer **Cloudflare Workers + Static Assets**. Cloudflare's current documentation says Workers is its primary application platform for new projects, while Pages remains available.

Official references:

- React + Vite on Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Workers static assets: https://developers.cloudflare.com/workers/static-assets/
- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/

## Why this fits Datapass

The compiled React app is static and cheap to serve. Static asset requests on Cloudflare Workers are currently free/unlimited; only Worker invocations consume Worker request/CPU allowance.

Datapass compute is not edge compute.

```text
Cloudflare
├── React/Vite static assets
├── SPA routing
└── tiny API gateway later
        │
        ▼
HTTPS Datapass API origin
        │
        ▼
Oracle/local runtime
├── FastAPI
├── Airflow
├── Spark
├── Polars
└── dbt
```

## Proposed repository shape

Do not move the React source into a second repository.

Add deployment files to this repository:

```text
cloudflare/
  worker.ts                 # optional tiny /api gateway
wrangler.jsonc              # static assets + SPA route config
architecture/
  04_CLOUDFLARE_TARGET.md
```

The existing Vite build already emits `apps/web/dist`.

A likely Wrangler asset configuration is:

```jsonc
{
  "name": "datapass-studio",
  "compatibility_date": "2026-09-21",
  "assets": {
    "directory": "./apps/web/dist",
    "not_found_handling": "single-page-application"
  }
}
```

If/when a Worker proxy is added:

```jsonc
{
  "main": "./cloudflare/worker.ts",
  "assets": {
    "directory": "./apps/web/dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  }
}
```

## API gateway rule

Do not proxy to Oracle until Oracle exposes a real HTTPS origin and the authentication model has been reviewed.

The Worker may later:

1. receive `/api/*`.
2. forward to a configured `DATAPASS_API_ORIGIN`.
3. preserve method/body/query.
4. add only the minimum required headers.
5. return upstream errors transparently.

Do not embed Oracle credentials, GitHub tokens, MotherDuck tokens or local session tokens in the browser bundle.

## Free-tier constraints that matter

Current Workers Free limits include approximately:

- 100,000 Worker requests/day.
- 10 ms CPU time per normal HTTP Worker invocation.
- 128 MB memory.

That is plenty for a tiny router/proxy, but it is intentionally unsuitable for Datapass data processing.

## Local development remains first-class

Keep these paths:

```text
production-like local:
python start.py ...

frontend development:
Vite :5173 -> proxy /api -> FastAPI :8000
```

Cloudflare deployment is an additional presentation/deployment target, not a replacement for the local execution architecture.

## Acceptance criteria for the Cloudflare migration

A migration pass is complete only when:

- `npm run build` still passes.
- local Vite/FastAPI development still works.
- `start.py` still serves the built app locally.
- Cloudflare serves deep SPA routes correctly.
- static frontend loads without secrets in the bundle.
- disconnected backend state is explicit.
- when an API origin is configured, `/api/health` and one bounded read-only request work through the edge.
- Cloudflare is not used for Spark/Polars/Airflow compute.
