"""
Memory Manager for Asset Intelligence Copilot.
Implements Two-Level Memory with SQLite Persistence:
1. Shared Knowledge (SQLite + Memory cache):
   - Dynamic corrections to raw sensor readings and AI estimates.
   - Domain rule updates per well type scope.
   - Shared operational announcements (e.g., planned shut-ins).
   - Unconfirmed claims and conflict records.
2. Private Memory per User (SQLite + Memory cache):
   - Conversation history isolated per user.
   - Query context (e.g. "the three wells we discussed yesterday").
   - Strict privacy enforcement between users.
"""
import os
import json
import sqlite3
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone

DEFAULT_DB_PATH = os.path.abspath("copilot_memory.db")

class MemoryManager:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = os.path.abspath(db_path)
        
        # In-memory fast access structures
        self.corrections: Dict[str, Dict[str, Any]] = {}
        self.custom_rules: Dict[str, Any] = {
            "pump_jack_rca_threshold": {
                "default": 3,
                "by_type": {} # e.g. {"T350": 2}
            }
        }
        self.shared_notes: List[Dict[str, Any]] = []
        self.unconfirmed_claims: List[Dict[str, Any]] = []
        self.user_sessions: Dict[str, List[Dict[str, Any]]] = {}
        self.user_context: Dict[str, Dict[str, Any]] = {}

        self._init_sqlite()
        self._load_from_sqlite()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_sqlite(self):
        """Create tables in SQLite if they don't exist."""
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                CREATE TABLE IF NOT EXISTS corrections (
                    inspection_id TEXT PRIMARY KEY,
                    well_id TEXT,
                    field TEXT,
                    new_value TEXT,
                    original_value TEXT,
                    author TEXT,
                    reason TEXT,
                    created_at TEXT
                )
            """)
            c.execute("""
                CREATE TABLE IF NOT EXISTS custom_rules (
                    rule_name TEXT,
                    well_type TEXT,
                    threshold INTEGER,
                    author TEXT,
                    note TEXT,
                    created_at TEXT,
                    PRIMARY KEY (rule_name, well_type)
                )
            """)
            c.execute("""
                CREATE TABLE IF NOT EXISTS shared_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    asset_id TEXT,
                    text TEXT,
                    author TEXT,
                    valid_from TEXT,
                    valid_to TEXT,
                    created_at TEXT
                )
            """)
            c.execute("""
                CREATE TABLE IF NOT EXISTS unconfirmed_claims (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    asset_id TEXT,
                    claim TEXT,
                    author TEXT,
                    contradicting_evidence TEXT,
                    status TEXT,
                    created_at TEXT
                )
            """)
            c.execute("""
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_key TEXT,
                    role TEXT,
                    content TEXT,
                    entities_json TEXT,
                    timestamp TEXT
                )
            """)
            c.execute("""
                CREATE TABLE IF NOT EXISTS user_context (
                    user_key TEXT,
                    context_key TEXT,
                    context_val TEXT,
                    PRIMARY KEY (user_key, context_key)
                )
            """)
            conn.commit()

    def _load_from_sqlite(self):
        """Populate in-memory caches from SQLite."""
        with self._get_connection() as conn:
            c = conn.cursor()
            # Corrections
            c.execute("SELECT * FROM corrections")
            for r in c.fetchall():
                val = r["new_value"]
                try:
                    val = float(val) if "." in val else int(val)
                except ValueError:
                    pass
                orig = r["original_value"]
                try:
                    orig = float(orig) if orig and "." in orig else int(orig) if orig else None
                except ValueError:
                    pass
                self.corrections[r["inspection_id"]] = {
                    "inspection_id": r["inspection_id"],
                    "well_id": r["well_id"],
                    "field": r["field"],
                    "new_value": val,
                    "original_value": orig,
                    "author": r["author"],
                    "reason": r["reason"],
                    "created_at": r["created_at"]
                }

            # Custom rules
            c.execute("SELECT * FROM custom_rules")
            for r in c.fetchall():
                rule_name = r["rule_name"]
                if rule_name not in self.custom_rules:
                    self.custom_rules[rule_name] = {"default": 3, "by_type": {}}
                self.custom_rules[rule_name]["by_type"][r["well_type"]] = {
                    "threshold": int(r["threshold"]),
                    "author": r["author"],
                    "note": r["note"],
                    "created_at": r["created_at"]
                }

            # Shared notes
            c.execute("SELECT * FROM shared_notes ORDER BY id ASC")
            self.shared_notes = [
                {
                    "asset_id": r["asset_id"],
                    "text": r["text"],
                    "author": r["author"],
                    "valid_from": r["valid_from"],
                    "valid_to": r["valid_to"],
                    "created_at": r["created_at"]
                }
                for r in c.fetchall()
            ]

            # Claims
            c.execute("SELECT * FROM unconfirmed_claims ORDER BY id ASC")
            self.unconfirmed_claims = [
                {
                    "asset_id": r["asset_id"],
                    "claim": r["claim"],
                    "author": r["author"],
                    "contradicting_evidence": r["contradicting_evidence"],
                    "status": r["status"],
                    "created_at": r["created_at"]
                }
                for r in c.fetchall()
            ]

            # Chat history
            c.execute("SELECT * FROM chat_history ORDER BY id ASC")
            for r in c.fetchall():
                uk = r["user_key"]
                if uk not in self.user_sessions:
                    self.user_sessions[uk] = []
                entities = json.loads(r["entities_json"]) if r["entities_json"] else {}
                self.user_sessions[uk].append({
                    "role": r["role"],
                    "content": r["content"],
                    "entities": entities,
                    "timestamp": r["timestamp"]
                })

            # User context
            c.execute("SELECT * FROM user_context")
            for r in c.fetchall():
                uk = r["user_key"]
                if uk not in self.user_context:
                    self.user_context[uk] = {}
                try:
                    self.user_context[uk][r["context_key"]] = json.loads(r["context_val"])
                except Exception:
                    self.user_context[uk][r["context_key"]] = r["context_val"]

    def reset(self):
        """Reset all memory to pristine initial state in memory and SQLite."""
        self.corrections.clear()
        self.custom_rules = {
            "pump_jack_rca_threshold": {
                "default": 3,
                "by_type": {}
            }
        }
        self.shared_notes.clear()
        self.unconfirmed_claims.clear()
        self.user_sessions.clear()
        self.user_context.clear()

        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("DELETE FROM corrections")
            c.execute("DELETE FROM custom_rules")
            c.execute("DELETE FROM shared_notes")
            c.execute("DELETE FROM unconfirmed_claims")
            c.execute("DELETE FROM chat_history")
            c.execute("DELETE FROM user_context")
            conn.commit()

    # --- Shared Knowledge Methods ---

    def add_correction(self, inspection_id: str, field: str, new_value: Any, original_value: Any, author: str, reason: str, well_id: Optional[str] = None):
        """Add a correction to raw data or AI analysis."""
        created_at = datetime.now(timezone.utc).isoformat()
        self.corrections[inspection_id] = {
            "inspection_id": inspection_id,
            "well_id": well_id,
            "field": field,
            "new_value": new_value,
            "original_value": original_value,
            "author": author,
            "reason": reason,
            "created_at": created_at
        }
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                INSERT OR REPLACE INTO corrections 
                (inspection_id, well_id, field, new_value, original_value, author, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (inspection_id, well_id or "", field, str(new_value), str(original_value or ""), author, reason, created_at))
            conn.commit()

    def get_correction(self, inspection_id: str) -> Optional[Dict[str, Any]]:
        return self.corrections.get(inspection_id)

    def set_type_rule(self, rule_name: str, well_type: str, threshold: Any, author: str, note: str):
        """Set a domain rule for a specific well type (e.g. T350 pump jack RCA trigger = 2)."""
        created_at = datetime.now(timezone.utc).isoformat()
        if rule_name not in self.custom_rules:
            self.custom_rules[rule_name] = {"default": 3, "by_type": {}}
        self.custom_rules[rule_name]["by_type"][well_type] = {
            "threshold": int(threshold),
            "author": author,
            "note": note,
            "created_at": created_at
        }
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                INSERT OR REPLACE INTO custom_rules
                (rule_name, well_type, threshold, author, note, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (rule_name, well_type, int(threshold), author, note, created_at))
            conn.commit()

    def get_pump_jack_rca_threshold(self, well_type: str) -> Tuple[int, Optional[str]]:
        """Returns (threshold, rule_author_or_none)"""
        rule = self.custom_rules.get("pump_jack_rca_threshold", {})
        if well_type in rule.get("by_type", {}):
            entry = rule["by_type"][well_type]
            return entry["threshold"], entry["author"]
        return rule.get("default", 3), None

    def add_shared_note(self, well_id: str, text: str, author: str, valid_from: str, valid_to: Optional[str] = None):
        """Add a shared announcement or planned maintenance note."""
        created_at = datetime.now(timezone.utc).isoformat()
        entry = {
            "asset_id": well_id,
            "text": text,
            "author": author,
            "valid_from": valid_from,
            "valid_to": valid_to,
            "created_at": created_at
        }
        self.shared_notes.append(entry)
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                INSERT INTO shared_notes (asset_id, text, author, valid_from, valid_to, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (well_id, text, author, valid_from, valid_to or "", created_at))
            conn.commit()

    def get_shared_notes_for_well(self, well_id: str) -> List[Dict[str, Any]]:
        return [n for n in self.shared_notes if n.get("asset_id") == well_id]

    def add_unconfirmed_claim(self, well_id: str, claim: str, author: str, contradicting_evidence: str):
        created_at = datetime.now(timezone.utc).isoformat()
        entry = {
            "asset_id": well_id,
            "claim": claim,
            "author": author,
            "contradicting_evidence": contradicting_evidence,
            "status": "unconfirmed",
            "created_at": created_at
        }
        self.unconfirmed_claims.append(entry)
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                INSERT INTO unconfirmed_claims (asset_id, claim, author, contradicting_evidence, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (well_id, claim, author, contradicting_evidence, "unconfirmed", created_at))
            conn.commit()

    # --- Private Memory Methods ---

    def log_user_message(self, user_key: str, role: str, content: str, entities: Optional[Dict[str, Any]] = None):
        user_key = user_key.lower().strip()
        timestamp = datetime.now(timezone.utc).isoformat()
        if user_key not in self.user_sessions:
            self.user_sessions[user_key] = []
        
        entry = {
            "role": role,
            "content": content,
            "entities": entities or {},
            "timestamp": timestamp
        }
        self.user_sessions[user_key].append(entry)

        if entities:
            if user_key not in self.user_context:
                self.user_context[user_key] = {}
            self.user_context[user_key].update(entities)
            with self._get_connection() as conn:
                c = conn.cursor()
                for k, v in entities.items():
                    c.execute("""
                        INSERT OR REPLACE INTO user_context (user_key, context_key, context_val)
                        VALUES (?, ?, ?)
                    """, (user_key, k, json.dumps(v)))
                conn.commit()

        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                INSERT INTO chat_history (user_key, role, content, entities_json, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (user_key, role, content, json.dumps(entities or {}), timestamp))
            conn.commit()

    def get_user_history(self, user_key: str) -> List[Dict[str, Any]]:
        user_key = user_key.lower().strip()
        return self.user_sessions.get(user_key, [])

    def get_user_context(self, user_key: str) -> Dict[str, Any]:
        user_key = user_key.lower().strip()
        return self.user_context.get(user_key, {})

    def set_user_discussed_wells(self, user_key: str, wells: List[str]):
        user_key = user_key.lower().strip()
        if user_key not in self.user_context:
            self.user_context[user_key] = {}
        self.user_context[user_key]["discussed_wells"] = wells
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                INSERT OR REPLACE INTO user_context (user_key, context_key, context_val)
                VALUES (?, ?, ?)
            """, (user_key, "discussed_wells", json.dumps(wells)))
            conn.commit()

    def log_turn(self, user_key: str, session_id: str, question: str, answer: str, wells: List[str], visuals: List[Dict[str, Any]]):
        user_key = user_key.lower().strip()
        timestamp = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                CREATE TABLE IF NOT EXISTS session_turns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_key TEXT,
                    session_id TEXT,
                    question TEXT,
                    answer TEXT,
                    wells_json TEXT,
                    visuals_json TEXT,
                    timestamp TEXT
                )
            """)
            c.execute("""
                INSERT INTO session_turns (user_key, session_id, question, answer, wells_json, visuals_json, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_key, session_id, question, answer, json.dumps(wells), json.dumps(visuals), timestamp))
            conn.commit()

    def get_user_sessions(self, user_key: str) -> List[Dict[str, Any]]:
        user_key = user_key.lower().strip()
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                CREATE TABLE IF NOT EXISTS session_turns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_key TEXT,
                    session_id TEXT,
                    question TEXT,
                    answer TEXT,
                    wells_json TEXT,
                    visuals_json TEXT,
                    timestamp TEXT
                )
            """)
            c.execute("""
                SELECT session_id, MIN(timestamp) as started, question as first_q, COUNT(*) as n
                FROM session_turns
                WHERE user_key = ?
                GROUP BY session_id
                ORDER BY MIN(timestamp) DESC
            """, (user_key,))
            rows = c.fetchall()
            return [
                {
                    "session_id": r["session_id"],
                    "started": r["started"][:16].replace("T", " ") if r["started"] else "2026-10-16",
                    "first_q": r["first_q"] or "Conversation",
                    "n": r["n"]
                }
                for r in rows
            ]

    def get_session_turns(self, user_key: str, session_id: str) -> List[Dict[str, Any]]:
        user_key = user_key.lower().strip()
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                CREATE TABLE IF NOT EXISTS session_turns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_key TEXT,
                    session_id TEXT,
                    question TEXT,
                    answer TEXT,
                    wells_json TEXT,
                    visuals_json TEXT,
                    timestamp TEXT
                )
            """)
            c.execute("""
                SELECT question, answer, wells_json, visuals_json
                FROM session_turns
                WHERE user_key = ? AND session_id = ?
                ORDER BY id ASC
            """, (user_key, session_id))
            rows = c.fetchall()
            return [
                {
                    "question": r["question"],
                    "answer": r["answer"],
                    "wells": json.loads(r["wells_json"]) if r["wells_json"] else [],
                    "visual": json.loads(r["visuals_json"]) if r["visuals_json"] else []
                }
                for r in rows
            ]

    def generate_transcript_markdown(self) -> str:
        md = "# FlytOps Asset Intelligence Copilot Transcript\n\n"
        md += f"Generated: {datetime.now(timezone.utc).isoformat()} (Permian Basin Operations)\n\n---\n\n"
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                CREATE TABLE IF NOT EXISTS session_turns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_key TEXT,
                    session_id TEXT,
                    question TEXT,
                    answer TEXT,
                    wells_json TEXT,
                    visuals_json TEXT,
                    timestamp TEXT
                )
            """)
            c.execute("SELECT * FROM session_turns ORDER BY id ASC")
            rows = c.fetchall()
            if not rows:
                return md + "*No recorded session turns in transcript yet.*\n"
            for r in rows:
                md += f"### User ({r['user_key'].title()}) [{r['timestamp'][:16].replace('T', ' ')}]:\n"
                md += f"> {r['question']}\n\n"
                md += f"**Copilot Answer:**\n\n{r['answer']}\n\n"
                if r['visuals_json']:
                    try:
                        vis = json.loads(r['visuals_json'])
                        if vis:
                            md += f"*Visual Rendered: {', '.join(v.get('type', '') for v in vis)}*\n\n"
                    except Exception:
                        pass
                md += "---\n\n"
            return md

# Alias
Memory = MemoryManager
