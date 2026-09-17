# Content model

The app is intentionally data-driven. The UI should stay stable while content grows.

## Concept record

Each concept should answer six things:

1. **Definition** — what it is.
2. **Mental model** — the shortest useful way to remember it.
3. **Use when** — decision criteria.
4. **Do not confuse with** — adjacent Microsoft services/concepts.
5. **Certification relevance** — which current exam domain needs it.
6. **Proof** — code and/or hands-on lab.

This avoids “documentation page syndrome,” where a learner reads a feature description without learning when to choose it.

## Lab record

The lab parser normalizes heterogeneous Microsoft course repositories into:

```ts
{
  id,
  title,
  description,
  duration,
  module,
  categories,
  courses,
  platform,
  source,
  status,
  relativePath,
  outline,
  sections: [{ title, summary, code }]
}
```

The structured reader can therefore show the same consistent study UX even when the original repositories use different front matter or Markdown layouts.

## Certification record

Current certifications store:

- code / title / role / platform
- verification date
- Microsoft “skills measured as of” date
- official study guide URL
- instructor-led course metadata
- weighted skill domains
- mapped self-paced learning paths

Legacy credentials keep only the historical metadata necessary to prevent accidental use as current guidance.

## Freshness boundary

The guide distinguishes:

- **Authoritative current web source** — current Microsoft Learn certification/product pages.
- **Uploaded source material** — labs and examples the user supplied.
- **Guide interpretation** — mental models, comparisons, study order, debrief prompts.

The UI should make these layers legible rather than blending them into a single “official” voice.
