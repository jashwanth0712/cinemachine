"""Export job: concatenate story shot videos into a single movie.

This script is designed to run as a Cloud Run Job. It reads STORY_ID
and DATABASE_URL from environment variables, downloads all shot videos
from GCS, concatenates them with ffmpeg, uploads the result, and
updates the database.
"""

import asyncio
import logging
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from uuid import UUID

import asyncpg
from google.cloud import storage

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    """Run the export job."""
    story_id_str = os.environ.get("STORY_ID")
    database_url = os.environ.get("DATABASE_URL")

    if not story_id_str:
        logger.error("STORY_ID environment variable is required")
        sys.exit(1)
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        sys.exit(1)

    story_id = UUID(story_id_str)
    logger.info("Starting export for story %s", story_id)

    # Connect to the database
    conn = await asyncpg.connect(dsn=database_url)

    try:
        # Fetch all shots for the story, ordered by shot_order
        shots = await conn.fetch(
            """
            SELECT id, shot_order, video_gcs_uri
            FROM shots
            WHERE story_id = $1
            ORDER BY shot_order
            """,
            story_id,
        )

        if not shots:
            logger.warning("No shots found for story %s", story_id)
            await conn.execute(
                "UPDATE stories SET status = 'exported' WHERE id = $1",
                story_id,
            )
            return

        # Filter to shots that have video URIs
        video_shots = [s for s in shots if s["video_gcs_uri"]]
        if not video_shots:
            logger.warning("No video URIs found for story %s", story_id)
            await conn.execute(
                "UPDATE stories SET status = 'exported' WHERE id = $1",
                story_id,
            )
            return

        gcs_client = storage.Client()

        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            downloaded_files: list[Path] = []

            # Download each shot video from GCS
            for shot in video_shots:
                gcs_uri: str = shot["video_gcs_uri"]
                # Parse gs://bucket/path
                if not gcs_uri.startswith("gs://"):
                    logger.warning("Invalid GCS URI: %s", gcs_uri)
                    continue

                uri_no_scheme = gcs_uri[5:]  # remove "gs://"
                bucket_name, blob_path = uri_no_scheme.split("/", 1)

                local_filename = f"shot_{shot['shot_order']:04d}.mp4"
                local_path = tmpdir_path / local_filename

                logger.info("Downloading %s -> %s", gcs_uri, local_path)
                bucket = gcs_client.bucket(bucket_name)
                blob = bucket.blob(blob_path)
                blob.download_to_filename(str(local_path))

                downloaded_files.append(local_path)

            if not downloaded_files:
                logger.error("No videos downloaded for story %s", story_id)
                sys.exit(1)

            # Create ffmpeg concat file list
            concat_list_path = tmpdir_path / "concat_list.txt"
            with open(concat_list_path, "w") as f:
                for video_path in downloaded_files:
                    f.write(f"file '{video_path}'\n")

            # Concatenate videos using ffmpeg concat demuxer
            output_path = tmpdir_path / "movie.mp4"
            ffmpeg_cmd = [
                "ffmpeg",
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", str(concat_list_path),
                "-c", "copy",
                str(output_path),
            ]

            logger.info("Running ffmpeg: %s", " ".join(ffmpeg_cmd))
            result = subprocess.run(
                ffmpeg_cmd,
                capture_output=True,
                text=True,
            )

            if result.returncode != 0:
                logger.error("ffmpeg failed: %s", result.stderr)
                sys.exit(1)

            logger.info("ffmpeg completed successfully")

            # Upload the result to GCS
            # Use the bucket from the first shot's URI
            first_uri = video_shots[0]["video_gcs_uri"]
            export_bucket_name = first_uri[5:].split("/", 1)[0]

            export_blob_path = f"exports/{story_id}/movie.mp4"
            export_bucket = gcs_client.bucket(export_bucket_name)
            export_blob = export_bucket.blob(export_blob_path)

            logger.info(
                "Uploading movie to gs://%s/%s",
                export_bucket_name,
                export_blob_path,
            )
            export_blob.upload_from_filename(
                str(output_path),
                content_type="video/mp4",
            )

            export_url = f"gs://{export_bucket_name}/{export_blob_path}"

            # Update story record
            await conn.execute(
                """
                UPDATE stories
                SET export_url = $1, status = 'exported'
                WHERE id = $2
                """,
                export_url,
                story_id,
            )

            logger.info(
                "Export complete for story %s: %s",
                story_id,
                export_url,
            )

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
