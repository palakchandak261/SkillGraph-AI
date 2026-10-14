# SkillGraph AI - Technical Methodology & Architecture

SkillGraph AI is an end-to-end Data Science and Machine Learning platform that transforms unstructured job postings and occupational taxonomies into actionable career intelligence, interactive knowledge graphs, and predictive career recommendations.

---

## 1. High-Level Architecture

The platform follows a modular, reproducible data science lifecycle:

```
[ Raw Datasets ]
  ├─ Dataset A: Real LinkedIn Job Postings (702k postings archive)
  ├─ Dataset B: Official ESCO Classification (Occupations & Skill Pillars)
  └─ Dataset C: Official O*NET 31.0 Database (Software & Essential Skills)
        │
        ▼
[ ETL & Cleaning Pipeline ]
  ├─ Deduplication (exact & title+company composite hash)
  ├─ Schema Standardization & Type Coercion
  ├─ HTML Tag Stripping & Encoding Normalization
  └─ Title & Location Normalization
        │
        ▼
[ NLP Skill Extraction & Normalization ]
  ├─ Canonical Taxonomy Indexing (8,800+ O*NET & ESCO entities)
  ├─ Inverted Index Fast Matcher (O(1) token intersection & phrase scanning)
  ├─ Boundary Enforcement & Stopword Disambiguation (False positive filtering)
  └─ Entity Linking to Canonical Skill IDs
        │
        ▼
[ Knowledge Graph Engine ]
  ├─ Skill-Skill Co-occurrence Network (Pointwise Mutual Information & Frequency)
  ├─ Occupation-Skill Bipartite Mappings
  ├─ Degree & Betweenness Centrality Analytics
  └─ Greedy Modularity Community Clustering
        │
        ▼
[ Time-Series Forecasting Engine ]
  ├─ Monthly Demand Share Aggregation: DemandShare(s, t) = Count(s, t) / TotalJobs(t)
  ├─ Stationarity Testing (Augmented Dickey-Fuller)
  ├─ Holt-Winters Exponential Smoothing & ARIMA Modeling
  ├─ 95% Bayesian Prediction Interval Estimation
  └─ Emerging Skills Momentum Classification (CAGR & Acceleration)
        │
        ▼
[ Personalized Career Recommender ]
  ├─ Skill Gap & Coverage Analysis: Coverage = |Current ∩ Target| / |Target|
  ├─ Multi-Factor Composite Priority Ranking:
  │    Score = w1*Relevance + w2*DemandShare + w3*GrowthRate + w4*GraphCentrality
  └─ Explainable Justification & Learning Roadmaps
        │
        ▼
[ Presentation & API Layer ]
  ├─ FastAPI RESTful Endpoints (24 routes with Pydantic validation)
  ├─ SQLite Local Persistent Storage (with PostgreSQL support)
  └─ React 18 + TypeScript + Tailwind CSS Interactive Visual Analytics Dashboard
```

---

## 2. Detailed Pipeline Stages

### 2.1 Ingestion & Data Hygiene
- **Deduplication:** Job descriptions often contain cross-posted identical listings. We perform deduplication by combining canonical company name, normalized title, and the first 250 characters of description.
- **Text Cleansing:** Unescapes HTML entities, strips tags, removes control characters, and standardizes unicode text.
- **Date Normalization:** Robust parsing handles Unix epoch timestamps (seconds and milliseconds), ISO-8601 strings, and calendar dates into normalized UTC datetimes.

### 2.2 NLP Skill Extraction
- **Canonical Taxonomy:** Built from official O*NET 31.0 (`Software Skills.txt`, `Essential Skills.txt`) and ESCO classification.
- **Two-Tier Inverted Index:** Instead of regex backtracking across 8,800 patterns per document, we tokenize text and perform set intersection against single-word skills ($O(1)$ lookup) and scan multi-word skills indexed by their first token.
- **Disambiguation:** Short tokens (e.g., "C", "R", "Go", "IT") are guarded with case-sensitive boundaries and negative context filters to prevent false positives (e.g., "IT department" vs "IT skills").

### 2.3 Graph Analytics
- **Graph Construction:** Graph $G = (V, E)$ where vertices $V$ represent canonical skills and occupations, and edges $E$ represent co-occurrence within the same job posting.
- **Edge Weighting:** Normalized co-occurrence frequency $w(u, v) = \text{Count}(u, v)$.
- **Centrality:** Degree centrality identifies versatile "hub" skills; betweenness centrality identifies "bridge" skills connecting disparate technical domains.
- **Community Detection:** Clauset-Newman-Moore greedy modularity maximization partitions skills into coherent domain clusters (e.g., Web Development, Data Science, DevOps, Cloud Infrastructure).

### 2.4 Demand Forecasting
- **Metric Formulation:** Monthly skill demand share:
  $$\text{DemandShare}(s, t) = \frac{\text{Postings mentioning skill } s \text{ in month } t}{\text{Total postings in month } t}$$
- **Model Selection:** Candidates include Naive Drift, Holt-Winters Exponential Smoothing (additive trend), and Auto-ARIMA. The model minimizing out-of-sample MAE/RMSE is automatically selected.
- **Prediction Intervals:** 95% confidence intervals derived from residual variance $\sigma^2$:
  $$\hat{y}_{t+h} \pm 1.96 \cdot \sigma \sqrt{h}$$
- **Emerging Skills:** Skills with positive Compound Annual Growth Rate (CAGR) and acceleration exceeding the 75th percentile of the labor market.

### 2.5 Recommendation Engine
- **Target Profile Match:** Given user skills $S_{\text{user}}$ and target occupation required skills $S_{\text{target}}$:
  $$\text{Coverage}(S_{\text{user}}, S_{\text{target}}) = \frac{|S_{\text{user}} \cap S_{\text{target}}|}{|S_{\text{target}}|}$$
- **Composite Priority Score:**
  $$\text{Score}(s) = w_r \cdot \text{Relevance}(s) + w_d \cdot \text{Demand}(s) + w_g \cdot \text{Growth}(s) + w_c \cdot \text{Centrality}(s)$$
  where default weights are $w_r = 0.40$, $w_d = 0.30$, $w_g = 0.20$, and $w_c = 0.10$.
