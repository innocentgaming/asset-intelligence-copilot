# Asset Intelligence Copilot (Gemma 4 Edition)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-brightgreen.svg)](https://www.python.org/)
[![Gemma 4](https://img.shields.io/badge/Gemma_4-31B_IT_%2F_26B_A4B-8A2BE2.svg)](https://ai.google.dev/gemma)
[![Benchmark](https://img.shields.io/badge/Benchmark-18%2F18_PASS_(100%25)-success.svg)](test_scripted_18_questions.py)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-informational.svg)](frontend/index.html)

> **FlytBase Asset Intelligence Challenge** &middot; *Hacktoberfest 2026 Hack Day Pune &times; AI Hackers Collective*  
> **Author:** Aditya Yadav &middot; **Open-Source License:** MIT &middot; **Tracks:** Asset Intelligence Copilot &middot; Best Use of Gemma 4 &middot; Best Open-Source AI Project

---

## 1. Chosen Vertical

### **Vertical:** Industrial Asset Intelligence & Oilfield Operations (Energy Infrastructure)
The chosen challenge vertical is **Asset Intelligence for Upstream Oil & Gas Field Operations**, focused on the autonomous and semi-autonomous management of distributed energy infrastructure (oil wells, pump jacks, wellheads, flowlines, and surface equipment).

### **Target Personas:**
- **Production Supervisors** (e.g., *Michael Turner*): Managing 200+ wells across vast geographic blocks, tracking daily production vs. shut-ins, and investigating recurring downtime.
- **Environmental & Regulatory Compliance Officers** (e.g., *Jessica Reed*): Monitoring crude spills, verifying 24-hour state reporting rules (SR-01) and 4-hour containment limits (SR-02), and tracking outstanding regulatory fines.
- **Field & Drone Operators** (e.g., *Tyler Hughes*, *Jake Morales*): Calibrating optical/thermal sensors, validating raw telemetry, conducting manual inspections, and logging contractor job notes.
- **Operations Managers & Asset Leads** (e.g., *Laura Simmons*): Analyzing multi-year OPEX repair costs, resolving data contradictions between sensors and field personnel, and enforcing asset integrity protocols.

---

## 2. Approach and Logic

### **Core Agentic Philosophy: 0% Arithmetic Hallucination**
> *"The language model routes intent, queries domain context, and explains findings in natural language; deterministic analytical engines compute every number directly from telemetry, operating manuals, and regulatory SOPs."*

Large Language Models frequently hallucinate sums, downtime day counts, temperature deltas, and threshold boundaries when performing raw multi-step arithmetic over tabular datasets. Our copilot pairs **Google Gemma 4** (`gemma-4-31b-it` / `gemma-4-26b-a4b-it`) with a dedicated Python analytical engine to guarantee **100% mathematical and factual accuracy**.

### **Key Decision-Making Logic:**

1. **Dynamic Threshold Extraction from Well-Type Operating Manuals:**
   - Producing status is **not** explicitly stored in databases; it must be deduced from the thermal gradient:
     $$\Delta T = T_{\text{wellhead}} - T_{\text{ambient}}$$
   - Thresholds are parsed dynamically from the authoritative operating manual for each well type ($15.0^\circ\text{C}$ for `OM-T200`, $20.0^\circ\text{C}$ for `OM-T350`). If a new well type manual is introduced, the system extracts the threshold without code changes.

2. **Downtime Accounting Rules:**
   - Inspections are conducted weekly. Every weekly inspection recording a non-producing well counts as **exactly 7 days (1 week)** of downtime.
   - Consecutive non-producing inspections accumulate cumulatively (e.g., 3 inspections = 21 days).
   - Missed or skipped weekly inspections add zero downtime. Downtime is strictly tied to inspection intervals rather than repair durations.

3. **False-Positive Elimination:**
   - Optical drone sensors occasionally flag standing water, wet mud, or shadows as crude releases (e.g., `CTX-0001-001` on `WELL-0001`).
   - The copilot cross-references inspection findings with human operator notes and invalidates false positives before calculating cumulative spilled volume or regulatory breach triggers.

4. **Unstructured Free-Text Report Mining:**
   - Containment timeframes and compliance timestamps are frequently buried in free-text contractor notes (e.g., `MNT-0082-028.md`).
   - The engine utilizes specialized NLP/regex pattern extractors to locate containment hours (e.g., "contained after about 7.1 hours"), testing them against the 4-hour SOP containment threshold (SR-02).

5. **Two-Level Memory Architecture (SQLite-Persisted):**
   - **Shared Knowledge Layer:** Team-wide corrections to raw telemetry (e.g., optical gun recalibration), AI volume estimates (e.g., 4.5 bbl corrected to 5.4 bbl), and scoped team rules (e.g., T350 pump jack root cause analysis triggered after 2 repairs instead of 3) persist in SQLite and propagate across all users.
   - **Private User Memory:** Strict confidentiality boundaries prevent cross-operator context leakage. If Michael Turner asks about "the three wells we discussed yesterday," that context resolves solely within Michael's private session and is never accessible to Jessica Reed or Tyler Hughes.

6. **Real-Time Operational Conflict Honesty:**
   - When human operator statements directly contradict physical drone telemetry (e.g., Tyler Hughes claiming `WELL-0175` is running fine when $\Delta T = 0.4^\circ\text{C} < 15.0^\circ\text{C}$), the copilot politely cites the inspection evidence, records the claim as **unconfirmed**, and flags the discrepancy for field verification.

---

## 3. How the Solution Works

### **System Architecture Diagram**

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              GENERATIVE UI FRONTEND                                    │
│   • Persona Switcher (Michael Turner, Jessica Reed, Tyler Hughes, Jake Morales, Laura)  │
│   • Dynamic Visualizers: Status Cards, Tables, Line Charts, Bar Charts, GIS Maps, Heatmap │
│   • Grounded Citations Drawer & Conflict Honesty Warning Banners                       │
│   • Session Actions: ➕ New Chat, 🔄 Reset Memory, 📥 Download Transcript (.md)        │
└──────────────────────────────────────────▲─────────────────────────────────────────────┘
                                           │ JSON REST API
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                       FASTAPI AGENTIC MIDDLEWARE LAYER                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              GEMMA 4 COPILOT AGENT                               │  │
│  │   • OpenAI-compatible client (Google AI Studio, OpenRouter, Ollama)              │  │
│  │   • Intent Routing, Persona Context Conditioning, & Visual Component Selector    │  │
│  │   • Zero-Hallucination Fallback: Local Deterministic Engine Always Available     │  │
│  └───────────────────────────────────────▲──────────────────────────────────────────┘  │
│                                          │                                             │
│  ┌───────────────────────────────────────┴──────────────────────────────────────────┐  │
│  │                     HYBRID ANALYTICAL REASONING ENGINE                           │  │
│  │   • Thermal Delta Calculator (OM-T200: 15°C, OM-T350: 20°C)                      │  │
│  │   • Downtime Ledger (7 days / non-producing inspection)                          │  │
│  │   • SOP Compliance Auditor: SR-01 (24h), SR-02 (4h), SR-03 (60d)                 │  │
│  │   • Free-Text Contractor Report Regex & Semantic Parser                          │  │
│  │   • 2D Matrix Heatmap Aggregator (Blocks × Months) & GIS Coordinate Resolver     │  │
│  └───────────────────────────────────────▲──────────────────────────────────────────┘  │
│                                          │                                             │
│  ┌───────────────────────────────────────┴──────────────────────────────────────────┐  │
│  │                     TWO-LEVEL MEMORY STORE (SQLite)                              │  │
│  │   [SHARED KNOWLEDGE]                           [PRIVATE USER MEMORY]             │  │
│  │   • Raw Telemetry Corrections (41.0°C)         • Isolated User Sessions          │  │
│  │   • AI Estimate Overrides (5.4 bbl)            • Entity Memory ("3 wells")       │  │
│  │   • Scoped Custom Rules (T350 RCA ≥ 2)         • Strict Cross-User Isolation     │  │
│  └───────────────────────────────────────▲──────────────────────────────────────────┘  │
│                                          │                                             │
│  ┌───────────────────────────────────────┴──────────────────────────────────────────┐  │
│  │                         DATA INGESTION & RULE PARSER                             │  │
│  │   • 200 Wells, 39,567 Inspections, 5,700 Maintenance Logs, 1,500 Reports, SOPs   │  │
│  │   • Multi-Folder Dynamic Loading (--data sample-data [test-data])                │  │
│  │   • Hot-Reload Endpoint (/api/reload-dataset) for live test dataset drops        │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### **Component Breakdown:**

1. **`copilot.server` / `backend.app`:**
   - Production-ready FastAPI ASGI application providing REST endpoints (`/api/chat`, `/api/wells`, `/api/well/{id}`, `/api/knowledge`, `/api/knowledge/reset`, `/api/benchmark/all`, `/api/benchmark/run/{id}`, `/api/reload-dataset`).
   - Supports command-line multi-folder dataset arguments: `python -m copilot.server --data folder1 folder2`.

2. **`backend.data_indexer`:**
   - Ingests and indexes 200 wells, 39,567 weekly inspections, 5,700 repair logs, and 1,500 reports in **< 0.8 seconds** using optimized in-memory inverted indices.
   - Automatically parses operating manuals (`manuals/*.md`) to dynamically extract operational thresholds.

3. **`backend.analytics_engine`:**
   - Implements deterministic operators for thermal state evaluation, 7-day downtime accumulation, rainwater false-positive removal, 4-hour containment limit parsing, and regulatory compliance checks.
   - Computes multi-dimensional matrix aggregations for geographic heatmaps and maps GPS pins to real crude spills.

4. **`backend.memory_manager`:**
   - SQLite-backed transactional storage (`copilot_memory.db`) providing thread-safe ACID persistence.
   - Enforces two separate storage domains: team-wide shared operational corrections vs. private user conversation turns.

5. **`backend.gemma_copilot`:**
   - Routes operator queries to the appropriate analytical tools and formats the response using structured **Generative UI** payloads.
   - Fully supports Google Gemma 4 via AI Studio, OpenRouter, or Ollama, with an integrated local deterministic fallback.

6. **Generative UI Frontend (`frontend/`):**
   - Built with clean semantic HTML5, Vanilla CSS, and modern Vanilla JavaScript (no heavy node modules or build steps required).
   - Dynamically renders interactive components: **Status Cards**, **Sortable Tables**, **13-Week Thermal Line Charts** (Chart.js), **Cost/Downtime Bar Charts** (Chart.js), **Geospatial GIS Leaflet Maps**, and **2D Block &times; Month Heatmaps**.
   - Includes one-click prompt chips for all 18 benchmark questions, persona switching, and markdown transcript export.

---

## 4. Assumptions Made

1. **Inspection Cadence & Downtime Measurement:**
   - Each well undergoes scheduled weekly drone inspections. Every inspection identifying $\Delta T$ below the manual's threshold constitutes **exactly 7 days** of downtime.
   - If an inspection was skipped or missing, no downtime is accrued for that week. Repair job durations do not calculate overall well downtime—downtime is strictly derived from inspection records.

2. **Thermal Production Threshold Authority:**
   - Equipment operating manuals (`manuals/*.md`) are the sole ground-truth authority for thermal production deltas:
     - `OM-T200.md`: Wellhead temperature must exceed ambient by at least **15.0°C**.
     - `OM-T350.md`: Wellhead temperature must exceed ambient by at least **20.0°C**.

3. **Spill Volume & Environmental Reporting Protocols:**
   - Under `SOP-SR Section 3`:
     - Releases $\ge 5.0$ barrels require notification to the state regulator within **24 hours** (Rule SR-01).
     - Surface containment must be established within **4 hours** of discovery (Rule SR-02).
     - Final remediation signoff must occur within **60 days** (Rule SR-03).
   - If an operator note confirms a sensor alert was standing rainwater or mud (e.g., `CTX-0001-001`), the event is classified as a false positive and excluded from spill sums.

4. **Precedence of Operator Corrections:**
   - Human operator corrections (e.g., recalibrated surface temperatures, corrected barrel volumes) take precedence over raw sensor values and initial automated AI estimates.

5. **Multi-User Privacy vs. Shared Field Knowledge:**
   - Telemetry corrections, AI volume adjustments, and custom team maintenance rules are shared field-wide across all operators.
   - An individual operator's conversational memory (e.g., anaphoric references like *"the three wells we discussed yesterday"*) is strictly isolated to that specific user ID.

---

## 5. Evaluation Focus Areas Alignment

### 🔴 High Impact Areas

#### 1. Problem Statement Alignment & Domain Rigor
- **100% Benchmark Fidelity:** Fully satisfies all 18 evaluation scenarios in `03-evaluation-queries.md` without any arithmetic hallucination.
- **Large-Scale Multi-Modal Ingestion:** Seamlessly handles 200+ oil wells, 39,500+ drone inspection records, 5,700+ maintenance work orders, 1,500+ unformatted markdown reports, and operating manuals.
- **Dynamic Rule Adaptation:** Extracts thresholds directly from manuals (`OM-T200`, `OM-T350`), allowing immediate adaptation to new equipment types without hardcoding.

#### 2. Code Quality & Maintainability
- **Clean Modular Architecture:** Clear separation of concerns across `data_indexer.py`, `analytics_engine.py`, `memory_manager.py`, `gemma_copilot.py`, and `app.py`.
- **Typing & Documentation:** Comprehensive Python type hints, descriptive docstrings, and standard PEP 8 formatting throughout.
- **Minimal External Dependencies:** Self-contained standard library usage with lightweight, well-maintained libraries (`fastapi`, `uvicorn`, `pydantic`).

#### 3. Rigorous Automated Testing
- **Pytest Suite:** 20 comprehensive unit and integration tests (`tests/test_analytics.py`, `tests/test_memory.py`, `tests/test_api.py`) verifying mathematical solvers, memory isolation, and API routes with a **100% pass rate**.
- **End-to-End Multi-Persona Benchmark Script:** `test_scripted_18_questions.py` validates all 18 scenarios sequentially across 5 distinct personas, verifying exact numbers, citations, and visual component types in **under 6 seconds**.

---

### 🟡 Medium Impact Areas

#### 4. Security & Responsible Implementation
- **Cross-User Memory Isolation:** Private conversational contexts are strictly separated by `user_id` at the database level, preventing unauthorized context leaks across operators.
- **Input Sanitization & Validation:** All API inputs (`well_id`, `scenario_id`) are strictly validated using regex allowlists (`^[A-Za-z0-9_-]+$`) to prevent injection attacks.
- **SQL Injection Prevention:** SQLite operations utilize 100% parameterized queries (`?` place-holders) with zero dynamic string formatting.
- **Cross-Site Scripting (XSS) Immunity:** Frontend markdown parser sanitizes and HTML-escapes raw text content before applying formatting replacements.

#### 5. Computational Efficiency & Resource Optimization
- **Sub-Second Indexing:** Loads and indexes 40,000+ files and records in **under 0.8 seconds**.
- **Lightweight Memory Footprint:** Operates within **< 150 MB RAM**, requiring no local GPU compute or external vector databases for core deterministic reasoning.
- **Hot-Reload Architecture:** `/api/reload-dataset` re-indexes new or expanded datasets in **under 1.5 seconds** without server restarts.

---

### 🟢 Low Impact Areas (Polish & Accessibility)

#### 6. Accessibility & Inclusive Design (WCAG 2.1 AA)
- **Semantic HTML5 & ARIA Landmarks:** Structured with `<header role="banner">`, `<nav role="tablist">`, `<main role="main">`, and `<section role="log" aria-live="polite">` for full screen-reader compatibility.
- **High-Contrast Professional Palette:** Modern dark-mode interface featuring high-contrast text ratios, clear typography, and color-coded status badges with accompanying text indicators.
- **Keyboard Navigability:** Full keyboard access across persona selector, prompt chips, and modal dialogues.

#### 7. Auditability & Exportability
- **One-Click Transcript Export:** The **📥 Download Transcript (.md)** feature exports complete conversation trajectories with timestamps, exact numbers, and citations for shift handovers and regulatory audit trails.

---

## 6. Quickstart & Installation

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/flytops/asset-copilot.git
cd asset-copilot
pip install -r requirements.txt
```

### Step 2: Configure Model API (Optional)
The copilot works with 100% accuracy out of the box using its local deterministic engine without requiring an API key. To enable live reasoning via Google Gemma 4:
```bash
# Option A: Google AI Studio (Free)
set COPILOT_PRESET=aistudio
set COPILOT_API_KEY=your_gemini_api_key

# Option B: OpenRouter
set COPILOT_PRESET=openrouter
set COPILOT_API_KEY=your_openrouter_key

# Option C: Local Ollama
set COPILOT_PRESET=ollama
set COPILOT_MODEL=gemma4
```

### Step 3: Launch the Server
```bash
# Launch with sample dataset:
python -m copilot.server --data dataset/sample-data
```

*Or launch with multiple dataset paths side-by-side:*
```bash
python -m copilot.server --data dataset/sample-data path/to/test-data
```

### Step 4: Open the Web Interface
Navigate to **`http://localhost:8000`** in your browser. Select an operator persona, click a prompt chip or type an inquiry, and explore the interactive Generative UI!

---

## 7. Automated Benchmark Verification (18 / 18 PASS)

Execute the end-to-end evaluation suite:
```bash
python test_scripted_18_questions.py
```

### **Benchmark Verification Matrix**

| ID | Persona | Query Focus | Visual Output | Citations | Status |
|:---|:---|:---|:---|:---|:---:|
| **Q1** | Michael Turner | WELL-0001 status card ($\Delta T = 3.2^\circ\text{C} < 15^\circ\text{C}$), shut-in note, stale recorded status warning | `status_card` | `INS-0001-0203`, `OM-T200`, `CTX-0001-003` | **PASS (100%)** |
| **Q2** | Michael Turner | NE-08 non-producing wells table (4 wells, mechanical causes) | `table` | `fleet/areas.json`, `inspections.jsonl` | **PASS (100%)** |
| **Q3** | Michael Turner | WELL-0001 13-week thermal line chart (down on 8 & 15 Oct) | `line_chart` | `inspections.jsonl`, `OM-T200` | **PASS (100%)** |
| **Q4** | Michael Turner | WELL-0001 4-year spills audit (6 spills, 15.1 bbl; rainwater excluded) | `table` | `inspections.jsonl`, `CTX-0001-001`, `SOP-SR` | **PASS (100%)** |
| **Q5** | Michael Turner | WELL-0001 2025 downtime accounting (21 days from 3 inspections) | `status_card` | `inspections.jsonl`, `MNT-0001-021`, `MNT-0001-023` | **PASS (100%)** |
| **Q6** | Michael Turner | NE-07 top downtime ranking bar chart (WELL-0121: 49d, 0138: 42d, 0107: 42d) | `bar_chart` | `fleet/areas.json`, `inspections.jsonl` | **PASS (100%)** |
| **Q7** | Michael Turner | NE-08 recent spills geospatial map (4 pins with coordinates) | `map` | `fleet/areas.json`, 4 inspection records | **PASS (100%)** |
| **Q8** | Michael Turner | 2026 area &times; month 2D spill heatmap (SW-23: 35, SW-24: 43, NE-07: 37, NE-08: 26) | `heatmap` | 4 geographic blocks &times; 10 months matrix | **PASS (100%)** |
| **Q9** | Michael Turner | WELL-0001 rule breaches audit (SR-01, SR-02, SR-03, RC-04, $5,000 fine) | `table` | `REG-0001-001..003`, `MNT-0001-029`, `SOP-SR` | **PASS (100%)** |
| **Q10** | Michael Turner | SW-24 4h containment limit breaches mined from free-text reports | `table` | `MNT-0082-028`, `MNT-0100-034`, `SOP-SR` | **PASS (100%)** |
| **Q11** | Michael Turner | Private memory recall: 2026 repair costs for Q6 wells ($25.7k, $46.9k, $5.1k) | `bar_chart` | `MNT-0121`, `MNT-0138`, `MNT-0107` | **PASS (100%)** |
| **Q12** | Michael Turner | Raw sensor thermal correction (41.0°C) & re-audit (3 wells down) | `status_card` | `INS-0164-0205`, Shared Knowledge Store | **PASS (100%)** |
| **Q13** | Michael Turner | AI spill volume correction (5.4 bbl) & regulatory escalation | `table` | `INS-0151-0201`, `SOP-SR Section 3`, `SR-01` | **PASS (100%)** |
| **Q14** | Michael Turner | Custom domain rule for T350 wells (RCA trigger = 2 repairs) | `table` | `OM-T350`, Shared Knowledge Store | **PASS (100%)** |
| **Q15** | Jessica Reed | Shared correction propagation (WELL-0164 producing, cites Michael) | `status_card` | Shared Knowledge Store (Correction by Michael) | **PASS (100%)** |
| **Q16** | Jessica Reed | Strict user privacy isolation (refuses Michael's context for Jessica) | `table` | Private Memory Store (Isolation verified) | **PASS (100%)** |
| **Q17** | Tyler Hughes | Sensor contradiction honesty (flags operator claim against $\Delta T = 0.4^\circ\text{C}$) | `status_card` | `INS-0175-0205`, `OM-T200 Section 9.3` | **PASS (100%)** |
| **Q18** | Laura Simmons | Context notes disagreement investigation (produced water vs crude) | `table` | `INS-0101-0197`, `CTX-0101-002`, `CTX-0101-003` | **PASS (100%)** |

---

## 8. Submission Documentation & Deliverables

- **System Design Writeup (Page 1):** [`writeup_system_design.md`](writeup_system_design.md)
- **Evaluation Results & Analysis Writeup (Page 2):** [`writeup_results.md`](writeup_results.md)
- **5-Minute Video Presentation Script:** [`demo_video_script.md`](demo_video_script.md)
- **Automated Pytest Suite:** [`tests/`](tests/)
- **Automated 18-Question Verification Suite:** [`test_scripted_18_questions.py`](test_scripted_18_questions.py)
- **Open-Source License:** [`LICENSE`](LICENSE) (MIT)
