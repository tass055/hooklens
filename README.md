# HookLens

HookLens is an open-source, web-based video hook analysis tool designed for creators and content strategists. It transcribes videos, extracts direct teachings, identifies high-impact hooks, scores them, and generates download-ready reports.

**Zero paid API keys. Zero subscriptions. 100% local and private.**

---

## Key Features

- **Verbatim Quotes & Teachings**: Extracts exact speaker transcriptions for teachings, rewritten hooks, and alternative hook suggestions.
- **Urdu Transcript Correction**: Automatically cleans up and corrects grammar/spelling for Urdu transcripts using local AI prior to analysis.
- **Upload Telemetry**: Real-time progress monitoring showing upload progress, active processing steps, and a live stream log of LLM thoughts.
- **Professional Reports**: Instantly generates downloadable Microsoft Word reports (`.docx`) detailing the transcript, hook analysis, and suggestions.
- **Compliance Built-In**: Video files are processed entirely in memory or temporary space and deleted immediately after transcription (no persistent storage of video data).

---

## Local AI Tech Stack

| Layer | Technology |
|---|---|
| **Frontend UI** | React + Vite + TypeScript + Tailwind CSS |
| **Backend API** | Python + FastAPI + Uvicorn |
| **Speech-to-Text** | `faster-whisper` (local OpenAI Whisper running on CPU) |
| **AI Editor & Strategist** | `ollama` + `llama3.2:3b` (runs locally, fully offline) |
| **Document Generator** | `python-docx` |

---

## Setup & Running HookLens

### Option 1: Docker Compose (Recommended)
This approach runs all components inside fully isolated containers.

1. **Clone & Prepare Environment**:
   ```bash
   cp .env.example .env
   ```
2. **Launch with Hot-Reloading (Development)**:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```
3. **Launch Production Stack**:
   ```bash
   docker compose up --build
   ```
4. **Access UI**:
   Open [http://localhost](http://localhost) (or port defined as `HOST_PORT` in your `.env`).

---

### Option 2: Native Manual Setup

Ensure you have **Node.js 20+**, **Python 3.11+**, and [**Ollama**](https://ollama.com) installed.

1. **Set Up Local LLM**:
   ```bash
   ollama pull llama3.2:3b
   ollama serve
   ```
2. **Start Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   uvicorn main:app --reload --port 8000
   ```
3. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. **Access UI**:
   Open [http://localhost:5173](http://localhost:5173).

---

## Environment & Configuration

HookLens can be configured using environment variables in a `.env` file at the root of the project:

### Available Environment Variables
| Variable | Default | Purpose |
|---|---|---|
| `HOST_PORT` | `80` | Host port for exposing the frontend in production Docker |
| `OLLAMA_MODEL` | `llama3.2:3b` | Local LLM model utilized for analysis (e.g. `llama3.2:3b`, `llama3.1:8b`) |
| `WHISPER_MODEL` | `base` | Speech-to-text model size (`tiny`, `base`, `small`, `medium`, `large-v3`) |
| `OLLAMA_HOST` | `http://localhost:11434` | Endpoint host address for the Ollama daemon (non-Docker setup) |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS whitelist allowed origins (comma-separated) |

---

## Docker Compose Configurations

### 1. Dev Stack (Hot-Reloading)
For local development where you want your code changes to refresh instantly:
```bash
docker compose -f docker-compose.dev.yml up --build
```
*   **Backend**: Reloads on edits via Uvicorn.
*   **Frontend**: Vite dev server hot-reloads components instantly.

### 2. GPU Acceleration (NVIDIA)
To speed up local LLM inference using a local graphics card, uncomment the `deploy` block under the `ollama` service in `docker-compose.yml`:
```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```
*(Requires the NVIDIA Container Toolkit installed on the host operating system/WSL).*

---

## Powered by ASAL

HookLens is built and maintained by [**ASAL**](https://asal.life) — a technology company focused on AI-powered tools and automation.

[![ASAL](frontend/public/asal-logo.png)](https://asal.life)

| Platform | Link |
|---|---|
| 🌐 Website | [asal.life](https://asal.life/) |
| 📘 Facebook | [facebook.com/profile.php?id=61573255537897](https://www.facebook.com/profile.php?id=61573255537897) |
| 📸 Instagram | [@asallifeoriginal](https://www.instagram.com/asallifeoriginal/) |
| ▶️ YouTube | [@AsalLlife](https://www.youtube.com/@AsalLlife) |
| 🎵 TikTok | [@asallifeoriginal](https://www.tiktok.com/@asallifeoriginal) |
| 🧵 Threads | [@asallifeoriginal](https://www.threads.com/@asallifeoriginal) |
