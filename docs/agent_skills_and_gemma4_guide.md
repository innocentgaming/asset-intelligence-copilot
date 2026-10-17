# Agent Skills, Gemma 4 & Edge Execution Guide

This comprehensive reference brings together the core resources provided for the **FlytBase Asset Intelligence Copilot Challenge**:

---

## 1. Agent Skills Explained: What They Are & How to Use Them

### What is an Agent Skill?
An **Agent Skill** is an open, portable standard for encapsulating autonomous capabilities, domain rules, API schemas, and reasoning guidelines into a format directly consumable by AI agents and coding assistants (Antigravity, Hermes Agent, Claude Desktop, Cursor, OpenAI assistants).

### Skill Structure
Each skill lives in a dedicated folder or workspace root with a `SKILL.md` file featuring YAML frontmatter:
```markdown
---
name: asset-intelligence-copilot
license: MIT
description: Autonomous oil & gas well asset intelligence copilot using Google Gemma 4 and deterministic SCADA telemetry analytics.
metadata:
  version: 2.0.0
  publisher: FlytBase-AHC
---
```

### Why Skills Outperform Generic Prompts
1. **Persistent Memory & Tool Binding:** Binds deterministic engine functions (`get_well_status`, `get_down_wells_in_area`, `get_spills_heatmap`) directly into the agent's function-calling tool registry.
2. **Deterministic Domain Rules:** Enforces mathematical precision ($\Delta T = T_{\text{wellhead}} - T_{\text{ambient}}$ vs. $15.0^\circ\text{C}$ / $20.0^\circ\text{C}$ limits) and prevents arithmetic hallucinations.
3. **Cross-Agent Portability:** Once defined in `SKILL.md`, any compatible harness can discover and invoke the skill without code refactoring.

---

## 2. A Developer's Guide to Open-Weight LLM API Integration

Google's **Gemma 4** is an open-weight, state-of-the-art model optimized for complex reasoning, tool calling, and multimodal field analysis.

### Integration Architecture
The Copilot uses an OpenAI-compatible function calling interface, enabling drop-in compatibility across multiple execution environments:

```
┌────────────────────────────────────────────────────────┐
│               COPILOT AGENTIC DISPATCHER               │
└────────────┬──────────────┬──────────────┬─────────────┘
             │              │              │
      (Cloud / API)   (Local Edge)   (Aggregator)
             │              │              │
             ▼              ▼              ▼
     Google AI Studio     Ollama       OpenRouter
     (gemma-4-31b-it)  (gemma4:31b)  (google/gemma-4)
```

### Handling Multi-Turn Tool Loops
1. **Turn 1 (Tool Selection):** The user query is forwarded along with `TOOL_DEFINITIONS`. Gemma 4 analyzes intent and returns a structured `tool_calls` request with arguments (e.g. `{"well_id": "WELL-0001"}`).
2. **Turn 2 (Deterministic Execution):** The backend executes `copilot.engine` and returns verified physical telemetry, removing sensor false-positives and calculating exact downtime days.
3. **Turn 3 (Synthesis & Citation):** Gemma 4 synthesizes the final explanation, citing record IDs (e.g. `[INS-0001-0203]`, `[MNT-0001-023]`, `[SOP-SR Section 7]`) and attaching Generative UI visual components.

---

## 3. How to Run Google's Gemma 4 Locally with Ollama

For field operations on remote drilling pads or air-gapped SCADA networks, Gemma 4 can run 100% locally with zero cloud dependencies using **Ollama**.

### Step 1: Install Ollama & Pull Gemma 4
```bash
# Pull the standard Gemma 4 model
ollama pull gemma4:31b

# For edge laptops or workstations with under 16 GB VRAM:
ollama pull gemma4:9b
# or
ollama pull gemma4:e4b
```

### Step 2: Configure Ollama Modelfile (Optional Tuning)
To optimize Gemma 4 for oilfield tool calling, create a `Modelfile`:
```dockerfile
FROM gemma4:31b
PARAMETER temperature 0.1
PARAMETER top_p 0.95
PARAMETER num_ctx 8192
SYSTEM """
You are the FlytBase Asset Intelligence Copilot. Never guess telemetry numbers or invent repair dates. Always call the provided tools to retrieve verified inspection records.
"""
```
Build it:
```bash
ollama create gemma4-copilot -f Modelfile
```

### Step 3: Configure Environment Variables
Set the following in `.env`:
```ini
COPILOT_PRESET=ollama
COPILOT_BASE_URL=http://localhost:11434/v1
COPILOT_MODEL=gemma4:31b
```

### Step 4: Verify Local Connection
```powershell
python scripts/test_gemma4_connection.py
```

---

## 4. Hermes Agent: A Practical Guide

**Hermes Agent** is an open-source agent harness designed for autonomous tool invocation and multi-step workflow execution.

### Importing the Copilot into Hermes Workflows
The copilot's tools can be plugged directly into Hermes pipelines via `hermes_agent_tools.json`:

```python
import json
from copilot.agent import Agent
from copilot.data import DataIndexer
from copilot.memory import MemoryManager

# Initialize engine and memory
indexer = DataIndexer("ds/sample-data")
memory = MemoryManager()
copilot = Agent(indexer, memory)

# Execute tool call produced by Hermes
result = copilot._execute_tool(
    tool_name="get_top_downtime_wells",
    args={"area_name": "Northeast Block 7", "top_n": 3},
    user_name="Michael Turner"
)

# Output contains verified data, UI visual component, and evidence citations
data, visual_type, visual_data, citations, warning, formatted_text = result
print(formatted_text)
```

---

## 5. Gemma 4 Quickstart & Endpoint Reference

### Google AI Studio Setup
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. Set in `.env`:
   ```ini
   COPILOT_PRESET=aistudio
   COPILOT_API_KEY=YOUR_GEMINI_API_KEY
   COPILOT_MODEL=gemma-4-31b-it
   ```
3. API Endpoint: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`

### OpenRouter Setup
1. Obtain an API key from [OpenRouter](https://openrouter.ai/).
2. Set in `.env`:
   ```ini
   COPILOT_PRESET=openrouter
   COPILOT_API_KEY=YOUR_OPENROUTER_API_KEY
   COPILOT_MODEL=google/gemma-4-31b-it:free
   ```
3. API Endpoint: `https://openrouter.ai/api/v1/chat/completions`

---

## 6. Zero-Hallucination Fallback Architecture

If an external LLM provider encounters network timeouts, rate limits, or connectivity issues, the Copilot automatically falls back to its internal **Deterministic Rule & Intent Classifier**, ensuring 100% uptime, mathematically exact calculations, and zero downtime for field operators.
