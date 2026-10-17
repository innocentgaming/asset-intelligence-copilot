# FlytOps: Asset Intelligence Copilot - Deployment Guide

This guide explains how to deploy the **FlytOps Asset Intelligence Copilot** to **Render** and **Vercel**.

---

## Architecture Overview

The system consists of:
1. **Backend**: Python FastAPI service with deterministic analytics (`copilot/engine.py`), SQLite two-level memory (`copilot_memory.db`), Gemma 4 tool-calling agent, and operational dataset (`dataset/sample-data`).
2. **Frontend**: React + Vite + Tailwind CSS SPA with Leaflet GIS maps, Chart.js/Recharts, and Persona switching.
3. **Unified Single-Port Mode**: The compiled React SPA (`copilot/static/app`) is automatically served directly by FastAPI at `/`, meaning **a single service on Render hosts both backend and frontend** with zero CORS configuration.

---

## Option 1: Deploy to Render (Recommended - Full Stack in One Service)

Render is the ideal platform for FlytOps because it supports persistent background Python runtimes, dynamic `$PORT` bindings, containerized builds, and SQLite databases.

### Method A: 1-Click Blueprint (Easiest)

We have included a [`render.yaml`](render.yaml) file in the repository root.

1. Push your latest code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Add production deployment configurations for Render and Vercel"
   git push origin main
   ```
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** > **Blueprint**.
4. Connect your GitHub repository: `innocentgaming/asset-intelligence-copilot`.
5. Render will automatically detect `render.yaml`.
6. Enter your `COPILOT_API_KEY` (your Google AI Studio or Gemini API key) under environment variables.
7. Click **Apply**. Render will automatically:
   - Build the React frontend with Node.js 20.
   - Install Python dependencies and load the dataset.
   - Launch `uvicorn copilot.server:app --host 0.0.0.0 --port $PORT`.
   - Assign you a public HTTPS URL: `https://asset-intelligence-copilot.onrender.com`.

---

### Method B: Manual Docker Web Service on Render

If you prefer setting up manually without the Blueprint:

1. In Render Dashboard, click **New +** > **Web Service**.
2. Select your repository: `innocentgaming/asset-intelligence-copilot`.
3. Configure the service:
   - **Name**: `asset-intelligence-copilot`
   - **Language**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: `Free`
   - **Health Check Path**: `/health`
4. Add the following **Environment Variables**:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `COPILOT_PRESET` | `aistudio` | Cloud provider preset (`aistudio`, `openrouter`, or `ollama`) |
   | `COPILOT_MODEL` | `gemma-4-31b-it` | Target model identifier |
   | `COPILOT_API_KEY` | `AIzaSy...` | Your Google AI Studio Gemini API Key |
   | `PYTHONUNBUFFERED` | `1` | Real-time console logs |
5. Click **Create Web Service**.

---

### Method C: Native Python Runtime on Render (No Docker)

If you prefer Render's native Python runtime:

1. In Render Dashboard, click **New +** > **Web Service**.
2. Configure:
   - **Environment**: `Python 3`
   - **Build Command**: `./build.sh` (or `pip install -r requirements.txt && cd web && npm install && npm run build && cd ..`)
   - **Start Command**: `uvicorn copilot.server:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
3. Add the environment variables (`COPILOT_API_KEY`, `COPILOT_PRESET`, `COPILOT_MODEL`).
4. Deploy!

---

## Option 2: Deploy Frontend on Vercel (Decoupled Edge Deployment)

If you want the React frontend hosted globally on Vercel's Edge CDN while keeping the FastAPI backend on Render:

### Step 1: Deploy Backend to Render First
Deploy the backend following **Option 1** above to obtain your live backend URL (e.g., `https://asset-intelligence-copilot.onrender.com`).

### Step 2: Deploy to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com) and click **Add New...** > **Project**.
2. Import `innocentgaming/asset-intelligence-copilot`.
3. In the project configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and choose `web` (or leave root with the included [`vercel.json`](vercel.json)).
   - **Build Command**: `npm run build`
   - **Output Directory**: `../copilot/static/app` (or `dist`)
4. Add the **Environment Variable**:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://asset-intelligence-copilot.onrender.com` |
5. Click **Deploy**.

Vercel will deploy the React visualizer to a custom domain (e.g. `https://flytops-copilot.vercel.app`), communicating with your live Render backend!

---

## Verifying Deployment

Once deployed, you can verify your service via curl or your browser:

### 1. Health Check
```bash
curl https://your-service.onrender.com/health
```
Expected response:
```json
{
  "status": "healthy",
  "service": "FlytOps Asset Intelligence Copilot",
  "version": "2.0.0",
  "timestamp": "..."
}
```

### 2. Fleet Metadata API
```bash
curl https://your-service.onrender.com/api/fleet/info
```
Expected response:
```json
{
  "total_wells": 200,
  "as_of_date": "2026-10-16"
}
```

### 3. Web UI Visualizer
Open `https://your-service.onrender.com/` in any browser:
- Status cards, tables, Recharts/Chart.js graphs, Leaflet GIS maps, and 2D heatmaps will load dynamically.
- Test persona switching (Michael Turner, Jessica Reed, Tyler Hughes, etc.).
- Try asking: *"Is WELL-0001 producing oil right now? Show me its status card."*

---

## Local Pre-Deployment Testing

To test the production Docker build locally before deploying:

```bash
# Build container image
docker build -t asset-intelligence-copilot:latest .

# Run container on port 8000
docker run -p 8000:8000 -e COPILOT_API_KEY="YOUR_API_KEY" asset-intelligence-copilot:latest

# Open in browser:
# http://localhost:8000
```
