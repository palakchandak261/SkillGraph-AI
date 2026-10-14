"""
Personalized Student Skill-Gap Analysis & Recommendation Engine for SkillGraph AI
Calculates transparent skill coverage, identifies curricular gaps, and computes explainable
composite learning priorities.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Set

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class SkillRecommender:
    """Calculates coverage scores and prioritized learning recommendations."""

    def __init__(self):
        pass

    def get_occupation_target_profile(
        self,
        occupation_title: str,
        job_postings_df: pd.DataFrame,
        job_skills_df: pd.DataFrame,
        occupation_skills_df: Optional[pd.DataFrame] = None,
        min_demand_threshold: float = 1.0,
    ) -> List[Dict[str, Any]]:
        """Construct canonical skill requirements for a target occupation from real postings."""
        target_skills: Dict[str, Dict[str, Any]] = {}

        # 1. From real job postings with matching normalized_title or title
        if not job_postings_df.empty and not job_skills_df.empty:
            lower_occ = occupation_title.lower().strip()
            # Match title keywords
            matching_postings = job_postings_df[
                job_postings_df["title"].astype(str).str.lower().str.contains(lower_occ, regex=False) |
                job_postings_df["normalized_title"].astype(str).str.lower().str.contains(lower_occ, regex=False)
            ]

            if not matching_postings.empty:
                n_matching = len(matching_postings)
                merged = pd.merge(
                    job_skills_df,
                    matching_postings[["id"]],
                    left_on="job_id",
                    right_on="id",
                    how="inner",
                )

                if not merged.empty:
                    counts = merged.groupby("canonical_skill")["job_id"].nunique().reset_index()
                    counts["share"] = (counts["job_id"] / n_matching) * 100

                    for _, row in counts.iterrows():
                        skill = str(row["canonical_skill"]).strip()
                        share = float(row["share"])
                        if share >= min_demand_threshold:
                            target_skills[skill] = {
                                "skill_name": skill,
                                "importance": min(1.0, round(share / 50.0, 2)),  # scale 0 to 1
                                "frequency": int(row["job_id"]),
                                "demand_share": round(share, 1),
                                "source": "job_postings",
                            }

        # 2. Augment from O*NET / ESCO occupational relationships
        if occupation_skills_df is not None and not occupation_skills_df.empty:
            occ_matches = occupation_skills_df[
                occupation_skills_df["occupation_title"].astype(str).str.lower().str.contains(
                    occupation_title.lower().strip(), regex=False
                )
            ]
            for _, row in occ_matches.iterrows():
                skill = str(row["skill_name"]).strip()
                score = float(row.get("importance", 0.8))
                if skill not in target_skills:
                    target_skills[skill] = {
                        "skill_name": skill,
                        "importance": round(min(1.0, max(0.2, score)), 2),
                        "frequency": 1,
                        "demand_share": 5.0,
                        "source": "taxonomy",
                    }

        # Fallback if no specific title matched: take top skills across market
        if not target_skills and not job_skills_df.empty:
            top_market = job_skills_df["canonical_skill"].value_counts().head(12)
            for skill, count in top_market.items():
                target_skills[str(skill)] = {
                    "skill_name": str(skill),
                    "importance": 0.7,
                    "frequency": int(count),
                    "demand_share": 10.0,
                    "source": "market_baseline",
                }

        results = list(target_skills.values())
        results.sort(key=lambda x: x["importance"], reverse=True)
        return results

    def analyze_skill_gap(
        self,
        candidate_skills: List[str],
        target_occupation: str,
        target_requirements: List[Dict[str, Any]],
        growth_scores: Optional[Dict[str, float]] = None,
        graph_engine: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Perform transparent gap analysis and rank missing skills by multi-factor composite priority."""
        norm_candidate = {s.lower().strip() for s in candidate_skills}
        growth_map = growth_scores or {}

        matched_skills = []
        missing_skills = []

        total_weight = 0.0
        matched_weight = 0.0

        for req in target_requirements:
            s_name = req["skill_name"]
            weight = req.get("importance", 0.5)
            total_weight += weight

            is_match = s_name.lower().strip() in norm_candidate
            if is_match:
                matched_weight += weight
                matched_skills.append({
                    "skill_id": hash(s_name) % 100000,
                    "skill_name": s_name,
                    "importance": weight,
                    "matched": True,
                })
            else:
                # Calculate multi-factor priority score:
                # 1. Relevance Score (w1 = 0.40): importance to the target role
                # 2. Demand Score (w2 = 0.30): market presence
                # 3. Growth Score (w3 = 0.20): momentum / trend
                # 4. Prerequisite / Graph Connectivity (w4 = 0.10)
                relevance = min(1.0, max(0.1, weight))
                demand = min(1.0, req.get("demand_share", 5.0) / 40.0)
                growth_val = growth_map.get(s_name, 0.0)
                growth = min(1.0, max(0.0, (growth_val + 50) / 100.0))

                # Graph connectivity to candidate's existing skills
                conn_score = 0.3
                if graph_engine and hasattr(graph_engine, "graph"):
                    related = graph_engine.get_related_skills(s_name, top_k=5)
                    overlap = sum(1 for r in related if r["skill_name"].lower() in norm_candidate)
                    conn_score = min(1.0, overlap * 0.3 + 0.1)

                composite = round(
                    0.40 * relevance + 0.30 * demand + 0.20 * growth + 0.10 * conn_score,
                    3,
                )

                reasoning_parts = []
                if relevance >= 0.7:
                    reasoning_parts.append("Core requirement for target occupation")
                elif relevance >= 0.4:
                    reasoning_parts.append("Commonly requested competence in postings")
                else:
                    reasoning_parts.append("Complementary occupational skill")

                if demand >= 0.5:
                    reasoning_parts.append(f"high market presence ({req.get('demand_share', 0):.1f}% demand share)")

                if growth_val > 10:
                    reasoning_parts.append(f"growing momentum (+{growth_val:.1f}%)")

                if conn_score >= 0.6:
                    reasoning_parts.append("builds naturally on your current skill set")

                reasoning = "; ".join(reasoning_parts) + "."

                missing_skills.append({
                    "skill_id": hash(s_name) % 100000,
                    "skill_name": s_name,
                    "priority_rank": 0,  # will set after sorting
                    "relevance_score": round(relevance, 2),
                    "demand_score": round(demand, 2),
                    "growth_score": round(growth, 2),
                    "composite_score": composite,
                    "reasoning": reasoning,
                })

        # Calculate SkillCoverage ratio:
        # Sum of importance weights for matched / Sum of importance weights for all
        coverage_score = round((matched_weight / total_weight) * 100, 1) if total_weight > 0 else 0.0

        # Sort missing skills by composite score descending
        missing_skills.sort(key=lambda x: x["composite_score"], reverse=True)
        for idx, item in enumerate(missing_skills):
            item["priority_rank"] = idx + 1

        return {
            "profile_id": 1,
            "target_occupation": target_occupation,
            "skill_coverage": coverage_score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "total_required": len(target_requirements),
            "total_matched": len(matched_skills),
        }
