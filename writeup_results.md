# Evaluation Results & Analysis: Asset Intelligence Copilot
**Hacktoberfest 2026 Hack Day Pune &times; AI Hackers Collective**  
**Track:** Asset Intelligence Copilot Challenge &middot; Best Use of Gemma 4  
**Author:** Aditya Yadav &middot; Evaluation Date: 16 Oct 2026 &middot; Pass Rate: **18 / 18 (100%)**

---

## 1. Executive Performance Summary
The **Asset Intelligence Copilot** was tested against the 18 standardized benchmark scenarios provided in `03-evaluation-queries.md`. Every scenario was evaluated for:
1. **Factual Rigor**: Exact matching of well IDs, numbers, temperatures, barrel volumes, dollar costs, and dates.
2. **Evidence Grounding**: Specific citation of raw inspection IDs, maintenance logs, free-text reports, SOP protocols, and context notes.
3. **Generative UI Component Selection**: Choosing the right visual (status cards, tables, line charts, bar charts, maps, heatmaps) inline.
4. **Stateful Multi-User Memory**: Accurate cross-user knowledge sharing, type-scoped rule application, and strict private memory privacy barriers.

**Overall Result:** **18 of 18 Scenarios Passed with 100% Numerical & Structural Fidelity.**

---

## 2. Benchmark Evaluation Matrix (Q1 to Q18)

| ID | Persona | Query Focus | Visual Output | Citations | Pass / Fail |
|:---|:---|:---|:---|:---:|:---:|
| **Q1** | Michael Turner | WELL-0001 live producing status & inspector | `status_card` | `INS-0001-0203`, `OM-T200`, `CTX-0001-003` | **PASS (100%)** |
| **Q2** | Michael Turner | NE-08 non-producing wells table & causes | `table` | `fleet/areas.json`, `inspections.jsonl` | **PASS (100%)** |
| **Q3** | Michael Turner | WELL-0001 13-week thermal line chart | `line_chart` | `inspections.jsonl (13 readings)`, `OM-T200` | **PASS (100%)** |
| **Q4** | Michael Turner | WELL-0001 4-year spills audit & rainwater removal | `table` | `inspections.jsonl`, `CTX-0001-001`, `SOP-SR` | **PASS (100%)** |
| **Q5** | Michael Turner | WELL-0001 2025 downtime accounting (21 days) | `status_card` | `inspections.jsonl`, `MNT-0001-021`, `MNT-0001-023` | **PASS (100%)** |
| **Q6** | Michael Turner | NE-07 4-month top downtime ranking bar chart | `bar_chart` | `fleet/areas.json`, `inspections.jsonl` | **PASS (100%)** |
| **Q7** | Michael Turner | NE-08 recent real spills geospatial map | `map` | `fleet/areas.json`, 4 inspection records | **PASS (100%)** |
| **Q8** | Michael Turner | 2026 area &times; month 2D spill heatmap | `heatmap` | 4 geographic blocks &times; 10 months matrix | **PASS (100%)** |
| **Q9** | Michael Turner | WELL-0001 12-month rule breaches & open fines | `table` | `REG-0001-001..003`, `MNT-0001-029`, `SOP-SR` | **PASS (100%)** |
| **Q10** | Michael Turner | SW-24 4h containment limit breaches | `table` | `MNT-0082-028`, `MNT-0100-034`, `SOP-SR` | **PASS (100%)** |
| **Q11** | Michael Turner | Private memory recall: repair costs for Q6 wells | `bar_chart` | `MNT-0121`, `MNT-0138`, `MNT-0107` | **PASS (100%)** |
| **Q12** | Michael Turner | Raw sensor calibration correction (41.0°C) | `status_card` | `INS-0164-0205`, Shared Knowledge Store | **PASS (100%)** |
| **Q13** | Michael Turner | AI spill volume correction (5.4 bbl) & escalation | `table` | `INS-0151-0201`, `SOP-SR Section 3`, `SR-01` | **PASS (100%)** |
| **Q14** | Michael Turner | Custom team rule scoped to T350 wells only | `table` | `OM-T350`, Shared Knowledge Store | **PASS (100%)** |
| **Q15** | Jessica Reed | Shared correction propagation across users | `status_card` | Shared Knowledge Store (Correction by Michael) | **PASS (100%)** |
| **Q16** | Jessica Reed | Private user memory isolation enforcement | `table` | Private Memory Store (Isolation verified) | **PASS (100%)** |
| **Q17** | Tyler Hughes | Data contradiction honesty: operator vs sensors | `status_card` | `INS-0175-0205`, `OM-T200 Section 9.3` | **PASS (100%)** |
| **Q18** | Laura Simmons | Disputed spill investigation (water vs crude) | `table` | `INS-0101-0197`, `CTX-0101-002`, `CTX-0101-003` | **PASS (100%)** |

---

## 3. Deep-Dive Analysis on Critical Test Scenarios

### Scenario Q1: Temperature Production Rule & Stale Status Detection
- **Query**: *"Is WELL-0001 producing oil right now? When was it last inspected, and by whom? Show me its status card."*
- **Actual Finding**: Wellhead temperature was $22.4^\circ\text{C}$ against $19.2^\circ\text{C}$ ambient ($\Delta T = 3.2^\circ\text{C}$). Under OM-T200 Section 9.3, a T200 well requires $\Delta T \ge 15.0^\circ\text{C}$. The copilot correctly identified that the well is **not producing oil**, cited drone inspection `INS-0001-0203` (15 Oct 2026 by Ryan Brooks), and surfaced note `CTX-0001-003` explaining a planned shut-in for rod string replacement.
- **Integrity Check**: Correctly flagged that the recorded status `active` is out-of-date.

### Scenario Q4: False-Positive Detection Handling
- **Query**: *"How many oil spills has WELL-0001 had in the last 4 years, and how much oil in total? List them in a table."*
- **Actual Finding**: Identified 7 total sensor detections, but correctly eliminated `INS-0001-0070` (7 Mar 2024) because note `CTX-0001-001` verified it as rainwater mixed with soil. Outputted exactly **6 confirmed spills totaling 15.1 barrels** (0.5, 2.6, 3.3, 0.3, 6.8, and 1.6 bbl).

### Scenario Q8: Two-Dimensional Area &times; Month Heatmap
- **Query**: *"Show a heatmap of 2026 spills by geographic area and month."*
- **Actual Finding**: Successfully parsed across 200 wells and aggregated real spills from Jan to Oct 2026:
  - Southwest Block 23: `[4, 3, 3, 6, 3, 4, 4, 3, 3, 2]` $\rightarrow$ Total: **35**
  - Southwest Block 24: `[7, 4, 5, 6, 5, 5, 3, 1, 5, 2]` $\rightarrow$ Total: **43**
  - Northeast Block 7: `[5, 3, 2, 4, 6, 6, 2, 4, 4, 1]` $\rightarrow$ Total: **37**
  - Northeast Block 8: `[4, 4, 4, 3, 2, 4, 4, 0, 1, 0]` $\rightarrow$ Total: **26**

### Scenario Q10: Free-Text Repair Report Information Extraction
- **Query**: *"In Southwest Block 24, which spills in the last 90 days were not contained within the SOP time limit?"*
- **Actual Finding**: Containment times do not exist in tabular record fields. The copilot's regex/NLP report parser crawled the markdown reports and discovered:
  - `WELL-0082`: Contained after **about 7.1 hours** (`MNT-0082-028.md`).
  - `WELL-0100`: Contained after **about 8.1 hours** (`MNT-0100-034.md`).
  Both exceeded the 4-hour SR-02 limit and were rendered in a clear audit table.

### Scenarios Q11, Q15 & Q16: Two-Level Memory & Privacy Enforcement
- In **Q11**, Michael Turner referred to "the three wells we discussed yesterday". The copilot recalled `[WELL-0121, WELL-0138, WELL-0107]` and returned their 2026 repair costs: **$25,794**, **$46,942**, and **$5,176** (total $77,912).
- In **Q15**, Jessica Reed asked about WELL-0164 and received Michael Turner's corrected temperature ($41.0^\circ\text{C}$), proving shared knowledge propagation.
- In **Q16**, Jessica Reed asked "For the three wells we discussed yesterday...", and the copilot **refused to use Michael Turner's history**, correctly informing Jessica that she had no prior conversation on record.

### Scenario Q14: Scoped Domain Rule Adaptation
- Michael Turner introduced a team rule: *"Note for all T350 wells: our team now wants a pump jack root-cause analysis after 2 repairs, not 3."*
- When querying pump jack RCA candidates in NE-07:
  - `WELL-0108` (T350, 3 repairs) $\rightarrow$ Included
  - `WELL-0121` (T200, 3 repairs) $\rightarrow$ Included
  - `WELL-0138` (T350, 3 repairs) $\rightarrow$ Included
  - `WELL-0120` (T350, 2 repairs) $\rightarrow$ **Included** via Michael's rule
  - `WELL-0102` (T200, 2 repairs) $\rightarrow$ **Excluded** because rule scope is restricted to T350 wells.

### Scenario Q17: Sensor Contradiction Honesty
- When Tyler Hughes declared *"WELL-0175 is running fine"*, the copilot flagged that the 15 Oct inspection showed wellhead temperature only $0.4^\circ\text{C}$ above ambient ($< 15^\circ\text{C}$ threshold), confirmed it was shut-in, marked Tyler's claim as *unconfirmed*, and solicited operator verification.

---

## 4. Key Learnings & Future Directions
1. **Hybrid Architecture Superiority**: Pure LLM querying often hallucinates exact barrel sums or misses dates. Coupling Gemma 4 with a deterministic analytical retrieval layer guarantees 100% precision while preserving flexible conversational intelligence.
2. **Generative UI Engagement**: Interactive status gauges and dynamic maps provide operators with immediate situational awareness that textual paragraphs cannot match.
3. **Extensibility**: The architecture successfully decoupled ingestion from reasoning, ensuring effortless adaptation when the unannounced test dataset is released.
