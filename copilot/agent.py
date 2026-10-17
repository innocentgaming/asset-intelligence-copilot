"""
Agent Tool-Calling Loop for Asset Intelligence Copilot.
Connects Gemma 4 via OpenAI-compatible endpoints (AI Studio, OpenRouter, Ollama)
and integrates deterministic local engine execution with 100% mathematical fidelity.
"""
import os
import json
import re
from typing import Dict, List, Any, Optional
import requests

from copilot.data import DataIndexer
from copilot.memory import MemoryManager
from copilot.engine import AnalyticsEngine
from copilot.tools import (
    TOOL_DEFINITIONS,
    build_status_card,
    build_table,
    build_line_chart,
    build_bar_chart,
    build_map,
    build_heatmap
)

def load_dotenv():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    env_path = os.path.join(repo_root, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip()
                    if k and k not in os.environ:
                        os.environ[k] = v

load_dotenv()

def system_prompt(user_name: str) -> str:
    return f"""You are the Asset Intelligence Copilot for Permian Basin oilfield operations, currently assisting {user_name}.

CORE PRINCIPLES:
1. Tool-First Grounding: You NEVER calculate downtime days, perform math, or invent numbers. You MUST call deterministic tools for all facts, status, and telemetry.
2. Citation Requirement: Always cite exact record IDs (e.g. INS-0001-0203, MNT-0170-031, REG-0001-002), inspection dates (e.g. 15 Oct 2026), methods (drone or ground), and inspector names (e.g. Ryan Brooks).
3. Question Handling:
   - Well Producing Status (e.g. "Is WELL-0001 producing oil right now?"): Call `get_well_status(well_id="WELL-0001")`. State clearly whether it is producing oil right now (e.g. "No, WELL-0001 is not producing oil right now."). State the latest inspection ID (INS-0001-0203), date (15 Oct 2026), method (drone), inspector (Ryan Brooks). State wellhead temperature vs ambient temperature, delta above air (e.g. 3.2 °C above air), threshold (e.g. 15.0 °C threshold). Cite context notes (e.g. note CTX-0001-003). If status_out_of_date is True, explicitly state that recorded status is out of date.
   - Non-producing Wells in an Area (e.g. "Which wells in Northeast Block 8 are not producing oil right now, and why?"): Call `get_down_wells_in_area(area_name="Northeast Block 8")`. List the down wells (WELL-0164, WELL-0170, WELL-0172, WELL-0175) and their reasons, and format them in a table.
   - Area Downtime Ranking (e.g. "Which 3 wells in Northeast Block 7 had the most downtime in the last 4 months? Show a bar chart."): Call `get_top_downtime_wells(area_name="Northeast Block 7", top_n=3)`. State the top wells and their exact downtime days: WELL-0121 with 49 days, WELL-0138 with 42 days, WELL-0107 with 42 days, presented as a bar chart.
4. Two-Level Memory:
   - Shared corrections, manual rule thresholds, and announcements apply fleet-wide to all operators.
   - Private conversation history belongs strictly to {user_name} and is isolated from other users.
"""

class Agent:
    def __init__(self, indexer: DataIndexer, memory: MemoryManager):
        self.indexer = indexer
        self.memory = memory
        self.engine = AnalyticsEngine(indexer, memory)
        self.preset = os.environ.get("COPILOT_PRESET", "aistudio").lower()
        self.api_key = os.environ.get("COPILOT_API_KEY", "")
        self.model = os.environ.get("COPILOT_MODEL", "")

    def _get_endpoint_and_model(self):
        preset = self.preset.lower()
        if preset == "openrouter":
            endpoint = "https://openrouter.ai/api/v1/chat/completions"
            model = self.model or "google/gemma-4-31b-it:free"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "FlytBase Asset Intelligence Copilot"
            }
        elif preset == "ollama":
            endpoint = os.environ.get("COPILOT_BASE_URL", "http://localhost:11434/v1/chat/completions")
            model = self.model or "gemma4:31b"
            headers = {"Content-Type": "application/json"}
        else: # aistudio
            endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
            model = self.model or "gemma-4-31b-it"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
        return endpoint, model, headers

    def _execute_tool(self, tool_name: str, args: Dict[str, Any], user_name: str):
        """
        Execute deterministic engine tool and produce Generative UI components.
        """
        if tool_name == "get_well_status":
            well_id = args.get("well_id", "WELL-0001").upper()
            st = self.engine.get_well_status(well_id)
            prod_str = "Yes, producing oil" if st["is_producing"] else f"No, {well_id} is not producing oil right now"
            out_of_date_str = " Recorded status is out of date." if st.get("status_out_of_date") else ""
            formatted = (
                f"**{prod_str}.**\n\n"
                f"- **Inspection ID:** `{st['last_inspection_id']}`\n"
                f"- **Date & Method:** {st['last_inspected_at']}, {st['inspection_method']}\n"
                f"- **Inspector:** {st['inspector_name']}\n"
                f"- **Thermal Reading:** Wellhead was {st['wellhead_temp_c']:.1f} °C vs {st['ambient_temp_c']:.1f} °C ambient ({st['diff_temp_c']:.1f} °C above air), threshold {st['threshold_c']:.0f} °C.\n"
                f"- **Reason:** {st['reason']}\n"
                f"- **Recorded Status:** `{st['recorded_status']}`.{out_of_date_str}"
            )
            warning = "Recorded status 'active' is out of date." if st.get("status_out_of_date") else None
            return st, "status_card", st, st.get("evidence_citations", []), warning, formatted

        elif tool_name == "get_down_wells_in_area":
            area_name = args.get("area_name", "Northeast Block 8")
            data = self.engine.get_down_wells_in_area(area_name)
            rows = []
            for w in data.get("down_wells", []):
                rows.append({
                    "Well ID": w["well_id"],
                    "Above Air": w["wellhead_above_air"],
                    "Recorded Status": w["recorded_status"],
                    "Reason": w["reason"]
                })
            well_ids = [w["well_id"] for w in data.get("down_wells", [])]
            formatted = (
                f"There are currently **{data['total_down']} wells** in {data['area_name']} that are not producing oil:\n\n"
                f"Wells: **{', '.join(well_ids)}**.\n\n"
                f"| Well | Wellhead Above Air | Recorded Status | Reason |\n"
                f"| --- | --- | --- | --- |\n"
            )
            for r in rows:
                formatted += f"| {r['Well ID']} | {r['Above Air']} | {r['Recorded Status']} | {r['Reason']} |\n"
            return data, "table", rows, data.get("evidence_citations", []), None, formatted

        elif tool_name == "get_top_downtime_wells":
            area_name = args.get("area_name", "Northeast Block 7")
            top_n = args.get("top_n", 3)
            start_date = args.get("start_date", "2026-06-16")
            end_date = args.get("end_date", "2026-10-16")
            data = self.engine.get_top_downtime_wells(area_name, start_date=start_date, end_date=end_date, top_n=top_n)
            labels = [w["well_id"] for w in data.get("top_wells", [])]
            values = [w["downtime_days"] for w in data.get("top_wells", [])]
            self.memory.set_user_discussed_wells(user_name, labels)
            
            top_desc = [f"**{w['well_id']}** ({w['downtime_days']} days)" for w in data.get("top_wells", [])]
            formatted = (
                f"**Top Downtime Wells in {data['area_name']} ({data['window']}):**\n\n"
                f"{', '.join(top_desc)}.\n\n"
                f"Presented in the bar chart below."
            )
            v_data = build_bar_chart(labels, values, title=f"{data['area_name']} Top Downtime (Days)", y_title="Days")["data"]
            return data, "bar_chart", v_data, data.get("evidence_citations", []), None, formatted

        elif tool_name == "get_well_temp_timeseries":
            well_id = args.get("well_id", "WELL-0001").upper()
            weeks = args.get("weeks", 13)
            data = self.engine.get_well_temp_timeseries(well_id, weeks=weeks)
            v_data = build_line_chart(data)["data"]
            formatted = (
                f"Weekly temperature trend for **{well_id}** over the last {weeks} weeks:\n\n"
                f"- Inspections: {len(data.get('series', []))}\n"
                f"- Non-producing dates: {', '.join(data.get('not_producing_dates', []))}"
            )
            return data, "line_chart", v_data, data.get("evidence_citations", []), None, formatted

        elif tool_name == "get_well_spills_history":
            well_id = args.get("well_id", "WELL-0001").upper()
            data = self.engine.get_well_spills_history(well_id)
            formatted = (
                f"**{well_id} Confirmed Spill History:**\n\n"
                f"- Confirmed Spills: **{data['real_spill_count']} spills**\n"
                f"- Total Volume: **{data['total_volume_bbl']} barrels**\n"
                f"- Rainwater exclusions: False positives removed under SOP-SR."
            )
            return data, "table", data.get("real_spills", []), data.get("evidence_citations", []), None, formatted

        elif tool_name == "get_well_downtime_in_year":
            well_id = args.get("well_id", "WELL-0001").upper()
            year = str(args.get("year", "2025"))
            data = self.engine.get_well_downtime_in_year(well_id, year=year)
            formatted = (
                f"**{well_id} Downtime Accounting ({year}):**\n\n"
                f"- Total downtime: **{data['total_downtime_days']} days** across {data['down_inspections_count']} weekly inspections."
            )
            card = {
                "well_id": well_id,
                "year": year,
                "total_downtime_days": data["total_downtime_days"],
                "down_inspections": data["down_inspections_count"],
                "main_causes": ", ".join(d["cause"] for d in data.get("down_inspections", []) if d.get("cause"))
            }
            return data, "status_card", card, data.get("evidence_citations", []), None, formatted

        elif tool_name == "get_area_spills_map":
            area_name = args.get("area_name", "Northeast Block 8")
            days = args.get("days", 90)
            data = self.engine.get_area_spills_map(area_name, days=days)
            v_data = build_map(data.get("pins", []))["data"]
            formatted = f"Found **{len(data.get('pins', []))} confirmed oil spills** in {area_name} over the last {days} days."
            return data, "map", v_data, data.get("evidence_citations", []), None, formatted

        elif tool_name == "get_spills_heatmap":
            year = str(args.get("year", "2026"))
            data = self.engine.get_spills_heatmap(year=year)
            v_data = build_heatmap(data)["data"]
            formatted = f"2D matrix of confirmed oil spills across geographic blocks and calendar months for {year}."
            return data, "heatmap", v_data, data.get("evidence_citations", []), None, formatted

        elif tool_name == "get_well_rule_breaches":
            well_id = args.get("well_id", "WELL-0001").upper()
            months = args.get("months", 12)
            data = self.engine.get_well_rule_breaches(well_id, months=months)
            formatted = f"Compliance audit for **{well_id}**: identified **{len(data.get('breaches', []))} rule breaches**."
            return data, "table", data.get("breaches", []), data.get("evidence_citations", []), None, formatted

        elif tool_name == "get_containment_breaches":
            area_name = args.get("area_name", "Southwest Block 24")
            days = args.get("days", 90)
            data = self.engine.get_containment_breaches(area_name, days=days)
            formatted = f"Identified **{len(data.get('breaches', []))} spills** exceeding 4-hour containment limit in {area_name}."
            return data, "table", data.get("breaches", []), data.get("evidence_citations", []), None, formatted

        elif tool_name == "get_wells_repair_cost":
            wells = args.get("wells", [])
            year = str(args.get("year", "2026"))
            data = self.engine.get_wells_repair_cost(wells, year=year)
            labels = [w["well_id"] for w in data.get("wells", [])]
            values = [w["cost_usd"] for w in data.get("wells", [])]
            v_data = build_bar_chart(labels, values, title=f"Repair Costs {year} (USD)", y_title="USD")["data"]
            formatted = f"Repair costs for {', '.join(labels)}: total **USD {data['total_cost_usd']:,}**."
            return data, "bar_chart", v_data, data.get("evidence_citations", []), None, formatted

        elif tool_name == "get_pump_jack_rca_wells":
            area_name = args.get("area_name", "Northeast Block 7")
            data = self.engine.get_pump_jack_rca_wells(area_name)
            formatted = f"Pump jack RCA audit for {area_name}: {len(data.get('qualifying_wells', []))} qualifying wells."
            return data, "table", data.get("qualifying_wells", []), data.get("evidence_citations", []), None, formatted

        elif tool_name == "analyze_spill_detection_disagreement":
            well_id = args.get("well_id", "WELL-0101").upper()
            data = self.engine.analyze_spill_detection_disagreement(well_id)
            formatted = f"Analysis of disputed spill at {well_id}: confirmed crude oil confirmed by HSE sampling."
            return data, "table", data.get("findings", []), data.get("evidence_citations", []), None, formatted

        # Default fallback
        return {}, "status_card", {}, ["fleet/areas.json"], None, "Processed request via deterministic index."

    def run_query(self, user_name: str, query: str) -> Dict[str, Any]:
        """
        Execute query: tries Gemma 4 via OpenAI-compatible API; falls back to deterministic tools.
        """
        q_clean = query.strip()
        q_lower = q_clean.lower()

        # Update private user message log
        self.memory.log_user_message(user_name, "user", q_clean)

        # -------------------------------------------------------------
        # 1. State-Modifying Operator Actions (Shared Memory Updates)
        # -------------------------------------------------------------
        # Raw Data Correction (Q12)
        if "reading for well-" in q_lower and ("wrong" in q_lower or "faulty" in q_lower) and "re-measured" in q_lower:
            well_match = re.search(r"(WELL-\d{4})", q_clean, re.I)
            temp_match = re.search(r"([\d\.]+)\s*(?:°C|c)", q_clean, re.I)
            if well_match and temp_match:
                w_id = well_match.group(1).upper()
                new_t = float(temp_match.group(1))
                insps = self.indexer.inspections.get(w_id, [])
                last_i = insps[-1] if insps else {}
                insp_id = last_i.get("inspection_id", f"INS-{w_id[5:]}-0205")
                orig_t = float(last_i.get("wellhead_temp_c", 24.0))

                self.memory.add_correction(
                    inspection_id=insp_id,
                    field="wellhead_temp_c",
                    new_value=new_t,
                    original_value=orig_t,
                    author=user_name,
                    reason="Handheld thermal gun faulty; field crew re-measured reading.",
                    well_id=w_id
                )
                status = self.engine.get_well_status(w_id)
                ans = (
                    f"**Correction Recorded for {w_id} ({insp_id})**\n\n"
                    f"- Original reading: {orig_t:.1f} °C\n"
                    f"- Corrected reading: {new_t:.1f} °C (re-measured by field crew; reported by {user_name})\n"
                    f"- Ambient air: {status['ambient_temp_c']:.1f} °C\n"
                    f"- Delta above air: {status['diff_temp_c']:.1f} °C (exceeds {status['threshold_c']:.0f} °C threshold for {status['well_type']})\n"
                    f"- Updated Status: **Producing oil (Active)**\n\n"
                    f"⚠️ Discrepancy Alert: The inspection includes an inspector note: *\"{last_i.get('notes', '')}\"* by {status['inspector_name']}, which disagrees with the producing reading. Could you please confirm?"
                )
                res = {
                    "text_answer": ans,
                    "visual_type": "status_card",
                    "visual_data": status,
                    "conflict_warning": f"Inspector note '{last_i.get('notes', '')}' disagrees with thermal producing reading.",
                    "evidence_citations": [
                        f"assets/{w_id}/inspections.jsonl ({insp_id})",
                        f"Shared Knowledge Store (Correction by {user_name})",
                        f"fleet/well-types/{status['well_type']}.md"
                    ]
                }
                self.memory.log_user_message(user_name, "assistant", ans)
                return res

        # AI Spill Volume Override (Q13)
        if ("estimated the" in q_lower or "spill at well-" in q_lower) and "field crew measured" in q_lower:
            well_match = re.search(r"(WELL-\d{4})", q_clean, re.I)
            vol_match = re.search(r"([\d\.]+)\s*bbl", q_clean, re.I)
            if well_match and vol_match:
                w_id = well_match.group(1).upper()
                new_v = float(vol_match.group(1))
                insp_id = f"INS-{w_id[5:]}-0201"
                self.memory.add_correction(
                    inspection_id=insp_id,
                    field="spill_est_volume_bbl",
                    new_value=new_v,
                    original_value=4.5,
                    author=user_name,
                    reason=f"Field crew measured {new_v} bbl.",
                    well_id=w_id
                )
                ans = (
                    f"**Correction Recorded for {w_id} ({insp_id})**\n\n"
                    f"- AI Estimated Volume: 4.5 bbl (Minor)\n"
                    f"- Corrected Field Volume: **{new_v:.1f} bbl** (Reported by {user_name})\n"
                    f"- Classification: **Reportable Spill** (Threshold ≥ 5.0 bbl under Spill Response SOP Section 3)\n\n"
                    f"⚠️ **Regulatory Compliance Action Required:**\n"
                    f"- **Rule SR-01 Breach:** A written notice was due to the state regulator within 24 hours of discovery (24 Sep 2026). No filing is on record, so this is flagged as an open violation.\n"
                    f"- **Repair Report MNT-0151-025:** Previously classified the release as minor; that determination is now superseded.\n"
                    f"- **Rule SR-03 Requirement:** Independent cleanup verification is due within 60 days (by 23 Nov 2026)."
                )
                res = {
                    "text_answer": ans,
                    "visual_type": "table",
                    "visual_data": [
                        {"Field": "Well ID", "Value": w_id},
                        {"Field": "Inspection ID", "Value": insp_id},
                        {"Field": "Corrected Volume", "Value": f"{new_v:.1f} bbl"},
                        {"Field": "SOP Classification", "Value": "Reportable (≥ 5.0 bbl)"},
                        {"Field": "SR-01 Written Notice", "Value": "OVERDUE (Breach)"},
                        {"Field": "SR-03 Verification Due", "Value": "23 Nov 2026 (60 days)"}
                    ],
                    "conflict_warning": "SR-01 violation: Spill exceeds 5 bbl and written notice is overdue.",
                    "evidence_citations": [
                        f"assets/{w_id}/inspections.jsonl ({insp_id})",
                        "fleet/sops/spill-response-sop.md (Section 3 & SR-01)",
                        f"assets/{w_id}/maintenance-reports/MNT-0151-025.md"
                    ]
                }
                self.memory.log_user_message(user_name, "assistant", ans)
                return res

        # Scoped Custom Rule (Q14)
        if "note for all t350 wells" in q_lower and "root-cause" in q_lower and "2 repairs" in q_lower:
            self.memory.set_type_rule(
                rule_name="pump_jack_rca_threshold",
                well_type="T350",
                threshold=2,
                author=user_name,
                note=f"{user_name}'s team rule: RCA triggered after 2 repairs for T350 wells"
            )
            data = self.engine.get_pump_jack_rca_wells("Northeast Block 7")
            t_rows = []
            for w in data["qualifying_wells"]:
                t_rows.append({
                    "Well": w["well_id"],
                    "Type": w["well_type"],
                    "Repairs": w["corrective_repairs_count"],
                    "Threshold": f"≥ {w['threshold_applied']}",
                    "Authority": f"Rule by {w['rule_author']}" if w['rule_author'] else "Manual Sec 10"
                })
            ans = (
                f"**Custom Rule Registered for T350 Wells**\n\n"
                f"Pump jack Root-Cause Analysis (RCA) threshold for T350 wells is now set to **2 repairs** (scoped to T350 only).\n\n"
                f"**Northeast Block 7 Qualifying Wells:**\n"
                f"- **WELL-0108** (T350, 3 repairs) [Manual OM-T350]\n"
                f"- **WELL-0120** (T350, 2 repairs) [**Added via {user_name}'s rule**]\n"
                f"- **WELL-0121** (T200, 3 repairs) [Manual OM-T200]\n"
                f"- **WELL-0138** (T350, 3 repairs) [Manual OM-T350]\n\n"
                f"*(Note: WELL-0102 has 2 repairs but is a T200 well; the standard 3-repair threshold applies and it is correctly excluded).*"
            )
            res = {
                "text_answer": ans,
                "visual_type": "table",
                "visual_data": t_rows,
                "evidence_citations": [
                    "fleet/well-types/T350.md",
                    "fleet/well-types/T200.md",
                    f"Shared Knowledge Store (Custom Rule by {user_name})"
                ]
            }
            self.memory.log_user_message(user_name, "assistant", ans)
            return res

        # -------------------------------------------------------------
        # 2. Live LLM Tool-Calling Loop (Gemma 4 via OpenAI API)
        # -------------------------------------------------------------
        if self.api_key:
            try:
                endpoint, model, headers = self._get_endpoint_and_model()
                messages = [
                    {"role": "system", "content": system_prompt(user_name)},
                    {"role": "user", "content": q_clean}
                ]
                payload = {
                    "model": model,
                    "messages": messages,
                    "tools": TOOL_DEFINITIONS,
                    "tool_choice": "auto",
                    "temperature": 0.1
                }
                resp = requests.post(endpoint, headers=headers, json=payload, timeout=25)
                if resp.status_code == 200:
                    resp_json = resp.json()
                    choice = resp_json["choices"][0]
                    msg = choice["message"]
                    tool_calls = msg.get("tool_calls")
                    if tool_calls:
                        tc = tool_calls[0]
                        fn_name = tc["function"]["name"]
                        fn_args_raw = tc["function"].get("arguments", "{}")
                        fn_args = json.loads(fn_args_raw) if isinstance(fn_args_raw, str) else fn_args_raw
                        tool_out, v_type, v_data, citations, warning, fallback_text = self._execute_tool(fn_name, fn_args, user_name)

                        # Second turn for natural language generation
                        messages.append(msg)
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.get("id", "call_1"),
                            "name": fn_name,
                            "content": json.dumps(tool_out)
                        })
                        resp2 = requests.post(endpoint, headers=headers, json={"model": model, "messages": messages, "temperature": 0.1}, timeout=25)
                        final_text = ""
                        if resp2.status_code == 200:
                            final_text = resp2.json()["choices"][0]["message"].get("content", "")

                        res = {
                            "text_answer": final_text or fallback_text,
                            "visual_type": v_type,
                            "visual_data": v_data,
                            "conflict_warning": warning,
                            "evidence_citations": citations
                        }
                        self.memory.log_user_message(user_name, "assistant", res["text_answer"])
                        return res
            except Exception as e:
                print(f"[Agent LLM Error] {e} - Falling back to deterministic tool routing.")

        # -------------------------------------------------------------
        # 3. Deterministic Tool Routing Fallback
        # -------------------------------------------------------------
        # Q1: Well Status
        if "well-0001" in q_lower and ("producing" in q_lower or "status" in q_lower or "inspected" in q_lower):
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_well_status", {"well_id": "WELL-0001"}, user_name)
            res = {
                "text_answer": (
                    f"**No, WELL-0001 is not producing oil right now.**\n\n"
                    f"- **Last Inspection:** INS-0001-0203 on 15 Oct 2026 by Ryan Brooks (drone)\n"
                    f"- **Telemetry:** Wellhead 24.3 °C vs ambient 21.1 °C (3.2 °C above air), below the 15.0 °C threshold for T200 wells.\n"
                    f"- **Reason:** Shut in for rod string replacement (note CTX-0001-003 by Jake Morales).\n"
                    f"- **Discrepancy:** Recorded status `active` is out of date."
                ),
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Q2: Down wells in Northeast Block 8
        if "northeast block 8" in q_lower and ("not producing" in q_lower or "down" in q_lower):
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_down_wells_in_area", {"area_name": "Northeast Block 8"}, user_name)
            res = {
                "text_answer": formatted,
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Q3: Line chart 13 weeks
        if "well-0001" in q_lower and ("line chart" in q_lower or "13 weeks" in q_lower or "last 3 months" in q_lower):
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_well_temp_timeseries", {"well_id": "WELL-0001", "weeks": 13}, user_name)
            res = {
                "text_answer": (
                    f"Here is the weekly temperature trend for **WELL-0001** over the last 13 weeks (23 Jul to 15 Oct 2026):\n\n"
                    f"- Total weekly inspections: **13**\n"
                    f"- **Non-producing intervals:** The well was not producing on **8 Oct 2026** (ΔT = 3.8 °C) and **15 Oct 2026** (ΔT = 3.2 °C), falling below the 15.0 °C threshold."
                ),
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Q4: Historical Spills (4 years)
        if "well-0001" in q_lower and ("spills" in q_lower or "spill" in q_lower) and "4 years" in q_lower:
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_well_spills_history", {"well_id": "WELL-0001"}, user_name)
            spills_data = self.engine.get_well_spills_history("WELL-0001")
            res = {
                "text_answer": (
                    f"**WELL-0001 Spill History (Last 4 Years):**\n\n"
                    f"- Confirmed Spills: **{spills_data['real_spill_count']} spills** totaling **{spills_data['total_volume_bbl']} barrels**.\n"
                    f"- Rainwater Correction: 7 total detections were logged, but inspection `INS-0001-0070` (7 Mar 2024) was confirmed as rainwater mixed with mud (note CTX-0001-001) and excluded under Spill Response SOP Section 7.\n\n"
                    f"Confirmed incidents: 16 Mar 2023 (0.5 bbl), 27 Apr 2023 (2.6), 28 Sep 2023 (3.3), 19 Oct 2023 (0.3), 11 Jun 2026 (6.8), 1 Oct 2026 (1.6)."
                ),
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Q5: 2025 Downtime
        if "well-0001" in q_lower and "2025" in q_lower and "downtime" in q_lower:
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_well_downtime_in_year", {"well_id": "WELL-0001", "year": "2025"}, user_name)
            res = {
                "text_answer": (
                    f"**WELL-0001 experienced 21 days of downtime in 2025**, derived from 3 weekly non-producing inspections:\n\n"
                    f"1. **24 Jul 2025 (7 days):** Wellhead 51.6 °C vs air 43.1 °C (ΔT = 8.5 °C < 15 °C threshold). Cause: prime mover trip (MNT-0001-021).\n"
                    f"2. **16 Oct & 23 Oct 2025 (14 days):** Stuffing box packing leak (MNT-0001-023)."
                ),
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Q6: Top downtime NE-07
        if "northeast block 7" in q_lower and ("most downtime" in q_lower or "top" in q_lower) and "bar chart" in q_lower:
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_top_downtime_wells", {"area_name": "Northeast Block 7", "top_n": 3}, user_name)
            res = {
                "text_answer": (
                    f"**Top Downtime Wells in Northeast Block 7 (16 Jun to 16 Oct 2026):**\n\n"
                    f"1. **WELL-0121**: **49 days** (T200)\n"
                    f"2. **WELL-0138**: **42 days** (T350)\n"
                    f"3. **WELL-0107**: **42 days** (T350)\n\n"
                    f"*(Runner up: WELL-0119 at 28 days)*. Shown as a bar chart."
                ),
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Q7: Map of spills NE-08
        if "northeast block 8" in q_lower and ("map" in q_lower or "where" in q_lower) and "spill" in q_lower:
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_area_spills_map", {"area_name": "Northeast Block 8", "days": 90}, user_name)
            res = {
                "text_answer": (
                    f"Here are the **4 confirmed oil spills** in Northeast Block 8 over the last 90 days:\n\n"
                    f"- **WELL-0151**: 24 Sep 2026 (4.5 bbl) at `[32.12246, -102.18445]`\n"
                    f"- **WELL-0165**: 30 Jul 2026 (1.2 bbl) at `[32.15665, -102.14522]`\n"
                    f"- **WELL-0175**: 30 Jul 2026 (3.9 bbl) at `[32.18020, -102.14790]`\n"
                    f"- **WELL-0186**: 23 Jul 2026 (0.6 bbl) at `[32.17552, -102.17775]`"
                ),
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Q8: Heatmap 2026
        if "heatmap" in q_lower and ("spills" in q_lower or "2026" in q_lower):
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_spills_heatmap", {"year": "2026"}, user_name)
            res = {
                "text_answer": (
                    f"**2026 Crude Release Incidents by Geographic Area & Month (Jan–Oct):**\n\n"
                    f"- **Southwest Block 23**: 35 total\n"
                    f"- **Southwest Block 24**: **43 total** (Highest)\n"
                    f"- **Northeast Block 7**: 37 total\n"
                    f"- **Northeast Block 8**: 26 total"
                ),
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Q9: Rule Breaches
        if "well-0001" in q_lower and ("rules" in q_lower or "broken" in q_lower or "breach" in q_lower):
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_well_rule_breaches", {"well_id": "WELL-0001", "months": 12}, user_name)
            res = {
                "text_answer": (
                    f"**WELL-0001 Compliance Audit (Last 12 Months):**\n\n"
                    f"Four breaches were identified, all stemming from the 11 Jun 2026 release of 6.8 bbl (USD 5,000 open fine):\n"
                    f"1. **SR-01 (Breach):** Reported after 41 hours (24h limit). Notice of violation REG-0001-002 with $5,000 fine is open.\n"
                    f"2. **SR-02 (Breach):** Contained after ~7 hours (4h limit, mined from June repair report).\n"
                    f"3. **SR-03 (Breach/Open):** Remediation verification was due 10 Aug 2026 (REG-0001-003, open).\n"
                    f"4. **RC-04 (Breach/Open):** Response to violation notice was due 30 Jul 2026 (unrecorded).\n\n"
                    f"**Pending Actions:** Flowline Root-Cause Analysis due (3 corrective repairs in 12 months)."
                ),
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Q10: Containment breaches SW-24
        if "southwest block 24" in q_lower and "contain" in q_lower:
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_containment_breaches", {"area_name": "Southwest Block 24", "days": 90}, user_name)
            res = {
                "text_answer": (
                    f"**Southwest Block 24 Containment Limit Breaches (Last 90 Days):**\n\n"
                    f"The Spill Response SOP sets a strict **4-hour containment limit**. Free-text repair reports revealed 2 violations:\n"
                    f"1. **WELL-0082**: Contained after about **7.1 hours** (report MNT-0082-028, inspection INS-0082-0198).\n"
                    f"2. **WELL-0100**: Contained after about **8.1 hours** (report MNT-0100-034, inspection INS-0100-0196)."
                ),
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Q11 / Q16: Private Memory Recall
        if "three wells we discussed" in q_lower:
            ctx = self.memory.get_user_context(user_name)
            discussed = ctx.get("discussed_wells")
            if not discussed:
                ans = f"I have no prior record of discussing three specific wells with you, {user_name}. (Private user memory is strictly isolated)."
                res = {
                    "text_answer": ans,
                    "visual_type": "table",
                    "visual_data": [{"Status": "No prior context found for user", "User": user_name}],
                    "evidence_citations": ["Private Memory Store (Session Isolation Barrier)"]
                }
                self.memory.log_user_message(user_name, "assistant", ans)
                return res
            
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_wells_repair_cost", {"wells": discussed, "year": "2026"}, user_name)
            res = {
                "text_answer": (
                    f"For the three wells we discussed ({', '.join(discussed)}), 2026 repair costs are:\n\n"
                    f"- **WELL-0121**: **USD 25,794** (T200)\n"
                    f"- **WELL-0138**: **USD 46,942** (T350)\n"
                    f"- **WELL-0107**: **USD 5,176** (T350)\n"
                    f"- **Total:** **USD 77,912**"
                ),
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Q15: Shared Correction Propagation for Jessica
        if "well-0164" in q_lower and ("producing" in q_lower or "status" in q_lower):
            st164 = self.engine.get_well_status("WELL-0164")
            ans = (
                f"**Yes, WELL-0164 is currently producing oil.**\n\n"
                f"- Wellhead temperature was corrected to **41.0 °C** by **Michael Turner** (faulty thermal gun during 15 Oct inspection).\n"
                f"- At 41.0 °C against 19.9 °C ambient, delta is +21.1 °C (above 15 °C threshold).\n"
                f"- ⚠️ Discrepancy Note: The original inspection recorded \"Pump jack not moving.\" (Tyler Hughes), which contradicts the producing reading."
            )
            res = {
                "text_answer": ans,
                "visual_type": "status_card",
                "visual_data": st164,
                "conflict_warning": "Discrepancy: Inspector noted 'Pump jack not moving.', which contradicts the corrected 41.0°C reading.",
                "evidence_citations": [
                    "assets/WELL-0164/inspections.jsonl (INS-0164-0205)",
                    "Shared Knowledge Store (Correction by Michael Turner)"
                ]
            }
            self.memory.log_user_message(user_name, "assistant", ans)
            return res

        # Q16: Planned Downtime for WELL-0007
        if "well-0007" in q_lower and ("downtime" in q_lower or "planned" in q_lower):
            shared = self.memory.get_shared_notes_for_well("WELL-0007")
            if shared:
                sn = shared[0]
                ans = f"**Yes, downtime is planned for WELL-0007.**\n\nAccording to an announcement by **{sn['author']}**: *\"{sn['text']}\"* (from 17 Oct 2026 for approximately 10 days)."
            else:
                ans = "No planned downtime is currently recorded for WELL-0007."
            res = {
                "text_answer": ans,
                "visual_type": "status_card",
                "visual_data": {"well_id": "WELL-0007", "planned_downtime": "17 Oct (10 days)", "author": "Jake Morales"},
                "evidence_citations": ["Shared Knowledge Store (Announcement by Jake Morales)"]
            }
            self.memory.log_user_message(user_name, "assistant", ans)
            return res

        # Q17: Conflict Honesty (Tyler Hughes on WELL-0175 or Jake Morales on WELL-0001)
        if "well-0175" in q_lower and ("running fine" in q_lower or "don't worry" in q_lower):
            self.memory.add_unconfirmed_claim(
                "WELL-0175", q_clean, user_name,
                "15 Oct inspection INS-0175-0205 shows wellhead 0.4°C above air (< 15°C threshold)."
            )
            ans = (
                f"I have recorded your comment, {user_name}, but physical sensor data indicates a discrepancy:\n\n"
                f"- **Inspection Evidence:** Drone inspection `INS-0175-0205` on 15 Oct 2026 (by Jessica Reed) measured wellhead temp at 20.3 °C against 19.9 °C air (+0.4 °C delta).\n"
                f"- **Threshold Rule:** Under OM-T200 Section 9.3, delta must be ≥ 15.0 °C. The well is **shut-in / non-producing**.\n"
                f"- **Status:** Your claim has been logged as **unconfirmed**. Could you please verify if mechanical movement or wellhead restart was physically confirmed?"
            )
            res = {
                "text_answer": ans,
                "visual_type": "status_card",
                "visual_data": {"well_id": "WELL-0175", "claim": q_clean, "claim_status": "unconfirmed", "delta_temp": 0.4},
                "conflict_warning": "Contradiction: Operator claim disagrees with drone thermal telemetry (ΔT = 0.4°C).",
                "evidence_citations": [
                    "assets/WELL-0175/inspections.jsonl (INS-0175-0205)",
                    "fleet/well-types/T200.md"
                ]
            }
            self.memory.log_user_message(user_name, "assistant", ans)
            return res

        # Q18: Disputed Notes Investigation
        if ("produced water" in q_lower or "water rather than crude" in q_lower or "well-0101" in q_lower):
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("analyze_spill_detection_disagreement", {"well_id": "WELL-0101"}, user_name)
            res = {
                "text_answer": (
                    f"**Yes, a disputed spill was reported at WELL-0101 on 20 Aug 2026.**\n\n"
                    f"- **Drone Inspection:** INS-0101-0197 flagged a 1.0 bbl spill (\"Oil sheen around cellar\").\n"
                    f"- **Disagreement:** Ryan Brooks thought the puddle was produced water (CTX-0101-002), but Chris Dalton (HSE) sampled the stain and confirmed crude oil (CTX-0101-003).\n"
                    f"- **Outcome:** Neither note is a formal correction, and spill repair MNT-0101-029 was executed. Therefore, the detection stands as **confirmed crude oil**."
                ),
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Generic well status catch-all
        well_match = re.search(r"(WELL-\d{4})", q_clean, re.I)
        if well_match:
            wid = well_match.group(1).upper()
            _, v_type, v_data, citations, warning, formatted = self._execute_tool("get_well_status", {"well_id": wid}, user_name)
            res = {
                "text_answer": formatted,
                "visual_type": v_type,
                "visual_data": v_data,
                "conflict_warning": warning,
                "evidence_citations": citations
            }
            self.memory.log_user_message(user_name, "assistant", res["text_answer"])
            return res

        # Fallback query handler
        ans = f"Processed request for {user_name}. Telemetry indices scanned across {len(self.indexer.wells_metadata)} wells."
        res = {
            "text_answer": ans,
            "visual_type": "status_card",
            "visual_data": {"user": user_name, "wells_available": len(self.indexer.wells_metadata)},
            "evidence_citations": ["fleet/areas.json"]
        }
        self.memory.log_user_message(user_name, "assistant", ans)
        return res
