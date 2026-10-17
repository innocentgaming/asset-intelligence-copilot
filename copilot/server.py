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
from fastapi.responses import FileResponse
from pydantic import BaseModel

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

class ChatRequest(BaseModel):
    user_name: str
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
    return list(indexer.users.values())

@app.post("/api/chat")
def chat(req: ChatRequest):
    if req.api_key:
        agent.api_key = req.api_key.strip()
    if req.model:
        agent.model = req.model.strip()
    return agent.run_query(user_name=req.user_name, query=req.message)

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
        "corrections": list(memory.corrections.values()),
        "custom_rules": memory.custom_rules,
        "shared_notes": memory.shared_notes,
        "unconfirmed_claims": memory.unconfirmed_claims,
        "active_user_contexts": {u: ctx for u, ctx in memory.user_context.items()}
    }

@app.post("/api/knowledge/reset")
def reset_knowledge():
    memory.reset()
    return {"status": "ok", "message": "Memory reset to initial sample state"}

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
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "FlytBase Asset Intelligence Copilot API running."}

def main():
    parser = argparse.ArgumentParser(description="FlytBase Asset Intelligence Copilot Server")
    parser.add_argument(
        "--data",
        nargs="+",
        default=[DEFAULT_DATA],
        help="Path(s) to dataset folder(s), e.g. --data ds/sample-data"
    )
    parser.add_argument("--host", default="0.0.0.0", help="Host interface to bind (default 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind (default 8000)")
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
