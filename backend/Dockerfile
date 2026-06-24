FROM python:3.12-slim

# Install system dependencies (libgomp1 is required by ctranslate2/faster-whisper)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies in a separate layer for Docker cache efficiency
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Runtime directories
# uploads/ — in-container only; files deleted after transcription (SOC2 minimal retention)
# outputs/ — mounted as named volume via docker-compose.yml
RUN mkdir -p uploads outputs

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
