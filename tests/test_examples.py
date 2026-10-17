"""
Test suite validating the 18 example scenarios from 03-evaluation-queries.md.
Tests deterministic engine calculations, memory scopes, and domain rules.
Usage: python tests/test_examples.py [data_path]
"""
import sys
import os
from typing import List

# Add workspace root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from copilot.data import DataIndexer
from copilot.memory import MemoryManager
from copilot.engine import AnalyticsEngine

def run_all_tests(data_path: str = "ds/sample-data") -> bool:
    print(f"Running 23 benchmark tests against: {data_path}...")
    indexer = DataIndexer(data_path)
    memory = MemoryManager()
    memory.reset()
    engine = AnalyticsEngine(indexer, memory)

    passed = 0
    failed = 0

    def check(test_id: str, description: str, condition: bool, err_msg: str = ""):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  [PASS] {test_id}: {description}")
        else:
            failed += 1
            print(f"  [FAIL] {test_id}: {description} -> {err_msg}")

    # -------------------------------------------------------------
    # 1. Q1 Part 1: WELL-0001 Production Status
    # -------------------------------------------------------------
    st1 = engine.get_well_status("WELL-0001")
    check(
        "T01 (Q1)", "WELL-0001 is not producing oil (diff 3.2°C < 15°C threshold)",
        st1["is_producing"] is False and st1["diff_temp_c"] == 3.2 and st1["threshold_c"] == 15.0,
        f"diff={st1.get('diff_temp_c')}, is_producing={st1.get('is_producing')}"
    )

    # -------------------------------------------------------------
    # 2. Q1 Part 2: WELL-0001 Inspector, Method, Context Note & Out-of-date Status
    # -------------------------------------------------------------
    check(
        "T02 (Q1)", "WELL-0001 latest inspection INS-0001-0203 by Ryan Brooks with planned shut-in note",
        st1["last_inspection_id"] == "INS-0001-0203" 
        and st1["inspector_name"] == "Ryan Brooks" 
        and "CTX-0001-003" in st1["reason"] 
        and st1["status_out_of_date"] is True,
        f"insp={st1.get('last_inspection_id')}, inspector={st1.get('inspector_name')}, reason={st1.get('reason')}"
    )

    # -------------------------------------------------------------
    # 3. Q2: Non-producing wells in Northeast Block 8
    # -------------------------------------------------------------
    ne8 = engine.get_down_wells_in_area("Northeast Block 8")
    down_ids = [w["well_id"] for w in ne8["down_wells"]]
    check(
        "T03 (Q2)", "Northeast Block 8 has 4 down wells (WELL-0164, 0170, 0172, 0175)",
        sorted(down_ids) == ["WELL-0164", "WELL-0170", "WELL-0172", "WELL-0175"],
        f"down_ids={down_ids}"
    )

    # -------------------------------------------------------------
    # 4. Q3: WELL-0001 13-week temperature trend
    # -------------------------------------------------------------
    ts = engine.get_well_temp_timeseries("WELL-0001", weeks=13)
    check(
        "T04 (Q3)", "WELL-0001 13-week trend has 13 readings; down on 8 Oct and 15 Oct",
        ts["weeks_count"] == 13 and ts["not_producing_dates"] == ["2026-10-08", "2026-10-15"],
        f"weeks={ts.get('weeks_count')}, not_producing={ts.get('not_producing_dates')}"
    )

    # -------------------------------------------------------------
    # 5. Q4: WELL-0001 4-year spills audit with rainwater false positive removed
    # -------------------------------------------------------------
    spills = engine.get_well_spills_history("WELL-0001")
    check(
        "T05 (Q4)", "WELL-0001 4-year spills total 6 confirmed spills and 15.1 bbl (rainwater excluded)",
        spills["real_spill_count"] == 6 and spills["total_volume_bbl"] == 15.1 and len(spills["discounted_false_positives"]) == 1,
        f"real_spills={spills.get('real_spill_count')}, vol={spills.get('total_volume_bbl')}"
    )

    # -------------------------------------------------------------
    # 6. Q5: WELL-0001 2025 downtime accounting
    # -------------------------------------------------------------
    dt2025 = engine.get_well_downtime_in_year("WELL-0001", "2025")
    check(
        "T06 (Q5)", "WELL-0001 down 21 days in 2025 across 3 inspections (prime mover & packing leak)",
        dt2025["total_downtime_days"] == 21 and dt2025["down_inspections_count"] == 3,
        f"days={dt2025.get('total_downtime_days')}, count={dt2025.get('down_inspections_count')}"
    )

    # -------------------------------------------------------------
    # 7. Q6: Northeast Block 7 top downtime ranking
    # -------------------------------------------------------------
    top_ne7 = engine.get_top_downtime_wells("Northeast Block 7", start_date="2026-06-16", end_date="2026-10-16", top_n=3)
    top_wells_summary = [(w["well_id"], w["downtime_days"]) for w in top_ne7["top_wells"]]
    check(
        "T07 (Q6)", "Northeast Block 7 top downtime: WELL-0121 (49d), WELL-0138 (42d), WELL-0107 (42d)",
        top_wells_summary == [("WELL-0121", 49), ("WELL-0138", 42), ("WELL-0107", 42)],
        f"top_wells={top_wells_summary}"
    )
    # Cache discussed wells in Michael Turner's private session for Q11
    memory.set_user_discussed_wells("michael turner", ["WELL-0121", "WELL-0138", "WELL-0107"])

    # -------------------------------------------------------------
    # 8. Q7: Recent spills geospatial map in Northeast Block 8
    # -------------------------------------------------------------
    map_ne8 = engine.get_area_spills_map("Northeast Block 8", days=90)
    map_well_ids = sorted([p["well_id"] for p in map_ne8["pins"]])
    check(
        "T08 (Q7)", "Northeast Block 8 recent spills map has 4 pins (WELL-0151, 0165, 0175, 0186)",
        map_well_ids == ["WELL-0151", "WELL-0165", "WELL-0175", "WELL-0186"],
        f"pins={map_well_ids}"
    )

    # -------------------------------------------------------------
    # 9. Q8: 2026 spills 2D heatmap matrix
    # -------------------------------------------------------------
    heatmap = engine.get_spills_heatmap("2026")
    area_totals = {r["area"]: r["total"] for r in heatmap["rows"]}
    check(
        "T09 (Q8)", "2026 area heatmap totals match: SW-23:35, SW-24:43, NE-07:37, NE-08:26",
        area_totals.get("Southwest Block 23") == 35 and
        area_totals.get("Southwest Block 24") == 43 and
        area_totals.get("Northeast Block 7") == 37 and
        area_totals.get("Northeast Block 8") == 26,
        f"totals={area_totals}"
    )

    # -------------------------------------------------------------
    # 10. Q9: WELL-0001 rule breaches & open fines
    # -------------------------------------------------------------
    breaches = engine.get_well_rule_breaches("WELL-0001", months=12)
    b_protocols = [b["protocol"] for b in breaches["breaches"]]
    check(
        "T10 (Q9)", "WELL-0001 has 4 breaches (SR-01, SR-02, SR-03, RC-04), $5,000 fine, flowline RCA pending",
        "SR-01" in b_protocols and "SR-02" in b_protocols and "SR-03" in b_protocols and "RC-04" in b_protocols
        and breaches["open_fines_usd"] == 5000 and len(breaches["pending_actions"]) >= 1,
        f"protocols={b_protocols}, fines={breaches.get('open_fines_usd')}"
    )

    # -------------------------------------------------------------
    # 11. Q10: Southwest Block 24 containment breaches mined from reports
    # -------------------------------------------------------------
    cb24 = engine.get_containment_breaches("Southwest Block 24", days=90)
    cb_wells = sorted([b["well_id"] for b in cb24["breaches"]])
    check(
        "T11 (Q10)", "Southwest Block 24 has 2 containment limit breaches (WELL-0082 ~7.1h, WELL-0100 ~8.1h)",
        cb_wells == ["WELL-0082", "WELL-0100"],
        f"wells={cb_wells}"
    )

    # -------------------------------------------------------------
    # 12. Q11: Private memory recall of discussed wells 2026 repair costs
    # -------------------------------------------------------------
    m_ctx = memory.get_user_context("michael turner")
    discussed = m_ctx.get("discussed_wells", [])
    rep_costs = engine.get_wells_repair_cost(discussed, "2026")
    cost_map = {w["well_id"]: w["cost_usd"] for w in rep_costs["wells"]}
    check(
        "T12 (Q11)", "Recalled discussed wells repair costs: WELL-0121 ($25,794), WELL-0138 ($46,942), WELL-0107 ($5,176)",
        cost_map.get("WELL-0121") == 25794 and cost_map.get("WELL-0138") == 46942 and cost_map.get("WELL-0107") == 5176,
        f"costs={cost_map}"
    )

    # -------------------------------------------------------------
    # 13. Q12 Part 1: Raw sensor correction for WELL-0164
    # -------------------------------------------------------------
    memory.add_correction(
        inspection_id="INS-0164-0205",
        field="wellhead_temp_c",
        new_value=41.0,
        original_value=24.0,
        author="Michael Turner",
        reason="Handheld thermal gun faulty; field crew re-measured reading.",
        well_id="WELL-0164"
    )
    st164 = engine.get_well_status("WELL-0164")
    check(
        "T13 (Q12)", "WELL-0164 corrected reading 41.0°C results in producing status with inspector conflict flagged",
        st164["is_producing"] is True and st164["wellhead_temp_c"] == 41.0 and st164["inspector_conflict"] is not None,
        f"producing={st164.get('is_producing')}, temp={st164.get('wellhead_temp_c')}, conflict={st164.get('inspector_conflict')}"
    )

    # -------------------------------------------------------------
    # 14. Q12 Part 2: Re-checking Q2 down wells after correction
    # -------------------------------------------------------------
    ne8_recheck = engine.get_down_wells_in_area("Northeast Block 8")
    ne8_down_recheck = [w["well_id"] for w in ne8_recheck["down_wells"]]
    check(
        "T14 (Q12)", "Northeast Block 8 down wells re-audit now has 3 wells (WELL-0164 removed)",
        sorted(ne8_down_recheck) == ["WELL-0170", "WELL-0172", "WELL-0175"],
        f"down_recheck={ne8_down_recheck}"
    )

    # -------------------------------------------------------------
    # 15. Q13: AI volume correction and regulatory escalation
    # -------------------------------------------------------------
    memory.add_correction(
        inspection_id="INS-0151-0201",
        field="spill_est_volume_bbl",
        new_value=5.4,
        original_value=4.5,
        author="Michael Turner",
        reason="Field crew measured 5.4 bbl.",
        well_id="WELL-0151"
    )
    corr151 = memory.get_correction("INS-0151-0201")
    check(
        "T15 (Q13)", "WELL-0151 spill volume corrected to 5.4 bbl (reportable under SOP-SR >= 5.0 bbl)",
        corr151 is not None and float(corr151["new_value"]) == 5.4,
        f"corr151={corr151}"
    )

    # -------------------------------------------------------------
    # 16. Q14 Part 1: Default pump jack RCA candidates in NE-07
    # -------------------------------------------------------------
    rca_default = engine.get_pump_jack_rca_wells("Northeast Block 7")
    rca_default_wells = sorted([w["well_id"] for w in rca_default["qualifying_wells"]])
    check(
        "T16 (Q14)", "Default pump jack RCA in NE-07 identifies 3 wells with >= 3 repairs (WELL-0108, 0121, 0138)",
        rca_default_wells == ["WELL-0108", "WELL-0121", "WELL-0138"],
        f"rca_wells={rca_default_wells}"
    )

    # -------------------------------------------------------------
    # 17. Q14 Part 2: Scoped custom rule for T350 wells (threshold = 2)
    # -------------------------------------------------------------
    memory.set_type_rule(
        rule_name="pump_jack_rca_threshold",
        well_type="T350",
        threshold=2,
        author="Michael Turner",
        note="Team wants pump jack RCA after 2 repairs for T350 wells"
    )
    rca_custom = engine.get_pump_jack_rca_wells("Northeast Block 7")
    rca_custom_wells = sorted([w["well_id"] for w in rca_custom["qualifying_wells"]])
    check(
        "T17 (Q14)", "Scoped T350 rule adds WELL-0120 (T350, 2 repairs) and excludes WELL-0102 (T200, 2 repairs)",
        rca_custom_wells == ["WELL-0108", "WELL-0120", "WELL-0121", "WELL-0138"],
        f"rca_custom_wells={rca_custom_wells}"
    )

    # -------------------------------------------------------------
    # 18. Q15 Part 1: Shared correction propagation to Jessica Reed
    # -------------------------------------------------------------
    st164_jessica = engine.get_well_status("WELL-0164")
    check(
        "T18 (Q15)", "Jessica Reed sees Michael Turner's 41.0°C correction for WELL-0164 (producing=True)",
        st164_jessica["is_producing"] is True and "Michael Turner" in str(st164_jessica.get("corrected_note")),
        f"producing={st164_jessica.get('is_producing')}, note={st164_jessica.get('corrected_note')}"
    )

    # -------------------------------------------------------------
    # 19. Q15 Part 2: Laura Simmons sees WELL-0151 overdue report
    # -------------------------------------------------------------
    ne8_spills = engine.get_area_spills_map("Northeast Block 8", days=90)
    spill151 = next((p for p in ne8_spills["pins"] if p["well_id"] == "WELL-0151"), None)
    check(
        "T19 (Q15)", "Laura Simmons sees WELL-0151 with corrected 5.4 bbl volume as reportable",
        spill151 is not None and spill151["barrels"] == 5.4,
        f"spill151={spill151}"
    )

    # -------------------------------------------------------------
    # 20. Q16 Part 1: Shared operational announcement for Michael Turner
    # -------------------------------------------------------------
    memory.add_shared_note(
        well_id="WELL-0007",
        text="WELL-0007 will be shut in from 17 Oct for a 10-day planned workover.",
        author="Jake Morales",
        valid_from="2026-10-17",
        valid_to="2026-10-27"
    )
    shared7 = memory.get_shared_notes_for_well("WELL-0007")
    check(
        "T20 (Q16)", "Michael Turner sees Jake Morales's planned shut-in announcement for WELL-0007",
        len(shared7) > 0 and "Jake Morales" in shared7[0]["author"] and "17 Oct" in shared7[0]["text"],
        f"shared7={shared7}"
    )

    # -------------------------------------------------------------
    # 21. Q16 Part 2: Private user memory isolation for Jessica Reed
    # -------------------------------------------------------------
    jessica_ctx = memory.get_user_context("jessica reed")
    jessica_discussed = jessica_ctx.get("discussed_wells", [])
    check(
        "T21 (Q16)", "Jessica Reed has no access to Michael Turner's discussed wells context (isolation verified)",
        len(jessica_discussed) == 0,
        f"jessica_discussed={jessica_discussed}"
    )

    # -------------------------------------------------------------
    # 22. Q17: Unconfirmed field claims logged against sensor evidence
    # -------------------------------------------------------------
    memory.add_unconfirmed_claim(
        well_id="WELL-0175",
        claim="WELL-0175 is running fine.",
        author="Tyler Hughes",
        contradicting_evidence="15 Oct inspection INS-0175-0205 shows wellhead 0.4°C above air (< 15°C threshold)."
    )
    claims175 = memory.unconfirmed_claims
    check(
        "T22 (Q17)", "Tyler Hughes claim for WELL-0175 logged as unconfirmed against physical sensor reading",
        len(claims175) >= 1 and claims175[-1]["status"] == "unconfirmed",
        f"claims={claims175}"
    )

    # -------------------------------------------------------------
    # 23. Q18: Disputed spill investigation (produced water vs crude oil)
    # -------------------------------------------------------------
    disagree = engine.analyze_spill_detection_disagreement("WELL-0101", approx_date="2026-08-20")
    check(
        "T23 (Q18)", "WELL-0101 spill is confirmed real oil; cites Ryan Brooks vs Chris Dalton disagreement",
        disagree["verdict_is_real_oil"] is True and len(disagree["disagreeing_notes"]) >= 2,
        f"verdict={disagree.get('verdict_is_real_oil')}, notes={disagree.get('disagreeing_notes')}"
    )

    print("=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    return failed == 0

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "ds/sample-data"
    success = run_all_tests(path)
    if not success:
        sys.exit(1)
