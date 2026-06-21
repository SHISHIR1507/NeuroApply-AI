FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for pdfminer
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run with uvicorn. Honour the platform-assigned $PORT (Render/Railway/Fly),
# default to 8000 locally. No --reload in production.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
