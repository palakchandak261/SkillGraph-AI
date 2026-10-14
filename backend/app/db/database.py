"""SQLAlchemy database engine setup, session management, and Base class.

Supports both SQLite (local development/testing) and PostgreSQL (production).
"""

from pathlib import Path
from typing import Generator
import sqlite3
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from backend.app.core.config import settings

# Determine database type and configure connect_args
database_url = settings.DATABASE_URL
connect_args = {}
engine_kwargs = {
    "echo": settings.DB_ECHO,
}

if database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    engine_kwargs["connect_args"] = connect_args
    # Ensure SQLite directory exists if file-based database
    if "///" in database_url:
        db_path = database_url.split("///")[-1]
        if db_path and db_path != ":memory:":
            path_obj = Path(db_path).resolve()
            path_obj.parent.mkdir(parents=True, exist_ok=True)
elif database_url.startswith("postgresql"):
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
    })

# Create SQLAlchemy Engine
engine = create_engine(database_url, **engine_kwargs)


# Enable Foreign Key enforcement for SQLite connections
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enforce foreign key constraints for SQLite."""
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides a database session and safely closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables defined in models."""
    from backend.app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
