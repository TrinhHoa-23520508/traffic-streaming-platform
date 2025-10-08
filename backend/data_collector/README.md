# Data Collector

Build with Docker from repo root under `backend`:

```bash
docker-compose up --build
```

## 3-step Dev Test Guide

Follow these three steps to quickly validate the collector in a local dev environment.

1) Start the stack (MinIO + collector)

```bash
cd C:/traffic-streaming-platform/backend
# build and start only MinIO and the collector (detached)
docker-compose up --build -d minio data_collector
# or start everything:
docker-compose up --build -d
```

2) Check `data_collector` logs

```bash
# follow logs in real time
docker-compose logs -f data_collector
# or view recent output
docker-compose logs --tail=200 data_collector
```

What to look for:
- `Found N cameras` — camera list fetch succeeded.
- `Uploaded <camera_id>/<timestamp>.jpg` — snapshot uploaded to MinIO.
- Errors like `Failed to fetch snapshot` or MinIO connection issues — see troubleshooting below.

3) Check MinIO console and objects

- Open: `http://localhost:9001`
- Default credentials (only for dev): `minioadmin` / `minioadmin`
- Open bucket `traffic-snapshots` and verify objects under keys like `camera_id/<timestamp>.jpg`.


