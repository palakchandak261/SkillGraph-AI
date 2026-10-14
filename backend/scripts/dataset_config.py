"""Dataset acquisition and validation configuration for SkillGraph AI.

This module defines configuration specifications, schema expectations,
download sources, and manual acquisition instructions for the three primary
SkillGraph AI datasets:
  - Dataset A: LinkedIn Job Postings (Kaggle arshkon/linkedin-job-postings)
  - Dataset B: ESCO Classification (European Skills, Competences, Qualifications and Occupations)
  - Dataset C: O*NET Database (U.S. Department of Labor ETA)
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


# ==============================================================================
# Filesystem Path Resolution
# ==============================================================================

def get_project_root() -> Path:
    """Resolve project root directory robustly."""
    env_root = os.getenv("SKILLGRAPH_ROOT")
    if env_root:
        return Path(env_root).resolve()
    # Default to 2 levels up from backend/scripts/ -> skillgraph-ai/
    return Path(__file__).resolve().parents[2]


PROJECT_ROOT: Path = get_project_root()
DATA_DIR: Path = PROJECT_ROOT / "data"
RAW_DATA_DIR: Path = DATA_DIR / "raw"
INTERIM_DATA_DIR: Path = DATA_DIR / "interim"
PROCESSED_DATA_DIR: Path = DATA_DIR / "processed"
EXTERNAL_DATA_DIR: Path = DATA_DIR / "external"
REPORTS_DATA_DIR: Path = DATA_DIR / "reports"

# Manifest locations (primary in data/, secondary mirror in data/raw/)
MANIFEST_PATH: Path = DATA_DIR / "dataset_manifest.json"
RAW_MANIFEST_PATH: Path = RAW_DATA_DIR / "dataset_manifest.json"


def ensure_data_directories(base_dir: Optional[Path] = None) -> Dict[str, Path]:
    """Ensure standard project data directories exist.

    Args:
        base_dir: Optional base data directory override (defaults to DATA_DIR).

    Returns:
        Dictionary of directory paths created/verified.
    """
    root = (base_dir or DATA_DIR).resolve()
    dirs = {
        "data": root,
        "raw": root / "raw",
        "raw_linkedin": root / "raw" / "linkedin_jobs",
        "raw_esco": root / "raw" / "esco",
        "raw_onet": root / "raw" / "onet",
        "interim": root / "interim",
        "processed": root / "processed",
        "external": root / "external",
        "reports": root / "reports",
    }
    for path in dirs.values():
        path.mkdir(parents=True, exist_ok=True)
    return dirs


# ==============================================================================
# Configuration Data Models
# ==============================================================================

@dataclass
class DatasetFileConfig:
    """Specification for an expected dataset file."""
    filename: str
    description: str
    is_required: bool = True
    file_format: str = "csv"  # "csv", "tsv", "txt", "json"
    delimiter: str = ","
    expected_columns: List[str] = field(default_factory=list)
    key_columns: List[str] = field(default_factory=list)
    min_expected_rows: int = 1
    alternative_filenames: List[str] = field(default_factory=list)


@dataclass
class DatasetConfig:
    """Full acquisition and schema configuration for a dataset."""
    key: str  # e.g., "dataset_a_linkedin"
    name: str  # e.g., "LinkedIn Job Postings"
    alias: str  # e.g., "linkedin" or "A"
    sub_dir: str  # relative subfolder under raw/
    license_name: str
    license_url: str
    official_url: str
    description: str
    files: List[DatasetFileConfig]
    kaggle_id: Optional[str] = None
    kaggle_command: Optional[str] = None
    huggingface_repos: List[str] = field(default_factory=list)
    direct_urls: List[str] = field(default_factory=list)
    candidate_archive_urls: List[str] = field(default_factory=list)
    manual_instructions: str = ""

    @property
    def target_dir(self) -> Path:
        """Target folder inside data/raw/."""
        return RAW_DATA_DIR / self.sub_dir

    def get_file_config(self, filename: str) -> Optional[DatasetFileConfig]:
        """Look up file configuration by filename or alias."""
        lower = filename.lower()
        for f in self.files:
            if f.filename.lower() == lower:
                return f
            if any(alt.lower() == lower for alt in f.alternative_filenames):
                return f
        return None


# ==============================================================================
# Dataset A: LinkedIn Job Postings (Kaggle arshkon/linkedin-job-postings)
# ==============================================================================

LINKEDIN_JOBS_CONFIG = DatasetConfig(
    key="dataset_a_linkedin",
    name="LinkedIn Job Postings (2023-2024)",
    alias="linkedin",
    sub_dir="linkedin_jobs",
    license_name="Kaggle Community Guidelines / Open Research Access",
    license_url="https://www.kaggle.com/datasets/arshkon/linkedin-job-postings",
    official_url="https://www.kaggle.com/datasets/arshkon/linkedin-job-postings",
    kaggle_id="arshkon/linkedin-job-postings",
    kaggle_command="kaggle datasets download -d arshkon/linkedin-job-postings -p data/raw/linkedin_jobs --unzip",
    huggingface_repos=[
        "xanderios/linkedin-job-postings",
        "jean-claude/linkedin-job-postings",
    ],
    direct_urls=[
        "https://huggingface.co/datasets/xanderios/linkedin-job-postings/resolve/main/job_postings.csv",
    ],
    description=(
        "Extensive collection of 30,000+ real LinkedIn job postings containing raw "
        "descriptions, required skills, titles, company details, pay ranges, and locations."
    ),
    manual_instructions="""Manual Download Instructions for Dataset A (LinkedIn Job Postings):
1. Using Kaggle CLI:
   a. Ensure kaggle is installed: pip install kaggle
   b. Place your Kaggle API key at ~/.kaggle/kaggle.json
   c. Execute:
      kaggle datasets download -d arshkon/linkedin-job-postings -p data/raw/linkedin_jobs --unzip

2. Using Kaggle Web Interface:
   a. Navigate to: https://www.kaggle.com/datasets/arshkon/linkedin-job-postings
   b. Click "Download" (requires Kaggle account login).
   c. Unzip the downloaded archive directly into:
      {target_dir}
   d. Confirm 'job_postings.csv' is present in that folder.

3. Using Hugging Face Direct Download:
   a. Visit https://huggingface.co/datasets/xanderios/linkedin-job-postings
   b. Download 'job_postings.csv' and place it into:
      {target_dir}
""",
    files=[
        DatasetFileConfig(
            filename="job_postings.csv",
            description="Primary job postings table with titles, descriptions, skills, and salaries.",
            is_required=True,
            file_format="csv",
            delimiter=",",
            min_expected_rows=1000,
            expected_columns=[
                "job_id",
                "company_name",
                "title",
                "description",
                "max_salary",
                "med_salary",
                "min_salary",
                "pay_period",
                "formatted_work_type",
                "location",
                "applies",
                "original_listed_time",
                "remote_allowed",
                "views",
                "job_posting_url",
                "application_url",
                "application_type",
                "expiry",
                "closed_time",
                "formatted_experience_level",
                "skills_desc",
                "listed_time",
                "posting_domain",
                "sponsored",
                "work_type",
                "currency",
                "compensation_type",
                "scraped",
            ],
            key_columns=["job_id", "title", "description"],
            alternative_filenames=["job_postings_sample.csv"],
        ),
        DatasetFileConfig(
            filename="companies.csv",
            description="Company profiles including name, size, city, and description.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=[
                "company_id",
                "name",
                "description",
                "company_size",
                "state",
                "country",
                "city",
                "zip_code",
                "address",
                "url",
            ],
            key_columns=["company_id", "name"],
        ),
        DatasetFileConfig(
            filename="job_skills.csv",
            description="Mapping of job IDs to skill abbreviations/tags.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=["job_id", "skill_abr"],
            key_columns=["job_id", "skill_abr"],
        ),
        DatasetFileConfig(
            filename="job_industries.csv",
            description="Mapping of job IDs to industry classification codes.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=["job_id", "industry_id"],
            key_columns=["job_id", "industry_id"],
        ),
        DatasetFileConfig(
            filename="salaries.csv",
            description="Granular compensation details associated with job postings.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=[
                "salary_id",
                "job_id",
                "max_salary",
                "med_salary",
                "min_salary",
                "pay_period",
                "currency",
                "compensation_type",
            ],
            key_columns=["job_id"],
        ),
        DatasetFileConfig(
            filename="company_specialities.csv",
            description="Company domain specialties and tags.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=["company_id", "speciality"],
        ),
        DatasetFileConfig(
            filename="company_industries.csv",
            description="Company primary industries.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=["company_id", "industry"],
        ),
        DatasetFileConfig(
            filename="employee_counts.csv",
            description="Company headcounts and member follower counts.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=["company_id", "employee_count", "follower_count", "time_stamp"],
        ),
        DatasetFileConfig(
            filename="benefits.csv",
            description="Benefits and perks tagged to job postings.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=["job_id", "inferred", "type"],
        ),
    ],
)


# ==============================================================================
# Dataset B: ESCO Classification (European Commission)
# ==============================================================================

ESCO_CONFIG = DatasetConfig(
    key="dataset_b_esco",
    name="ESCO Classification (v1.2.0 / v1.1.1)",
    alias="esco",
    sub_dir="esco",
    license_name="European Commission Open Data / CC BY 4.0 compatible",
    license_url="https://ec.europa.eu/esco/portal/licence",
    official_url="https://ec.europa.eu/esco/portal/download",
    candidate_archive_urls=[
        # Direct public mirrors / EU packages
        "https://ec.europa.eu/esco/portal/download",
    ],
    direct_urls=[
        # Alternative GitHub mirrors containing clean ESCO English CSVs
        "https://raw.githubusercontent.com/maudgrol/Data_driven_skills_taxonomy/main/data/occupations_en.csv",
        "https://raw.githubusercontent.com/maudgrol/Data_driven_skills_taxonomy/main/data/skills_en.csv",
    ],
    description=(
        "European Skills, Competences, Qualifications and Occupations taxonomy containing "
        "hierarchical occupation concepts, skill concepts, and occupation-to-skill mappings."
    ),
    manual_instructions="""Manual Download Instructions for Dataset B (ESCO Classification):
1. Navigate to the official European Commission ESCO download portal:
   https://ec.europa.eu/esco/portal/download
2. Choose version: 'ESCO v1.2.0' (or latest stable v1.1.1).
3. Select format: 'CSV'.
4. Select language: 'English (en)'.
5. Select pillars:
   - Occupations pillar
   - Skills pillar
   - Transversal skills
   - Relations (Skill-Skill and Occupation-Skill mappings)
6. Read and accept the privacy notice, then provide your email to generate the download link.
7. Download the zip bundle from the link sent to your email.
8. Extract all files into the SkillGraph raw ESCO directory:
   {target_dir}
9. Verify that at least the following four files are present:
   - occupations_en.csv
   - skills_en.csv
   - occupationSkillRelations.csv
   - skillSkillRelations.csv
""",
    files=[
        DatasetFileConfig(
            filename="occupations_en.csv",
            description="Occupations taxonomy with ISCO codes, URIs, preferred and alternative labels.",
            is_required=True,
            file_format="csv",
            delimiter=",",
            min_expected_rows=2000,
            expected_columns=[
                "conceptType",
                "conceptUri",
                "iscoGroup",
                "preferredLabel",
                "altLabels",
                "hiddenLabels",
                "status",
                "modifiedDate",
                "scopeNote",
                "definition",
                "inScheme",
                "description",
                "code",
            ],
            key_columns=["conceptUri", "preferredLabel"],
            alternative_filenames=["occupations.csv"],
        ),
        DatasetFileConfig(
            filename="skills_en.csv",
            description="Skills and competences taxonomy with URIs, labels, reuse level, and descriptions.",
            is_required=True,
            file_format="csv",
            delimiter=",",
            min_expected_rows=10000,
            expected_columns=[
                "conceptType",
                "conceptUri",
                "skillType",
                "reuseLevel",
                "preferredLabel",
                "altLabels",
                "hiddenLabels",
                "status",
                "modifiedDate",
                "scopeNote",
                "definition",
                "inScheme",
                "description",
            ],
            key_columns=["conceptUri", "preferredLabel", "skillType"],
            alternative_filenames=["skills.csv"],
        ),
        DatasetFileConfig(
            filename="occupationSkillRelations.csv",
            description="Explicit bipartite relationships between occupations and skills (essential/optional).",
            is_required=True,
            file_format="csv",
            delimiter=",",
            min_expected_rows=50000,
            expected_columns=[
                "occupationUri",
                "relationType",
                "skillType",
                "skillUri",
            ],
            key_columns=["occupationUri", "relationType", "skillUri"],
            alternative_filenames=["occupation_skill_relations.csv"],
        ),
        DatasetFileConfig(
            filename="skillSkillRelations.csv",
            description="Skill-to-skill hierarchical and associative relationships.",
            is_required=True,
            file_format="csv",
            delimiter=",",
            min_expected_rows=1000,
            expected_columns=[
                "originalSkillUri",
                "relationType",
                "relatedSkillUri",
            ],
            key_columns=["originalSkillUri", "relationType", "relatedSkillUri"],
            alternative_filenames=["skill_skill_relations.csv"],
        ),
        DatasetFileConfig(
            filename="broaderRelationsOccPillar.csv",
            description="Hierarchical parent-child relationships in the occupation pillar.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=["conceptType", "conceptUri", "broaderType", "broaderUri"],
            key_columns=["conceptUri", "broaderUri"],
        ),
        DatasetFileConfig(
            filename="broaderRelationsSkillPillar.csv",
            description="Hierarchical parent-child relations in the skill pillar.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=["conceptType", "conceptUri", "broaderType", "broaderUri"],
            key_columns=["conceptUri", "broaderUri"],
        ),
        DatasetFileConfig(
            filename="skillGroups_en.csv",
            description="Skill categorization groups and clusters.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=["conceptType", "conceptUri", "preferredLabel", "altLabels", "description", "code"],
        ),
        DatasetFileConfig(
            filename="ISCOGroups_en.csv",
            description="International Standard Classification of Occupations (ISCO-08) groups.",
            is_required=False,
            file_format="csv",
            delimiter=",",
            expected_columns=["conceptType", "conceptUri", "code", "preferredLabel", "altLabels", "description"],
        ),
    ],
)


# ==============================================================================
# Dataset C: O*NET Database (U.S. Department of Labor / ETA)
# ==============================================================================

ONET_CONFIG = DatasetConfig(
    key="dataset_c_onet",
    name="O*NET Database",
    alias="onet",
    sub_dir="onet",
    license_name="Creative Commons Attribution 4.0 International (CC BY 4.0)",
    license_url="https://www.onetcenter.org/license_db.html",
    official_url="https://www.onetcenter.org/database.html",
    candidate_archive_urls=[
        # Probe from newest to older stable versions
        "https://www.onetcenter.org/dl_files/database/db_31_0_text.zip",
        "https://www.onetcenter.org/dl_files/database/db_30_3_text.zip",
        "https://www.onetcenter.org/dl_files/database/db_30_2_text.zip",
        "https://www.onetcenter.org/dl_files/database/db_30_1_text.zip",
        "https://www.onetcenter.org/dl_files/database/db_30_0_text.zip",
        "https://www.onetcenter.org/dl_files/database/db_29_3_text.zip",
        "https://www.onetcenter.org/dl_files/database/db_29_2_text.zip",
        "https://www.onetcenter.org/dl_files/database/db_29_1_text.zip",
        "https://www.onetcenter.org/dl_files/database/db_29_0_text.zip",
    ],
    description=(
        "The Occupational Information Network (O*NET) database published by the U.S. "
        "Department of Labor. Provides standardized descriptors for occupations, "
        "skills, knowledge, abilities, work activities, and technology tools."
    ),
    manual_instructions="""Manual Download Instructions for Dataset C (O*NET Database):
1. Visit the official O*NET Center database download page:
   https://www.onetcenter.org/database.html
2. Under "Text" or "ASCII Files", locate the download link for the latest release:
   (e.g., db_31_0_text.zip or db_30_0_text.zip)
3. Direct download links:
   - Latest: https://www.onetcenter.org/dl_files/database/db_31_0_text.zip
   - Archive: https://www.onetcenter.org/db_releases.html
4. Download the ZIP file and extract all flat text files into:
   {target_dir}
5. Confirm the presence of key text files:
   - Skills.txt
   - Technology Skills.txt
   - Occupation Data.txt
   - Knowledge.txt
   - Abilities.txt
   - Work Activities.txt
""",
    files=[
        DatasetFileConfig(
            filename="Skills.txt",
            description="Ratings of basic skills and cross-functional skills per occupation.",
            is_required=True,
            file_format="txt",
            delimiter="\t",
            min_expected_rows=20000,
            expected_columns=[
                "O*NET-SOC Code",
                "Element ID",
                "Element Name",
                "Scale ID",
                "Data Value",
                "N",
                "Standard Error",
                "Lower CI Bound",
                "Upper CI Bound",
                "Recommend Suppress",
                "Not Relevant",
                "Date",
                "Domain Source",
            ],
            key_columns=["O*NET-SOC Code", "Element ID", "Element Name", "Scale ID", "Data Value"],
            alternative_filenames=["Essential Skills.txt", "Transferable Skills.txt"],
        ),
        DatasetFileConfig(
            filename="Technology Skills.txt",
            description="Software, programming languages, and IT tools mapped to occupations.",
            is_required=True,
            file_format="txt",
            delimiter="\t",
            min_expected_rows=15000,
            expected_columns=[
                "O*NET-SOC Code",
                "Title",
                "Example",
                "Workplace Example",
                "Commodity Code",
                "Commodity Title",
                "Hot Technology",
                "In Demand",
            ],
            key_columns=["O*NET-SOC Code"],
            alternative_filenames=["Software Skills.txt"],
        ),
        DatasetFileConfig(
            filename="Occupation Data.txt",
            description="Master list of O*NET-SOC occupations with standardized titles and definitions.",
            is_required=True,
            file_format="txt",
            delimiter="\t",
            min_expected_rows=900,
            expected_columns=[
                "O*NET-SOC Code",
                "Title",
                "Description",
            ],
            key_columns=["O*NET-SOC Code", "Title"],
        ),
        DatasetFileConfig(
            filename="Knowledge.txt",
            description="Knowledge domain ratings per occupation.",
            is_required=False,
            file_format="txt",
            delimiter="\t",
            expected_columns=[
                "O*NET-SOC Code",
                "Element ID",
                "Element Name",
                "Scale ID",
                "Data Value",
                "N",
                "Standard Error",
                "Lower CI Bound",
                "Upper CI Bound",
                "Recommend Suppress",
                "Not Relevant",
                "Date",
                "Domain Source",
            ],
            key_columns=["O*NET-SOC Code", "Element ID", "Element Name"],
        ),
        DatasetFileConfig(
            filename="Abilities.txt",
            description="Cognitive, physical, and psychomotor abilities per occupation.",
            is_required=False,
            file_format="txt",
            delimiter="\t",
            expected_columns=[
                "O*NET-SOC Code",
                "Element ID",
                "Element Name",
                "Scale ID",
                "Data Value",
                "N",
                "Standard Error",
                "Lower CI Bound",
                "Upper CI Bound",
                "Recommend Suppress",
                "Not Relevant",
                "Date",
                "Domain Source",
            ],
            key_columns=["O*NET-SOC Code", "Element ID", "Element Name"],
        ),
        DatasetFileConfig(
            filename="Work Activities.txt",
            description="Generalized work activities performed across occupations.",
            is_required=False,
            file_format="txt",
            delimiter="\t",
            expected_columns=[
                "O*NET-SOC Code",
                "Element ID",
                "Element Name",
                "Scale ID",
                "Data Value",
                "N",
                "Standard Error",
                "Lower CI Bound",
                "Upper CI Bound",
                "Recommend Suppress",
                "Not Relevant",
                "Date",
                "Domain Source",
            ],
            key_columns=["O*NET-SOC Code", "Element ID", "Element Name"],
        ),
        DatasetFileConfig(
            filename="Tools Used.txt",
            description="Machines, equipment, and tangible tools utilized on the job.",
            is_required=False,
            file_format="txt",
            delimiter="\t",
            expected_columns=[
                "O*NET-SOC Code",
                "Title",
                "Example",
                "Commodity Code",
                "Commodity Title",
            ],
            key_columns=["O*NET-SOC Code", "Example"],
        ),
        DatasetFileConfig(
            filename="Task Statements.txt",
            description="Detailed job task statements per occupation.",
            is_required=False,
            file_format="txt",
            delimiter="\t",
            expected_columns=[
                "O*NET-SOC Code",
                "Task ID",
                "Task",
                "Task Type",
                "Incumbents Responding",
                "Date",
                "Domain Source",
            ],
            key_columns=["O*NET-SOC Code", "Task ID", "Task"],
        ),
        DatasetFileConfig(
            filename="Tasks to Technology.txt",
            description="Crosswalk between occupational tasks and technology skills.",
            is_required=False,
            file_format="txt",
            delimiter="\t",
            expected_columns=[
                "O*NET-SOC Code",
                "Task ID",
                "Commodity Code",
                "Hot Technology",
            ],
            key_columns=["O*NET-SOC Code", "Task ID", "Commodity Code"],
        ),
        DatasetFileConfig(
            filename="Alternate Titles.txt",
            description="Alternative and lay job titles for O*NET-SOC occupations.",
            is_required=False,
            file_format="txt",
            delimiter="\t",
            expected_columns=[
                "O*NET-SOC Code",
                "Alternate Title",
                "Short Title",
                "Source(s)",
            ],
            key_columns=["O*NET-SOC Code", "Alternate Title"],
        ),
    ],
)


# ==============================================================================
# Global Registries & Lookup Helpers
# ==============================================================================

DATASETS_CONFIG: Dict[str, DatasetConfig] = {
    "dataset_a_linkedin": LINKEDIN_JOBS_CONFIG,
    "dataset_b_esco": ESCO_CONFIG,
    "dataset_c_onet": ONET_CONFIG,
}

# Alias mapping for CLI convenience: 'a', 'linkedin', 'b', 'esco', 'c', 'onet'
ALIAS_MAP: Dict[str, str] = {
    "a": "dataset_a_linkedin",
    "linkedin": "dataset_a_linkedin",
    "linkedin_jobs": "dataset_a_linkedin",
    "dataset_a": "dataset_a_linkedin",
    "dataset_a_linkedin": "dataset_a_linkedin",

    "b": "dataset_b_esco",
    "esco": "dataset_b_esco",
    "dataset_b": "dataset_b_esco",
    "dataset_b_esco": "dataset_b_esco",

    "c": "dataset_c_onet",
    "onet": "dataset_c_onet",
    "dataset_c": "dataset_c_onet",
    "dataset_c_onet": "dataset_c_onet",
}


def get_dataset_config(identifier: str) -> DatasetConfig:
    """Resolve a dataset configuration by key or alias (case-insensitive).

    Args:
        identifier: 'A', 'B', 'C', 'linkedin', 'esco', 'onet', etc.

    Raises:
        KeyError: If identifier does not match any known dataset.
    """
    cleaned = identifier.strip().lower()
    canonical_key = ALIAS_MAP.get(cleaned, cleaned)
    if canonical_key in DATASETS_CONFIG:
        return DATASETS_CONFIG[canonical_key]

    valid = list(ALIAS_MAP.keys())
    raise KeyError(f"Unknown dataset identifier '{identifier}'. Valid options: {valid}")


def list_all_expected_files(dataset_key: Optional[str] = None) -> List[tuple[DatasetConfig, DatasetFileConfig]]:
    """Return a flat list of (dataset_config, file_config) pairs."""
    results = []
    if dataset_key:
        cfg = get_dataset_config(dataset_key)
        for f in cfg.files:
            results.append((cfg, f))
    else:
        for cfg in DATASETS_CONFIG.values():
            for f in cfg.files:
                results.append((cfg, f))
    return results
