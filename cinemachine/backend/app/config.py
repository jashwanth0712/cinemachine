"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Settings loaded from environment variables.

    On Cloud Run, these are set via the service configuration.
    For local development, use a .env file or export them.
    """

    DATABASE_URL: str = (
        "postgresql://cinemachine:password@localhost/cinemachine"
        "?host=/cloudsql/cinemachine-app:us-central1:cinemachine-db"
    )
    GCS_BUCKET: str = "cinemachine-videos"
    GEMINI_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_IOS_CLIENT_ID: str = ""
    ALLOWED_ORIGINS: str = "*"
    CLOUD_SQL_CONNECTION_NAME: str = "cinemachine-app:us-central1:cinemachine-db"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
