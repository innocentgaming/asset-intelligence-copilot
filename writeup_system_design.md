# System Design: Asset Intelligence Copilot
**Hacktoberfest 2026 Hack Day Pune &times; AI Hackers Collective**  
**Track:** Asset Intelligence Copilot Challenge &middot; Best Use of Gemma 4  
**Author:** Aditya Yadav &middot; Open-Source License: MIT  

---

## 1. Executive Summary & Problem Framing
In modern oilfield operations, mission-critical asset data is heavily fragmented across weekly drone/sensor inspections, maintenance work orders, free-text contractor job reports, regulatory enforcement notices, SOP manuals, and human tacit knowledge. Uncoordinated systems cause shut-ins and oil releases to linger unaddressed for weeks, creating catastrophic environmental damage, lost production, and severe regulatory penalties.

The **Asset Intelligence Copilot** engineers the middle agentic layer. It bridges structured sensor metrics and semi-structured documentation into an evidence-grounded conversational assistant powered by **Gemma 4** (`gemma-4-31b-it` / `gemma-4-26b-a4b-it` via the `google-genai` SDK) and an ultra-fast analytical verification engine, featuring **inline Generative UI** and **Two-Level Memory**.

---

## 2. High-Level Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 GENERATIVE UI FRONTEND                                       │
│   • Persona Switcher (Michael Turner, Jessica Reed, Tyler Hughes, Jake Morales, Laura)       │
│   • Inline Dynamic Visualizer: Status Cards, Tables, Line Charts, Bar Charts, GIS Maps, Heatmap │
│   • Grounded Evidence Drawer (File citations, protocol rule tags, conflict warning banners)   │
└──────────────────────────────────────────────▲───────────────────────────────────────────────┘
                                               │ JSON REST API (Streaming / SSE Ready)
┌──────────────────────────────────────────────▼───────────────────────────────────────────────┐
│                           FASTAPI AGENTIC MIDDLEWARE LAYER                                   │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                GEMMA 4 COPILOT AGENT                                   │  │
│  │   • Google GenAI SDK (gemma-4-31b-it / gemma-4-26b-a4b-it / gemini-2.5-flash)           │  │
│  │   • Reasoning System Prompts + SOP Domain Rules Context Injection                      │  │
│  │   • Intent Router & Visual Component Selector                                          │  │
│  └───────────────────────────────────────────▲────────────────────────────────────────────┘  │
│                                              │                                               │
│  ┌───────────────────────────────────────────┴────────────────────────────────────────────┐  │
│  │                         HYBRID ANALYTICAL REASONING ENGINE                             │  │
│  │   • Production Temp Calculator (T200: ΔT ≥ 15°C, T350: ΔT ≥ 20°C)                      │  │
│  │   • Downtime Ledger (7 days / non-producing inspection; ignores missed)                │  │
│  │   • SOP Auditor: SR-01 (24h report), SR-02 (4h containment), SR-03 (60d agency verif)  │  │
│  │   • Free-Text Report NLP Parser (Containment hours regex, compliance matrix)          │  │
│  │   • 2D Matrix Heatmap Aggregator & GIS Coordinate Resolver                             │  │
│  └───────────────────────────────────────────▲────────────────────────────────────────────┘  │
│                                              │                                               │
│  ┌───────────────────────────────────────────┴────────────────────────────────────────────┐  │
│  │                                 TWO-LEVEL MEMORY STORE                                 │  │
│  │   [SHARED KNOWLEDGE]                               [PRIVATE USER MEMORY]               │  │
│  │   • Raw Sensor Corrections (41.0°C)                 • Isolated Conversation Sessions   │  │
│  │   • AI Analysis Corrections (5.4 bbl)               • Entity References ("3 wells")    │  │
│  │   • Dynamic Type Rules (T350 RCA ≥ 2)               • Strict Cross-User Access Barrier │  │
│  │   • Operational Announcements & Discrepancy Logs                                       │  │
│  └───────────────────────────────────────────▲────────────────────────────────────────────┘  │
│                                              │                                               │
│  ┌───────────────────────────────────────────┴────────────────────────────────────────────┐  │
│  │                            DATA INGESTION & INDEXING ENGINE                            │  │
│  │   • 200 Wells Metadata, 39,600+ Inspections, 5,700+ Maintenance, 1,500+ Reports, SOPs │  │
│  │   • Dynamic Hot-Reload Endpoint (/api/reload-dataset) for 2-Hour Test Dataset Drop    │  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Storage, Indexing & Retrieval Architecture
1. **In-Memory Graph & Relational Inverted Index**: Rather than forcing flat SQL schemas or lossy vector approximations onto structured oilfield telemetry, the system implements a typed in-memory inverted index (`DataIndexer`):
   - **Entity Hierarchy**: Area $\rightarrow$ Production Team $\rightarrow$ Asset (Well) $\rightarrow$ Equipment Tree.
   - **Temporal Time Series**: Pre-indexed weekly inspection logs sorted by UTC timestamps with fast window slicing.
   - **Report Document Parser**: Corrective maintenance reports (`assets/WELL-XXXX/maintenance-reports/*.md`) are ingested into an extracted compliance index tracking actual containment hours, written notification hours, and protocol checklists (WS-01 to WS-07, SR-01 to SR-04).
2. **Hot-Reload Architecture for New Test Datasets**: The `/api/reload-dataset` endpoint supports instantaneous re-indexing of any newly provided folder matching the standard layout, executing full parsing in under 1.5 seconds.

---

## 4. Two-Level Memory Management

### Level 1: Shared Knowledge Vault
- **Dynamic Raw Data Corrections**: When an operator notes a sensor calibration error (e.g. Michael Turner correcting WELL-0164's thermal reading from 24.0°C to 41.0°C), the engine stores both the original reading, the corrected reading, author identity, and rationale. Future queries by **any user** immediately reflect the corrected state.
- **AI Estimation Corrections & Escalations**: When an AI-estimated spill volume is corrected (e.g. WELL-0151 updated from 4.5 bbl to 5.4 bbl), the system recalculates compliance tiers under SOP-SR Section 3, escalating the incident to *Reportable* and flagging missing 24-hour written regulatory filings.
- **Type-Scoped Domain Rules**: Custom rules (e.g. "T350 pump jack RCA triggered after 2 repairs instead of 3") are stored with strict type scope, affecting only T350 assets and leaving T200 assets governed by base manuals.

### Level 2: Private User Memory
- **Per-User Context Silos**: User conversational histories are partitioned by `user_id`. When Michael Turner asks about "the three wells we discussed yesterday", the private memory resolves the entity reference to `[WELL-0121, WELL-0138, WELL-0107]`.
- **Confidentiality & Privacy Enforcement**: If Jessica Reed submits the exact same query, the private memory layer identifies no prior conversation for Jessica and refuses to leak Michael Turner's context.

---

## 5. Honesty & Conflict Resolution Protocol
When human claims contradict physical inspection data or when notes disagree:
1. **Sensor Contradiction**: If an operator asserts *"WELL-0175 is running fine"*, the copilot checks the latest inspection (15 Oct, $\Delta T = 0.4^\circ\text{C}$). The copilot politely highlights the contradiction, cites the drone inspection evidence, logs the claim as *unconfirmed*, and asks the operator for verification.
2. **Note Disagreements**: In ambiguous incidents (e.g. WELL-0101: Ryan Brooks suspected produced water while Chris Dalton sampled crude), the copilot transparently reports both accounts, confirms that neither was a formal correction, and explains why maintenance executed a crude spill repair.

---

## 6. Generative UI Design System
Instead of monolithic markdown walls, the copilot generates component specifications rendered inline:
- **Status Cards**: Temperature gauge, $\Delta T$ above air, operating threshold, recorded status freshness badge.
- **Tables**: Sortable records with severity badges (Breach, Overdue, Out of Date).
- **Line Charts**: Interactive Chart.js time-series highlighting non-producing intervals.
- **Bar Charts**: Comparative downtime days and maintenance cost comparisons.
- **GIS Maps**: Leaflet maps with styled spill pins, volumes, and GPS coordinates.
- **2D Heatmaps**: 4 geographic blocks $\times$ 10 months color-scaled spill matrix.

---

## 7. Model Strategy, Cost & Performance
- **Primary Model**: Google Gemma 4 (`gemma-4-31b-it` / `gemma-4-26b-a4b-it`) via the `google-genai` SDK with reasoning.
- **Inference Cost**: $0.00 / query on AI Studio free tier; minimal token footprint due to deterministic analytical filtering prior to prompt injection.
- **Query Latency**: $\approx 15\text{ms}$ analytical retrieval + $\approx 350\text{ms}$ LLM generation.
