"""Application configuration settings using Pydantic Settings."""

import json
from pathlib import Path
from typing import Any, List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for SkillGraph AI backend."""

    # Project Information
    PROJECT_NAME: str = "SkillGraph AI"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = (
        "SkillGraph AI: Production-grade labor market intelligence, "
        "skill extraction, knowledge graph analytics, and demand forecasting platform."
    )
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api"

    # Database Configuration
    DATABASE_URL: str = "sqlite:///./data/skillgraph.db"
    DB_ECHO: bool = False

    # Directory Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    DATA_DIR: Path = Path("./data")
    MODELS_DIR: Path = Path("./models")

    # Raw / Processed Data subdirectories
    @property
    def raw_data_dir(self) -> Path:
        path = self.DATA_DIR / "raw"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def RAW_DATA_DIR(self) -> Path:
        return self.raw_data_dir

    @property
    def processed_data_dir(self) -> Path:
        path = self.DATA_DIR / "processed"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def PROCESSED_DATA_DIR(self) -> Path:
        return self.processed_data_dir

    @property
    def INTERIM_DATA_DIR(self) -> Path:
        path = self.DATA_DIR / "interim"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def models_artifact_dir(self) -> Path:
        path = self.MODELS_DIR
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def MODELS_ARTIFACT_DIR(self) -> Path:
        return self.models_artifact_dir

    # Security & CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]], info: Any) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
