"""
Launcher for Asset Intelligence Copilot Application.
Starts the FastAPI server with uvicorn on http://localhost:8000.
Delegates to copilot.server main entry point.
"""
import os
import sys

# Ensure repository root in python path
REPO_ROOT = os.path.abspath(os.path.dirname(__file__))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from copilot.server import main

if __name__ == "__main__":
    main()
