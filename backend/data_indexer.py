"""
Data Indexer for Asset Intelligence Copilot.
Loads and indexes fleet-wide metadata, SOPs, well manuals, and all asset records
(metadata, weekly inspections, maintenance history, free-text reports, regulatory events, context notes).
Supports loading multiple dataset folders (e.g., sample-data and test-data side-by-side).
Dynamically parses temperature thresholds from well-type manuals.
"""
import json
import os
import glob
import re
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Any, Optional, Union

class DataIndexer:
    def __init__(self, data_root: Union[str, List[str]] = "d:/hacknewalone/dataset/sample-data"):
        if isinstance(data_root, list):
            self.data_roots = [os.path.abspath(p) for p in data_root if p]
        else:
            self.data_roots = [os.path.abspath(data_root)]
        
        self.data_root = self.data_roots[0] if self.data_roots else os.path.abspath("d:/hacknewalone/dataset/sample-data")

        self.areas: Dict[str, Any] = {}
        self.teams: Dict[str, Any] = {}
        self.users: Dict[str, Any] = {}
        self.user_by_name: Dict[str, Any] = {}
        self.well_to_area: Dict[str, str] = {}
        self.well_to_area_obj: Dict[str, Any] = {}
        
        self.wells_metadata: Dict[str, Any] = {}
        self.inspections: Dict[str, List[Dict[str, Any]]] = {}
        self.maintenance: Dict[str, List[Dict[str, Any]]] = {}
        self.maintenance_reports: Dict[str, Dict[str, Any]] = {} # keyed by well_id -> list of reports
        self.regulatory_events: Dict[str, List[Dict[str, Any]]] = {}
        self.context_notes: Dict[str, List[Dict[str, Any]]] = {}
        
        self.well_types_docs: Dict[str, str] = {}
        self.well_type_thresholds: Dict[str, float] = {
            "T200": 15.0,
            "T350": 20.0
        }
        self.sops_docs: Dict[str, str] = {}
        self.corrections_in_data: Dict[str, Dict[str, Any]] = {} # inspection_id -> correction note

        self.load_all()

    def load_all(self):
        print(f"[DataIndexer] Ingesting dataset from {len(self.data_roots)} location(s): {', '.join(self.data_roots)}...")
        for root in self.data_roots:
            self._load_fleet(root)
            self._load_docs(root)
            self._load_assets(root)
        
        # Log status
        total_inspections = sum(len(v) for v in self.inspections.values())
        parsed_rules_str = ", ".join(f"{k} ({v:.1f}°C)" for k, v in sorted(self.well_type_thresholds.items()))
        print(f"[DataIndexer] Loaded {len(self.wells_metadata)} wells, {total_inspections} inspections. Parsed rules (thresholds): {parsed_rules_str}")

    def _load_fleet(self, root: str):
        areas_file = os.path.join(root, "fleet", "areas.json")
        if os.path.exists(areas_file):
            with open(areas_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for a in data.get("areas", []):
                    self.areas[a["name"]] = a
                    self.areas[a["area_id"]] = a
                    for w in a.get("asset_ids", []):
                        self.well_to_area[w] = a["name"]
                        self.well_to_area_obj[w] = a
                for t in data.get("teams", []):
                    self.teams[t["team_id"]] = t
                    self.teams[t["name"]] = t

        users_file = os.path.join(root, "fleet", "users.json")
        if os.path.exists(users_file):
            with open(users_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for u in data.get("users", []):
                    self.users[u["user_id"]] = u
                    self.user_by_name[u["name"].lower()] = u
                    self.user_by_name[u["name"]] = u

    def _load_docs(self, root: str):
        well_types_dir = os.path.join(root, "fleet", "well-types")
        if os.path.exists(well_types_dir):
            for path in glob.glob(os.path.join(well_types_dir, "*.md")):
                name = os.path.splitext(os.path.basename(path))[0]
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    self.well_types_docs[name] = content
                    
                    # Parse threshold from manual (e.g. at least 15 °C above ambient)
                    thresh = self._parse_temp_threshold_from_manual(content)
                    if thresh is not None:
                        self.well_type_thresholds[name] = thresh
                    elif name not in self.well_type_thresholds:
                        # Fallback threshold logged on startup
                        default_fallback = 15.0
                        self.well_type_thresholds[name] = default_fallback
                        print(f"[DataIndexer] Fallback threshold {default_fallback:.1f}°C applied for well type {name}")

        sops_dir = os.path.join(root, "fleet", "sops")
        if os.path.exists(sops_dir):
            for path in glob.glob(os.path.join(sops_dir, "*.md")):
                name = os.path.splitext(os.path.basename(path))[0]
                with open(path, "r", encoding="utf-8") as f:
                    self.sops_docs[name] = f.read()

    def _parse_temp_threshold_from_manual(self, text: str) -> Optional[float]:
        """Extract temperature threshold in °C from a well-type manual."""
        m = re.search(r'at least \*{0,2}(\d+(?:\.\d+)?)\s*°?C\s*(?:warmer than|above)?\s*ambient', text, re.I)
        if m:
            return float(m.group(1))
        m2 = re.search(r'(\d+(?:\.\d+)?)\s*°?C\s*(?:warmer than|above)\s*ambient', text, re.I)
        if m2:
            return float(m2.group(1))
        return None

    def _load_assets(self, root: str):
        assets_dir = os.path.join(root, "assets")
        if not os.path.exists(assets_dir):
            return

        well_dirs = [d for d in glob.glob(os.path.join(assets_dir, "*")) if os.path.isdir(d)]
        for wdir in well_dirs:
            well_id = os.path.basename(wdir)
            
            # 1. Metadata
            meta_path = os.path.join(wdir, "metadata.json")
            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    self.wells_metadata[well_id] = json.load(f)

            # 2. Inspections
            insp_path = os.path.join(wdir, "inspections.jsonl")
            if os.path.exists(insp_path):
                items = []
                with open(insp_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            items.append(json.loads(line))
                items.sort(key=lambda x: x["inspected_at"])
                if well_id in self.inspections:
                    self.inspections[well_id].extend(items)
                    self.inspections[well_id].sort(key=lambda x: x["inspected_at"])
                else:
                    self.inspections[well_id] = items

            # 3. Maintenance
            maint_path = os.path.join(wdir, "maintenance.jsonl")
            if os.path.exists(maint_path):
                items = []
                with open(maint_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            items.append(json.loads(line))
                items.sort(key=lambda x: x["started_at"])
                if well_id in self.maintenance:
                    self.maintenance[well_id].extend(items)
                    self.maintenance[well_id].sort(key=lambda x: x["started_at"])
                else:
                    self.maintenance[well_id] = items

            # 4. Regulatory Events
            reg_path = os.path.join(wdir, "regulatory-events.jsonl")
            if os.path.exists(reg_path):
                items = []
                with open(reg_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            items.append(json.loads(line))
                items.sort(key=lambda x: x["date"])
                if well_id in self.regulatory_events:
                    self.regulatory_events[well_id].extend(items)
                    self.regulatory_events[well_id].sort(key=lambda x: x["date"])
                else:
                    self.regulatory_events[well_id] = items

            # 5. Context Notes
            ctx_path = os.path.join(wdir, "context.jsonl")
            if os.path.exists(ctx_path):
                items = []
                with open(ctx_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            note = json.loads(line)
                            items.append(note)
                            if note.get("note_type") == "correction" and note.get("inspection_id"):
                                self.corrections_in_data[note["inspection_id"]] = note
                items.sort(key=lambda x: x["created_at"])
                if well_id in self.context_notes:
                    self.context_notes[well_id].extend(items)
                    self.context_notes[well_id].sort(key=lambda x: x["created_at"])
                else:
                    self.context_notes[well_id] = items

            # 6. Maintenance Reports (free-text markdown)
            rep_dir = os.path.join(wdir, "maintenance-reports")
            if os.path.exists(rep_dir):
                if well_id not in self.maintenance_reports:
                    self.maintenance_reports[well_id] = {}
                for rpath in glob.glob(os.path.join(rep_dir, "*.md")):
                    rname = os.path.basename(rpath)
                    with open(rpath, "r", encoding="utf-8") as f:
                        content = f.read()
                        self.maintenance_reports[well_id][rname] = {
                            "file_name": rname,
                            "relative_path": f"assets/{well_id}/maintenance-reports/{rname}",
                            "content": content,
                            "parsed": self._parse_maintenance_report(content)
                        }

    def _parse_maintenance_report(self, text: str) -> Dict[str, Any]:
        """Extract structured fields and protocol compliance from free-text reports."""
        parsed = {
            "sr01": None,
            "sr02": None,
            "sr03": None,
            "containment_hours": None,
            "reporting_hours": None,
            "action_required": "action required" in text.lower(),
        }
        
        cont_match = re.search(r"contained (?:about|in|after) ([\d\.]+) hours?", text, re.I)
        if cont_match:
            try:
                parsed["containment_hours"] = float(cont_match.group(1))
            except ValueError:
                pass
        
        sr02_match = re.search(r"SR-02\s*\|\s*(\*\*[^*]+\*\*|[A-Za-z ]+)\s*\|\s*([^|\n]+)", text)
        if sr02_match:
            parsed["sr02"] = {
                "status": sr02_match.group(1).replace("*", "").strip(),
                "detail": sr02_match.group(2).strip()
            }
            if not parsed["containment_hours"]:
                hours_match = re.search(r"([\d\.]+) hours?", sr02_match.group(2))
                if hours_match:
                    try:
                        parsed["containment_hours"] = float(hours_match.group(1))
                    except ValueError:
                        pass

        sr01_match = re.search(r"SR-01\s*\|\s*(\*\*[^*]+\*\*|[A-Za-z ]+)\s*\|\s*([^|\n]+)", text)
        if sr01_match:
            parsed["sr01"] = {
                "status": sr01_match.group(1).replace("*", "").strip(),
                "detail": sr01_match.group(2).strip()
            }

        sr03_match = re.search(r"SR-03\s*\|\s*(\*\*[^*]+\*\*|[A-Za-z ]+)\s*\|\s*([^|\n]+)", text)
        if sr03_match:
            parsed["sr03"] = {
                "status": sr03_match.group(1).replace("*", "").strip(),
                "detail": sr03_match.group(2).strip()
            }

        return parsed

    def get_user_name(self, user_id: str) -> str:
        u = self.users.get(user_id)
        return u["name"] if u else user_id

    def get_user_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        return self.user_by_name.get(name.lower()) or self.user_by_name.get(name)

    def get_area_wells(self, area_name_or_id: str) -> List[str]:
        area = self.areas.get(area_name_or_id)
        if area:
            return area.get("asset_ids", [])
        return []

    def get_well_threshold(self, well_id: str, custom_rules: Optional[Dict[str, Any]] = None) -> float:
        meta = self.wells_metadata.get(well_id, {})
        w_type = meta.get("well_type", "T200")
        if custom_rules and "temp_thresholds" in custom_rules:
            if w_type in custom_rules["temp_thresholds"]:
                return float(custom_rules["temp_thresholds"][w_type])
        
        # Check parsed rule from manual
        if w_type in self.well_type_thresholds:
            return float(self.well_type_thresholds[w_type])
            
        return 20.0 if w_type == "T350" else 15.0
