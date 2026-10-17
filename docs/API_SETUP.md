# API Setup & Data Provider Configuration Guide

SkillGraph AI integrates both local canonical labor data (O*NET 31.0, ESCO v1.1.1, LinkedIn postings) and live modular data providers (Adzuna, JSearch, ESCO API, and O*NET Web Services) to provide live labor-market intelligence.

---

## 1. Quick Local Setup

By default, **SkillGraph AI runs completely offline** with no external API keys required!
The included SQLite database (`data/skillgraph.db`) is pre-populated with:
- **1,016 canonical occupations**
- **8,828 standardized skills**
- **31,821 occupation-skill relationships**
- **1,000 real job postings** for instant matching and skill overlap evaluation
- **Monthly historical demand observations & time-series forecasts**

To run the application immediately:

```bash
# Terminal 1 - Backend
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

---

## 2. External Data Providers

SkillGraph AI features a pluggable, fault-tolerant provider architecture located in `backend/app/services/data_providers.py`. It automatically falls back to curated database records if an external provider API key is omitted or exceeds its rate limit.

| Provider | Purpose | Status | Rate Limits / Notes |
|:---|:---|:---|:---|
| **ESCO API** | European Commission Skills Taxonomy | Ready (No Key Required) | Official public REST API (`https://esco.ec.europa.eu/api`) |
| **Adzuna API** | Live Job Search & Salary Telemetry | Optional (App ID + Key) | 250 requests/day on Free Developer Tier |
| **JSearch (RapidAPI)** | Aggregated Postings (LinkedIn, Indeed, Glassdoor) | Optional (RapidAPI Key) | 500 requests/month on Free Tier |
| **O*NET Web Services** | Live US Labor Statistics & Task Updates | Optional (Basic Auth) | Free upon developer registration at onetcenter.org |

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Edit `.env` to supply optional provider credentials:

```dotenv
# Environment Mode
ENVIRONMENT=development
LOG_LEVEL=INFO

# Database Connection (Default is SQLite, also supports PostgreSQL)
DATABASE_URL=sqlite:///./data/skillgraph.db

# Adzuna API Credentials (Optional)
# Register at: https://developer.adzuna.com/
ADZUNA_APP_ID=your_adzuna_app_id_here
ADZUNA_APP_KEY=your_adzuna_app_key_here
ADZUNA_COUNTRY=us

# RapidAPI / JSearch Credentials (Optional)
# Register at: https://rapidapi.com/letscrape-6bRBa3qguO/api/jsearch
RAPIDAPI_KEY=your_rapidapi_key_here

# O*NET Web Services (Optional)
# Register at: https://services.onetcenter.org/
ONET_USERNAME=your_onet_username
ONET_PASSWORD=your_onet_password
```

---

## 4. Testing Provider Connectivity

You can test provider connectivity programmatically or via the API:

### API Endpoints
- **Provider Status:** `GET /api/providers/status`
  - Returns connection health, response latencies, and active configuration for all registered providers.
- **Provider Connectivity Test:** `POST /api/providers/test`
  - Sends a live ping / test query through the provider pipeline and reports round-trip latency.

### Command Line Verification
Run our test suite to verify provider fallback mechanisms:
```bash
python -m pytest backend/tests/test_features.py -k "provider" -v
```

---

## 5. Security & Privacy Guarantees

1. **Zero Résumé Retention Policy**: The instant résumé parser (`POST /api/resume/extract`) parses skills in-memory using an inverted-index regex scanner and never persists raw user documents or personally identifiable information (PII) to disk or database.
2. **CORS Isolation**: The FastAPI backend restricts access to trusted frontend origins defined in `backend/app/core/config.py`.
3. **Database Sandboxing**: All SQL queries utilize parameterized SQLAlchemy ORM models, eliminating SQL injection vectors.
