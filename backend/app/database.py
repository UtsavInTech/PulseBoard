from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import get_settings

settings = get_settings()

# Pool settings only apply to PostgreSQL, not SQLite
_url = settings.database_url
_engine_kwargs = {}
if _url.startswith("postgresql"):
    _engine_kwargs = {"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20}

engine = create_engine(_url, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── Additive schema sync ────────────────────────────────────────────────────
# Base.metadata.create_all() creates missing TABLES but never alters existing
# ones. This project has no migration tool, so the few additive columns the
# organization/role model introduced are applied here. Idempotent, PostgreSQL
# only (SQLite test databases are always created fresh from the models).
_ADDITIVE_COLUMNS = [
    ("users", "role", "VARCHAR(40) NOT NULL DEFAULT 'product_manager'"),
    ("users", "organization_id", "INTEGER REFERENCES organizations(id) ON DELETE CASCADE"),
    ("users", "full_name", "VARCHAR(120)"),
    ("users", "email", "VARCHAR(200)"),
    ("events", "category", "VARCHAR(60)"),
    ("events", "product_id", "VARCHAR(40)"),
    ("events", "device", "VARCHAR(20)"),
    ("events", "browser", "VARCHAR(30)"),
]


# Columns whose NOT NULL constraint no longer applies. Employee age/gender were
# required when members and end users shared one table; they are now optional
# legacy fields. DROP NOT NULL is idempotent in PostgreSQL.
_RELAXED_COLUMNS = [
    ("users", "age"),
    ("users", "gender"),
]


def ensure_schema() -> None:
    if not engine.url.drivername.startswith("postgresql"):
        return
    from sqlalchemy import text
    with engine.begin() as conn:
        for table, column, ddl in _ADDITIVE_COLUMNS:
            conn.execute(text(
                f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS "{column}" {ddl}'
            ))
        for table, column in _RELAXED_COLUMNS:
            conn.execute(text(
                f'ALTER TABLE "{table}" ALTER COLUMN "{column}" DROP NOT NULL'
            ))
