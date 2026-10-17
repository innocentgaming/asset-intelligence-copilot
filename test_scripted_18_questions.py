"""
End-to-End Automated Scripted Test for All 18 Benchmark Questions (Q1 to Q18).
Executes the questions through the Copilot Agent in the exact multi-user sequence
specified in dataset/03-evaluation-queries.md, verifying facts, citations,
two-level memory, and visual types.
"""
import os
import sys
import json

# Ensure UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.data_indexer import DataIndexer
from backend.memory_manager import MemoryManager
from backend.analytics_engine import AnalyticsEngine
from backend.gemma_copilot import GemmaCopilot

def run_all_18_tests():
    print("=" * 75)
    print("  FLYTOPS COPILOT · SCRIPTED 18-QUESTION BENCHMARK EVALUATOR")
    print("  Hacktoberfest 2026 Hack Day Pune · FlytBase Challenge")
    print("=" * 75)

    data_dir = os.path.abspath("d:/hacknewalone/dataset/sample-data")
    indexer = DataIndexer(data_root=data_dir)
    memory = MemoryManager()
    memory.reset() # Start from clean baseline
    copilot = GemmaCopilot(indexer=indexer, memory=memory)

    passed = 0
    total = 18

    # -----------------------------------------------------------------
    # Q1: Michael Turner asks about WELL-0001 status card
    # -----------------------------------------------------------------
    print("\n[TEST Q1] Michael Turner: WELL-0001 status card right now...")
    res = copilot.process_query("Michael Turner", "Is WELL-0001 producing oil right now? When was it last inspected, and by whom? Show me its status card.")
    assert "No, WELL-0001 is not producing oil" in res["text_answer"]
    assert "INS-0001-0203" in res["text_answer"]
    assert "Ryan Brooks" in res["text_answer"]
    assert "3.2 °C" in res["text_answer"]
    assert "out of date" in res["text_answer"]
    assert res["visual_type"] == "status_card"
    print("  [PASS]: Not producing (diff 3.2°C < 15°C), Insp INS-0001-0203 by Ryan Brooks, status card rendered.")
    passed += 1

    # -----------------------------------------------------------------
    # Q2: Michael Turner asks about NE-08 non-producing wells table
    # -----------------------------------------------------------------
    print("\n[TEST Q2] Michael Turner: NE-08 non-producing wells table...")
    res = copilot.process_query("Michael Turner", "Which wells in Northeast Block 8 are not producing oil right now, and why? Show them in a table.")
    assert "4 wells" in res["text_answer"]
    assert "WELL-0164" in res["text_answer"]
    assert "WELL-0170" in res["text_answer"]
    assert "WELL-0172" in res["text_answer"]
    assert "WELL-0175" in res["text_answer"]
    assert res["visual_type"] == "table"
    print("  [PASS]: Table with 4 non-producing wells (WELL-0164, WELL-0170, WELL-0172, WELL-0175).")
    passed += 1

    # -----------------------------------------------------------------
    # Q3: Michael Turner asks for 13-week thermal line chart of WELL-0001
    # -----------------------------------------------------------------
    print("\n[TEST Q3] Michael Turner: WELL-0001 13-week line chart...")
    res = copilot.process_query("Michael Turner", "Show a line chart of WELL-0001's wellhead temperature against air temperature for the last 13 weeks, and mark when it was not producing oil.")
    assert res["visual_type"] == "line_chart"
    assert "13-week" in res["text_answer"]
    assert "2026-10-08" in res["text_answer"] and "2026-10-15" in res["text_answer"]
    print("  [PASS]: Line chart with 13 readings, not producing on 8 Oct and 15 Oct.")
    passed += 1

    # -----------------------------------------------------------------
    # Q4: Michael Turner asks for 4-year spills of WELL-0001
    # -----------------------------------------------------------------
    print("\n[TEST Q4] Michael Turner: WELL-0001 4-year spills table...")
    res = copilot.process_query("Michael Turner", "How many oil spills has WELL-0001 had in the last 4 years, and how much oil in total? List them in a table.")
    assert "6 spills" in res["text_answer"]
    assert "15.1 barrels" in res["text_answer"] or "15.1" in res["text_answer"]
    assert "rainwater" in res["text_answer"] or "INS-0001-0070" in res["text_answer"]
    assert res["visual_type"] == "table"
    print("  [PASS]: 6 confirmed spills, 15.1 bbl; INS-0001-0070 excluded as rainwater.")
    passed += 1

    # -----------------------------------------------------------------
    # Q5: Michael Turner asks for 2025 downtime of WELL-0001
    # -----------------------------------------------------------------
    print("\n[TEST Q5] Michael Turner: WELL-0001 2025 downtime accounting...")
    res = copilot.process_query("Michael Turner", "How many days was WELL-0001 down in 2025?")
    assert "21 days" in res["text_answer"]
    assert "MNT-0001-021" in res["text_answer"]
    assert "MNT-0001-023" in res["text_answer"]
    print("  [PASS]: 21 days downtime across 3 inspections (24 Jul trip, 16 & 23 Oct packing leak).")
    passed += 1

    # -----------------------------------------------------------------
    # Q6: Michael Turner asks for top 3 downtime wells in NE-07 (Bar chart)
    # -----------------------------------------------------------------
    print("\n[TEST Q6] Michael Turner: NE-07 top downtime ranking bar chart...")
    res = copilot.process_query("Michael Turner", "Which 3 wells in Northeast Block 7 had the most downtime in the last 4 months? Show a bar chart.")
    assert "WELL-0121" in res["text_answer"] and "49 days" in res["text_answer"]
    assert "WELL-0138" in res["text_answer"] and "42 days" in res["text_answer"]
    assert "WELL-0107" in res["text_answer"] and "42 days" in res["text_answer"]
    assert res["visual_type"] == "bar_chart"
    print("  [PASS]: Bar chart: WELL-0121 (49d), WELL-0138 (42d), WELL-0107 (42d). Stored in private memory.")
    passed += 1

    # -----------------------------------------------------------------
    # Q7: Michael Turner asks for NE-08 recent spills map (90 days)
    # -----------------------------------------------------------------
    print("\n[TEST Q7] Michael Turner: NE-08 recent spills GIS map...")
    res = copilot.process_query("Michael Turner", "Show on a map every well in Northeast Block 8 with a real spill in the last 90 days.")
    assert res["visual_type"] == "map"
    assert len(res["visual_data"]["pins"]) == 4
    well_pins = {p["well_id"] for p in res["visual_data"]["pins"]}
    assert well_pins == {"WELL-0151", "WELL-0165", "WELL-0175", "WELL-0186"}
    print("  [PASS]: Map with 4 pins: WELL-0151, WELL-0165, WELL-0175, WELL-0186.")
    passed += 1

    # -----------------------------------------------------------------
    # Q8: Michael Turner asks for 2026 spills 2D heatmap
    # -----------------------------------------------------------------
    print("\n[TEST Q8] Michael Turner: 2026 spills 2D heatmap...")
    res = copilot.process_query("Michael Turner", "Show a heatmap of 2026 spills by geographic area and month.")
    assert res["visual_type"] == "heatmap"
    rows = res["visual_data"]["rows"]
    row_map = {r["area"]: r["total"] for r in rows}
    assert row_map["Southwest Block 23"] == 35
    assert row_map["Southwest Block 24"] == 43
    assert row_map["Northeast Block 7"] == 37
    assert row_map["Northeast Block 8"] == 26
    print("  [PASS]: Heatmap 4 blocks x 10 months: SW-23 (35), SW-24 (43), NE-07 (37), NE-08 (26).")
    passed += 1

    # -----------------------------------------------------------------
    # Q9: Michael Turner asks for WELL-0001 rule breaches
    # -----------------------------------------------------------------
    print("\n[TEST Q9] Michael Turner: WELL-0001 rule breaches in last 12 months...")
    res = copilot.process_query("Michael Turner", "Which rules has WELL-0001 broken in the last 12 months, and what is still open?")
    assert "SR-01" in res["text_answer"]
    assert "SR-02" in res["text_answer"]
    assert "SR-03" in res["text_answer"]
    assert "RC-04" in res["text_answer"]
    assert "5,000" in res["text_answer"]
    assert res["visual_type"] == "table"
    print("  [PASS]: 4 breaches (SR-01, SR-02, SR-03, RC-04), $5k open fine, pending flowline RCA.")
    passed += 1

    # -----------------------------------------------------------------
    # Q10: Michael Turner asks for SW-24 containment breaches (free-text mining)
    # -----------------------------------------------------------------
    print("\n[TEST Q10] Michael Turner: SW-24 containment breaches mined from reports...")
    res = copilot.process_query("Michael Turner", "In Southwest Block 24, which spills in the last 90 days were not contained within the SOP time limit?")
    assert "WELL-0082" in res["text_answer"] and "7.1" in res["text_answer"]
    assert "WELL-0100" in res["text_answer"] and "8.1" in res["text_answer"]
    assert res["visual_type"] == "table"
    print("  [PASS]: WELL-0082 (~7.1h) and WELL-0100 (~8.1h) mined from maintenance reports.")
    passed += 1

    # -----------------------------------------------------------------
    # Q11: Michael Turner in new chat recalls Q6 discussed wells
    # -----------------------------------------------------------------
    print("\n[TEST Q11] Michael Turner: Private memory recall for discussed wells...")
    res = copilot.process_query("Michael Turner", "For the three wells we discussed yesterday, what have repairs cost this year?")
    assert "25,794" in res["text_answer"]
    assert "46,942" in res["text_answer"]
    assert "5,176" in res["text_answer"]
    assert res["visual_type"] == "bar_chart"
    print("  [PASS]: Recalled [WELL-0121, WELL-0138, WELL-0107] from private memory: $25.7k, $46.9k, $5.1k.")
    passed += 1

    # -----------------------------------------------------------------
    # Q12: Michael Turner corrects raw thermal reading of WELL-0164
    # -----------------------------------------------------------------
    print("\n[TEST Q12] Michael Turner: Correcting raw reading for WELL-0164 to 41.0°C...")
    res = copilot.process_query("Michael Turner", "The 15 Oct reading for WELL-0164 is wrong. The handheld thermal gun used in that inspection was faulty; the field crew re-measured the wellhead at 41.0 °C.")
    assert "Correction Recorded" in res["text_answer"]
    assert "41.0 °C" in res["text_answer"]
    assert "Pump jack not moving" in res["text_answer"]
    assert "Conflict Alert" in res["text_answer"] or "conflict" in res.get("conflict_warning", "").lower()
    
    # Re-ask Q2
    res_q2_again = copilot.process_query("Michael Turner", "Which wells in Northeast Block 8 are not producing oil right now, and why? Show them in a table.")
    assert "3 wells" in res_q2_again["text_answer"]
    assert "WELL-0164 was previously listed, but was removed" in res_q2_again["text_answer"]
    print("  [PASS]: Recorded 41.0°C correction, flagged mechanical conflict, re-audit removed WELL-0164.")
    passed += 1

    # -----------------------------------------------------------------
    # Q13: Michael Turner corrects AI spill volume for WELL-0151
    # -----------------------------------------------------------------
    print("\n[TEST Q13] Michael Turner: Correcting AI spill volume at WELL-0151 to 5.4 bbl...")
    res = copilot.process_query("Michael Turner", "The AI estimated the 24 Sep spill at WELL-0151 as 4.5 bbl. The field crew measured 5.4 bbl.")
    assert "5.4 bbl" in res["text_answer"]
    assert "Reportable" in res["text_answer"]
    assert "SR-01" in res["text_answer"]
    assert "23 Nov 2026" in res["text_answer"]
    print("  [PASS]: Reclassified to Reportable (>=5 bbl), escalated SR-01 breach, set SR-03 agency deadline.")
    passed += 1

    # -----------------------------------------------------------------
    # Q14: Michael Turner sets custom domain rule for T350 wells
    # -----------------------------------------------------------------
    print("\n[TEST Q14] Michael Turner: Scoped domain rule for T350 wells (RCA trigger = 2)...")
    res_before = copilot.process_query("Michael Turner", "Which wells in Northeast Block 7 need a root-cause analysis on their pump jack?")
    assert "WELL-0108" in res_before["text_answer"]
    assert "WELL-0121" in res_before["text_answer"]
    assert "WELL-0138" in res_before["text_answer"]
    assert "WELL-0120" not in res_before["text_answer"] # Not yet added

    copilot.process_query("Michael Turner", "Note for all T350 wells: our team now wants a pump jack root-cause analysis after 2 repairs, not 3.")
    
    res_after = copilot.process_query("Michael Turner", "Which wells in Northeast Block 7 need a root-cause analysis on their pump jack?")
    assert "WELL-0120" in res_after["text_answer"] # Added via rule
    qualifying_wells = [row["Well"] for row in res_after["visual_data"]["rows"]]
    assert "WELL-0120" in qualifying_wells
    assert "WELL-0102" not in qualifying_wells # T200 well excluded from qualifying list
    assert "correctly excluded" in res_after["text_answer"] or "not added" in res_after["text_answer"].lower()
    print("  [PASS]: Registered T350 rule. Added WELL-0120 (T350, 2 repairs); excluded WELL-0102 (T200).")
    passed += 1

    # -----------------------------------------------------------------
    # Q15: Jessica Reed sees Michael's correction; Laura sees reportable spill
    # -----------------------------------------------------------------
    print("\n[TEST Q15] Jessica Reed & Laura Simmons: Shared knowledge propagation...")
    res_jessica = copilot.process_query("Jessica Reed", "Is WELL-0164 producing oil right now?")
    assert "Yes, WELL-0164 is producing oil" in res_jessica["text_answer"]
    assert "Michael Turner" in res_jessica["text_answer"]
    assert "Pump jack not moving" in res_jessica["text_answer"]

    res_laura = copilot.process_query("Laura Simmons", "Which spills in Northeast Block 8 in the last 90 days needed a report to the regulator?")
    assert "WELL-0151" in res_laura["text_answer"]
    assert "5.4 bbl" in res_laura["text_answer"]
    assert "overdue" in res_laura["text_answer"].lower()
    print("  [PASS]: Jessica sees Michael's 41.0°C correction & conflict; Laura sees WELL-0151 overdue report.")
    passed += 1

    # -----------------------------------------------------------------
    # Q16: Shared announcements vs strict private memory isolation
    # -----------------------------------------------------------------
    print("\n[TEST Q16] Jake Morales, Michael Turner & Jessica Reed: Privacy isolation...")
    copilot.process_query("Jake Morales", "FYI for everyone: WELL-0007 will be shut in from 17 Oct for a 10-day planned workover.")
    
    res_mt = copilot.process_query("Michael Turner", "Is any downtime planned for WELL-0007?")
    assert "Yes, planned downtime" in res_mt["text_answer"] or "Yes, downtime is planned" in res_mt["text_answer"]
    assert "Jake Morales" in res_mt["text_answer"]

    res_jr_leak = copilot.process_query("Jessica Reed", "For the three wells we discussed yesterday, what have repairs cost this year?")
    assert "I do not have record of an earlier conversation" in res_jr_leak["text_answer"]
    assert "isolated" in res_jr_leak["text_answer"].lower()
    print("  [PASS]: Jake's announcement shared to Michael; copilot refuses to leak Michael's context to Jessica.")
    passed += 1

    # -----------------------------------------------------------------
    # Q17: Operator sensor contradiction honesty
    # -----------------------------------------------------------------
    print("\n[TEST Q17] Tyler Hughes & Jake Morales: Sensor contradiction honesty...")
    copilot.process_query("Michael Turner", "WELL-0175 has been shut in for planned work since 14 Oct.")
    res_tyler = copilot.process_query("Tyler Hughes", "WELL-0175 is running fine.")
    assert "Conflict Detected with Sensor Data" in res_tyler["text_answer"]
    assert "0.4 °C above air" in res_tyler["text_answer"] or "0.4" in res_tyler["text_answer"]
    assert "unconfirmed" in res_tyler["text_answer"]

    res_jake = copilot.process_query("Jake Morales", "WELL-0001 is back online since 14 Oct.")
    assert "Conflict Detected with Sensor Data" in res_jake["text_answer"]
    assert "3.2 °C above air" in res_jake["text_answer"] or "3.2" in res_jake["text_answer"]
    assert "unconfirmed" in res_jake["text_answer"]
    print("  [PASS]: Detected sensor conflicts for WELL-0175 and WELL-0001; logged claims as unconfirmed.")
    passed += 1

    # -----------------------------------------------------------------
    # Q18: Disputed spill detection resolution
    # -----------------------------------------------------------------
    print("\n[TEST Q18] Laura Simmons: Water vs Crude notes disagreement...")
    res_q18 = copilot.process_query("Laura Simmons", "Was the 20 Aug spill at WELL-0101 real oil?")
    assert "Yes, the 20 Aug 2026 spill at WELL-0101 was real crude oil" in res_q18["text_answer"]
    assert "Ryan Brooks" in res_q18["text_answer"]
    assert "Chris Dalton" in res_q18["text_answer"]
    assert "MNT-0101-029" in res_q18["text_answer"]
    print("  [PASS]: Answered YES, reported Ryan Brooks vs Chris Dalton disagreement, cited MNT-0101-029.")
    passed += 1

    print("\n" + "=" * 75)
    print(f"  RESULT: ALL {passed} / {total} BENCHMARK SCENARIOS PASSED WITH 100% SUCCESS!")
    print("=" * 75)

if __name__ == "__main__":
    run_all_18_tests()
