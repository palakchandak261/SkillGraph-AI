"""
ETL Pipeline for SkillGraph AI
Handles data cleaning, preprocessing, validation, and enrichment
"""
import pandas as pd
import numpy as np
import hashlib
import json
import logging
import re
from pathlib import Path
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


class DataPipeline:
    """Main ETL pipeline for processing job posting data."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.raw_dir = self.data_dir / "raw"
        self.interim_dir = self.data_dir / "interim"
        self.processed_dir = self.data_dir / "processed"
        self.reports_dir = self.data_dir / "reports"

        for d in [self.raw_dir, self.interim_dir, self.processed_dir, self.reports_dir]:
            d.mkdir(parents=True, exist_ok=True)

        self.quality_report: dict = {}
        self.pipeline_log: list = []

    def _log_step(self, stage: str, message: str, records_in: int = 0, records_out: int = 0):
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "stage": stage,
            "message": message,
            "records_in": records_in,
            "records_out": records_out,
        }
        self.pipeline_log.append(entry)
        logger.info(f"[{stage}] {message} (in={records_in}, out={records_out})")

    # ---- Stage 1: Load raw data ----
    def load_job_postings(self, file_path: Optional[Path] = None) -> pd.DataFrame:
        """Load raw job postings from CSV/parquet files."""
        if file_path and file_path.exists():
            if file_path.suffix == ".parquet":
                df = pd.read_parquet(file_path)
            else:
                df = pd.read_csv(file_path, low_memory=False)
            self._log_step("extract", f"Loaded {len(df)} records from {file_path.name}", 0, len(df))
            return df

        # Search for job posting files in raw directory
        candidates = []
        for pattern in ["*job*post*.csv", "*linkedin*.csv", "*job*.parquet", "*postings*.csv"]:
            candidates.extend(self.raw_dir.rglob(pattern))

        if not candidates:
            # Also check subdirectories
            for subdir in self.raw_dir.iterdir():
                if subdir.is_dir():
                    for pattern in ["*post*.csv", "*.parquet"]:
                        candidates.extend(subdir.rglob(pattern))

        if not candidates:
            logger.warning("No job posting files found in data/raw/")
            return pd.DataFrame()

        # Load the largest file (likely the main postings file)
        candidates.sort(key=lambda f: f.stat().st_size, reverse=True)
        main_file = candidates[0]
        logger.info(f"Loading job postings from: {main_file}")

        if main_file.suffix == ".parquet":
            df = pd.read_parquet(main_file)
        else:
            df = pd.read_csv(main_file, low_memory=False)

        self._log_step("extract", f"Loaded {len(df)} records from {main_file.name}", 0, len(df))
        return df

    # ---- Stage 2: Inspect schema ----
    def inspect_schema(self, df: pd.DataFrame, name: str = "dataset") -> dict:
        """Inspect and report dataset schema."""
        schema_info = {
            "name": name,
            "shape": list(df.shape),
            "columns": list(df.columns),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "missing_counts": df.isnull().sum().to_dict(),
            "missing_pct": (df.isnull().sum() / len(df) * 100).round(2).to_dict(),
            "sample_values": {col: str(df[col].dropna().iloc[0]) if not df[col].dropna().empty else None
                              for col in df.columns[:20]},
        }
        self._log_step("inspect", f"Schema inspection for {name}: {df.shape[0]} rows, {df.shape[1]} cols")
        return schema_info

    # ---- Stage 3: Standardize column names ----
    def standardize_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Standardize column names to snake_case."""
        col_map = {}
        for col in df.columns:
            new_col = col.strip()
            new_col = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', new_col)
            new_col = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', new_col)
            new_col = re.sub(r'[^\w\s]', '', new_col)
            new_col = re.sub(r'\s+', '_', new_col)
            new_col = new_col.lower().strip('_')
            new_col = re.sub(r'_+', '_', new_col)
            col_map[col] = new_col

        df = df.rename(columns=col_map)
        self._log_step("standardize", f"Standardized {len(col_map)} column names", len(df), len(df))
        return df

    # ---- Stage 4: Validate data types ----
    def validate_types(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate and coerce data types."""
        # Try to identify and convert common column types
        for col in df.columns:
            if col in ('salary', 'salary_min', 'salary_max', 'min_salary', 'max_salary',
                       'med_salary', 'pay_period'):
                df[col] = pd.to_numeric(df[col], errors='coerce')

            if 'date' in col or col in ('listed_time', 'expiry', 'closed_time',
                                         'original_listed_time'):
                df[col] = self._parse_dates(df[col])

        self._log_step("validate_types", "Data types validated", len(df), len(df))
        return df

    def _parse_dates(self, series: pd.Series) -> pd.Series:
        """Robust date parsing for various formats."""
        if series.dtype == 'float64' or series.dtype == 'int64':
            # Might be unix timestamps (milliseconds)
            numeric = pd.to_numeric(series, errors='coerce')
            if numeric.dropna().empty:
                return series
            # Check if values look like unix timestamps
            median_val = numeric.dropna().median()
            if median_val > 1e12:  # milliseconds
                return pd.to_datetime(numeric, unit='ms', errors='coerce')
            elif median_val > 1e9:  # seconds
                return pd.to_datetime(numeric, unit='s', errors='coerce')

        return pd.to_datetime(series, errors='coerce', infer_datetime_format=True)

    # ---- Stage 5: Text normalization ----
    def normalize_text(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize text encoding and clean text fields."""
        text_cols = df.select_dtypes(include=['object']).columns

        for col in text_cols:
            if col in ('description', 'job_description'):
                # Clean HTML from descriptions
                df[col] = df[col].apply(lambda x: self._clean_html(x) if isinstance(x, str) else x)

            # Fix encoding issues
            df[col] = df[col].apply(lambda x: x.encode('utf-8', errors='replace').decode('utf-8')
                                     if isinstance(x, str) else x)

        self._log_step("normalize_text", "Text encoding normalized", len(df), len(df))
        return df

    @staticmethod
    def _clean_html(text: str) -> str:
        """Remove HTML tags from text."""
        clean = re.sub(r'<[^>]+>', ' ', text)
        clean = re.sub(r'\s+', ' ', clean).strip()
        return clean

    # ---- Stage 6: Remove duplicates ----
    def remove_duplicates(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove duplicate postings using multiple strategies."""
        initial_count = len(df)

        # Strategy 1: Exact ID duplicates
        id_cols = [c for c in df.columns if c in ('job_id', 'id', 'external_id', 'posting_id')]
        if id_cols:
            df = df.drop_duplicates(subset=id_cols, keep='first')
            logger.info(f"Removed {initial_count - len(df)} exact ID duplicates")

        # Strategy 2: Content-based dedup (title + company + description hash)
        mid_count = len(df)
        title_col = next((c for c in df.columns if 'title' in c.lower()), None)
        company_col = next((c for c in df.columns if 'company' in c.lower()), None)
        desc_col = next((c for c in df.columns if c in ('description', 'job_description')), None)

        if title_col and desc_col:
            df['_dedup_hash'] = df.apply(
                lambda r: hashlib.md5(
                    f"{str(r.get(title_col, '')).lower().strip()}|"
                    f"{str(r.get(company_col, '')).lower().strip() if company_col else ''}|"
                    f"{str(r.get(desc_col, ''))[:200].lower().strip()}"
                    .encode()
                ).hexdigest(),
                axis=1
            )
            df = df.drop_duplicates(subset=['_dedup_hash'], keep='first')
            df = df.drop(columns=['_dedup_hash'])
            logger.info(f"Removed {mid_count - len(df)} content-based duplicates")

        dup_count = initial_count - len(df)
        dup_pct = (dup_count / initial_count * 100) if initial_count > 0 else 0
        self._log_step("dedup", f"Removed {dup_count} duplicates ({dup_pct:.1f}%)", initial_count, len(df))
        self.quality_report['duplicate_count'] = dup_count
        self.quality_report['duplicate_rate'] = round(dup_pct, 2)
        return df

    # ---- Stage 7: Handle missing values ----
    def handle_missing(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle missing values - document and filter."""
        initial_count = len(df)

        # Find description column
        desc_col = next((c for c in df.columns if c in ('description', 'job_description')), None)
        title_col = next((c for c in df.columns if 'title' in c.lower()), None)

        # Drop rows with no title AND no description
        if desc_col and title_col:
            mask = df[title_col].notna() | df[desc_col].notna()
            df = df[mask].copy()
        elif desc_col:
            df = df[df[desc_col].notna()].copy()

        # Record missingness stats
        missing_stats = {}
        for col in df.columns:
            missing_count = df[col].isnull().sum()
            missing_pct = (missing_count / len(df) * 100) if len(df) > 0 else 0
            if missing_pct > 0:
                missing_stats[col] = {
                    'count': int(missing_count),
                    'percentage': round(missing_pct, 2)
                }

        self.quality_report['missing_values'] = missing_stats
        dropped = initial_count - len(df)
        self.quality_report['missing_description_dropped'] = dropped
        self._log_step("handle_missing", f"Dropped {dropped} rows with no title/description",
                       initial_count, len(df))
        return df

    # ---- Stage 8: Normalize titles and locations ----
    def normalize_fields(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize job titles and locations without destroying originals."""
        title_col = next((c for c in df.columns if 'title' in c.lower()), None)
        loc_col = next((c for c in df.columns if c in ('location', 'job_location')), None)

        if title_col:
            df['original_title'] = df[title_col]
            df['normalized_title'] = df[title_col].apply(
                lambda x: self._normalize_title(x) if isinstance(x, str) else x
            )

        if loc_col:
            df['original_location'] = df[loc_col]
            df['normalized_location'] = df[loc_col].apply(
                lambda x: self._normalize_location(x) if isinstance(x, str) else x
            )

        self._log_step("normalize_fields", "Titles and locations normalized", len(df), len(df))
        return df

    @staticmethod
    def _normalize_title(title: str) -> str:
        """Normalize a job title."""
        title = title.strip()
        # Remove common suffixes
        title = re.sub(r'\s*[-–]\s*(remote|hybrid|contract|full.?time|part.?time|intern).*$',
                       '', title, flags=re.IGNORECASE)
        title = re.sub(r'\s*\(.*?\)\s*$', '', title)
        title = title.strip()
        return title.title() if title else title

    @staticmethod
    def _normalize_location(location: str) -> str:
        """Normalize a location string."""
        location = location.strip()
        # Standardize common patterns
        location = re.sub(r'\s*,\s*', ', ', location)
        location = re.sub(r'\s+', ' ', location)
        return location

    # ---- Stage 9: Generate quality report ----
    def generate_quality_report(self, df: pd.DataFrame, output_path: Optional[Path] = None) -> dict:
        """Generate comprehensive data quality report."""
        report = {
            "generated_at": datetime.utcnow().isoformat(),
            "total_records": len(df),
            "total_columns": len(df.columns),
            "columns": list(df.columns),
            "duplicates": self.quality_report.get('duplicate_count', 0),
            "duplicate_rate": self.quality_report.get('duplicate_rate', 0),
            "missing_values": self.quality_report.get('missing_values', {}),
        }

        # Completeness score
        total_cells = len(df) * len(df.columns)
        missing_cells = df.isnull().sum().sum()
        report['completeness'] = round((1 - missing_cells / total_cells) * 100, 2) if total_cells > 0 else 0

        # Date coverage
        date_cols = df.select_dtypes(include=['datetime64']).columns
        for col in date_cols:
            valid_dates = df[col].dropna()
            if not valid_dates.empty:
                report['date_coverage'] = {
                    'column': col,
                    'start': str(valid_dates.min()),
                    'end': str(valid_dates.max()),
                    'months': int((valid_dates.max() - valid_dates.min()).days / 30),
                }
                break

        # Description length stats
        desc_col = next((c for c in df.columns if c in ('description', 'job_description')), None)
        if desc_col:
            desc_lengths = df[desc_col].dropna().str.len()
            report['description_stats'] = {
                'mean_length': int(desc_lengths.mean()),
                'median_length': int(desc_lengths.median()),
                'min_length': int(desc_lengths.min()),
                'max_length': int(desc_lengths.max()),
            }

        report['pipeline_log'] = self.pipeline_log
        report.update(self.quality_report)

        if output_path is None:
            output_path = self.reports_dir / "data_quality_report.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(f"Quality report saved to {output_path}")
        return report

    # ---- Full pipeline ----
    def run(self, source_file: Optional[Path] = None) -> pd.DataFrame:
        """Run the complete ETL pipeline."""
        logger.info("Starting ETL pipeline...")

        # 1. Extract
        df = self.load_job_postings(source_file)
        if df.empty:
            logger.warning("No data loaded. Pipeline cannot proceed.")
            return df

        # 2. Inspect
        schema = self.inspect_schema(df, "raw_job_postings")

        # 3. Standardize columns
        df = self.standardize_columns(df)

        # 4. Validate types
        df = self.validate_types(df)

        # 5. Normalize text
        df = self.normalize_text(df)

        # 6. Remove duplicates
        df = self.remove_duplicates(df)

        # 7. Handle missing values
        df = self.handle_missing(df)

        # 8. Normalize fields
        df = self.normalize_fields(df)

        # 9. Save interim output
        interim_path = self.interim_dir / "cleaned_postings.parquet"
        df.to_parquet(interim_path, index=False)
        self._log_step("save", f"Saved {len(df)} cleaned records to interim", len(df), len(df))

        # 10. Generate quality report
        self.generate_quality_report(df)

        logger.info(f"ETL pipeline complete. {len(df)} records processed.")
        return df
