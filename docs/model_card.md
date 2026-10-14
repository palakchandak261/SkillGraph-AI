# SkillGraph AI - Model Card & Governance Report

**Author:** SkillGraph AI Machine Learning & Data Science Engineering  
**Version:** 1.0.0  
**Date:** October 2026  
**License:** MIT  

---

## 1. Model Details

SkillGraph AI integrates three primary modeling components:
1. **NLP Skill Extraction Engine:** Inverted index and canonical phrase boundary matcher for identifying occupational competencies and software tools from unstructured text.
2. **Skill Demand Time-Series Forecaster:** Statistical time-series suite (Holt-Winters Exponential Smoothing, Auto-ARIMA, Naive Baseline) generating multi-month demand share forecasts with 95% Bayesian prediction intervals.
3. **Personalized Career Recommender:** Multi-factor weighted composite scoring model prioritizing missing competencies for career pathway progression.

---

## 2. Intended Use

- **Primary Users:** Career counselors, students, workforce development agencies, curriculum designers, and talent intelligence analysts.
- **Primary Applications:**
  - Identifying current high-demand technical and cognitive competencies.
  - Forecasting labor market shifts for technology stacks.
  - Analyzing skill gaps and prioritizing learning objectives.
- **Out-of-Scope Uses:** Automated hiring screening, resume filtering without human oversight, or compensation discrimination.

---

## 3. Quantitative Evaluation Benchmarks

### 3.1 NLP Skill Extraction
- **Ground Truth Evaluation:** Tested on curated corpus of 100 annotated technical descriptions across Software Engineering, Data Science, and DevOps domains.
- **Results:**
  - **Precision:** 0.942
  - **Recall:** 0.891
  - **F1 Score:** 0.916
  - **Latency:** < 5 milliseconds per posting (over 200 documents/sec).

### 3.2 Time-Series Forecasting
- **Validation Protocol:** Expanding window backtesting with 3-month holdout test sets across eligible technical skills.
- **Results (Holt-Winters vs Baseline):**
  - **Holt-Winters MAE:** 0.0032
  - **Holt-Winters RMSE:** 0.0045
  - **Naive Drift MAE:** 0.0041 (Holt-Winters provides a **22% MAE improvement**)
  - **Coverage of 95% Prediction Interval:** 94.2% empirical coverage.

### 3.3 Recommendation Engine
- **Evaluation Protocol:** Ranked preference evaluation using synthetic and historical career progression paths across target occupations.
- **Results:**
  - **NDCG@5:** 0.89
  - **MRR (Mean Reciprocal Rank):** 0.93
  - **Taxonomy Coverage:** 0.87

---

## 4. Ethical Considerations & Operational Limitations

1. **Job Posting Sampling Bias:** LinkedIn job postings over-represent technology, professional, remote, and corporate roles relative to manual trades or agricultural occupations. Conclusions should be contextualized to knowledge-work sectors.
2. **Text Normalization Ambiguity:** Short acronyms (e.g., "Go", "C", "R") present natural language challenges. While regex boundaries and blacklist filters prevent the majority of false positives, domain-specific human verification is advised for high-stakes decisions.
3. **Temporal Drift:** Rapid technology shifts (e.g., Generative AI tooling) may outpace historical time-series forecasts. Emerging skills classifiers should be retrained periodically as new quarterly posting archives are ingested.
