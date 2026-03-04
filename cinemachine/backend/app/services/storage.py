"""Google Cloud Storage helper functions."""

import datetime
import logging

from google.cloud import storage

logger = logging.getLogger(__name__)


def generate_signed_upload_url(
    bucket_name: str,
    blob_path: str,
    content_type: str,
    expiration_minutes: int = 15,
) -> str:
    """Generate a V4 signed URL for uploading a blob to GCS.

    The client uses this URL to PUT a file directly to Cloud Storage,
    bypassing the backend for large binary transfers.

    Args:
        bucket_name: GCS bucket name.
        blob_path: Full path of the blob within the bucket.
        content_type: MIME type of the file being uploaded.
        expiration_minutes: How long the signed URL remains valid.

    Returns:
        The signed upload URL as a string.
    """
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(minutes=expiration_minutes),
        method="PUT",
        content_type=content_type,
    )

    logger.info("Generated signed upload URL for gs://%s/%s", bucket_name, blob_path)
    return url


def delete_blob(bucket_name: str, blob_path: str) -> None:
    """Delete a blob from GCS.

    Logs a warning if the blob does not exist but does not raise.

    Args:
        bucket_name: GCS bucket name.
        blob_path: Full path of the blob within the bucket.
    """
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)

    if blob.exists():
        blob.delete()
        logger.info("Deleted gs://%s/%s", bucket_name, blob_path)
    else:
        logger.warning("Blob gs://%s/%s does not exist, skipping delete", bucket_name, blob_path)
