---
name: asset-intelligence-copilot
license: MIT
description: Autonomous oil & gas well asset intelligence copilot using Google Gemma 4 and deterministic SCADA telemetry analytics. Discovers producing anomalies via thermal gradient rules, tallies cumulative downtime ledgers, audits SOP containment breaches, resolves conflicting human notes, and serves generative UI visuals (status cards, tables, Recharts, GIS Leaflet maps, and 2D heatmaps).
metadata:
  version: 2.0.0
  publisher: FlytBase-AHC
  framework: Agent Skill Open Standard
  supported_models:
    - google/gemma-4-31b-it
    - google/gemma-4-9b-it
    - gemma4:31b (ollama)
    - gemma4:latest (ollama)
---

# Asset Intelligence Copilot Agent Skill

An open-standard Agent Skill designed for autonomous operational reasoning across oilfield telemetry, SCADA inspection logs, standard operating procedures (SOPs), and human field notes.

## 1. When to Activate This Skill
Activate this skill whenever a user or autonomous workflow requires:
1. Assessing the operational state of oil wells (producing vs. shut-in/down).
2. Calculating thermal gradient telemetry:
   $$\Delta T = T_{\text{wellhead}} - T_{\text{ambient}}$$
   against dynamic equipment manual limits ($15.0^\circ\text{C}$ for `T200`, $20.0^\circ\text{C}$ for `T350`).
3. Calculating cumulative downtime ledgering (7 days per non-producing inspection).
4. Geospatial incident mapping (GPS coordinate extraction for crude spills).
5. Regulatory compliance audits (e.g. `SOP-SR` 24h notification, 4h containment, 60d remediation).
6. Discrepancy arbitration between physical sensor readings and subjective human claims.
7. Generating interactive UI artifacts (Status cards, DataTables, Recharts time-series, Bar charts, Leaflet maps, and Matrix heatmaps).

---

## 2. Core Operational Rules & Decision-Making

### Rule 1: Thermal Delta & Dynamic Thresholding
- **Physics Principle:** A flowing well carries warm hydrocarbons from the reservoir, causing the wellhead temperature to exceed ambient air.
- **Formula:** $\Delta T = T_{\text{wellhead}} - T_{\text{ambient}}$.
- **Thresholds:**
  - `T200` type wells: $\Delta T \ge 15.0^\circ\text{C} \implies$ **Producing**; $\Delta T < 15.0^\circ\text{C} \implies$ **Not Producing**.
  - `T350` type wells: $\Delta T \ge 20.0^\circ\text{C} \implies$ **Producing**; $\Delta T < 20.0^\circ\text{C} \implies$ **Not Producing**.
- **Stale Status Warning:** If the database record says `active` but thermal reading $\Delta T < \text{threshold}$, flag recorded status as **out of date**.

### Rule 2: 7-Day Downtime Accounting
- Each weekly inspection where $\Delta T < \text{threshold}$ represents **exactly 7 days (1 week)** of outage.
- Consecutive non-producing inspections accumulate cumulatively (e.g. 3 consecutive down inspections = 21 days).
- Skipped weekly inspections add 0 days.

### Rule 3: Sensor False-Positive Exclusion
- Optical drone sensors may mistake pooled rainwater mixed with mud for crude oil.
- Cross-reference inspection notes (e.g. `CTX-0001-001` on `WELL-0001`). If confirmed as non-hydrocarbon runoff under Spill Response SOP Section 7, exclude from official spill counts and volume sums.

### Rule 4: Regulatory Compliance (SOP-SR)
- **Immediate Notification (SR-01):** Spills $\ge 5.0\text{ bbl}$ must be reported within 24 hours.
- **Secondary Containment (SR-02):** Surface releases must be contained within 4.0 hours.
- **Remediation Sign-Off (SR-03):** Soil remediation must be certified within 60 days.
- **Root Cause Analysis (RC-04):** Flowline or repeated mechanical failures mandate an RCA within 14 days.

### Rule 5: Cross-Operator Knowledge vs Privacy
- **Shared Knowledge:** Physical telemetry sensor corrections (e.g. $24.0 \rightarrow 41.0^\circ\text{C}$), SOP threshold adjustments, and field announcements propagate immediately fleet-wide.
- **Private Conversations:** Discussion entities, pronouns, and session history remain isolated strictly to the active operator persona.

---

## 3. Function & Tool Execution Schemas

This skill exposes 8 deterministic execution tools compatible with Gemma 4, Hermes Agent, and OpenAI-compatible tool calling:

```json
[
  {
    "name": "get_well_status",
    "description": "Assess current producing status from latest inspection thermal delta vs operating manual threshold.",
    "parameters": {
      "type": "object",
      "properties": {
        "well_id": { "type": "string", "description": "e.g. WELL-0001" }
      },
      "required": ["well_id"]
    }
  },
  {
    "name": "get_down_wells_in_area",
    "description": "List all wells in a block (e.g. 'Northeast Block 8') that are currently not producing.",
    "parameters": {
      "type": "object",
      "properties": {
        "area_name": { "type": "string" }
      },
      "required": ["area_name"]
    }
  },
  {
    "name": "get_well_temp_timeseries",
    "description": "Weekly wellhead vs ambient temperature history for N weeks with shut-in markers.",
    "parameters": {
      "type": "object",
      "properties": {
        "well_id": { "type": "string" },
        "weeks": { "type": "integer", "default": 13 }
      },
      "required": ["well_id"]
    }
  },
  {
    "name": "get_well_spills_history",
    "description": "Get confirmed spill history and total volume with false-positives filtered.",
    "parameters": {
      "type": "object",
      "properties": {
        "well_id": { "type": "string" }
      },
      "required": ["well_id"]
    }
  },
  {
    "name": "get_well_downtime_in_year",
    "description": "Calculate downtime days (7 days per inspection) and reasons for a year.",
    "parameters": {
      "type": "object",
      "properties": {
        "well_id": { "type": "string" },
        "year": { "type": "string", "default": "2025" }
      },
      "required": ["well_id"]
    }
  },
  {
    "name": "get_top_downtime_wells",
    "description": "Rank top wells in an area by cumulative downtime days over a window.",
    "parameters": {
      "type": "object",
      "properties": {
        "area_name": { "type": "string" },
        "start_date": { "type": "string" },
        "end_date": { "type": "string" },
        "top_n": { "type": "integer", "default": 3 }
      },
      "required": ["area_name"]
    }
  },
  {
    "name": "get_area_spills_map",
    "description": "Retrieve GPS coordinates, volumes, and dates for recent spills in an area.",
    "parameters": {
      "type": "object",
      "properties": {
        "area_name": { "type": "string" },
        "days": { "type": "integer", "default": 90 }
      },
      "required": ["area_name"]
    }
  },
  {
    "name": "get_spills_heatmap",
    "description": "2D matrix aggregation of spills by geographic block and calendar month.",
    "parameters": {
      "type": "object",
      "properties": {
        "year": { "type": "string", "default": "2026" }
      }
    }
  }
]
```

---

## 4. Running Gemma 4 Locally with Ollama

To execute this skill locally on edge devices or offline field workstations:

1. **Pull and Run Gemma 4 in Ollama:**
   ```bash
   ollama pull gemma4:31b
   ollama run gemma4:31b
   ```
   *(For edge hardware with $\le 16\text{ GB}$ VRAM, use `ollama run gemma4:9b` or `gemma4:e4b`)*.

2. **Configure Environment:**
   ```ini
   COPILOT_PRESET=ollama
   COPILOT_BASE_URL=http://localhost:11434/v1
   COPILOT_MODEL=gemma4:31b
   ```

3. **Start the Copilot Server:**
   ```bash
   python -m copilot.server --data ds/sample-data
   ```

---

## 5. Hermes Agent Harness Integration

This skill can be imported directly into the Hermes Agent harness (`hermes-agent`):
```python
from copilot.agent import Agent
from copilot.data import DataIndexer
from copilot.memory import MemoryManager

indexer = DataIndexer("ds/sample-data")
memory = MemoryManager()
copilot_agent = Agent(indexer=indexer, memory=memory)

# Multi-turn inquiry with citation chips and UI visual output
response = copilot_agent.run_query(
    user_name="Michael Turner",
    query="What is the current status of WELL-0001?"
)
print("Answer:", response["text_answer"])
print("Visual Type:", response["visual_type"])
print("Citations:", response["evidence_citations"])
```
