# SkillGraph AI - Data Dictionary

This document details the data structures, schemas, and relational entity models across all stages of SkillGraph AI.

---

## 1. Raw Dataset Specifications

### 1.1 Dataset A: LinkedIn Job Postings
- **Primary Source:** Kaggle / Hugging Face mirror (`xanderios/linkedin-job-postings`)
- **Key Columns:**
  - `job_id` (BIGINT): Unique identifier for job posting.
  - `company_name` / `company_id` (TEXT/BIGINT): Employer entity.
  - `title` (TEXT): Stated job title.
  - `description` (TEXT): Full unformatted text of job description (HTML/plain).
  - `max_salary`, `med_salary`, `min_salary`, `pay_period`, `currency` (NUMERIC): Compensation attributes.
  - `location` (TEXT): City, state, or remote indicator.
  - `listed_time` / `original_listed_time` (BIGINT): Unix millisecond timestamp.
  - `formatted_work_type` (TEXT): Full-time, Part-time, Contract, etc.

### 1.2 Dataset B: Official ESCO Classification
- **Primary Source:** European Commission ESCO Portal (v1.1 English)
- **Key Files:**
  - `occupations_en.csv`: Canonical occupation titles and concept URIs.
  - `skills_en.csv`: Preferred labels, alternative labels, descriptions.
  - `occupationSkillRelations.csv`: Essential vs optional occupation-skill links.

### 1.3 Dataset C: Official O*NET 31.0 Database
- **Primary Source:** O*NET Resource Center (`db_31_0_text.zip`)
- **Key Files:**
  - `Software Skills.txt`: Commercial software titles, tools, and platforms (`O*NET-SOC Code`, `Title`, `Example`, `Commodity Code`).
  - `Essential Skills.txt`: Standardized cognitive and technical competencies.
  - `Occupation Data.txt`: SOC code to occupation titles and descriptions.

---

## 2. Relational Database Schema (`skillgraph.db`)

### `dataset_sources`
Tracks provenance, file size, hashes, and row counts of external data.
- `id` (INTEGER, PK): Auto-increment primary key.
- `name` (VARCHAR): Human-readable name.
- `source_url` (VARCHAR): Download origin URL.
- `file_name` (VARCHAR): Local file name.
- `file_size` (BIGINT): Size in bytes.
- `sha256_checksum` (VARCHAR): Cryptographic SHA-256 digest.
- `row_count` (INTEGER): Total rows parsed.
- `processing_status` (VARCHAR): `downloaded`, `processed`, `failed`.

### `job_postings`
Cleaned and normalized job postings.
- `id` (INTEGER, PK): Primary key.
- `source_id` (INTEGER, FK -> dataset_sources.id): Provenance link.
- `external_id` (VARCHAR): Original posting ID.
- `title` (VARCHAR): Raw job title.
- `normalized_title` (VARCHAR): Standardized job title.
- `company` (VARCHAR): Normalized company name.
- `location` (VARCHAR): Location string.
- `description` (TEXT): Cleaned job description body.
- `employment_type` (VARCHAR): Full-time, Contract, etc.
- `posted_date` (DATETIME): Parsed publication date.
- `is_active` (BOOLEAN): Active record indicator.

### `skills`
Canonical occupational and technology skills taxonomy.
- `id` (INTEGER, PK): Primary key.
- `canonical_name` (VARCHAR, UNIQUE): Standardized skill name.
- `esco_id` (VARCHAR): European ESCO concept identifier.
- `onet_id` (VARCHAR): O*NET element identifier.
- `taxonomy_source` (VARCHAR): Origin taxonomy (`ONET`, `ESCO`, `Common`).
- `category` (VARCHAR): Skill domain (Technical, Soft, Cloud, Language).
- `description` (TEXT): Definition.
- `aliases_json` (TEXT): JSON array of recognized synonyms and abbreviations.

### `occupations`
Standardized occupational titles.
- `id` (INTEGER, PK): Primary key.
- `title` (VARCHAR, UNIQUE): Occupational title.
- `esco_code` (VARCHAR): ESCO code.
- `onet_code` (VARCHAR): O*NET SOC code.
- `description` (TEXT): Scope and role summary.
- `taxonomy_source` (VARCHAR): Classification source.

### `job_skills`
Extracted mentions of skills within job postings.
- `id` (INTEGER, PK): Primary key.
- `job_id` (INTEGER, FK -> job_postings.id): Target job posting.
- `skill_id` (INTEGER, FK -> skills.id): Extracted canonical skill.
- `matched_phrase` (VARCHAR): Exact substring matched in text.
- `confidence` (FLOAT): Extraction confidence score (0.0 - 1.0).
- `extraction_method` (VARCHAR): `exact`, `alias`, `regex`.

### `skill_relationships`
Edges in the skill knowledge graph.
- `id` (INTEGER, PK): Primary key.
- `skill_id_1` (INTEGER, FK -> skills.id): First skill entity.
- `skill_id_2` (INTEGER, FK -> skills.id): Second skill entity.
- `relationship_type` (VARCHAR): `co-occurrence`, `prerequisite`, `taxonomic`.
- `weight` (FLOAT): Normalized relationship strength.

### `skill_demand_observations`
Time-series demand observations aggregated by period.
- `id` (INTEGER, PK): Primary key.
- `skill_id` (INTEGER, FK -> skills.id): Target skill.
- `period_start` (DATETIME): Beginning of observation window.
- `period_end` (DATETIME): End of observation window.
- `posting_count` (INTEGER): Number of postings requiring this skill.
- `total_postings` (INTEGER): Total postings during this window.
- `demand_share` (FLOAT): Ratio `posting_count / total_postings`.

### `forecast_runs` & `forecast_results`
Models trained and projected skill demand trajectories.
- `forecast_runs`: Model name, parameters, MAE, RMSE, selected indicator.
- `forecast_results`: Projected demand point, lower 95% bound, upper 95% bound.

### `model_evaluation_runs`
Audit and benchmark records for NLP extraction, forecasting, and recommendations.
- `model_type` (VARCHAR): Extraction, Forecasting, Recommendation.
- `model_name` (VARCHAR): Specific algorithm.
- `metrics_json` (TEXT): Dict of calculated metrics (Precision, Recall, MAE, NDCG).
