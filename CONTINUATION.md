# SkillGraph AI — Continuation & Status Report

## 1. Project Overview & Vision
SkillGraph AI is an AI-powered, student-centered career intelligence and skill-gap analysis platform built upon real labor-market data from **O*NET 31.0**, **ESCO v1.1.1**, and empirical **LinkedIn job postings**. It translates raw job market telemetry into personalized, evidence-backed career guidance answering 6 core student questions:
1. **Is my dream job in demand?** (Real posting frequencies, demand classification: High / Moderate / Emerging / Limited, verified employer counts)
2. **How is demand changing over time?** (Monthly historical trajectory + statistical Holt-Winters time-series forecasting with 95% confidence intervals)
3. **What skills do employers require?** (Combined O*NET taxonomy importance weights and empirical job posting demand percentages)
4. **Which required skills do I already have?** (Proficiency matching: beginner, intermediate, advanced)
5. **What should I learn first?** (Mathematically rigorous weighted skill coverage formula + composite priority ranking + 4-phase structured roadmap with portfolio projects)
6. **What alternative career opportunities can I pursue?** (Knowledge graph career mobility matching based on skill overlap and transferable competencies)

---

## 2. Completed Features

### Data Science, Database & ETL
- **O*NET Ingestion:** Ingested all 1,016 canonical occupations from `data/raw/onet/Occupation Data.txt` into `occupations` table.
- **Reported Titles & Aliases:** Ingested 8,057 reported title variations from `data/raw/onet/Sample of Reported Titles.txt` into `occupations.aliases_json` enabling high-recall fuzzy and exact career search.
- **Skill Mappings:** Ingested 14,268 software skills from `data/raw/onet/Software Skills.txt` into `occupation_skills` (bringing total to 31,821 mappings across 8,828 unique skills).
- **Posting Mappings:** Mapped 595 cleaned LinkedIn job postings to corresponding O*NET occupations with foreign key relationships.
- **Career Intelligence Engine (`backend/app/services/career_service.py`):**
  - **Career Search & Autocomplete:** Exact, substring, and alias matching across all 1,016 occupations with demand status badges.
  - **Career Overview:** Real posting counts, distinct verified employer counts, distinct skills count, date spans, and transparency limitations.
  - **Empirical Skills Profile:** Blends O*NET importance scores ($w_s \in [0.2, 1.0]$) with empirical demand frequency ($\% = \frac{\text{postings with skill}}{\text{total postings}} \times 100$).
  - **Historical Trends & Forecasting:** Holt-Winters exponential smoothing forecast with 95% prediction intervals and rigorous data sufficiency checks ($N \ge 6$ periods, non-zero variance).
  - **Transferable Career Alternatives:** Jaccard/cosine similarity + 18,460 O*NET related occupation mappings with shared vs. distinctive skill breakdowns.
  - **Mathematically Sound Skill-Gap Analyzer:**
    $$\text{Skill Coverage (\%)} = 100 \times \frac{\sum_{s \in \text{Matched}} w_s}{\sum_{s \in \text{Target}} w_s}$$
    with beginner proficiency weighted at 60% partial credit.
  - **Composite Priority Scoring for Missing Skills:**
    $$\text{Score} = 0.40 \times \text{Relevance} + 0.35 \times \text{Demand Share} + 0.25 \times \text{Category Weight}$$
  - **4-Phase Learning Roadmap:**
    - Phase 1: Build the Foundations
    - Phase 2: Master Core Target-Role Skills
    - Phase 3: Complementary & Advanced Competencies
    - Phase 4: Practical Projects & Applied Portfolio (with specific deliverables, repo structure, and architecture guides)
  - **Career Mobility Matching:** Evaluates student's skill inventory across all 1,016 occupations to discover Strong, Moderate, and Emerging pathways.
  - **Focused Knowledge Graph Subgraph:** NetworkX radial graph centering on the target career, connected skills (teal for required, green for owned, rose for missing), and related career transitions (indigo).

### Backend REST APIs & Test Suite
- `GET /api/careers/search?query={q}`
- `GET /api/careers/{career_id}/overview`
- `GET /api/careers/{career_id}/skills`
- `GET /api/careers/{career_id}/trends`
- `GET /api/careers/{career_id}/forecast`
- `GET /api/careers/{career_id}/alternatives`
- `POST /api/student/profile`
- `POST /api/student/skill-gap`
- `POST /api/student/roadmap`
- `POST /api/student/career-matches`
- `GET /api/graph/career/{career_id}`
- **Automated Tests:** 41 of 41 unit and integration tests passing (`python -m pytest -v`) in 18 seconds.

### Frontend Application (Vite + React + TypeScript + Tailwind CSS)
- **`StudentContext`:** Persistent state with `localStorage` tracking target career, selected skills with Beginner/Intermediate/Advanced proficiencies, custom skills, experience level, and roadmap task completion states.
- **`Layout.tsx`:** Clean, distraction-free modern navigation with dedicated **Career Journey** section and secondary **System & Data Insights** section. Header displays active target dream role with live demand badges.
- **Page 1: Student Landing Page (`Home.tsx`)**:
  - Live autocomplete career search input with instant suggestions.
  - Popular career quick chips (Data Scientist, Software Developer, ML Engineer, Cyber Security, etc.).
  - 6 Core Student Questions cards with direct navigation triggers.
  - 7-Step Career Discovery Roadmap walkthrough.
  - Full data transparency banner explaining dataset provenance.
- **Page 2: Dream Career Intelligence (`CareerIntelligence.tsx`)**:
  - Role overview, verified posting count, distinct employers, date coverage, demand status badge.
  - Interactive Holt-Winters trend & forecast composed chart with 95% confidence intervals and data sufficiency checks.
  - Skill requirements horizontal bar chart and comprehensive searchable table.
  - Comparison drawer allowing side-by-side comparison with alternative careers.
  - "Set as Dream Career" one-click action.
- **Page 3: My Skills Profile (`SkillsProfile.tsx`)**:
  - Add skills via autocomplete from 8,800+ canonical skills or add custom skills.
  - Interactive proficiency selectors (Beginner, Intermediate, Advanced).
  - Target career selector with auto-loaded suggestions.
  - Profile summary stats and instant navigation to Gap Analysis.
- **Page 4: Skill Gap Analyzer (`SkillGapAnalyzer.tsx`)**:
  - Visual donut gauge showing percentage skill coverage based on the weighted mathematical formula.
  - Categorized breakdown: Covered Skills (green), Skills to Strengthen (amber), High-Priority Missing Skills (rose), and Optional Missing Skills (slate).
  - High-leverage "Suggested Next Skill to Learn" recommendation card.
  - Detailed recommendations table with composite priority ranking scores and reasoning.
- **Page 5: Personalized Learning Roadmap (`LearningRoadmap.tsx`)**:
  - 4-phase structured timeline: Foundations, Core Role Skills, Advanced Tooling, and Applied Projects.
  - Interactive status toggles (`Not Started`, `Learning`, `Practiced`, `Confident`).
  - Practical portfolio projects with architecture deliverables and GitHub project ideas.
- **Page 6: Career Alternatives & Mobility (`CareerAlternatives.tsx`)**:
  - Discovers occupations matching candidate's current skills.
  - Match tier categorization: Strong Match ($\ge 50\%$), Moderate Match ($\ge 30\%$), and Emerging Pathway.
  - Shared skills count, overlapping skill badges, and top missing skills.
  - One-click "Switch Target to this Career" action.
- **Page 7: Interactive Career & Skill Graph (`CareerGraphPage.tsx`)**:
  - Interactive React Flow radial network visualization with auto-arranged circular layouts.
  - Custom styled nodes: Target Career (purple center), Student-Owned Skills (emerald), Missing Required Skills (rose), Related Occupations (indigo).
  - Interactive sidebar inspector on node click showing details and transition rationale.
- **Page 8: Student Progress Tracker (`StudentProgress.tsx`)**:
  - Overall role readiness score.
  - Completion progress across the 4 roadmap phases.
  - Mastered competencies list vs. active learning list.
  - Unlocked career mobility opportunities.
- **Secondary System Telemetry Pages:**
  - `Overview.tsx` (accessible at `/system/overview` and `/system`)
  - `DataExplorer.tsx` (accessible at `/system/data`)
  - `Pipeline.tsx` (accessible at `/system/pipeline`)
  - `ModelEvaluation.tsx` (accessible at `/system/evaluation`)
- **Backward-Compatible Route Redirects:** Old URLs (`/data`, `/skills`, `/pipeline`, `/forecast`, `/gap-analyzer`, `/evaluation`) seamlessly redirect to their respective routes so no broken links occur.
- **Frontend Build:** `npm run build` passes with 0 TypeScript and JSX errors.

---

## 3. Incomplete Features / Future Enhancements
- **Resume Upload & Parsing:** Auto-extracting candidate skills directly from a PDF/DOCX resume using NLP entity recognition into `StudentContext`.
- **Course & Tutorial Links:** Direct deep links to free high-quality educational resources (e.g. Coursera, edX, documentation) for each missing skill in the roadmap.
- **Export Career Report to PDF:** Downloadable PDF report summarizing the student's skill gap, roadmap, and alternative career recommendations.

---

## 4. Current Project Structure
```
skillgraph-ai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes.py             # FastAPI REST endpoints
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   └── config.py             # App settings and paths
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── database.py           # SQLAlchemy session and engine
│   │   │   └── models.py             # Database ORM models (15 tables)
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py            # Pydantic v2 schemas
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── career_service.py     # Data science & career logic engine
│   │   └── main.py                   # FastAPI application initialization
│   ├── scripts/
│   │   ├── dataset_config.py
│   │   ├── download_datasets.py
│   │   └── verify_datasets.py
│   ├── tests/
│   │   ├── test_api.py
│   │   ├── test_careers.py           # 10 comprehensive career API tests
│   │   ├── test_etl.py
│   │   ├── test_forecasting.py
│   │   ├── test_graph.py
│   │   ├── test_nlp.py
│   │   └── test_recommendations.py
│   └── data_pipeline/                # ETL, NLP, Graph, Forecast, Evaluation modules
├── data/
│   ├── raw/
│   │   ├── esco/
│   │   ├── linkedin/
│   │   └── onet/                     # O*NET 31.0 text files
│   └── skillgraph.db                 # SQLite database with 1,016 occupations & 31,821 skills
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx            # Redesigned student navigation layout
│   │   │   └── ...                   # Reusable UI cards, tables, badges
│   │   ├── context/
│   │   │   └── StudentContext.tsx    # Persistent student state (localStorage)
│   │   ├── pages/
│   │   │   ├── Home.tsx              # Page 1: Student Landing Page
│   │   │   ├── CareerIntelligence.tsx# Page 2: Dream Career Intelligence
│   │   │   ├── SkillsProfile.tsx     # Page 3: My Skills Profile
│   │   │   ├── SkillGapAnalyzer.tsx  # Page 4: Skill Gap Analyzer
│   │   │   ├── LearningRoadmap.tsx   # Page 5: 4-Phase Learning Roadmap
│   │   │   ├── CareerAlternatives.tsx# Page 6: Career Alternatives & Mobility
│   │   │   ├── CareerGraphPage.tsx   # Page 7: Interactive Career & Skill Graph
│   │   │   ├── StudentProgress.tsx   # Page 8: Student Progress Tracker
│   │   │   ├── Overview.tsx          # System: Market Overview
│   │   │   ├── DataExplorer.tsx      # System: Data Provenance
│   │   │   ├── Pipeline.tsx          # System: Pipeline Telemetry
│   │   │   └── ModelEvaluation.tsx   # System: Model Benchmarks
│   │   ├── services/
│   │   │   └── api.ts                # Axios client with career & student endpoints
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces
│   │   ├── App.tsx                   # Central router with student provider & redirects
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── pytest.ini
├── requirements.txt
└── CONTINUATION.md
```

---

## 5. Important Files Modified & Created
1. `backend/app/db/models.py`: Added `aliases_json` to `Occupation`, added `occupation_id` to `JobPosting`.
2. `backend/app/services/career_service.py`: Complete Data Science and Career Intelligence Service (1,000 lines).
3. `backend/app/schemas/schemas.py`: Pydantic request/response models for career intelligence, student journey, and forecast points.
4. `backend/app/api/routes.py`: 11 new REST endpoints for career search, overview, skills, trends, forecasts, alternatives, skill-gap, roadmaps, mobility matches, and graph.
5. `backend/tests/test_careers.py`: Test suite verifying all career and student endpoints.
6. `frontend/src/context/StudentContext.tsx`: Persistent student state management.
7. `frontend/src/types/index.ts`: TypeScript contracts for career and student data models.
8. `frontend/src/services/api.ts`: API client connecting frontend to FastAPI backend.
9. `frontend/src/components/Layout.tsx`: Complete redesign with student journey navigation and active career header pill.
10. `frontend/src/pages/Home.tsx` to `StudentProgress.tsx`: 8 student-centric pages.
11. `frontend/src/App.tsx`: Central router registration with legacy URL redirects.

---

## 6. How to Run and Test the Application Locally on Windows

### Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ and npm

### Step 1: Start the Backend (FastAPI)
Open PowerShell in `C:\Users\Palak\.gemini\antigravity\scratch\skillgraph-ai`:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend will be live at: `http://127.0.0.1:8000`  
Swagger API Docs: `http://127.0.0.1:8000/docs`

### Step 2: Start the Frontend (Vite React)
Open a second PowerShell window in `C:\Users\Palak\.gemini\antigravity\scratch\skillgraph-ai\frontend`:
```powershell
npm run dev -- --host 127.0.0.1 --port 5173
```
The application will be live at: `http://localhost:5173`

### Step 3: Run the Automated Test Suites
In PowerShell in `C:\Users\Palak\.gemini\antigravity\scratch\skillgraph-ai`:
```powershell
# Run all backend unit & integration tests:
python -m pytest -v

# Run frontend build check (type-checking + bundling):
cd frontend
npm run build
```

---

## 7. Known Errors and Blockers
- **None.** All 41 backend tests pass, frontend TypeScript build compiles with 0 errors, and both local servers are active and responding with HTTP 200.

---

## 8. Exact Next Implementation Task
- Implement Resume / CV PDF skill extraction service to let students drag and drop their resume and auto-populate their skills profile.
