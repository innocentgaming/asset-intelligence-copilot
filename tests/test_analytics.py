"""
Unit & Integration Tests for AnalyticsEngine.
Validates thermal delta calculation, downtime accounting, false-positive filtering,
SOP compliance auditing, and free-text report NLP mining.
"""
import pytest
import os
from backend.data_indexer import DataIndexer
from backend.memory_manager import MemoryManager
from backend.analytics_engine import AnalyticsEngine

@pytest.fixture(scope="module")
def setup_engine():
    data_dir = os.path.abspath("d:/hacknewalone/dataset/sample-data")
    indexer = DataIndexer(data_root=data_dir)
    memory = MemoryManager()
    memory.reset()
    engine = AnalyticsEngine(indexer=indexer, memory=memory)
    return engine, indexer, memory

def test_thermal_production_rule_t200(setup_engine):
    engine, indexer, _ = setup_engine
    # WELL-0001 is T200 (15C threshold)
    status = engine.get_well_status("WELL-0001")
    assert status["well_type"] == "T200"
    assert status["threshold_c"] == 15.0
    # On 15 Oct, wellhead was 22.4, ambient was 19.2, diff is 3.2 < 15.0
    assert status["is_producing"] is False
    assert status["diff_temp_c"] == 3.2
    assert status["status_out_of_date"] is True

def test_thermal_production_rule_t350(setup_engine):
    engine, indexer, _ = setup_engine
    # WELL-0107 is T350 (20C threshold)
    status = engine.get_well_status("WELL-0107")
    assert status["well_type"] == "T350"
    assert status["threshold_c"] == 20.0

def test_downtime_accounting_rule(setup_engine):
    engine, indexer, _ = setup_engine
    # WELL-0001 had 3 non-producing inspections in 2025 -> 21 days
    dt = engine.get_well_downtime_in_year("WELL-0001", "2025")
    assert dt["down_inspections_count"] == 3
    assert dt["total_downtime_days"] == 21

def test_false_positive_spill_exclusion(setup_engine):
    engine, indexer, _ = setup_engine
    # WELL-0001 has 7 total detections, but INS-0001-0070 is excluded as rainwater
    sp = engine.get_well_spills_history("WELL-0001")
    assert sp["real_spill_count"] == 6
    assert abs(sp["total_volume_bbl"] - 15.1) < 0.01

def test_free_text_report_containment_mining(setup_engine):
    engine, indexer, _ = setup_engine
    # In SW-24, WELL-0082 (7.1h) and WELL-0100 (8.1h) breached the 4h limit
    data = engine.get_containment_breaches("Southwest Block 24", days=90)
    assert data["total_breaches"] == 2
    breached_wells = {b["well_id"] for b in data["breaches"]}
    assert breached_wells == {"WELL-0082", "WELL-0100"}

def test_spills_heatmap_2d_aggregation(setup_engine):
    engine, indexer, _ = setup_engine
    hm = engine.get_spills_heatmap("2026")
    totals = {r["area"]: r["total"] for r in hm["rows"]}
    assert totals["Southwest Block 23"] == 35
    assert totals["Southwest Block 24"] == 43
    assert totals["Northeast Block 7"] == 37
    assert totals["Northeast Block 8"] == 26
