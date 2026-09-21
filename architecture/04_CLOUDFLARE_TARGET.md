# Cloudflare deployment note — non-blocking V1 target

Cloudflare remains a valid future web-shell deployment target, but **it is not the next Datapass coding milestone**.

## Correct responsibility split

```text
Cloudflare
├── React/Vite static shell
├── SPA routing
└── optional tiny authenticated/API gateway later
       │
       ▼
explicit HTTPS Datapass API origin, if/when one exists
```

Cloudflare must not run the local data plane, trusted Python, Polars, dbt jobs, SparkLab compute or orchestration.

## V1 rule

The complete V1 must remain useful locally through the supported launcher. A hosted shell without an API origin must show runtime-disconnected/unavailable state rather than fabricate execution.

## Priority

Do not spend the current consolidation pass on Cloudflare unless deployment is required to validate a user-facing release. First finish:

1. native M2 integration;
2. workspace resource ownership;
3. dbt Core bridge;
4. Pipeline Lab;
5. Arena/SparkLab convergence;
6. V1 QA.
