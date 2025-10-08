import os
from minio import Minio
from minio.error import S3Error


def get_client():
    endpoint = os.environ.get("MINIO_ENDPOINT", "minio:9000")
    access = os.environ.get("MINIO_ACCESS_KEY")
    secret = os.environ.get("MINIO_SECRET_KEY")
    secure = False
    if endpoint.startswith("https://"):
        endpoint = endpoint.replace("https://", "")
        secure = True
    elif endpoint.startswith("http://"):
        endpoint = endpoint.replace("http://", "")
        secure = False

    if not access or not secret:
        raise RuntimeError("MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be set")

    return Minio(endpoint, access_key=access, secret_key=secret, secure=secure)


def ensure_bucket(client, bucket_name):
    try:
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
    except S3Error as e:
        # bucket_exists can raise if permissions/network
        raise


def upload_file(client, bucket_name, object_name, file_path, content_type=None):
    try:
        ensure_bucket(client, bucket_name)
        client.fput_object(bucket_name, object_name, file_path, content_type=content_type)
        return True
    except Exception:
        raise
