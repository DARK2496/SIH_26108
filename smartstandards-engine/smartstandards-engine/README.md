# SmartStandards-Engine — SIH demo build

A recommendation engine for Indian Standards in government procurement, built
as a hybrid retrieval + knowledge-graph + rule-engine pipeline. See the demo
UI for the full flow: paste a tender clause, get ranked standards with
evidence, allied-standard graph expansion, outdated-citation detection, and
certification applicability.

## What's in this repo

```
index.html        The whole app: UI, dataset, retrieval/graph/rule logic
api/extract.js     Serverless function — calls Claude for requirement
                    extraction, holding the API key server-side
```

Everything except that one extraction step runs as plain client-side
JavaScript over a small hand-curated dataset (~12 records, Electrical &
Lighting Equipment category). No database, no build step.

## Deploying

1. Push this folder to a GitHub repo (or `vercel` from inside it directly).
2. Import the repo on [vercel.com](https://vercel.com) → New Project →
   Deploy. No framework preset or config needed — Vercel auto-detects the
   static `index.html` and the `/api` serverless function.
3. **Optional but recommended:** in the Vercel project → Settings →
   Environment Variables, add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key (from [console.anthropic.com](https://console.anthropic.com))
   - Redeploy after adding it (env vars only apply to new deployments).

## Live extraction vs. offline fallback

- **With `ANTHROPIC_API_KEY` set:** the "As understood" panel is populated
  by a real, schema-constrained call to Claude Haiku 4.5, run server-side
  through `/api/extract`. The key is never sent to or readable by the
  browser.
- **Without it (or if the call fails for any reason):** the app
  automatically falls back to a deterministic, offline rule-based parser
  (regex/keyword matching for power/voltage/IP-rating/material/application
  and IS-number citations). The rest of the pipeline — retrieval scoring,
  graph expansion, amendment detection, certification rules — is identical
  either way, since none of that depends on an LLM.

This means the app is **safe and fully functional to deploy with zero
configuration** — you only need to add the API key if you want the live
extraction step for the demo.

## Cost note

If you do add a key: each analysis is one short Claude Haiku call
(~400 output tokens, input capped at 4000 characters), so cost per demo
run is a small fraction of a cent. There's no other metered usage — the
retrieval/graph/certification logic makes no API calls at all.

## Data disclaimer

The standards dataset embedded in `index.html` is illustrative, hand-curated
for this prototype, and explicitly labeled as such in the app's UI. It is
not a live BIS feed — verify any citation against the official BIS
catalogue before real procurement use.
