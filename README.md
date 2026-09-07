# MAITRI – Government Innovation & Startup Enablement Platform

## Overview
MAITRI is a full‑stack prototype that demonstrates an end‑to‑end workflow for government departments to identify challenges, discover matching startups, evaluate eligibility, and pilot solutions. The platform integrates semantic search (ChromaDB), graph relationships (Neo4j), deterministic rule‑based eligibility, and LLM‑augmented RAG for policy assistance.

## Features

- **Challenge Generation**
  - Uses Groq LLM to transform government problem statements into structured innovation challenges.
  - Generates titles, descriptions, required technologies, and impact metrics.

- **Semantic Startup Matching**
  - Stores startup embeddings in ChromaDB for fast vector search.
  - Retrieves top‑k candidates using vector similarity combined with a deterministic capability score (technology, sector, capacity).

- **Eligibility Engine**
  - Rule‑based evaluation of TRL, certifications, prior government experience, and capacity.
  - Returns status (`ELIGIBLE`, `BORDERLINE`, `NOT_ELIGIBLE`) with clear explanations.

- **Pilot & KPI Tracking**
  - Records pilot deployments, outcomes, and KPI measurements.
  - Computes scale‑up recommendations based on success criteria.

- **Policy Assistant (RAG)**
  - Retrieves relevant knowledge‑base documents from ChromaDB.
  - Summarises answers with Groq LLM, grounding output in source material.

- **Graph Explorer**
  - Syncs relational data from SQLite to Neo4j.
  - Provides interactive graph visualisation of departments → problems → challenges → startups.

- **Dockerised Neo4j**
  - Runs Neo4j in a Docker container for easy local setup.
  - Exposes Bolt and HTTP endpoints for application integration.

## Pipeline & Orchestration Flow

The MAITRI platform follows a clear pipeline:

# MAITRI – Government Innovation & Startup Enablement Platform

## Overview
MAITRI is a full‑stack prototype that demonstrates an end‑to‑end workflow for government departments to identify challenges, discover matching startups, evaluate eligibility, and pilot solutions. The platform integrates semantic search (ChromaDB), graph relationships (Neo4j), deterministic rule‑based eligibility, and LLM‑augmented RAG for policy assistance.

## Features

- **Challenge Generation**
  - Uses Groq LLM to transform government problem statements into structured innovation challenges.
  - Generates titles, descriptions, required technologies, and impact metrics.

- **Semantic Startup Matching**
  - Stores startup embeddings in ChromaDB for fast vector search.
  - Retrieves top‑k candidates using vector similarity combined with a deterministic capability score (technology, sector, capacity).

- **Eligibility Engine**
  - Rule‑based evaluation of TRL, certifications, prior government experience, and capacity.
  - Returns status (`ELIGIBLE`, `BORDERLINE`, `NOT_ELIGIBLE`) with clear explanations.

- **Pilot & KPI Tracking**
  - Records pilot deployments, outcomes, and KPI measurements.
  - Computes scale‑up recommendations based on success criteria.

- **Policy Assistant (RAG)**
  - Retrieves relevant knowledge‑base documents from ChromaDB.
  - Summarises answers with Groq LLM, grounding output in source material.

- **Graph Explorer**
  - Syncs relational data from SQLite to Neo4j.
  - Provides interactive graph visualisation of departments → problems → challenges → startups.

- **Dockerised Neo4j**
  - Runs Neo4j in a Docker container for easy local setup.
  - Exposes Bolt and HTTP endpoints for application integration.

## Pipeline & Orchestration Flow

The MAITRI platform follows a clear, end‑to‑end pipeline that ties together data ingestion, AI generation, matching, evaluation, and orchestration:

1. **Data Ingestion** – Synthetic mock data is loaded into SQLite, ChromaDB, and Neo4j via the seed scripts (`seed_db.py`, `seed_chroma.py`, `seed_neo4j.py`).
2. **Challenge Generation** – Government problem statements are sent to the Groq LLM, which returns structured challenge definitions (title, description, required tech, impact metrics).
3. **Semantic Matching** – Startup embeddings stored in ChromaDB are queried; results are re‑ranked using deterministic capability scoring (technology, sector, capacity).
4. **Eligibility Evaluation** – A rule‑engine checks each candidate against TRL, certifications, prior government experience, and capacity, returning a status with explanations.
5. **Pilot & KPI Tracking** – Approved startups are piloted; outcomes and KPI measurements are recorded and used to compute scale‑up recommendations.
6. **Policy Assistant (RAG)** – User queries trigger retrieval of relevant knowledge‑base documents from ChromaDB and summarisation via Groq, producing grounded answers.
7. **Graph Sync** – After each data mutation, a background sync updates Neo4j relationships from SQLite, keeping the graph view current.

All steps are orchestrated by simple Python scripts and Docker‑compose for Neo4j, enabling reproducible local development.

## Architecture
├─ backend/           # FastAPI + SQLAlchemy (SQLite) + Pydantic
│   ├─ app/          # Routers, services, models
│   └─ seed/         # Scripts to seed SQLite, ChromaDB, Neo4j
├─ data/chroma/       # Persistent vector store
├─ mock-data/         # Synthetic JSON fixtures
└─ docker-compose.yml # Neo4j container
```
- **FastAPI** handles all business logic and exposes a REST API.
- **SQLite** stores transactional data (departments, challenges, startups, etc.).
- **ChromaDB** provides offline vector embeddings for semantic matching.
- **Neo4j** stores a relationship graph that is synchronised from SQLite.
- **Groq** LLM is used only for RAG summarisation and challenge phrasing – embeddings are computed locally, no external model download required.

## Setup
### Prerequisites
- Python 3.11+ (Windows, macOS, Linux)
- Node.js 18+ and npm
- Docker (for Neo4j)
- Groq API key (free tier is sufficient)

### Install dependencies
```bash
# Backend
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

# Frontend (in a new terminal, from the project root)
cd ../frontend
npm install
```

### Configure environment variables
```bash
cd backend
cp .env.example .env   # copy template
# Edit backend/.env and insert your Groq API key
# The GITHUB_TOKEN you provided is already in envexample for CI use
```

### Start services
```bash
# 1. Neo4j (Docker)
cd ../../
docker compose up -d   # starts Neo4j on bolt://localhost:7687

# 2. Initialise databases
cd backend
python -m app.seed.seed_db          # SQLite tables + synthetic data
python -m app.seed.seed_chroma      # Vectorise startups & knowledge docs
python -m app.seed.seed_neo4j       # Sync graph from SQLite

# 3. Run FastAPI backend
uvicorn app.main:app --reload --port 8000

# 4. Run the React frontend (new terminal)
cd ../../frontend
npm run dev   # http://localhost:5173
```

## Usage
- Open the UI at **http://localhost:5173**.
- Browse *Challenges*, click **Find matching startups**, then **Check eligibility**.
- Use the *Policy Assistant* tab to ask questions such as:
  > "What TRL level is typically required before a pilot can begin?"
- Explore the *Relationship Graph* to visualise department → problem → challenge → startup connections.

### API Docs
FastAPI documentation is available at **http://localhost:8000/docs**.

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome‑thing`).
3. Ensure code passes `flake8`/`black` formatting.
4. Open a pull request with a clear description and screenshots.

## License
This project is licensed under the **MIT License** – see `LICENSE` for details.

## Screenshots & Demo
*(Add GIFs or screenshots of the UI here to showcase the workflow.)*
