FROM python:3.12-slim

WORKDIR /app

# lightgbm links against OpenMP, which the slim image does not ship
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY data/ data/
COPY model/ model/

EXPOSE 8081

CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8081}
