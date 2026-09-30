"""Populate the development database from the repository's mock-data files."""

import json
from datetime import datetime
from pathlib import Path

from app import models
from app.config import settings
from app.database import Base, SessionLocal, engine


MOCK_DIR = settings.mock_data_dir
ENTITY_FILES = (
    ("departments", models.Department, None),
    ("problems", models.Problem, "created_at"),
    ("policies", models.Policy, None),
    ("challenges", models.Challenge, "created_at"),
    ("startups", models.Startup, None),
    ("eligibility_rules", models.EligibilityRule, None),
    ("applications", models.Application, "submitted_at"),
    ("evaluations", models.Evaluation, "evaluated_at"),
    ("pilots", models.Pilot, "start_date"),
    ("kpis", models.KPI, None),
    ("knowledge_documents", models.KnowledgeDocument, None),
)


def _load(name: str) -> list[dict]:
    with (MOCK_DIR / f"{name}.json").open(encoding="utf-8") as file:
        return json.load(file)


def _parse_datetime(value):
    return datetime.fromisoformat(value) if isinstance(value, str) else value


def seed() -> dict[str, int]:
    """Insert or update all mock records without creating duplicates."""
    print(f"Reading mock data from: {MOCK_DIR}")
    Base.metadata.create_all(bind=engine)
    inserted: dict[str, int] = {}

    with SessionLocal.begin() as db:
        for name, model, datetime_field in ENTITY_FILES:
            records = _load(name)
            primary_key = model.__table__.primary_key.columns[0].name
            existing_ids = {
                row[0]
                for row in db.query(getattr(model, primary_key)).all()
            }
            for record in records:
                values = dict(record)
                if datetime_field:
                    values[datetime_field] = _parse_datetime(values[datetime_field])
                db.merge(model(**values))
            inserted[name] = sum(
                1 for record in records if record[primary_key] not in existing_ids
            )

    counts = {}
    with SessionLocal() as db:
        for name, model, _ in ENTITY_FILES:
            counts[name] = db.query(model).count()

    for name, _, _ in ENTITY_FILES:
        print(f"{name}: inserted {inserted[name]}, total {counts[name]}")
    print("Database seeding complete.")
    return inserted


if __name__ == "__main__":
    seed()
