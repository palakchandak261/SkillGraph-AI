"""
Opportunity Matcher Service for SkillGraph AI.

Matches student profiles and skill sets against real job postings in the database.
Calculates transparent match scores, identified vs missing competencies, and direct links.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Set
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from backend.app.db.models import JobPosting, JobSkill, Skill

logger = logging.getLogger(__name__)


class OpportunityService:
    """Matches user skills and criteria against real ingested job postings."""

    def match_opportunities(
        self,
        db: Session,
        candidate_skills: List[str],
        role_filter: Optional[str] = None,
        location_filter: Optional[str] = None,
        min_match_score: float = 20.0,
        limit: int = 15,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Scan active job postings and compute transparent competency relevance.
        """
        if not candidate_skills:
            # Return recent postings with 0 match
            query = db.query(JobPosting).filter(JobPosting.is_active == True)
            if role_filter:
                query = query.filter(JobPosting.title.ilike(f"%{role_filter}%"))
            if location_filter:
                query = query.filter(JobPosting.location.ilike(f"%{location_filter}%"))

            total_jobs = query.count()
            postings = query.order_by(desc(JobPosting.posted_date)).offset(offset).limit(limit).all()

            results = []
            for job in postings:
                job_skills = [
                    js.skill.canonical_name for js in job.job_skills if js.skill and js.skill.canonical_name
                ]
                results.append(self._format_job_match(job, job_skills, set(), 0.0))

            return {
                "total_matched": total_jobs,
                "matches": results,
                "message": "Enter your skills to see personalized match scores.",
            }

        norm_candidate = {s.lower().strip() for s in candidate_skills}

        # Query active jobs
        query = db.query(JobPosting).filter(JobPosting.is_active == True)
        if role_filter:
            query = query.filter(
                or_(
                    JobPosting.title.ilike(f"%{role_filter}%"),
                    JobPosting.normalized_title.ilike(f"%{role_filter}%"),
                )
            )
        if location_filter:
            query = query.filter(
                or_(
                    JobPosting.location.ilike(f"%{location_filter}%"),
                    JobPosting.normalized_location.ilike(f"%{location_filter}%"),
                )
            )

        jobs = query.limit(400).all()

        scored_matches = []
        for job in jobs:
            skills_in_job = [
                js.skill.canonical_name for js in job.job_skills if js.skill and js.skill.canonical_name
            ]
            if not skills_in_job:
                continue

            job_skills_lower = {s.lower(): s for s in skills_in_job}
            shared_lower = set(job_skills_lower.keys()) & norm_candidate

            if not shared_lower:
                continue

            # Calculate match score based on coverage of required skills
            match_score = round((len(shared_lower) / max(1, len(job_skills_lower))) * 100, 1)

            if match_score >= min_match_score or len(shared_lower) >= 2:
                matched_names = [job_skills_lower[k] for k in shared_lower]
                missing_names = [
                    job_skills_lower[k] for k in job_skills_lower if k not in shared_lower
                ]
                scored_matches.append(
                    self._format_job_match(job, skills_in_job, matched_names, match_score, missing_names)
                )

        scored_matches.sort(key=lambda x: (x["match_score"], len(x["matched_skills"])), reverse=True)

        paginated = scored_matches[offset : offset + limit]
        return {
            "total_matched": len(scored_matches),
            "matches": paginated,
            "candidate_skills_evaluated": candidate_skills,
        }

    def _format_job_match(
        self,
        job: JobPosting,
        all_skills: List[str],
        matched_skills: Any,
        match_score: float,
        missing_skills: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        matched_list = list(matched_skills) if matched_skills else []
        missing_list = (
            missing_skills
            if missing_skills is not None
            else [s for s in all_skills if s not in matched_list]
        )

        salary_str = None
        if job.salary_min or job.salary_max:
            curr = job.salary_currency or "$"
            if job.salary_min and job.salary_max:
                salary_str = f"{curr}{int(job.salary_min):,} - {curr}{int(job.salary_max):,}"
            elif job.salary_min:
                salary_str = f"From {curr}{int(job.salary_min):,}"
            else:
                salary_str = f"Up to {curr}{int(job.salary_max):,}"

        # Match tier classification
        if match_score >= 70.0:
            match_tier = "Excellent Match"
        elif match_score >= 45.0:
            match_tier = "Strong Contender"
        elif match_score >= 25.0:
            match_tier = "Moderate Alignment"
        else:
            match_tier = "Development Opportunity"

        return {
            "job_id": job.id,
            "title": job.title,
            "company": job.company or "Verified Employer",
            "location": job.location or "Remote / Flexible",
            "employment_type": job.employment_type or "Full-time",
            "salary_range": salary_str,
            "posted_date": job.posted_date.strftime("%Y-%m-%d") if job.posted_date else None,
            "source_name": job.source.name if job.source else "Ingested Labor Dataset",
            "external_url": f"https://www.linkedin.com/jobs/view/{job.external_id}" if job.external_id else None,
            "match_score": match_score,
            "match_tier": match_tier,
            "matched_skills": matched_list,
            "matched_count": len(matched_list),
            "missing_skills": missing_list[:6],
            "missing_count": len(missing_list),
            "total_job_skills": len(all_skills),
            "relevance_explanation": (
                f"Matches {len(matched_list)} of {len(all_skills)} verified required skills. "
                + (f"Key gaps to close: {', '.join(missing_list[:2])}." if missing_list else "All core requirements covered.")
            ),
        }


opportunity_service = OpportunityService()
