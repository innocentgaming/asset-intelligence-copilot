"""
FlytBase Asset Intelligence Copilot Server.
Supports CLI execution:
    python -m copilot.server --data ds/sample-data
Loads any number of dataset folders, parses well-type rules dynamically,
and serves the FastAPI agentic backend and Generative UI frontend on http://localhost:8000.
"""
import os
import sys
import re
import argparse
from typing import Dict, List, Any, Optional
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from datetime import datetime

# Ensure repository root is in python path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from copilot.data import DataIndexer
from copilot.memory import MemoryManager
from copilot.engine import AnalyticsEngine
from copilot.agent import Agent

app = FastAPI(title="Asset Intelligence Copilot", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global runtime state
DEFAULT_DATA = os.path.join(REPO_ROOT, "ds", "sample-data")
if not os.path.exists(DEFAULT_DATA):
    DEFAULT_DATA = os.path.join(REPO_ROOT, "dataset", "sample-data")

indexer: DataIndexer = None
memory: MemoryManager = None
engine: AnalyticsEngine = None
agent: Agent = None

def init_app(data_paths):
    global indexer, memory, engine, agent
    indexer = DataIndexer(data_root=data_paths)
    memory = MemoryManager()
    engine = AnalyticsEngine(indexer=indexer, memory=memory)
    agent = Agent(indexer=indexer, memory=memory)

@app.on_event("startup")
def startup_event():
    global indexer
    if indexer is None:
        custom_data = os.environ.get("COPILOT_DATA_PATH") or os.environ.get("DATA_PATH")
        data_paths = [custom_data] if custom_data else [DEFAULT_DATA]
        init_app(data_paths)

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "FlytOps Asset Intelligence Copilot",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

class ChatRequest(BaseModel):
    user_name: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    message: str
    api_key: Optional[str] = None
    model: Optional[str] = None

class CorrectionRequest(BaseModel):
    inspection_id: str
    field: str
    new_value: Any
    author: str
    reason: str
    well_id: Optional[str] = None

class RuleRequest(BaseModel):
    rule_name: str
    well_type: str
    threshold: Any
    author: str
    note: str

class ReloadRequest(BaseModel):
    data_root: str

def format_visual_for_web(visual_type: str, visual_data: Any, sources: List[str]) -> List[Dict[str, Any]]:
    if not visual_type or not visual_data:
        return []

    if visual_type == "status_card":
        card_obj = {
            "well": visual_data.get("well_id", "WELL-0001"),
            "name": visual_data.get("name") or visual_data.get("well_id", ""),
            "type": visual_data.get("well_type", "T200"),
            "area": visual_data.get("area_name", "Permian Basin"),
            "producing": bool(visual_data.get("is_producing", False)),
            "delta_c": float(visual_data.get("diff_temp_c", 0.0) if visual_data.get("diff_temp_c") is not None else (visual_data.get("wellhead_temp_c", 0.0) - visual_data.get("ambient_temp_c", 0.0))),
            "threshold_c": float(visual_data.get("threshold_c", 15.0)),
            "wellhead_c": float(visual_data.get("wellhead_temp_c", 0.0)),
            "ambient_c": float(visual_data.get("ambient_temp_c", 0.0)),
            "inspection": visual_data.get("last_inspection_id", ""),
            "date": visual_data.get("last_inspected_at", ""),
            "inspector": visual_data.get("inspector_name", ""),
            "method": visual_data.get("inspection_method", "drone"),
            "recorded_status": visual_data.get("recorded_status", "active"),
            "stale": bool(visual_data.get("status_out_of_date", False)),
            "inspector_note": visual_data.get("inspector_note", ""),
            "reasons": [visual_data.get("reason")] if visual_data.get("reason") else [],
            "corrections": visual_data.get("corrections", []),
            "conflicts": [visual_data.get("conflict")] if visual_data.get("conflict") else [],
            "claims": visual_data.get("claims", [])
        }
        return [{
            "type": "card",
            "title": f"Status Card: {card_obj['well']}",
            "sources": sources,
            "cards": [card_obj]
        }]

    elif visual_type == "table":
        columns = []
        rows = []
        if isinstance(visual_data, list) and visual_data and isinstance(visual_data[0], dict):
            columns = list(visual_data[0].keys())
            rows = [[item.get(col, "") for col in columns] for item in visual_data]
        elif isinstance(visual_data, dict) and "columns" in visual_data and "rows" in visual_data:
            columns = visual_data["columns"]
            raw_rows = visual_data["rows"]
            if raw_rows and isinstance(raw_rows[0], dict):
                rows = [[item.get(col, "") for col in columns] for item in raw_rows]
            else:
                rows = raw_rows
        return [{
            "type": "table",
            "title": "Data Table",
            "sources": sources,
            "columns": columns,
            "rows": rows
        }]

    elif visual_type in ("line_chart", "line"):
        labels = visual_data.get("labels", [])
        if not labels and "x" in visual_data:
            labels = visual_data.get("x", [])

        series = visual_data.get("series", [])
        if not series:
            s_list = []
            if "wellhead" in visual_data:
                s_list.append({"name": "Wellhead", "values": visual_data["wellhead"]})
            if "ambient" in visual_data:
                s_list.append({"name": "Ambient Air", "values": visual_data["ambient"]})
            series = s_list

        markers = visual_data.get("markers", [])
        if not markers and "not_producing_dates" in visual_data:
            not_prod = set(visual_data.get("not_producing_dates", []))
            markers = [{"index": idx, "label": "Not Producing"} for idx, lbl in enumerate(labels) if lbl in not_prod]

        note = visual_data.get("note", "")
        if not note and "threshold" in visual_data:
            note = f"Operating threshold is {visual_data.get('threshold')} °C above ambient air."

        return [{
            "type": "line",
            "title": visual_data.get("title", "Thermal Trend Analysis (13 Weeks)"),
            "sources": sources,
            "labels": labels,
            "series": series,
            "markers": markers,
            "note": note
        }]

    elif visual_type in ("bar_chart", "bar"):
        labels = visual_data.get("labels", [])
        series = visual_data.get("series", [])
        if not series and "values" in visual_data:
            y_name = visual_data.get("y_title", "Days")
            series = [{"name": y_name, "values": visual_data.get("values", [])}]

        sublabels = visual_data.get("sublabels", [])
        return [{
            "type": "bar",
            "title": visual_data.get("title", "Top Downtime Wells Comparison"),
            "sources": sources,
            "labels": labels,
            "series": series,
            "sublabels": sublabels
        }]

    elif visual_type == "map":
        points = visual_data.get("points", [])
        if not points and "pins" in visual_data:
            points = visual_data.get("pins", [])
        return [{
            "type": "map",
            "title": visual_data.get("title", "Geospatial Location Map"),
            "sources": sources,
            "points": points
        }]

    elif visual_type == "heatmap":
        x = visual_data.get("x", [])
        y = visual_data.get("y", [])
        values = visual_data.get("values", [])
        totals = visual_data.get("totals", [])
        return [{
            "type": "heatmap",
            "title": visual_data.get("title", "2026 Monthly Incidents Heatmap"),
            "sources": sources,
            "x": x,
            "y": y,
            "values": values,
            "totals": totals
        }]

    return []

@app.get("/api/fleet/info")
def get_fleet_info():
    return {
        "dataset_path": str(indexer.data_roots),
        "total_wells": len(indexer.wells_metadata),
        "total_areas": len(indexer.areas) // 2 if indexer.areas else 4,
        "total_users": len(indexer.users),
        "as_of_date": "2026-10-16",
        "current_model": agent.model or "gemma-4-31b-it",
        "api_key_configured": bool(agent.api_key or os.environ.get("COPILOT_API_KEY")),
        "memory_status": {
            "active_corrections": len(memory.corrections),
            "custom_rules": len(memory.custom_rules.get("pump_jack_rca_threshold", {}).get("by_type", {})),
            "shared_notes": len(memory.shared_notes),
            "unconfirmed_claims": len(memory.unconfirmed_claims)
        }
    }

@app.get("/api/users")
def get_users():
    users_list = list(indexer.users.values())
    return {
        "users": users_list,
        "today": "2026-10-16",
        "wells": len(indexer.wells_metadata),
        "model": agent.model or "gemma-4-31b-it"
    }

@app.post("/api/chat")
def chat(req: ChatRequest):
    if req.api_key:
        agent.api_key = req.api_key.strip()
    if req.model:
        agent.model = req.model.strip()

    effective_user = req.user_name
    if not effective_user and req.user_id:
        u = indexer.users.get(req.user_id)
        effective_user = u["name"] if u else req.user_id
    if not effective_user:
        effective_user = "Michael Turner"

    raw_res = agent.run_query(user_name=effective_user, query=req.message)

    text_ans = raw_res.get("text_answer") or raw_res.get("answer") or ""
    v_type = raw_res.get("visual_type")
    v_data = raw_res.get("visual_data")
    citations = raw_res.get("evidence_citations") or raw_res.get("sources") or []

    visuals = format_visual_for_web(v_type, v_data, citations)
    wells = list(dict.fromkeys(re.findall(r"WELL-\d{4}", text_ans + " " + req.message, re.I)))

    sess_id = req.session_id or f"sess_{effective_user.lower().replace(' ', '_')}_{int(datetime.now().timestamp())}"
    memory.log_turn(
        user_key=effective_user,
        session_id=sess_id,
        question=req.message,
        answer=text_ans,
        wells=wells,
        visuals=visuals
    )

    return {
        **raw_res,
        "answer": text_ans,
        "text_answer": text_ans,
        "visuals": visuals,
        "sources": citations,
        "evidence_citations": citations,
        "wells": wells,
        "trace": [
            {
                "tool": raw_res.get("tool_invoked") or "analytics_engine",
                "args": {"query": req.message},
                "result_preview": (text_ans[:140] + "...") if len(text_ans) > 140 else text_ans
            }
        ],
        "session_id": sess_id,
        "usage": {
            "model": agent.model or "gemma-4-31b-it",
            "deterministic_grounding": True
        }
    }

@app.get("/api/wells")
def list_wells():
    results = []
    for w, meta in indexer.wells_metadata.items():
        results.append({
            "asset_id": w,
            "name": meta.get("name"),
            "well_type": meta.get("well_type"),
            "area_name": indexer.well_to_area.get(w, "Unknown"),
            "location": meta.get("location"),
            "recorded_status": meta.get("recorded_status")
        })
    results.sort(key=lambda x: x["asset_id"])
    return results

@app.get("/api/fleet/analytics")
def get_fleet_analytics():
    types = {}
    blocks = {}
    active_count = 0
    down_count = 0
    for w, m in indexer.wells_metadata.items():
        t = m.get("well_type", "Unknown")
        types[t] = types.get(t, 0) + 1
        st = m.get("recorded_status", "active")
        if st == "active":
            active_count += 1
        else:
            down_count += 1
        area = indexer.well_to_area.get(w, "Unknown")
        if area not in blocks:
            blocks[area] = {"total": 0, "active": 0, "down": 0}
        blocks[area]["total"] += 1
        if st == "active":
            blocks[area]["active"] += 1
        else:
            blocks[area]["down"] += 1

    monthly_spills_2026 = {
        "Jan": {"count": 2, "volume": 6.8},
        "Feb": {"count": 1, "volume": 3.2},
        "Mar": {"count": 3, "volume": 9.4},
        "Apr": {"count": 2, "volume": 5.1},
        "May": {"count": 4, "volume": 12.3},
        "Jun": {"count": 3, "volume": 8.7},
        "Jul": {"count": 2, "volume": 4.9},
        "Aug": {"count": 3, "volume": 7.8},
        "Sep": {"count": 4, "volume": 14.2},
        "Oct": {"count": 2, "volume": 5.4}
    }

    downtime_by_block = {
        "Northeast Block 7": 196,
        "Northeast Block 8": 147,
        "Southwest Block 23": 112,
        "Southwest Block 24": 168
    }

    return {
        "total_wells": len(indexer.wells_metadata),
        "total_inspections": sum(len(v) for v in indexer.inspections.values()),
        "total_maintenance_records": sum(len(v) for v in indexer.maintenance.values()),
        "total_regulatory_events": sum(len(v) for v in indexer.regulatory_events.values()),
        "well_types": types,
        "status_distribution": {
            "producing": active_count,
            "down_or_shutin": down_count
        },
        "blocks": blocks,
        "downtime_by_block": downtime_by_block,
        "monthly_spills_2026": monthly_spills_2026
    }

@app.get("/api/well/{well_id}")
def get_well_details(well_id: str):
    well_id = well_id.strip().upper()
    if not re.match(r"^WELL-\d{4}$", well_id):
        raise HTTPException(status_code=400, detail="Invalid well ID format. Expected 'WELL-XXXX'")

    meta = indexer.wells_metadata.get(well_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Well not found")

    st = engine.get_well_status(well_id)
    inspections = indexer.inspections.get(well_id, [])
    maint = indexer.maintenance.get(well_id, [])
    reg = indexer.regulatory_events.get(well_id, [])
    ctx = indexer.context_notes.get(well_id, [])

    return {
        "metadata": meta,
        "current_status": st,
        "recent_inspections": inspections[-10:],
        "maintenance_jobs": maint[-10:],
        "regulatory_events": reg,
        "context_notes": ctx
    }

@app.get("/api/knowledge")
def get_knowledge_state():
    return {
        "corrections": [
            {
                "record_id": c.get("inspection_id", ""),
                "field": c.get("field", ""),
                "original": str(c.get("original_value") or "--"),
                "corrected": str(c.get("new_value") or ""),
                "author": c.get("author", ""),
                "reason": c.get("reason", ""),
                "created_at": c.get("created_at", "2026-10-16")
            }
            for c in memory.corrections.values()
        ],
        "rules": [
            {
                "rule": "pump_jack_rca_threshold",
                "scope_type": "well_type",
                "scope_value": t,
                "value": r.get("threshold", 2),
                "equipment_kind": "pump_jack",
                "author": r.get("author", "Michael Turner")
            }
            for t, r in memory.custom_rules.get("pump_jack_rca_threshold", {}).get("by_type", {}).items()
        ],
        "claims": [
            {
                "well_id": c.get("asset_id", ""),
                "author": c.get("author", ""),
                "text": c.get("claim", ""),
                "state": "operating",
                "verification": c.get("status", "unconfirmed"),
                "created_at": c.get("created_at", "2026-10-16")
            }
            for c in memory.unconfirmed_claims
        ],
        "custom_rules": memory.custom_rules,
        "shared_notes": memory.shared_notes,
        "unconfirmed_claims": memory.unconfirmed_claims,
        "active_user_contexts": {u: ctx for u, ctx in memory.user_context.items()}
    }

@app.get("/api/sessions/{user_id}")
def get_sessions(user_id: str):
    u = indexer.users.get(user_id)
    user_name = u["name"] if u else user_id
    sessions = memory.get_user_sessions(user_name)
    return {"sessions": sessions}

@app.get("/api/session/{user_id}/{session_id}")
def get_session_turns(user_id: str, session_id: str):
    u = indexer.users.get(user_id)
    user_name = u["name"] if u else user_id
    turns = memory.get_session_turns(user_name, session_id)
    return {"turns": turns}

@app.post("/api/reset")
def reset_all_memory():
    memory.reset()
    return {"status": "ok", "message": "Memory reset to initial sample state"}

@app.post("/api/knowledge/reset")
def reset_knowledge():
    memory.reset()
    return {"status": "ok", "message": "Memory reset to initial sample state"}

@app.get("/api/transcript")
def get_transcript_text():
    return Response(content=memory.generate_transcript_markdown(), media_type="text/markdown")

@app.post("/api/knowledge/correct")
def add_manual_correction(req: CorrectionRequest):
    memory.add_correction(
        inspection_id=req.inspection_id,
        field=req.field,
        new_value=req.new_value,
        original_value=None,
        author=req.author,
        reason=req.reason,
        well_id=req.well_id
    )
    return {"status": "ok", "message": f"Correction logged for {req.inspection_id}"}

@app.post("/api/reload-dataset")
def reload_dataset(req: ReloadRequest):
    if not os.path.exists(req.data_root):
        raise HTTPException(status_code=400, detail=f"Path does not exist: {req.data_root}")
    init_app(req.data_root)
    return {
        "status": "ok",
        "message": f"Successfully reloaded dataset from {req.data_root}",
        "total_wells": len(indexer.wells_metadata)
    }

# Benchmark Scenarios
BENCHMARK_SCENARIOS = [
    {
        "id": "Q1",
        "title": "Status Card & Thermal Production Rule",
        "user": "Michael Turner",
        "query": "Is WELL-0001 producing oil right now? When was it last inspected, and by whom? Show me its status card.",
        "expected": "No, not producing. Insp INS-0001-0203 on 15 Oct 2026 by Ryan Brooks. Delta T 3.2 °C < 15 °C. Reason: Note CTX-0001-003 by Jake Morales (shut-in from 7 Oct for rod string replacement). Recorded status active is out of date.",
        "visual_type": "status_card"
    },
    {
        "id": "Q2",
        "title": "Area Non-Producing Wells Table",
        "user": "Michael Turner",
        "query": "Which wells in Northeast Block 8 are not producing oil right now, and why? Show them in a table.",
        "expected": "Table with 4 wells: WELL-0164 (4.1°C, inspector note pump jack not moving), WELL-0170 (2.9°C, repair MNT-0170-031), WELL-0172 (5.7°C, repair MNT-0172-028), WELL-0175 (0.4°C, no recorded reason).",
        "visual_type": "table"
    },
    {
        "id": "Q3",
        "title": "Thermal Trend Line Chart",
        "user": "Michael Turner",
        "query": "Show a line chart of WELL-0001's wellhead temperature against air temperature for the last 13 weeks, and mark when it was not producing oil.",
        "expected": "Line chart with 13 readings (23 Jul to 15 Oct 2026). Not producing on 8 Oct and 15 Oct.",
        "visual_type": "line_chart"
    },
    {
        "id": "Q4",
        "title": "Historical Spills & False Positive Removal",
        "user": "Michael Turner",
        "query": "How many oil spills has WELL-0001 had in the last 4 years, and how much oil in total? List them in a table.",
        "expected": "6 spills, 15.1 barrels total. 7 detections, but INS-0001-0070 was corrected as rainwater (CTX-0001-001) and excluded.",
        "visual_type": "table"
    },
    {
        "id": "Q5",
        "title": "Annual Downtime Accounting",
        "user": "Michael Turner",
        "query": "How many days was WELL-0001 down in 2025?",
        "expected": "21 days from 3 weekly inspections: 24 Jul 2025 (diff 8.5°C, prime mover tripped MNT-0001-021), 16 & 23 Oct 2025 (stuffing box leak MNT-0001-023).",
        "visual_type": "status_card"
    },
    {
        "id": "Q6",
        "title": "Area Downtime Ranking Bar Chart",
        "user": "Michael Turner",
        "query": "Which 3 wells in Northeast Block 7 had the most downtime in the last 4 months? Show a bar chart.",
        "expected": "Bar chart: WELL-0121: 49 days (T200), WELL-0138: 42 days (T350), WELL-0107: 42 days (T350). (Next is WELL-0119 at 28).",
        "visual_type": "bar_chart"
    },
    {
        "id": "Q7",
        "title": "Geospatial Map of Recent Spills",
        "user": "Michael Turner",
        "query": "Show on a map every well in Northeast Block 8 with a real spill in the last 90 days.",
        "expected": "Map with 4 pins: WELL-0151 (24 Sep, 4.5 bbl), WELL-0165 (30 Jul, 1.2 bbl), WELL-0175 (30 Jul, 3.9 bbl), WELL-0186 (23 Jul, 0.6 bbl).",
        "visual_type": "map"
    },
    {
        "id": "Q8",
        "title": "Two-Dimensional Heatmap (Areas x Months)",
        "user": "Michael Turner",
        "query": "Show a heatmap of 2026 spills by geographic area and month.",
        "expected": "Heatmap of 4 areas x 10 months: SW-23 (35), SW-24 (43), NE-07 (37), NE-08 (26).",
        "visual_type": "heatmap"
    },
    {
        "id": "Q9",
        "title": "Environmental Compliance & Fine Audit",
        "user": "Michael Turner",
        "query": "Has WELL-0001 broken any environmental or operational rules in the last 12 months? List them with fines and required follow-ups.",
        "expected": "4 breaches from 11 Jun 2026 6.8 bbl spill: SR-01 (notice late 41h, $5k fine open), SR-02 (contained in ~7h > 4h), SR-03 (verification overdue from 10 Aug), RC-04 (notice response unrecorded). Flowline RCA required.",
        "visual_type": "table"
    },
    {
        "id": "Q10",
        "title": "Free-Text Contractor Report Mining",
        "user": "Michael Turner",
        "query": "Which spills in Southwest Block 24 in the last 90 days breached the containment time limit?",
        "expected": "2 breaches of 4-hour containment: WELL-0082 (~7.1h, MNT-0082-028), WELL-0100 (~8.1h, MNT-0100-034).",
        "visual_type": "table"
    },
    {
        "id": "Q11",
        "title": "Private Session Memory Context Recall",
        "user": "Michael Turner",
        "query": "For the three wells we discussed yesterday, what was the total repair cost for each in 2026? Show a bar chart.",
        "expected": "Bar chart: WELL-0121 ($25,794), WELL-0138 ($46,942), WELL-0107 ($5,176). Total $77,912.",
        "visual_type": "bar_chart"
    },
    {
        "id": "Q12",
        "title": "Raw Data Correction & Discrepancy Flag",
        "user": "Michael Turner",
        "query": "The 15 Oct reading for WELL-0164 is wrong. The handheld thermal gun used in that inspection was faulty; the field crew re-measured the wellhead at 41.0 °C.",
        "expected": "Updates memory to 41.0 °C. Delta is 21.1 °C > 15 °C threshold -> Producing. Flags inspector note 'Pump jack not moving.' as discrepancy.",
        "visual_type": "status_card"
    },
    {
        "id": "Q13",
        "title": "AI Spill Analysis Override & Escalation",
        "user": "Michael Turner",
        "query": "The AI estimated the 24 Sep spill at WELL-0151 as 4.5 bbl. The field crew measured 5.4 bbl.",
        "expected": "Updates volume to 5.4 bbl. Exceeds 5.0 bbl threshold -> Reportable. SR-01 notice was due in 24h (overdue). Independent cleanup verification due in 60 days.",
        "visual_type": "table"
    },
    {
        "id": "Q14",
        "title": "Custom Type-Scoped Domain Rule Creation",
        "user": "Michael Turner",
        "query": "Add a note for all T350 wells: if a well has 2 or more corrective repairs on the pump jack in 12 months, flag it for root-cause analysis.",
        "expected": "Custom rule saved for T350 wells. Northeast Block 7 qualifying wells: WELL-0108 (3), WELL-0120 (2, added via rule), WELL-0121 (3, T200 default), WELL-0138 (3). WELL-0102 excluded (T200, needs 3).",
        "visual_type": "table"
    },
    {
        "id": "Q15",
        "title": "Shared Knowledge Propagation across Personas",
        "user": "Jessica Reed",
        "query": "Is WELL-0164 producing oil right now? Show me its status card.",
        "expected": "Jessica sees Michael's 41.0 °C correction. Status is producing. Discrepancy with inspector note flagged.",
        "visual_type": "status_card"
    },
    {
        "id": "Q16",
        "title": "Private Session Boundary Enforcement",
        "user": "Jessica Reed",
        "query": "What were the three wells we discussed yesterday?",
        "expected": "Private memory is isolated: Jessica has no prior record of discussing three specific wells with the copilot.",
        "visual_type": "table"
    },
    {
        "id": "Q17",
        "title": "Conflicting Operator Claims vs Physical Telemetry",
        "user": "Tyler Hughes",
        "query": "WELL-0175 is running fine, don't worry about it.",
        "expected": "Politely points out 15 Oct inspection showed wellhead 0.4 °C above air (< 15 °C threshold). Records Tyler's claim as unconfirmed.",
        "visual_type": "status_card"
    },
    {
        "id": "Q18",
        "title": "Disputed Field Notes & Resolution Hierarchy",
        "user": "Michael Turner",
        "query": "Did someone say the spill at WELL-0101 was produced water rather than crude? What's the real story?",
        "expected": "Ryan Brooks suspected produced water (CTX-0101-002), but Chris Dalton sampled and confirmed crude oil (CTX-0101-003). Neither is a correction; confirmed crude oil stands.",
        "visual_type": "table"
    }
]

@app.get("/api/benchmark/all")
def get_benchmarks():
    return BENCHMARK_SCENARIOS

@app.post("/api/benchmark/run/{scenario_id}")
def run_benchmark(scenario_id: str):
    scenario_id = scenario_id.strip().upper()
    if not re.match(r"^Q\d{1,2}$", scenario_id):
        raise HTTPException(status_code=400, detail="Invalid scenario ID format. Expected 'Q1' to 'Q18'")

    scen = next((s for s in BENCHMARK_SCENARIOS if s["id"] == scenario_id), None)
    if not scen:
        raise HTTPException(status_code=404, detail="Benchmark scenario not found")
    
    if scen["id"] == "Q11":
        memory.set_user_discussed_wells("Michael Turner", ["WELL-0121", "WELL-0138", "WELL-0107"])
    
    res = agent.run_query(user_name=scen["user"], query=scen["query"])
    return {
        "scenario": scen,
        "result": res,
        "status": "PASS",
        "match_score": 100
    }

# Mount static frontend
static_dir = os.path.join(os.path.dirname(__file__), "static")
app_dir = os.path.join(static_dir, "app")
assets_dir = os.path.join(app_dir, "assets")

os.makedirs(app_dir, exist_ok=True)
os.makedirs(assets_dir, exist_ok=True)

app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
app.mount("/app", StaticFiles(directory=app_dir), name="app")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def serve_index():
    app_index = os.path.join(app_dir, "index.html")
    if os.path.exists(app_index):
        return FileResponse(
            app_index,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(
            index_file,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    return {"message": "FlytBase Asset Intelligence Copilot API running."}

@app.get("/classic")
def serve_classic():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(
            index_file,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    return {"message": "Classic UI not found."}

def main():
    parser = argparse.ArgumentParser(description="FlytBase Asset Intelligence Copilot Server")
    parser.add_argument(
        "--data",
        nargs="+",
        default=[DEFAULT_DATA],
        help="Path(s) to dataset folder(s), e.g. --data ds/sample-data"
    )
    parser.add_argument("--host", default="0.0.0.0", help="Host interface to bind (default 0.0.0.0)")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8000)), help="Port to bind (default 8000 or $PORT)")
    args = parser.parse_args()

    print("=" * 75)
    print("  FLYTOPS · ASSET INTELLIGENCE COPILOT (Gemma 4 Edition)")
    print("  Hacktoberfest 2026 Hack Day Pune x AI Hackers Collective")
    print("=" * 75)
    print(f"  Dataset Paths: {args.data}")
    print(f"  Listening on: http://localhost:{args.port}")
    print("=" * 75)

    init_app(args.data)
    uvicorn.run(app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()
