"""
Unit Tests for MemoryManager (Two-Level Memory with SQLite Persistence).
Validates raw data corrections, AI volume updates, type-scoped domain rules,
operational announcements, unconfirmed claims, and private user session isolation.
"""
import pytest
import os
import tempfile
from backend.memory_manager import MemoryManager

@pytest.fixture
def temp_memory():
    f = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    db_path = f.name
    f.close()
    mem = MemoryManager(db_path=db_path)
    mem.reset()
    yield mem
    mem.reset()
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
    except Exception:
        pass

def test_raw_correction_persistence(temp_memory):
    temp_memory.add_correction(
        inspection_id="INS-0164-0205",
        field="wellhead_temp_c",
        new_value=41.0,
        original_value=24.0,
        author="Michael Turner",
        reason="Faulty handheld thermal gun; field crew re-measured.",
        well_id="WELL-0164"
    )
    corr = temp_memory.get_correction("INS-0164-0205")
    assert corr is not None
    assert corr["new_value"] == 41.0
    assert corr["author"] == "Michael Turner"

def test_type_scoped_custom_rule(temp_memory):
    # Standard threshold is 3
    thresh_default, author = temp_memory.get_pump_jack_rca_threshold("T350")
    assert thresh_default == 3
    assert author is None

    # Set custom rule for T350 only
    temp_memory.set_type_rule(
        rule_name="pump_jack_rca_threshold",
        well_type="T350",
        threshold=2,
        author="Michael Turner",
        note="Team wants RCA after 2 repairs for T350"
    )

    # T350 should now return 2 with author
    thresh_t350, author_t350 = temp_memory.get_pump_jack_rca_threshold("T350")
    assert thresh_t350 == 2
    assert author_t350 == "Michael Turner"

    # T200 must remain unaffected (still 3)
    thresh_t200, author_t200 = temp_memory.get_pump_jack_rca_threshold("T200")
    assert thresh_t200 == 3
    assert author_t200 is None

def test_shared_operational_notes(temp_memory):
    temp_memory.add_shared_note(
        well_id="WELL-0007",
        text="WELL-0007 will be shut in from 17 Oct for a 10-day planned workover.",
        author="Jake Morales",
        valid_from="2026-10-17",
        valid_to="2026-10-27"
    )
    notes = temp_memory.get_shared_notes_for_well("WELL-0007")
    assert len(notes) == 1
    assert notes[0]["author"] == "Jake Morales"

def test_private_memory_isolation_barrier(temp_memory):
    # Michael Turner discusses wells in private session
    temp_memory.set_user_discussed_wells("Michael Turner", ["WELL-0121", "WELL-0138", "WELL-0107"])
    
    # Michael can retrieve them
    mt_ctx = temp_memory.get_user_context("Michael Turner")
    assert mt_ctx.get("discussed_wells") == ["WELL-0121", "WELL-0138", "WELL-0107"]

    # Jessica Reed MUST NOT see Michael's discussed wells
    jr_ctx = temp_memory.get_user_context("Jessica Reed")
    assert "discussed_wells" not in jr_ctx

def test_reset_memory(temp_memory):
    temp_memory.add_correction("INS-TEST", "temp", 50.0, 20.0, "Tester", "Reason", "WELL-9999")
    assert temp_memory.get_correction("INS-TEST") is not None
    
    temp_memory.reset()
    assert temp_memory.get_correction("INS-TEST") is None
    assert len(temp_memory.corrections) == 0
