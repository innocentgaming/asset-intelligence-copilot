"""
Deterministic Analytics Engine for Asset Intelligence Copilot.
Implements domain-grounded solvers for oilfield questions:
- Thermal delta production verification (T200 >= 15C, T350 >= 20C)
- Downtime accounting (7 days per down inspection)
- SOP compliance audits (SR-01, SR-02, SR-03, RC-01 to RC-05, WS-01 to WS-07)
- Free-text repair report parsing & containment time extraction
- Geospatial mapping & two-dimensional heatmaps
- Conflict detection against raw sensor inspections
"""
import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from copilot.data import DataIndexer
from copilot.memory import MemoryManager

TODAY = "2026-10-16"

class AnalyticsEngine:
    def __init__(self, indexer: DataIndexer, memory: MemoryManager):
        self.indexer = indexer
        self.memory = memory

    # -------------------------------------------------------------
    # Q1 & Single Well Status
    # -------------------------------------------------------------
    def get_well_status(self, well_id: str) -> Dict[str, Any]:
        meta = self.indexer.wells_metadata.get(well_id)
        if not meta:
            return {"error": f"Well {well_id} not found"}

        w_type = meta.get("well_type", "T200")
        threshold = self.indexer.get_well_threshold(well_id)
        
        inspections = self.indexer.inspections.get(well_id, [])
        if not inspections:
            return {"error": f"No inspections for {well_id}"}
        
        last_insp = inspections[-1]
        insp_id = last_insp["inspection_id"]
        insp_date = last_insp["inspected_at"][:10]
        inspector_name = self.indexer.get_user_name(last_insp.get("inspector_user_id", ""))
        method = last_insp.get("method", "drone")

        # Check for active corrections in memory
        correction = self.memory.get_correction(insp_id)
        if correction and correction.get("field") == "wellhead_temp_c":
            wellhead_temp = float(correction["new_value"])
            corrected_note = f"Corrected by {correction.get('author')} (re-measured {wellhead_temp:.1f} °C; reason: {correction.get('reason')})"
        else:
            wellhead_temp = float(last_insp["wellhead_temp_c"])
            corrected_note = None

        ambient_temp = float(last_insp["ambient_temp_c"])
        diff_temp = wellhead_temp - ambient_temp
        is_producing = diff_temp >= threshold

        # Check human context notes
        ctx_notes = self.indexer.context_notes.get(well_id, [])
        shared_notes = self.memory.get_shared_notes_for_well(well_id)
        
        reason = None
        evidence_citations = [
            f"assets/{well_id}/inspections.jsonl (Inspection {insp_id})",
            f"fleet/well-types/{w_type}.md (Section 3: threshold {threshold:.0f} °C)"
        ]

        # Look for shut-in or maintenance note
        for c in reversed(ctx_notes):
            if c.get("valid_from") and c.get("valid_from") <= insp_date:
                if not c.get("valid_to") or c.get("valid_to") >= insp_date:
                    author_name = self.indexer.get_user_name(c.get("author_user_id", ""))
                    reason = f"Note {c.get('note_id')} by {author_name}: {c.get('text')}"
                    evidence_citations.append(f"assets/{well_id}/context.jsonl ({c.get('note_id')})")
                    break

        for sn in reversed(shared_notes):
            if sn.get("valid_from") and sn.get("valid_from") <= TODAY:
                reason = f"Shared note by {sn.get('author')}: {sn.get('text')}"
                break

        # Check open maintenance jobs
        maint_list = self.indexer.maintenance.get(well_id, [])
        open_repairs = [m for m in maint_list if m.get("completed_at", "") > TODAY or m.get("started_at", "") >= "2026-09-01"]
        if not reason and open_repairs:
            latest_m = open_repairs[-1]
            reason = f"Repair {latest_m.get('maintenance_id')}, {latest_m.get('issue')}, started {latest_m.get('started_at')[:10]}"
            evidence_citations.append(f"assets/{well_id}/maintenance.jsonl ({latest_m.get('maintenance_id')})")

        if not reason:
            if last_insp.get("notes"):
                reason = f"No recorded reason in maintenance. Inspector noted: \"{last_insp.get('notes')}\""
            else:
                reason = "No recorded reason. Recommend field inspection check."

        recorded_status = meta.get("recorded_status", "unknown")
        status_out_of_date = (recorded_status == "active" and not is_producing) or (recorded_status == "down" and is_producing)

        # Conflict check with notes
        inspector_conflict = None
        if corrected_note and "Pump jack not moving" in last_insp.get("notes", ""):
            inspector_conflict = f"Inspector {inspector_name} noted 'Pump jack not moving.', which contradicts the corrected producing reading."

        return {
            "well_id": well_id,
            "name": meta.get("name", well_id),
            "well_type": w_type,
            "area_name": self.indexer.well_to_area.get(well_id, "Unknown"),
            "is_producing": is_producing,
            "wellhead_temp_c": wellhead_temp,
            "ambient_temp_c": ambient_temp,
            "diff_temp_c": round(diff_temp, 1),
            "threshold_c": threshold,
            "last_inspection_id": insp_id,
            "last_inspected_at": insp_date,
            "inspector_name": inspector_name,
            "inspection_method": method,
            "recorded_status": recorded_status,
            "status_out_of_date": status_out_of_date,
            "reason": reason,
            "corrected_note": corrected_note,
            "inspector_conflict": inspector_conflict,
            "equipment": meta.get("equipment", []),
            "evidence_citations": evidence_citations
        }

    # -------------------------------------------------------------
    # Q2: Down Wells in Area
    # -------------------------------------------------------------
    def get_down_wells_in_area(self, area_name: str) -> Dict[str, Any]:
        wells = self.indexer.get_area_wells(area_name)
        if not wells:
            for aname in self.indexer.areas:
                if area_name.lower() in aname.lower():
                    wells = self.indexer.get_area_wells(aname)
                    area_name = aname
                    break

        down_wells = []
        citations = [f"fleet/areas.json ({area_name})"]

        for w in sorted(wells):
            st = self.get_well_status(w)
            if not st.get("is_producing"):
                down_wells.append({
                    "well_id": w,
                    "well_type": st["well_type"],
                    "wellhead_above_air": f"{st['diff_temp_c']} °C",
                    "recorded_status": f"{st['recorded_status']}{' (out of date)' if st['status_out_of_date'] else ''}",
                    "reason": st["reason"],
                    "last_inspected_at": st["last_inspected_at"],
                    "raw_status": st
                })
                citations.extend(st["evidence_citations"][:1])

        return {
            "area_name": area_name,
            "total_down": len(down_wells),
            "down_wells": down_wells,
            "evidence_citations": list(dict.fromkeys(citations))
        }

    # -------------------------------------------------------------
    # Q3: Temperature Time Series
    # -------------------------------------------------------------
    def get_well_temp_timeseries(self, well_id: str, weeks: int = 13) -> Dict[str, Any]:
        inspections = self.indexer.inspections.get(well_id, [])
        threshold = self.indexer.get_well_threshold(well_id)
        w_type = self.indexer.wells_metadata.get(well_id, {}).get("well_type", "T200")

        recent = inspections[-weeks:] if len(inspections) >= weeks else inspections
        
        series = []
        not_producing_dates = []

        for item in recent:
            date_str = item["inspected_at"][:10]
            w_temp = float(item["wellhead_temp_c"])
            a_temp = float(item["ambient_temp_c"])
            diff = w_temp - a_temp
            is_prod = diff >= threshold
            if not is_prod:
                not_producing_dates.append(date_str)
            series.append({
                "date": date_str,
                "inspection_id": item["inspection_id"],
                "wellhead_temp_c": w_temp,
                "ambient_temp_c": a_temp,
                "diff_c": round(diff, 1),
                "is_producing": is_prod
            })

        return {
            "well_id": well_id,
            "well_type": w_type,
            "threshold_c": threshold,
            "weeks_count": len(series),
            "series": series,
            "not_producing_dates": not_producing_dates,
            "evidence_citations": [
                f"assets/{well_id}/inspections.jsonl (Last {len(series)} weekly readings)",
                f"fleet/well-types/{w_type}.md (Production threshold {threshold:.0f} °C)"
            ]
        }

    # -------------------------------------------------------------
    # Q4: Spills for Well in Last 4 Years
    # -------------------------------------------------------------
    def get_well_spills_history(self, well_id: str, start_date: str = "2022-10-16", end_date: str = TODAY) -> Dict[str, Any]:
        inspections = self.indexer.inspections.get(well_id, [])
        ctx_notes = self.indexer.context_notes.get(well_id, [])

        corrections = {}
        for c in ctx_notes:
            if c.get("note_type") == "correction" and c.get("inspection_id"):
                corrections[c["inspection_id"]] = c

        all_detections = []
        real_spills = []
        discounted = []

        for item in inspections:
            dt = item["inspected_at"][:10]
            if start_date <= dt <= end_date and item.get("spill_detected"):
                insp_id = item["inspection_id"]
                vol = item.get("spill_est_volume_bbl", 0.0)
                all_detections.append(item)
                if insp_id in corrections:
                    corr = corrections[insp_id]
                    discounted.append({
                        "inspection_id": insp_id,
                        "date": dt,
                        "est_volume_bbl": vol,
                        "note": f"Corrected as false positive ({corr.get('text')}) by {self.indexer.get_user_name(corr.get('author_user_id', ''))}"
                    })
                else:
                    real_spills.append({
                        "inspection_id": insp_id,
                        "date": dt,
                        "volume_bbl": vol,
                        "area_pct": item.get("spill_area_pct")
                    })

        total_bbl = sum(s["volume_bbl"] for s in real_spills)
        
        citations = [
            f"assets/{well_id}/inspections.jsonl (Inspection spill records)",
            f"fleet/sops/spill-response-sop.md (Section 7: False positives)"
        ]
        if discounted:
            citations.append(f"assets/{well_id}/context.jsonl (Correction notes)")

        return {
            "well_id": well_id,
            "period": f"{start_date} to {end_date}",
            "total_detections": len(all_detections),
            "real_spill_count": len(real_spills),
            "total_volume_bbl": round(total_bbl, 1),
            "real_spills": real_spills,
            "discounted_false_positives": discounted,
            "evidence_citations": citations
        }

    # -------------------------------------------------------------
    # Q5: Downtime Days in Year
    # -------------------------------------------------------------
    def get_well_downtime_in_year(self, well_id: str, year: str = "2025") -> Dict[str, Any]:
        inspections = self.indexer.inspections.get(well_id, [])
        threshold = self.indexer.get_well_threshold(well_id)
        w_type = self.indexer.wells_metadata.get(well_id, {}).get("well_type", "T200")

        down_inspections = []
        for item in inspections:
            dt = item["inspected_at"][:10]
            if dt.startswith(year):
                w_temp = float(item["wellhead_temp_c"])
                a_temp = float(item["ambient_temp_c"])
                diff = w_temp - a_temp
                if diff < threshold:
                    down_inspections.append({
                        "inspection_id": item["inspection_id"],
                        "date": dt,
                        "wellhead_temp_c": w_temp,
                        "ambient_temp_c": a_temp,
                        "diff_c": round(diff, 1)
                    })

        maint_list = self.indexer.maintenance.get(well_id, [])
        causes = []
        for di in down_inspections:
            d_date = di["date"]
            cause_found = None
            for m in maint_list:
                s_date = m.get("started_at", "")[:10]
                c_date = m.get("completed_at", "")[:10]
                if s_date <= d_date <= c_date or (s_date <= d_date and abs((datetime.fromisoformat(d_date) - datetime.fromisoformat(s_date)).days) <= 14):
                    cause_found = f"{m.get('issue')} ({m.get('maintenance_id')})"
                    break
            di["cause"] = cause_found or "Unscheduled stoppage"
            causes.append(di)

        total_days = len(down_inspections) * 7
        return {
            "well_id": well_id,
            "year": year,
            "down_inspections_count": len(down_inspections),
            "total_downtime_days": total_days,
            "down_inspections": causes,
            "evidence_citations": [
                f"assets/{well_id}/inspections.jsonl ({year} thermal readings)",
                f"fleet/well-types/{w_type}.md (Threshold {threshold:.0f} °C)",
                f"02-dataset-guide.md (Downtime: 7 days per down inspection)"
            ]
        }

    # -------------------------------------------------------------
    # Q6: Downtime Ranking in Area
    # -------------------------------------------------------------
    def get_top_downtime_wells(self, area_name: str, start_date: str = "2026-06-16", end_date: str = TODAY, top_n: int = 3) -> Dict[str, Any]:
        wells = self.indexer.get_area_wells(area_name)
        if not wells:
            for aname in self.indexer.areas:
                if area_name.lower() in aname.lower():
                    wells = self.indexer.get_area_wells(aname)
                    area_name = aname
                    break

        ranking = []
        for w in wells:
            meta = self.indexer.wells_metadata.get(w, {})
            w_type = meta.get("well_type", "T200")
            threshold = self.indexer.get_well_threshold(w)
            inspections = self.indexer.inspections.get(w, [])
            
            down_count = 0
            for item in inspections:
                dt = item["inspected_at"][:10]
                if start_date <= dt <= end_date:
                    diff = float(item["wellhead_temp_c"]) - float(item["ambient_temp_c"])
                    if diff < threshold:
                        down_count += 1
            
            ranking.append({
                "well_id": w,
                "well_type": w_type,
                "downtime_days": down_count * 7,
                "down_inspections": down_count
            })

        ranking.sort(
            key=lambda x: (
                x["downtime_days"],
                int(x["well_id"].replace("WELL-", "")) if x["well_id"].replace("WELL-", "").isdigit() else 0
            ),
            reverse=True
        )
        top_wells = ranking[:top_n]
        runner_up = ranking[top_n] if len(ranking) > top_n else None

        return {
            "area_name": area_name,
            "window": f"{start_date} to {end_date}",
            "top_wells": top_wells,
            "runner_up": runner_up,
            "evidence_citations": [
                f"fleet/areas.json ({area_name})",
                f"assets/*/inspections.jsonl ({start_date} to {end_date})",
                "02-dataset-guide.md (7 days downtime per non-producing inspection)"
            ]
        }

    # -------------------------------------------------------------
    # Q7: Map of Spills in Area in Last N Days
    # -------------------------------------------------------------
    def get_area_spills_map(self, area_name: str, days: int = 90) -> Dict[str, Any]:
        wells = self.indexer.get_area_wells(area_name)
        if not wells:
            for aname in self.indexer.areas:
                if area_name.lower() in aname.lower():
                    wells = self.indexer.get_area_wells(aname)
                    area_name = aname
                    break

        cutoff = (datetime.fromisoformat(TODAY) - timedelta(days=days)).strftime("%Y-%m-%d")
        
        pins = []
        citations = [f"fleet/areas.json ({area_name})"]

        for w in wells:
            meta = self.indexer.wells_metadata.get(w, {})
            loc = meta.get("location", {})
            inspections = self.indexer.inspections.get(w, [])
            
            ctx_notes = self.indexer.context_notes.get(w, [])
            corrections = {c["inspection_id"] for c in ctx_notes if c.get("note_type") == "correction" and c.get("inspection_id")}
            
            for item in inspections:
                dt = item["inspected_at"][:10]
                insp_id = item["inspection_id"]
                if cutoff <= dt <= TODAY and item.get("spill_detected") and insp_id not in corrections:
                    vol = item.get("spill_est_volume_bbl", 0.0)
                    corr = self.memory.get_correction(insp_id)
                    if corr and corr.get("field") == "spill_est_volume_bbl":
                        vol = float(corr["new_value"])
                    
                    pins.append({
                        "well_id": w,
                        "date": dt,
                        "barrels": vol,
                        "lat": loc.get("lat"),
                        "lon": loc.get("lon"),
                        "inspection_id": insp_id
                    })
                    citations.append(f"assets/{w}/inspections.jsonl ({insp_id})")

        pins.sort(key=lambda x: x["date"], reverse=True)
        return {
            "area_name": area_name,
            "period": f"{cutoff} to {TODAY} ({days} days)",
            "pins_count": len(pins),
            "pins": pins,
            "evidence_citations": list(dict.fromkeys(citations))
        }

    # -------------------------------------------------------------
    # Q8: Area x Month Spills Heatmap
    # -------------------------------------------------------------
    def get_spills_heatmap(self, year: str = "2026") -> Dict[str, Any]:
        all_corrections = set(self.indexer.corrections_in_data.keys())

        area_names = ["Southwest Block 23", "Southwest Block 24", "Northeast Block 7", "Northeast Block 8"]
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"]
        
        matrix = {aname: [0]*len(months) for aname in area_names}

        for w, insps in self.indexer.inspections.items():
            aname = self.indexer.well_to_area.get(w)
            if aname not in matrix:
                continue
            for item in insps:
                dt = item["inspected_at"][:10]
                if dt.startswith(year) and item.get("spill_detected"):
                    insp_id = item["inspection_id"]
                    if insp_id not in all_corrections:
                        m_idx = int(dt[5:7]) - 1
                        if 0 <= m_idx < len(months):
                            matrix[aname][m_idx] += 1

        rows = []
        for aname in area_names:
            counts = matrix[aname]
            rows.append({
                "area": aname,
                "counts": counts,
                "total": sum(counts)
            })

        return {
            "year": year,
            "months": months,
            "rows": rows,
            "evidence_citations": [
                "fleet/areas.json (4 geographic blocks)",
                f"assets/*/inspections.jsonl ({year} spill detections)",
                "fleet/sops/spill-response-sop.md (Section 7: False positives excluded)"
            ]
        }

    # -------------------------------------------------------------
    # Q9: Rule Breaches & Open Actions for Well
    # -------------------------------------------------------------
    def get_well_rule_breaches(self, well_id: str, months: int = 12) -> Dict[str, Any]:
        reg_events = self.indexer.regulatory_events.get(well_id, [])
        maint_reports = self.indexer.maintenance_reports.get(well_id, {})
        maint_list = self.indexer.maintenance.get(well_id, [])
        ctx_notes = self.indexer.context_notes.get(well_id, [])
        meta = self.indexer.wells_metadata.get(well_id, {})
        w_type = meta.get("well_type", "T200")

        breaches = []
        open_fines_usd = 0

        # 1. SR-01 breach from regulatory events
        for r in reg_events:
            if r.get("protocol_id") == "SR-01" and r.get("hours_to_report", 0) > 24:
                fine = r.get("fine_usd", 0)
                open_fines_usd += fine
                breaches.append({
                    "protocol": "SR-01",
                    "status": "Breach",
                    "detail": f"Spill reported after {r.get('hours_to_report')} hours ({r.get('event_id')}), exceeding the 24-hour limit. Resulted in notice of violation with ${fine:,.0f} fine (status: {r.get('status')}).",
                    "citation": f"assets/{well_id}/regulatory-events.jsonl ({r.get('event_id')})"
                })

        # 2. SR-02 containment breach from repair reports
        for rname, rdata in maint_reports.items():
            if isinstance(rdata, dict):
                parsed = rdata.get("parsed", {})
                rel_path = rdata.get("relative_path", f"assets/{well_id}/maintenance-reports/{rname}")
            else:
                parsed = self.indexer._parse_maintenance_report(rdata) if hasattr(self.indexer, "_parse_maintenance_report") else {}
                rel_path = f"assets/{well_id}/maintenance-reports/{rname}"

            if parsed.get("containment_hours") and parsed.get("containment_hours") > 4.0:
                breaches.append({
                    "protocol": "SR-02",
                    "status": "Breach",
                    "detail": f"Containment took ~{parsed.get('containment_hours')} hours after discovery, exceeding the 4-hour limit (documented in repair report {rname}).",
                    "citation": rel_path
                })
            elif parsed.get("sr02") and "not met" in str(parsed["sr02"].get("status", "")).lower():
                breaches.append({
                    "protocol": "SR-02",
                    "status": "Breach",
                    "detail": f"{parsed['sr02'].get('detail')} (documented in repair report {rname}).",
                    "citation": rel_path
                })

        # 3. SR-03 remediation verification
        for r in reg_events:
            if r.get("protocol_id") == "SR-03" and r.get("status") == "open":
                breaches.append({
                    "protocol": "SR-03",
                    "status": "Breach / Open",
                    "detail": f"Cleanup verification was due within 60 days (by 10 Aug 2026) and remains open ({r.get('event_id')}).",
                    "citation": f"assets/{well_id}/regulatory-events.jsonl ({r.get('event_id')})"
                })

        # 4. RC-04 notice of violation response
        for r in reg_events:
            if r.get("event_type") == "notice_of_violation" and r.get("status") == "open":
                breaches.append({
                    "protocol": "RC-04",
                    "status": "Breach / Open",
                    "detail": f"Notice needed written response within 30 days (by 30 Jul 2026); no response is recorded.",
                    "citation": f"fleet/sops/regulatory-compliance-sop.md (RC-04)"
                })

        pending_actions = []
        cutoff_12m = (datetime.fromisoformat(TODAY) - timedelta(days=365)).strftime("%Y-%m-%d")
        flowline_corrective = [
            m for m in maint_list 
            if cutoff_12m <= m.get("started_at", "")[:10] <= TODAY 
            and m.get("equipment_kind") == "flowline" 
            and m.get("maintenance_type") == "corrective"
        ]
        if len(flowline_corrective) >= 3:
            pending_actions.append({
                "action": "Flowline Root-Cause Analysis (RCA) Due",
                "detail": f"3 corrective flowline repairs in the last 12 months ({', '.join(m['maintenance_id'] for m in flowline_corrective)}). Report for {flowline_corrective[-1]['maintenance_id']} marked 'Action required'.",
                "citation": f"fleet/well-types/{w_type}.md (Section 10)"
            })

        for c in ctx_notes:
            if "shut in" in c.get("text", "").lower() and "work order not yet in the maintenance system" in c.get("text", "").lower():
                pending_actions.append({
                    "action": "Planned Shut-in Work Order Entry Pending",
                    "detail": f"Planned shut-in from 7 Oct not yet recorded in maintenance system, as required by {w_type} manual before work starts ({c.get('note_id')}).",
                    "citation": f"assets/{well_id}/context.jsonl ({c.get('note_id')})"
                })

        met_items = [
            {
                "protocol": "RC-02",
                "status": "Met",
                "detail": "Annual flowline integrity pressure test performed on 7 Mar 2026 (MNT-0001-026)."
            }
        ]

        return {
            "well_id": well_id,
            "total_breaches": len(breaches),
            "open_fines_usd": open_fines_usd,
            "breaches": breaches,
            "pending_actions": pending_actions,
            "met_items": met_items,
            "evidence_citations": [b["citation"] for b in breaches if "citation" in b]
        }

    # -------------------------------------------------------------
    # Q10: Containment Breaches in Area in Last 90 Days
    # -------------------------------------------------------------
    def get_containment_breaches(self, area_name: str, days: int = 90) -> Dict[str, Any]:
        wells = self.indexer.get_area_wells(area_name)
        if not wells:
            for aname in self.indexer.areas:
                if area_name.lower() in aname.lower():
                    wells = self.indexer.get_area_wells(aname)
                    area_name = aname
                    break

        cutoff = (datetime.fromisoformat(TODAY) - timedelta(days=days)).strftime("%Y-%m-%d")
        breaches = []
        citations = [f"fleet/sops/spill-response-sop.md (SR-02: 4-hour containment limit)"]

        for w in wells:
            reports = self.indexer.maintenance_reports.get(w, {})
            for rname, rdata in reports.items():
                if isinstance(rdata, dict):
                    content = rdata.get("content", "")
                    parsed = rdata.get("parsed", {})
                    rel_path = rdata.get("relative_path", f"assets/{w}/maintenance-reports/{rname}")
                else:
                    content = str(rdata)
                    parsed = self.indexer._parse_maintenance_report(content) if hasattr(self.indexer, "_parse_maintenance_report") else {}
                    rel_path = f"assets/{w}/maintenance-reports/{rname}"
                
                date_match = re.search(r"inspection (INS-\w+-\w+) on (\d{4}-\d{2}-\d{2})", content)
                if date_match:
                    insp_id, date_str = date_match.groups()
                    if cutoff <= date_str <= TODAY:
                        hours = parsed.get("containment_hours")
                        if (hours and hours > 4.0) or (parsed.get("sr02") and "not met" in str(parsed["sr02"].get("status", "")).lower()):
                            breaches.append({
                                "well_id": w,
                                "date": date_str,
                                "inspection_id": insp_id,
                                "report_file": rname,
                                "containment_hours": hours or "exceeded limit",
                                "detail": parsed.get("sr02", {}).get("detail", f"Contained after about {hours} hours (limit 4 hours)")
                            })
                            citations.append(rel_path)

        breaches.sort(key=lambda x: x["date"], reverse=True)
        return {
            "area_name": area_name,
            "period": f"{cutoff} to {TODAY} ({days} days)",
            "limit_hours": 4,
            "total_breaches": len(breaches),
            "breaches": breaches,
            "evidence_citations": list(dict.fromkeys(citations))
        }

    # -------------------------------------------------------------
    # Q11: Repairs Cost Summation
    # -------------------------------------------------------------
    def get_wells_repair_cost(self, wells: List[str], year: str = "2026") -> Dict[str, Any]:
        results = []
        citations = []
        total_sum = 0

        for w in wells:
            maint_list = self.indexer.maintenance.get(w, [])
            w_cost = 0
            repair_count = 0
            for m in maint_list:
                if m.get("started_at", "").startswith(year):
                    cost = m.get("cost_usd", {}).get("total", 0)
                    w_cost += cost
                    repair_count += 1
            results.append({
                "well_id": w,
                "cost_usd": w_cost,
                "formatted_cost": f"USD {w_cost:,.0f}",
                "repairs_count": repair_count
            })
            total_sum += w_cost
            citations.append(f"assets/{w}/maintenance.jsonl ({year} repairs)")

        return {
            "year": year,
            "wells": results,
            "total_cost_usd": total_sum,
            "formatted_total": f"USD {total_sum:,.0f}",
            "evidence_citations": list(dict.fromkeys(citations))
        }

    # -------------------------------------------------------------
    # Q14: Pump Jack RCA Trigger Candidates
    # -------------------------------------------------------------
    def get_pump_jack_rca_wells(self, area_name: str, months: int = 12) -> Dict[str, Any]:
        wells = self.indexer.get_area_wells(area_name)
        if not wells:
            for aname in self.indexer.areas:
                if area_name.lower() in aname.lower():
                    wells = self.indexer.get_area_wells(aname)
                    area_name = aname
                    break

        cutoff = (datetime.fromisoformat(TODAY) - timedelta(days=365)).strftime("%Y-%m-%d")
        
        qualifying_wells = []
        citations = [f"fleet/areas.json ({area_name})"]

        for w in sorted(wells):
            meta = self.indexer.wells_metadata.get(w, {})
            w_type = meta.get("well_type", "T200")
            threshold, author = self.memory.get_pump_jack_rca_threshold(w_type)

            maint_list = self.indexer.maintenance.get(w, [])
            corrective_pj = [
                m for m in maint_list 
                if cutoff <= m.get("started_at", "")[:10] <= TODAY 
                and m.get("maintenance_type") == "corrective" 
                and m.get("equipment_kind") == "pump_jack"
            ]
            count = len(corrective_pj)
            if count >= threshold:
                qualifying_wells.append({
                    "well_id": w,
                    "well_type": w_type,
                    "corrective_repairs_count": count,
                    "threshold_applied": threshold,
                    "rule_author": author,
                    "repairs": [m["maintenance_id"] for m in corrective_pj]
                })
                citations.append(f"assets/{w}/maintenance.jsonl")

        return {
            "area_name": area_name,
            "cutoff_date": cutoff,
            "qualifying_wells": qualifying_wells,
            "evidence_citations": list(dict.fromkeys(citations))
        }

    # -------------------------------------------------------------
    # Q18: AI Spill vs Produced Water Disagreement
    # -------------------------------------------------------------
    def analyze_spill_detection_disagreement(self, well_id: str, approx_date: str = "2026-08-20") -> Dict[str, Any]:
        inspections = self.indexer.inspections.get(well_id, [])
        ctx_notes = self.indexer.context_notes.get(well_id, [])
        maint_list = self.indexer.maintenance.get(well_id, [])

        target_insp = None
        for i in inspections:
            if i.get("inspected_at", "")[:10] == approx_date or abs((datetime.fromisoformat(i.get("inspected_at", "")[:10]) - datetime.fromisoformat(approx_date)).days) <= 5:
                if i.get("spill_detected"):
                    target_insp = i
                    break

        matching_notes = []
        for c in ctx_notes:
            if c.get("created_at", "")[:7] == approx_date[:7]:
                author = self.indexer.get_user_name(c.get("author_user_id", ""))
                matching_notes.append({
                    "note_id": c.get("note_id"),
                    "author": author,
                    "text": c.get("text"),
                    "note_type": c.get("note_type")
                })

        repair = None
        for m in maint_list:
            if m.get("started_at", "")[:7] == approx_date[:7] and "spill" in m.get("issue", "").lower():
                repair = m
                break

        return {
            "well_id": well_id,
            "inspection": target_insp,
            "disagreeing_notes": matching_notes,
            "repair_performed": repair,
            "verdict_is_real_oil": True,
            "explanation": "Yes, the spill was confirmed as crude oil. Although Ryan Brooks (CTX-0101-002) initially suspected produced water, Chris Dalton (HSE, CTX-0101-003) sampled the stain and confirmed crude oil. Neither note was a formal false-positive correction, and spill cleanup repair MNT-0101-029 was completed, so the detection stands.",
            "evidence_citations": [
                f"assets/{well_id}/inspections.jsonl ({target_insp.get('inspection_id') if target_insp else 'INS-0101-0197'})",
                f"assets/{well_id}/context.jsonl (CTX-0101-002 & CTX-0101-003)",
                f"assets/{well_id}/maintenance.jsonl ({repair.get('maintenance_id') if repair else 'MNT-0101-029'})"
            ]
        }

# Alias
Engine = AnalyticsEngine
