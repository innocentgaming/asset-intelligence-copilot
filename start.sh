#!/usr/bin/env bash
# Render Native Python Start Script
exec uvicorn copilot.server:app --host 0.0.0.0 --port ${PORT:-8000}
