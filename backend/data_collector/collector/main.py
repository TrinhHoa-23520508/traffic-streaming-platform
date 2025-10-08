import os
import time
import tempfile
import requests
import traceback
from urllib.parse import urljoin, quote
from minio.error import S3Error
from .minio_client import get_client, upload_file

CAMERAS_API = os.environ.get(
    "CAMERAS_API",
    "https://api.notis.vn/v4/cameras/bybbox?lat1=11.160767&lng1=106.554166&lat2=9.45&lng2=128.99999",
)
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "traffic-snapshots")
INTERVAL = int(os.environ.get("COLLECT_INTERVAL", "60"))


def fetch_cameras():
    try:
        resp = requests.get(CAMERAS_API, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and "data" in data:
            return data["data"]
        return data
    except Exception as e:
        print("Failed to fetch cameras:", e)
        return []


def fetch_snapshot_by_url(snap_url, retries=1):
    try:
        resp = requests.get(snap_url, timeout=15)
        resp.raise_for_status()
        return resp.content
    except Exception as e:
        if retries > 0:
            time.sleep(1)
            return fetch_snapshot_by_url(snap_url, retries - 1)
        print(f"Failed to fetch snapshot url {snap_url}:", e)
        return None


def fetch_snapshot_for_camera(cam):
    # Prefer explicit liveviewUrl if present
    live = cam.get("liveviewUrl")
    if live:
        # live may be relative like 'cameras/<id>/snapshot'
        if live.startswith("http://") or live.startswith("https://"):
            snap_url = live
        else:
            snap_url = urljoin("https://api.notis.vn/v4/", live)
        return fetch_snapshot_by_url(snap_url)

    # Prefer internal _id (document id) over human 'id' label
    internal_id = cam.get("_id") or cam.get("id")
    if internal_id:
        # if it's the human label (contains spaces), prefer encoding or skip
        if " " in str(internal_id) or "." in str(internal_id):
            # try using _id explicitly if available
            if cam.get("_id"):
                internal_id = cam.get("_id")
        snap_url = f"https://api.notis.vn/v4/cameras/{quote(str(internal_id))}/snapshot"
        return fetch_snapshot_by_url(snap_url)

    return None


def main_loop():
    client = None
    while True:
        try:
            if client is None:
                client = get_client()

            cameras = fetch_cameras()
            print(f"Found {len(cameras)} cameras")

            for cam in cameras:
                cam_key = cam.get("_id") or cam.get("id") or "unknown"
                img = fetch_snapshot_for_camera(cam)
                if not img:
                    print(f"No snapshot for camera {cam_key}")
                    continue
                # write to temp file
                with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tf:
                    tf.write(img)
                    tmp_path = tf.name
                object_name = f"{cam_key}/{int(time.time())}.jpg"
                try:
                    upload_file(client, MINIO_BUCKET, object_name, tmp_path, content_type="image/jpeg")
                    print(f"Uploaded {object_name}")
                except Exception as e:
                    print(f"Upload failed for {object_name}", e)
                finally:
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
        except Exception as e:
            print("Collector loop error:\n", traceback.format_exc())
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main_loop()
