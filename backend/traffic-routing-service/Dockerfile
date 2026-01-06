FROM python:3.9-slim

WORKDIR /app

# Install system dependencies needed for spatial libraries if any (e.g. for osmnx/gdal sometimes)
# keeping it simple for now, add if needed: libspatialindex-dev
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libspatialindex-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
