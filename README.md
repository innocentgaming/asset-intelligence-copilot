# Asset Intelligence Copilot (Gemma 4 Edition)
**Hacktoberfest 2026 Hack Day Pune &times; AI Hackers Collective**  
**Challenge:** Asset Intelligence Copilot Challenge (FlytBase)  
**Tracks:** Asset Intelligence Copilot · Best Use of Gemma 4 · Best Open-Source AI Project  
**Author:** Aditya Yadav · License: MIT  

---

## Overview

Modern oilfield operations generate vast, scattered data: weekly drone inspections, SCADA thermal readings, maintenance work orders, free-text contractor job reports, regulatory violation notices, environmental SOP manuals, and human tacit knowledge. A stopped or leaking well often goes unnoticed for weeks, causing lost production, environmental damage, and crippling fines.

The **Asset Intelligence Copilot** is an evidence-grounded agentic assistant powered by **Google Gemma 4** (`gemma-4-31b-it` / `gemma-4-26b-a4b-it`) and a deterministic hybrid analytical engine. It delivers exact factual answers across 200+ oil wells, complete with clickable citations, dynamic inline Generative UI, stateful Two-Level Memory (SQLite-persisted), and real-time conflict honesty.

> **Core Philosophy:** *The language model routes and explains; deterministic tools compute every number from the data, manuals, and SOPs.* That keeps answers exact with 0% arithmetic hallucination, even on a small open model and on unseen datasets.

---

## Key Features

1. **Deterministic Analytical Rigor & Dynamic Rule Parsing**
   - **Production Status:** Evaluates temperature difference ($\Delta T = \text{Wellhead} - \text{Ambient}$) against thresholds dynamically parsed directly from well-type manuals ($15.0^\circ\text{C}$ for T200, $20.0^\circ\text{C}$ for T350).
   - **Downtime Accounting:** Evaluates 7 days per non-producing weekly inspection in any temporal window.
   - **False-Positive Removal:** Automatically excludes sensor false positives verified as rainwater (e.g. `CTX-0001-001`).
   - **Free-Text Report Mining:** Extracts containment hours, reporting deadlines, and protocol compliance directly from unformatted contractor markdown reports.

2. **Inline Generative UI Component Suite**
   - **Status Cards:** Real-time producing state, thermal delta gauge, and stale recorded status warnings.
   - **Interactive Tables:** Sortable compliance audits, down-well lists, and repair tracking.
   - **Time-Series Line Charts:** 13-week thermal curves with non-producing intervals highlighted.
   - **Comparative Bar Charts:** Downtime rankings and year-to-date maintenance costs.
   - **GIS Mapping:** Leaflet-powered maps pinning verified crude releases with GPS coordinates.
   - **2D Heatmaps:** Multi-dimensional matrix comparing geographic blocks across calendar months.

3. **Two-Level Memory (SQLite-Persisted)**
   - **Shared Knowledge Layer:** Team-wide corrections to raw sensor telemetry (e.g. thermal gun calibration) and AI estimations (e.g. 4.5 bbl to 5.4 bbl) are immediately reflected for all users. Custom team rules apply strictly within their well-type scope (e.g. T350 pump jack RCA threshold reduced to 2 repairs).
   - **Private User Memory:** Strict confidentiality barrier between operators. Inquiries like *"For the three wells we discussed yesterday..."* resolve solely from that user's private history and are never leaked to other users.

4. **Honesty & Operational Conflict Resolution**
   - When an operator's claim contradicts physical drone sensor readings (e.g. Tyler claiming WELL-0175 is running fine while inspection reads $\Delta T = 0.4^\circ\text{C}$), the copilot politely cites the inspection evidence, records the claim as **unconfirmed**, and flags the discrepancy.
   - When context notes disagree (e.g. WELL-0101 water vs crude), both sources are presented transparently.

5. **Hot-Reload Architecture for Test Dataset Drops**
   - Loads multiple dataset folders side-by-side (`--data sample-data test-data`) with zero code changes.
   - `/api/reload-dataset` hot-reloads 40,000+ inspections and manuals in under 1.5 seconds.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              GENERATIVE UI FRONTEND                                    │
│   • Persona Switcher (Michael Turner, Jessica Reed, Tyler Hughes, Jake Morales, Laura)  │
│   • Inline Visualizers: Status Cards, Tables, Line Charts, Bar Charts, GIS Maps, Heatmap │
│   • Session Toolbar: New Chat, Reset Memory, Download Transcript (.md)                 │
└──────────────────────────────────────────▲─────────────────────────────────────────────┘
                                           │ JSON REST API
┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
│                       FASTAPI AGENTIC MIDDLEWARE LAYER                                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              GEMMA 4 COPILOT AGENT                               │  │
│  │   • OpenAI-compatible client (AI Studio, OpenRouter, Ollama)                     │  │
│  │   • Google GenAI SDK integration (gemma-4-31b-it)                                │  │
│  │   • Intent Routing & Component Selector                                          │  │
│  └───────────────────────────────────────▲──────────────────────────────────────────┘  │
│                                          │                                             │
│  ┌───────────────────────────────────────┴──────────────────────────────────────────┐  │
│  │                     HYBRID ANALYTICAL REASONING ENGINE                           │  │
│  │   • Thermal Delta Calculator (OM-T200, OM-T350)                                  │  │
│  │   • Downtime Ledger (7 days / non-producing inspection)                          │  │
│  │   • SOP Auditor: SR-01 (24h report), SR-02 (4h containment), SR-03 (60d agency)  │  │
│  │   • Free-Text Report Regex/NLP Parser                                            │  │
│  └───────────────────────────────────────▲──────────────────────────────────────────┘  │
│                                          │                                             │
│  ┌───────────────────────────────────────┴──────────────────────────────────────────┐  │
│  │                     TWO-LEVEL MEMORY STORE (SQLite)                              │  │
│  │   [SHARED KNOWLEDGE]                           [PRIVATE USER MEMORY]             │  │
│  │   • Raw Sensor Corrections (41.0°C)             • Isolated Session History       │  │
│  │   • AI Analysis Corrections (5.4 bbl)           • Context Entities ("3 wells")   │  │
│  │   • Type Rules (T350 RCA >= 2)                  • Privacy Isolation Barrier      │  │
│  └───────────────────────────────────────▲──────────────────────────────────────────┘  │
│                                          │                                             │
│  ┌───────────────────────────────────────┴──────────────────────────────────────────┐  │
│  │                         DATA INGESTION & RULE PARSER                             │  │
│  │   • 200 Wells, 39,567 Inspections, 5,700 Maintenance, 1,500 Reports, SOPs       │  │
│  │   • Multi-Folder side-by-side loading (--data sample-data [test-data])           │  │
│  │   • Dynamic rule extraction from manuals (temperature thresholds)                │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Quickstart & Installation

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/flytops/asset-copilot.git
cd asset-copilot
pip install -r requirements.txt
```

### 2. Configure Model API (Optional)
The copilot runs deterministically with 100% accuracy out of the box even without an API key. To enable live reasoning calls via Gemma 4:
```bash
# Option A: Google AI Studio (Free)
set COPILOT_PRESET=aistudio
set COPILOT_API_KEY=AIzaSy...

# Option B: OpenRouter
set COPILOT_PRESET=openrouter
set COPILOT_API_KEY=sk-or-v1-...

# Option C: Local Ollama
set COPILOT_PRESET=ollama
set COPILOT_MODEL=gemma4
```

### 3. Launch Server
```bash
python -m copilot.server --data dataset/sample-data
```
*Or with an additional test dataset folder:*
```bash
python -m copilot.server --data dataset/sample-data path/to/test-data
```

### 4. Open in Browser
Visit **`http://localhost:8000`**, choose a persona, and start asking!

---

## Automated Evaluation Suite (18 / 18 Pass Rate)

To run the complete automated test suite validating all 18 benchmark scenarios from `03-evaluation-queries.md`:

```bash
python test_scripted_18_questions.py
```

| ID | Persona | Query Focus | Visual Output | Factual Match |
|:---|:---|:---|:---|:---:|
| **Q1** | Michael Turner | WELL-0001 status card, $\Delta T = 3.2^\circ\text{C} < 15^\circ\text{C}$, planned shut-in note | `status_card` | **PASS (100%)** |
| **Q2** | Michael Turner | NE-08 non-producing wells table (4 wells, mechanical causes) | `table` | **PASS (100%)** |
| **Q3** | Michael Turner | WELL-0001 13-week thermal line chart (down on 8 & 15 Oct) | `line_chart` | **PASS (100%)** |
| **Q4** | Michael Turner | WELL-0001 4-year spills audit (6 spills, 15.1 bbl; rainwater excluded) | `table` | **PASS (100%)** |
| **Q5** | Michael Turner | WELL-0001 2025 downtime accounting (21 days from 3 inspections) | `status_card` | **PASS (100%)** |
| **Q6** | Michael Turner | NE-07 top downtime ranking bar chart (WELL-0121: 49d, 0138: 42d, 0107: 42d) | `bar_chart` | **PASS (100%)** |
| **Q7** | Michael Turner | NE-08 recent spills geospatial map (4 pins with coordinates) | `map` | **PASS (100%)** |
| **Q8** | Michael Turner | 2026 area &times; month 2D spill heatmap (SW-23: 35, SW-24: 43, NE-07: 37, NE-08: 26) | `heatmap` | **PASS (100%)** |
| **Q9** | Michael Turner | WELL-0001 rule breaches audit (SR-01, SR-02, SR-03, RC-04, $5,000 fine) | `table` | **PASS (100%)** |
| **Q10** | Michael Turner | SW-24 4h containment limit breaches mined from free-text reports | `table` | **PASS (100%)** |
| **Q11** | Michael Turner | Private memory recall: 2026 repair costs for Q6 wells ($25.7k, $46.9k, $5.1k) | `bar_chart` | **PASS (100%)** |
| **Q12** | Michael Turner | Raw sensor thermal correction (41.0°C) & re-audit (3 wells down) | `status_card` | **PASS (100%)** |
| **Q13** | Michael Turner | AI spill volume correction (5.4 bbl) & regulatory escalation | `table` | **PASS (100%)** |
| **Q14** | Michael Turner | Custom domain rule for T350 wells (RCA trigger = 2 repairs) | `table` | **PASS (100%)** |
| **Q15** | Jessica Reed | Shared correction propagation (WELL-0164 producing, cites Michael) | `status_card` | **PASS (100%)** |
| **Q16** | Jessica Reed | Strict user privacy isolation (refuses Michael's context for Jessica) | `table` | **PASS (100%)** |
| **Q17** | Tyler Hughes | Sensor contradiction honesty (flags operator claim against $\Delta T = 0.4^\circ\text{C}$) | `status_card` | **PASS (100%)** |
| **Q18** | Laura Simmons | Context notes disagreement investigation (produced water vs crude) | `table` | **PASS (100%)** |

---

## Submission Deliverables

- **System Design Writeup (Page 1):** [`writeup_system_design.md`](writeup_system_design.md)
- **Evaluation Results Writeup (Page 2):** [`writeup_results.md`](writeup_results.md)
- **5-Minute Video Walkthrough Script:** [`demo_video_script.md`](demo_video_script.md)
- **MIT License:** [`LICENSE`](LICENSE)
