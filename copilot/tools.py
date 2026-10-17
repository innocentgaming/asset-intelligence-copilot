"""
Tool schemas for Gemma 4 (OpenAI-compatible function calling) and Generative-UI visual builders.
"""
from typing import Dict, List, Any, Optional

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_well_status",
            "description": "Get current producing status of a well from its latest inspection and operating manual threshold. Returns whether the well is producing, latest inspection ID (e.g. INS-0001-0203), date (e.g. 15 Oct 2026), method (e.g. drone), inspector name (e.g. Ryan Brooks), wellhead temp, ambient temp, delta above air, threshold, reason, context notes (e.g. CTX-0001-003), recorded status, and whether recorded status is out of date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "well_id": {"type": "string", "description": "Asset ID, e.g. WELL-0001"}
                },
                "required": ["well_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_down_wells_in_area",
            "description": "List all wells in a geographic area/block (e.g. 'Northeast Block 8') that are currently not producing oil, along with delta above air, recorded status, and reasons.",
            "parameters": {
                "type": "object",
                "properties": {
                    "area_name": {"type": "string", "description": "Name of geographic block, e.g. 'Northeast Block 8', 'Northeast Block 7'"}
                },
                "required": ["area_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_well_temp_timeseries",
            "description": "Get weekly wellhead vs ambient temperature history for a well over the last N weeks.",
            "parameters": {
                "type": "object",
                "properties": {
                    "well_id": {"type": "string", "description": "Asset ID, e.g. WELL-0001"},
                    "weeks": {"type": "integer", "description": "Number of weeks, default 13"}
                },
                "required": ["well_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_well_spills_history",
            "description": "Get confirmed spill history and total volume for a well over a time period, with false positives removed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "well_id": {"type": "string", "description": "Asset ID, e.g. WELL-0001"},
                    "start_date": {"type": "string", "description": "YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "YYYY-MM-DD"}
                },
                "required": ["well_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_well_downtime_in_year",
            "description": "Calculate downtime days (7 days per non-producing inspection) and causes for a well in a year.",
            "parameters": {
                "type": "object",
                "properties": {
                    "well_id": {"type": "string", "description": "Asset ID, e.g. WELL-0001"},
                    "year": {"type": "string", "description": "Year, e.g. '2025'"}
                },
                "required": ["well_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_downtime_wells",
            "description": "Rank top wells in an area by cumulative downtime days over a given window (default last 4 months: 2026-06-16 to 2026-10-16).",
            "parameters": {
                "type": "object",
                "properties": {
                    "area_name": {"type": "string", "description": "e.g. 'Northeast Block 7'"},
                    "start_date": {"type": "string", "description": "YYYY-MM-DD (default '2026-06-16')"},
                    "end_date": {"type": "string", "description": "YYYY-MM-DD (default '2026-10-16')"},
                    "top_n": {"type": "integer", "description": "Number of top wells to return, default 3"}
                },
                "required": ["area_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_area_spills_map",
            "description": "Get GPS pins and volume for all real oil spills in an area over the last N days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "area_name": {"type": "string", "description": "e.g. 'Northeast Block 8'"},
                    "days": {"type": "integer", "description": "Default 90"}
                },
                "required": ["area_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_spills_heatmap",
            "description": "Get a 2D matrix of confirmed crude spills across geographic areas and calendar months for a year.",
            "parameters": {
                "type": "object",
                "properties": {
                    "year": {"type": "string", "description": "Default '2026'"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_well_rule_breaches",
            "description": "Audit environmental and regulatory rule breaches (SR-01, SR-02, SR-03, RC-04) and open fines for a well.",
            "parameters": {
                "type": "object",
                "properties": {
                    "well_id": {"type": "string", "description": "Asset ID, e.g. WELL-0001"},
                    "months": {"type": "integer", "description": "Default 12"}
                },
                "required": ["well_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_containment_breaches",
            "description": "Mine free-text contractor reports in an area to find spills that exceeded the 4-hour containment limit.",
            "parameters": {
                "type": "object",
                "properties": {
                    "area_name": {"type": "string", "description": "e.g. 'Southwest Block 24'"},
                    "days": {"type": "integer", "description": "Default 90"}
                },
                "required": ["area_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_wells_repair_cost",
            "description": "Calculate total maintenance and repair costs for a specific list of wells in a year.",
            "parameters": {
                "type": "object",
                "properties": {
                    "wells": {"type": "array", "items": {"type": "string"}},
                    "year": {"type": "string", "description": "e.g. '2026'"}
                },
                "required": ["wells"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_pump_jack_rca_wells",
            "description": "Identify wells in an area that meet the threshold of corrective pump jack repairs triggering a Root Cause Analysis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "area_name": {"type": "string", "description": "e.g. 'Northeast Block 7'"},
                    "months": {"type": "integer", "description": "Default 12"}
                },
                "required": ["area_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_spill_detection_disagreement",
            "description": "Investigate disputed spill detections where notes conflict (e.g. produced water vs crude oil).",
            "parameters": {
                "type": "object",
                "properties": {
                    "well_id": {"type": "string", "description": "e.g. WELL-0101"},
                    "approx_date": {"type": "string", "description": "e.g. '2026-08-20'"}
                },
                "required": ["well_id"]
            }
        }
    }
]

# Visual Builders for Generative UI
def build_status_card(status_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "component": "status_card",
        "data": status_data
    }

def build_table(rows: List[Dict[str, Any]], columns: Optional[List[str]] = None) -> Dict[str, Any]:
    return {
        "component": "table",
        "data": {
            "columns": columns or (list(rows[0].keys()) if rows else []),
            "rows": rows
        }
    }

def build_line_chart(timeseries_data: Dict[str, Any]) -> Dict[str, Any]:
    series = timeseries_data.get("series", [])
    return {
        "component": "line_chart",
        "data": {
            "x": [s["date"] for s in series],
            "wellhead": [s["wellhead_temp_c"] for s in series],
            "ambient": [s["ambient_temp_c"] for s in series],
            "threshold": timeseries_data.get("threshold_c", 15.0),
            "not_producing_dates": timeseries_data.get("not_producing_dates", [])
        }
    }

def build_bar_chart(labels: List[str], values: List[float], title: str = "", y_title: str = "") -> Dict[str, Any]:
    return {
        "component": "bar_chart",
        "data": {
            "title": title,
            "y_title": y_title,
            "labels": labels,
            "values": values
        }
    }

def build_map(pins: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "component": "map",
        "data": {
            "pins": pins
        }
    }

def build_heatmap(heatmap_data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "component": "heatmap",
        "data": {
            "x": heatmap_data.get("months", []),
            "y": [r["area"] for r in heatmap_data.get("rows", [])],
            "z": [r["counts"] for r in heatmap_data.get("rows", [])]
        }
    }
