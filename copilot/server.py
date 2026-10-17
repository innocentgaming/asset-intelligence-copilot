"""
FlytBase Asset Intelligence Copilot Server.
Supports CLI execution:
    python -m copilot.server --data path/to/sample-data [path/to/test-data]
Loads any number of dataset folders, parses well-type rules dynamically,
and serves the FastAPI agentic backend and Generative UI frontend on http://localhost:8000.
"""
import os
import sys
import argparse
import uvicorn

# Ensure repository root is in python path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from backend.data_indexer import DataIndexer
from backend.memory_manager import MemoryManager
from backend.analytics_engine import AnalyticsEngine
from backend.gemma_copilot import GemmaCopilot
import backend.app as app_module

def main():
    parser = argparse.ArgumentParser(description="FlytBase Asset Intelligence Copilot Server")
    parser.add_argument(
        "--data",
        nargs="+",
        default=[os.path.join(REPO_ROOT, "dataset", "sample-data")],
        help="Path(s) to dataset folder(s), e.g. --data sample-data [test-data]"
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

    # Initialize components
    indexer = DataIndexer(data_root=args.data)
    memory = MemoryManager()
    analytics = AnalyticsEngine(indexer=indexer, memory=memory)
    copilot = GemmaCopilot(indexer=indexer, memory=memory)

    # Attach to FastAPI app module
    app_module.indexer = indexer
    app_module.memory = memory
    app_module.analytics = analytics
    app_module.copilot = copilot

    uvicorn.run(app_module.app, host=args.host, port=args.port)

if __name__ == "__main__":
    main()
