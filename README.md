# 📋 SmartStandards-Engine
### AI-Powered Recommendation Engine for Indian Standards in Government Procurement Specifications

**Smart India Hackathon (SIH) Problem Statement**: `SIH26108`
**Organization**: Ministry of Consumer Affairs, Food & Public Distribution — Department of Consumer Affairs (DoCA)
**Category**: Software · **Theme**: Smart Automation

---

## 🎯 The Core Insight

> **The Pitch**: *"Procurement officials don't fail because they don't know Indian Standards exist — they fail because they have no fast, structured way to know which subset of thousands of overlapping, cross-referencing, frequently-revised standards applies to their exact spec, and no way to verify they haven't missed one. Keyword search can't answer that. A raw LLM chatbot answers it dangerously — with confident, unverifiable, hallucinated standard numbers. We treat this as a retrieval-and-verification problem, not a generation problem: the model never invents a standard number, it only phrases evidence that deterministic retrieval, graph traversal, and rule-matching have already proven."*

SmartStandards-Engine sits inside the tender-drafting workflow. An officer pastes, uploads, or types a specification; the system returns a **ranked, evidence-backed, graph-expanded, certification-aware** set of applicable Indian Standards — flagging outdated citations and coverage gaps — before the tender is ever published.

---

## 🏗️ How It Actually Solves the Problem — End-to-End Architecture

```mermaid
flowchart TD
    subgraph Input["1. Specification Ingestion"]
        A1[Procurement Officer] -->|Paste text / Upload PDF·DOCX / Type query| A2[Document Parser<br/>PyMuPDF + pdfplumber + OCR fallback]
        A1 -->|Hindi / Hinglish phrasing| A2
    end

    subgraph Understanding["2. Requirement Understanding"]
        A2 --> B1[Language Detection + Translation to English]
        B1 --> B2[LLM Requirement Extraction<br/>JSON-schema constrained — never freeform]
        B2 --> B3[Query Normalization + Entity Tagging<br/>voltage, material, dimension, environment]
    end

    subgraph Retrieval["3. Hybrid Retrieval + Reranking"]
        B3 --> C1[BM25 Lexical Search]
        B3 --> C2[Bi-Encoder Embedding Search — FAISS]
        C1 & C2 --> C3[Reciprocal Rank Fusion → top ~30 candidates]
        C3 --> C4[Cross-Encoder Reranker → top ~10]
    end

    subgraph Graph["4. Normative-Reference Knowledge Graph"]
        C4 --> D1{1–2 hop traversal}
        D1 --> D2[Test-Method standards]
        D1 --> D3[Safety standards]
        D1 --> D4[Terminology standards]
        D1 --> D5[Installation standards]
    end

    subgraph Verify["5. Deterministic Verification Layer — zero LLM inference"]
        C4 --> E1[Amendment + Supersession Lookup]
        C4 --> E2[Certification Rule Engine<br/>BIS · CRS · Hallmark]
        C4 --> E3[Weighted Confidence Score]
    end

    subgraph Explain["6. Explainable, Evidence-Bound Output"]
        D2 & D3 & D4 & D5 & E1 & E2 & E3 --> F1[Closed-book LLM phrasing<br/>rephrases evidence only — never invents]
        F1 --> F2[Ranked standards + allied standards<br/>+ certification + confidence + citation flags]
        F2 --> F3[Exportable Compliance Report — PDF/Word]
    end
```

**Explicitly rejected design**: `Query → LLM → Answer`. A raw LLM call has zero traceability and unacceptable hallucination risk in a legal procurement context — every standard ID surfaced above comes from retrieval, the graph, or the rule engine; the LLM is used *only* for (a) turning free text into a structured query, and (b) turning already-verified evidence into a readable sentence.

---

## ⚙️ Key Differentiators vs. Naive Keyword Search / Generic Chatbots

| Most teams will build | We build instead |
|---|---|
| A RAG chatbot over scraped PDF text | Hybrid retrieval + graph-expansion + rule-based certification engine |
| A single relevance score, no justification | A transparent, additive, inspectable explanation for every recommendation |
| "The one best standard" | Primary standard + normative/allied standard expansion via graph traversal |
| A static list of standards | Outdated-standard and amendment detection with a live before/after diff |
| Certification ignored | Explicit BIS/CRS/Hallmark applicability engine with cited legal basis |

---

## 🛡️ Deep Dive: The Hallucination-Prevention Protocol

> **The Pitch**: *"A raw LLM given a spec and asked 'which standard applies?' will invent a plausible-looking IS number with 100% apparent confidence. That is unacceptable when the output ends up in a legally binding tender. SmartStandards-Engine structurally cannot do this — the model is never the source of a standard ID."*

```mermaid
graph TD
    A[Requirement Query] --> B[Retrieval + Graph + Rule Engine — 100% deterministic code]
    B --> C[Evidence Object: matched attributes, graph edges,<br/>certification rule fired, computed confidence %]
    C -->|Confidence ≥ 70%| D["Closed-book" LLM phrasing<br/>— rephrases the evidence JSON only]
    C -->|Confidence < 70%| E[⚠️ Flagged: Needs Human Verification<br/>— no answer asserted]
    D --> F[Explanation shown alongside a full evidence checklist]
```

**System instruction to the phrasing model**: *"Rephrase only the facts given in this evidence JSON. Do not add any standard number, fact, or claim not present in the input. If information is insufficient, say so."* Because the evidence object is generated entirely by deterministic code, a valid — if less readable — explanation could still be shown even if the LLM step were skipped entirely. That fallback is the actual safety net, not a disclaimer.

**Hallucination rate is a tested metric, not a claim**: evaluation checks that 100% of facts stated in a generated explanation trace back to the evidence object (Section: Evaluation Framework below). Target: 0%.

---

## 🕸️ Deep Dive: Why a Knowledge Graph, Not Just Better Retrieval

> **The Problem with Pure Retrieval**: Retrieval answers *"what's textually similar to this query?"* It cannot answer *"what else does the correct standard normatively require?"* — and that second question is where most real-world tender defects live: officials cite the obvious primary standard but silently miss the 2–4 companion standards (test method, safety, terminology) it depends on.

```mermaid
graph LR
    subgraph Keyword["Naive Keyword Search — what most teams ship"]
        A1["Query: LED street light,<br/>90W, IP65"] -->|Text match on 'light'| B1[Dozens of unrelated<br/>luminaire standards]
        B1 --> C1[❌ Officer misses the safety<br/>and test-method standards entirely]
    end

    subgraph Ours["SmartStandards-Engine — Hybrid + Graph"]
        A2["Query: LED street light,<br/>90W, IP65"] -->|Hybrid retrieval + rerank| B2["IS 10322 (Pt 5/Sec 1):2023<br/>— primary match, 92% confidence"]
        B2 -->|Normative graph traversal| C2[+ IS 16102-1<br/>Test Method]
        B2 --> D2[+ IS 60598-1<br/>Safety]
        B2 --> E2[+ IS 1885 Pt 2<br/>Terminology]
        C2 & D2 & E2 --> F2[✅ Officer cites a complete,<br/>defensible standard set]
    end
```

Every edge in the graph is **typed** (`TEST_METHOD`, `SAFETY`, `TERMINOLOGY`, `INSTALLATION`), which is what lets the explanation say *"referenced as a safety standard"* instead of a vague *"related"* — and what a pure similarity search structurally cannot produce.

---

## 🧮 Recommendation & Confidence Formula

```
FinalScore(s) =
    0.30 · SemanticSim(query, s)        // bi-encoder cosine similarity
  + 0.15 · LexicalScore(query, s)       // normalized BM25 score
  + 0.20 · AttributeMatch(query, s)     // structured field match (voltage, IP, material...)
  + 0.10 · ScopeMatch(query, s)         // scope-text entailment via reranker
  + 0.10 · RerankScore(query, s)        // cross-encoder score, normalized
  + 0.05 · StatusBonus(s)               // +1 current, 0 superseded, -1 withdrawn
  + 0.05 · GraphCentrality(s)           // verified edges connecting s to the matched cluster
  + 0.05 · CertificationRelevance(s)    // +1 if a mandatory cert rule fires

Confidence(%) = round(100 × FinalScore(s) × Coverage(s))
where Coverage(s) = (# structured attributes matched) / (# attributes present in query)

If Confidence < 70%  →  UI shows "⚠ Needs human verification" instead of asserting an answer
```

Weights are deliberately **transparent, tunable hyperparameters — not learned** — so every number on screen is explainable to an evaluator on request, not a black-box score.

---

## 🚨 Outdated-Standard & Amendment Engine

Pure deterministic lookup — zero ML, zero hallucination risk, which makes it the single most demo-reliable feature:

```
function checkCitation(cited_id):
    record = db.get(cited_id)
    if record.status == "withdrawn":
        return ALERT("withdrawn — no longer valid, replace immediately")
    if record.status == "superseded":
        current = db.get(record.superseded_by)
        return ALERT(f"superseded — current is {current.id}", amendments=current.amendments)
    if record.amendments and latest_amendment.date > tender_date:
        return NOTICE(f"{len(amendments)} amendment(s) exist — review required")
    return OK("current, no outstanding amendments")
```

```
⚠ Tender references: IS 10322 (Part 5):2016
   Status: SUPERSEDED
   Latest available: IS 10322 (Part 5/Sec 1):2023
   Amendments since: AMD 1 (2021) · AMD 2 (2023)
   [ Update clause automatically ]   [ View diff ]
```

---

## 📜 Certification Engine (BIS / CRS / Hallmark)

Certification applicability is a matter of **notified legal fact, not semantic judgement** — an LLM guessing here carries real regulatory risk and cannot be audited. This is a human-curated, deterministic rule table:

```json
{
  "rule_id": "CERT_LED_LUMINAIRE_001",
  "product_category": "LED luminaire — public/outdoor use",
  "standard_id": "IS_10322_5_2023",
  "certification_type": "BIS_PRODUCT_CERT",
  "mandatory": true,
  "conditions": [
    { "field": "application", "op": "in", "value": ["street", "area", "public"] },
    { "field": "power_rating_w", "op": ">=", "value": 1 }
  ],
  "legal_basis": "BIS Compulsory Registration Order reference",
  "last_verified": "2026-08-01"
}
```

No LLM inference is used to decide *whether* a rule fires — only to phrase the result once a rule has already matched.

---

## 🌐 Multilingual Support

**Decision**: translate the incoming query to English at the input boundary; keep the standards database English-only. Re-indexing the entire corpus per language is unnecessary engineering cost with no demo-visible benefit.

| Layer | Approach |
|---|---|
| Language detection | Lightweight detector (langdetect / fastText lang-id) on raw input |
| Translation | Hindi/Hinglish → English via IndicTrans2 or an LLM translation call, before entering the pipeline |
| Hinglish handling | Small synonym dictionary normalizes common transliterated technical terms first |
| Trust UI | Shows **both** "As understood (English)" and the original text side-by-side, so the officer can verify the translation before proceeding |

---

## 🏛️ Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (React) + Tailwind | Fast to build, clean graph-viz integration |
| Backend | FastAPI (Python) | Async, auto docs, same language as the ML stack |
| Embeddings | `bge-small-en-v1.5` (local) | Free, fast, no API dependency for core search |
| Vector DB | FAISS (in-process) | Zero infra, deterministic, offline-safe |
| Reranker | `bge-reranker-base` (local) | Meaningful top-3 precision boost |
| LLM | Claude API (Haiku/Sonnet tier) | Schema-constrained extraction + evidence-bound explanation only |
| Relational DB | PostgreSQL | Standards metadata, amendments, cert rules, users, feedback |
| Graph | Postgres adjacency tables + NetworkX traversal | Sufficient at 150–300 nodes, avoids a separate graph DB service |
| Cache | Redis | Demo-safety net — caches embeddings + LLM responses |
| Document parsing | PyMuPDF + pdfplumber + pytesseract | Reliable, well-documented, OCR fallback for scans |
| Deployment | Docker Compose, single VPS / free-tier cloud | Reproducible; Kubernetes would be over-engineering here |

---

## 🚀 Quick Start

```bash
# 1. Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# 2. Build the standards dataset + FAISS index
cd data_pipeline
python build_dataset.py      # produces standards.json per the schema below
python build_index.py        # builds the FAISS index

# 3. Seed the knowledge graph
cd knowledge_graph
python seed_relationships.py

# 4. Frontend
cd frontend && npm install
npm run dev
```

Open **`http://localhost:3000`** for the officer-facing UI, and **`http://localhost:8000/docs`** for the auto-generated API docs.

Environment variables (`.env`):
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/smartstandards
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=your_key_here   # optional — falls back to rule-based extraction if unset
```

---

## 📂 Repository Structure

```
smartstandards-engine/
├── frontend/                  # Next.js app
│   ├── app/                   # pages/routes
│   ├── components/            # results cards, graph view, cert panel, upload
│   └── lib/api.ts
├── backend/
│   └── app/
│       ├── api/                (analyze.py, standards.py, compliance.py, report.py)
│       ├── core/                (config.py, auth.py, cache.py)
│       └── models/              (SQLAlchemy models)
├── ai/
│   ├── extraction/             llm_extract.py — schema-constrained requirement extraction
│   ├── retrieval/               bm25.py, embeddings.py, hybrid_fusion.py
│   ├── ranking/                 reranker.py, scoring.py — the confidence formula above
│   ├── graph/                   traversal.py — normative expansion
│   ├── certification/           rule_engine.py
│   └── explanation/             evidence_builder.py, explain_prompt.py
├── data_pipeline/
│   ├── raw/                     curated source notes — NOT full copyrighted PDFs
│   ├── build_dataset.py
│   └── build_index.py
├── knowledge_graph/seed_relationships.py
├── evaluation/
│   ├── benchmark_queries.json
│   └── run_eval.py              Precision@K / Recall@K / MRR
├── scripts/ (seed_db.py, demo_reset.py)
├── tests/
└── configs/ (.env.example, docker-compose.yml)
```

---

## 🧪 Demo Scenarios (Electrical & Lighting Equipment cluster)

1. **LED Street Lighting — the headline scenario**
   Input: *"500 nos. LED street lighting luminaires, 90W, IP65, outdoor use, as per IS 10322 (Part 5):2016."*
   → Primary match IS 10322 (Part 5/Sec 1):2023 at ~90%+ confidence · live supersession catch on the 2016 citation · graph reveals IS 16102-1 (test method), IS 60598-1 (safety), IS 1885 (Part 2) (terminology) · BIS Product Certification flagged mandatory.

2. **XLPE Power Cable**
   Input: *"XLPE insulated power cable, 11kV, outdoor underground use, armoured, as per IS 7098."*
   → Primary match IS 7098 (Part 1) · allied conductor test-method standard (IS 8130) surfaced via the graph · BIS CRS certification flagged mandatory.

3. **LV Switchgear Assembly**
   Input: *"Low-voltage switchgear assembly, indoor panel, 415V, type-tested enclosure."*
   → Primary match IS 13947 (Part 1) · allied earthing safety standard (IS 3043) surfaced · certification flagged voluntary (no compulsory order currently notified for this assembly class).

4. **Calibration / No Confident Match**
   A deliberately vague or out-of-category input → system asks a clarifying follow-up for the missing key attribute rather than guessing, demonstrating the confidence threshold working as designed rather than being silently ignored.

---

## 📡 API Contract Highlights

```
POST /api/analyze
  Request:  { "text": "LED street light, 90W, IP65, outdoor use" }
  Response: {
    "extracted": { "product": "...", "attributes": {...}, "application": "street" },
    "recommendations": [
      { "standard_id": "IS_10322_5_2023", "confidence": 92,
        "evidence": {...},
        "allied": [ { "standard_id": "IS_16102_1", "relation": "TEST_METHOD" }, ... ],
        "certification": [ { "scheme": "BIS_PRODUCT_CERT", "mandatory": true } ] }
    ]
  }

POST /api/upload                         multipart file → extracted text + analyze()
GET  /api/standards/{id}                 full standard record
GET  /api/standards/{id}/related         graph-expanded allied standards
POST /api/compliance/check               { standard_ids, tender_attributes } → { gaps, completeness_pct }
POST /api/tender/gaps                    full tender text → structured gap report
POST /api/report/generate                { analysis_id } → PDF/Word download URL
POST /api/feedback                       { recommendation_id, useful, note }
```

---

## 📊 Evaluation Framework

Hand-labelled benchmark of 20–30 realistic queries/tender excerpts, each tagged with the correct standard(s) and correct allied standards, run through three configurations:

| Method | Precision@3 | Recall@5 | MRR | Allied-standard recall |
|---|---|---|---|---|
| A. Keyword search (BM25 only) | *measure* | *measure* | *measure* | 0% — no traversal |
| B. Vector search only | *measure* | *measure* | *measure* | 0% — no traversal |
| C. Hybrid + rerank + graph (ours) | *measure* | *measure* | *measure* | *measure* |

*(Numbers above are placeholders by design — run the benchmark and report your team's actual measured results; never present fabricated numbers to evaluators.)*

Additional metrics: outdated-detection accuracy, certification-classification accuracy against the hand-verified rule set, and **hallucination rate** — the % of explanation text containing any standard ID not present in the evidence object (target: 0%, testable because the pipeline is closed-book by construction).

---

## 🔒 Data Sourcing & Legal Safeguards

- Metadata, title, scope summary, status, and amendment listings are sourced from **public** BIS catalogue listings and public tender/spec documents.
- **Never** scrape, store, or redistribute full copyrighted BIS standard text — only `metadata_and_scope_only` content.
- Never claim broader coverage than what is actually curated and verified; any field the team couldn't verify is explicitly marked `"unverified": true` rather than guessed.
- A `last_verified` timestamp on every record surfaces staleness instead of hiding it.

---

## 🛡️ Security & Government Readiness

| Area | Approach |
|---|---|
| Auth | JWT-based login, role-gated (officer / admin / viewer) |
| Document handling | Access scoped per uploading user, TTL-based deletion, no execution of embedded scripts/macros |
| Encryption | HTTPS in transit, encryption at rest via managed Postgres/disk defaults |
| Audit trail | `analyses` + `feedback` tables double as a queryable audit log |
| Prompt-injection protection | User text is always treated as data inside a schema-constrained prompt, never as instructions |
| API security | Rate limiting, Pydantic validation, ORM-only (no raw SQL string concatenation) |

---

## 🗺️ What We're Explicitly *Not* Building

Fine-tuning a custom LLM · a multi-agent orchestration framework · a from-scratch graph database or vector index · a "blockchain tender ledger" · 10+ microservices · full ingestion of the entire BIS catalogue. Each of these adds engineering risk or cost with no demo-visible benefit over the architecture above — see the blueprint for the full reasoning.

---

## 🎬 One-Sentence Product Vision

**SmartStandards-Engine turns "which Indian Standards apply here?" from a manual, error-prone keyword search into an explainable, graph-verified recommendation a procurement official can actually trust — because it shows its work, and the model is never allowed to invent a standard.**
