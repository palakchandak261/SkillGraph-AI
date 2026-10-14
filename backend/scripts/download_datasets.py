"""Dataset acquisition and download pipeline for SkillGraph AI.

Acquires, validates, and hashes the three primary knowledge source datasets:
  - Dataset A: LinkedIn Job Postings (Kaggle arshkon/linkedin-job-postings or mirrors)
  - Dataset B: ESCO Taxonomy (European Commission)
  - Dataset C: O*NET Database (U.S. Department of Labor ETA)

Generates and maintains `data/dataset_manifest.json` tracking checksums,
schemas, row counts, and licensing metadata.

Usage:
  python -m backend.scripts.download_datasets
  python -m backend.scripts.download_datasets --dataset A
  python -m backend.scripts.download_datasets --dataset B
  python -m backend.scripts.download_datasets --dataset C
  python -m backend.scripts.download_datasets --force
"""

from __future__ import annotations

import argparse
import csv
import datetime
import hashlib
import json
import logging
import os
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.scripts.dataset_config import (
    DATA_DIR,
    DATASETS_CONFIG,
    ESCO_CONFIG,
    LINKEDIN_JOBS_CONFIG,
    MANIFEST_PATH,
    ONET_CONFIG,
    PROJECT_ROOT,
    RAW_DATA_DIR,
    RAW_MANIFEST_PATH,
    DatasetConfig,
    DatasetFileConfig,
    ensure_data_directories,
    get_dataset_config,
)

# Standard logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("skillgraph.download")

USER_AGENT = "SkillGraph-AI/1.0 (Dataset Acquisition Tool; https://github.com/skillgraph-ai)"


# ==============================================================================
# Helper Utilities: Formatting & Checksums
# ==============================================================================

def format_bytes(size_bytes: int) -> str:
    """Format byte size into human readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def compute_sha256(file_path: Path, chunk_size: int = 1048576) -> str:
    """Compute SHA-256 hash using streaming blocks to prevent high memory usage."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(chunk_size):
            hasher.update(chunk)
    return hasher.hexdigest()


def quick_line_count(file_path: Path, chunk_size: int = 1048576) -> int:
    """Fast line count by scanning newline bytes in chunks."""
    count = 0
    with open(file_path, "rb") as f:
        while chunk := f.read(chunk_size):
            count += chunk.count(b"\n")
    return count


# ==============================================================================
# Network Helper Functions
# ==============================================================================

def probe_url(url: str, timeout: int = 8) -> Tuple[bool, Optional[int]]:
    """Test if a remote URL is reachable and returns HTTP 200 or 302.

    Returns:
        (is_accessible, status_code)
    """
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT},
        method="HEAD",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status in (200, 301, 302), resp.status
    except urllib.error.HTTPError as e:
        # Some servers disallow HEAD; fallback to range GET for the first byte
        if e.code in (405, 403):
            try:
                range_req = urllib.request.Request(
                    url,
                    headers={"User-Agent": USER_AGENT, "Range": "bytes=0-0"},
                    method="GET",
                )
                with urllib.request.urlopen(range_req, timeout=timeout) as resp:
                    return resp.status in (200, 206), resp.status
            except Exception:
                return False, e.code
        return False, e.code
    except Exception:
        return False, None


def download_file_stream(
    url: str,
    dest_path: Path,
    expected_size: Optional[int] = None,
    timeout: int = 90,
    chunk_size: int = 65536,
) -> bool:
    """Stream download remote URL to temporary file, then atomic rename.

    Args:
        url: Direct download URL
        dest_path: Final destination path on disk
        expected_size: Optional expected size in bytes
        timeout: Socket timeout
        chunk_size: Stream buffer size

    Returns:
        True if download succeeded, False otherwise.
    """
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_name(f"{dest_path.name}.tmp.{int(time.time())}")

    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    logger.info(f"Downloading: {url} -> {dest_path.name}")

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            total_size = int(response.headers.get("Content-Length", 0)) or expected_size
            downloaded = 0
            start_time = time.time()
            last_log = start_time

            with open(temp_path, "wb") as out_file:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    downloaded += len(chunk)

                    now = time.time()
                    if now - last_log > 2.0:
                        speed = downloaded / (now - start_time + 1e-5)
                        if total_size:
                            pct = (downloaded / total_size) * 100
                            logger.info(
                                f"  Progress: {pct:5.1f}% ({format_bytes(downloaded)} / "
                                f"{format_bytes(total_size)}) at {format_bytes(int(speed))}/s"
                            )
                        else:
                            logger.info(
                                f"  Downloaded: {format_bytes(downloaded)} "
                                f"at {format_bytes(int(speed))}/s"
                            )
                        last_log = now

        # Atomic rename on complete download
        if temp_path.exists():
            if dest_path.exists():
                dest_path.unlink()
            temp_path.rename(dest_path)
            logger.info(
                f"Successfully downloaded {dest_path.name} "
                f"({format_bytes(dest_path.stat().st_size)})"
            )
            return True
        return False

    except Exception as e:
        logger.error(f"Failed to download {url}: {e}")
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass
        return False


# ==============================================================================
# Inspection & Manifest Management
# ==============================================================================

def inspect_file(
    file_path: Path,
    file_cfg: Optional[DatasetFileConfig] = None,
    sample_rows_for_dates: int = 500,
) -> Dict[str, Any]:
    """Inspect a downloaded tabular file to extract metadata for manifest.

    Reads header for column schema, counts rows, extracts SHA-256, and analyzes
    date coverage if date columns exist.
    """
    stat = file_path.stat()
    size_bytes = stat.st_size
    sha256 = compute_sha256(file_path)

    delimiter = ","
    if file_cfg:
        delimiter = file_cfg.delimiter
    elif file_path.suffix.lower() in (".tsv", ".txt"):
        delimiter = "\t"

    columns: List[str] = []
    row_count = 0
    date_coverage: Dict[str, Optional[str]] = {"start": None, "end": None}

    # Inspect header and sample rows
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f, delimiter=delimiter)
            try:
                header = next(reader)
                columns = [col.strip().strip('"').strip("'") for col in header]
            except StopIteration:
                columns = []

            # Check for date columns
            date_col_indices = [
                i for i, c in enumerate(columns)
                if any(k in c.lower() for k in ["date", "time", "listed", "created", "scraped"])
            ]

            min_val: Optional[str] = None
            max_val: Optional[str] = None
            rows_sampled = 0

            for row in reader:
                rows_sampled += 1
                if date_col_indices and rows_sampled <= sample_rows_for_dates:
                    for idx in date_col_indices:
                        if idx < len(row):
                            val = row[idx].strip()
                            if val and val.replace(".", "").isdigit():
                                # Timestamp check
                                if min_val is None or val < min_val:
                                    min_val = val
                                if max_val is None or val > max_val:
                                    max_val = val
                            elif val and len(val) >= 4 and (val[0].isdigit()):
                                if min_val is None or val < min_val:
                                    min_val = val
                                if max_val is None or val > max_val:
                                    max_val = val

            # Total row count
            if rows_sampled > 0:
                row_count = rows_sampled
            else:
                total_lines = quick_line_count(file_path)
                row_count = max(0, total_lines - 1)

            if min_val or max_val:
                date_coverage = {"start": min_val, "end": max_val}

    except Exception as e:
        logger.warning(f"Inspection error on {file_path.name}: {e}")
        row_count = max(0, quick_line_count(file_path) - 1)

    return {
        "file_name": file_path.name,
        "relative_path": str(file_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "size_bytes": size_bytes,
        "size_human": format_bytes(size_bytes),
        "sha256": sha256,
        "row_count": row_count,
        "column_count": len(columns),
        "columns": columns,
        "date_coverage": date_coverage,
        "inspected_at": datetime.datetime.utcnow().isoformat() + "Z",
    }


def load_manifest(path: Path = MANIFEST_PATH) -> Dict[str, Any]:
    """Load existing manifest or initialize a new structure."""
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Could not parse manifest at {path}: {e}")

    # Fallback to raw manifest if primary is missing
    if RAW_MANIFEST_PATH.exists():
        try:
            with open(RAW_MANIFEST_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    return {
        "manifest_version": "1.0.0",
        "project": "SkillGraph AI",
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
        "last_updated": datetime.datetime.utcnow().isoformat() + "Z",
        "datasets": {},
    }


def save_manifest(
    manifest_data: Dict[str, Any],
    primary_path: Path = MANIFEST_PATH,
    mirror_path: Path = RAW_MANIFEST_PATH,
) -> None:
    """Save manifest to primary data/ directory and mirror in data/raw/."""
    manifest_data["last_updated"] = datetime.datetime.utcnow().isoformat() + "Z"
    primary_path.parent.mkdir(parents=True, exist_ok=True)
    mirror_path.parent.mkdir(parents=True, exist_ok=True)

    formatted = json.dumps(manifest_data, indent=2, ensure_ascii=False)
    with open(primary_path, "w", encoding="utf-8") as f:
        f.write(formatted)
    with open(mirror_path, "w", encoding="utf-8") as f:
        f.write(formatted)

    logger.info(f"Updated manifest at {primary_path}")


# ==============================================================================
# Dataset Acquisition Modules
# ==============================================================================

def acquire_linkedin_jobs(
    config: DatasetConfig = LINKEDIN_JOBS_CONFIG,
    force: bool = False,
) -> Dict[str, Any]:
    """Acquire Dataset A: LinkedIn Job Postings.

    Resolution Strategy:
      1. Check existing files (skip if present and not force)
      2. Kaggle Python API / CLI
      3. Hugging Face `datasets` library
      4. Known direct download mirrors
      5. Print actionable manual acquisition instructions
    """
    logger.info("=" * 80)
    logger.info(f"Processing Dataset A: {config.name}")
    logger.info("=" * 80)

    target_dir = config.target_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    primary_file = target_dir / "job_postings.csv"

    # Step 1: Check existing
    if primary_file.exists() and primary_file.stat().st_size > 1024 and not force:
        logger.info(
            f"Dataset A already present at {primary_file} "
            f"({format_bytes(primary_file.stat().st_size)}). Skipping download."
        )
        return _build_dataset_manifest_entry(config, "present_local", "Local Cache")

    download_success = False
    source_method = "manual"

    # Step 2: Try Kaggle API (only if credentials exist)
    kaggle_creds_exist = (
        bool(os.environ.get("KAGGLE_API_TOKEN")) or
        (bool(os.environ.get("KAGGLE_USERNAME")) and bool(os.environ.get("KAGGLE_KEY"))) or
        (Path.home() / ".kaggle" / "kaggle.json").exists() or
        (Path.home() / ".kaggle" / "access_token").exists()
    )
    if kaggle_creds_exist:
        logger.info("Attempting acquisition via Kaggle API...")
        try:
            import kaggle  # type: ignore
            logger.info("Kaggle client detected. Authenticating...")
            kaggle.api.authenticate()
            logger.info(f"Downloading dataset '{config.kaggle_id}' to {target_dir}...")
            kaggle.api.dataset_download_files(
                config.kaggle_id,
                path=str(target_dir),
                unzip=True,
                quiet=False,
            )
            if primary_file.exists() and primary_file.stat().st_size > 0:
                logger.info("Successfully acquired LinkedIn dataset via Kaggle API.")
                download_success = True
                source_method = "kaggle_api"
        except (ImportError, SystemExit, Exception) as e:
            logger.warning(f"Kaggle API acquisition failed or credentials invalid: {e}")
    else:
        logger.info("Kaggle credentials not detected in environment or ~/.kaggle; proceeding to Hugging Face / mirrors.")

    # Step 3: Try Hugging Face direct streaming & datasets library
    if not download_success:
        logger.info("Attempting acquisition via Hugging Face mirrors...")
        for hf_repo in config.huggingface_repos:
            hf_direct_url = f"https://huggingface.co/datasets/{hf_repo}/resolve/main/job_postings.csv"
            logger.info(f"Checking Hugging Face direct URL: {hf_direct_url}...")
            ok, _ = probe_url(hf_direct_url)
            if ok:
                logger.info(f"Found active stream at {hf_direct_url}. Downloading...")
                if download_file_stream(hf_direct_url, primary_file):
                    download_success = True
                    source_method = f"huggingface:{hf_repo}"
                    break

        if not download_success:
            try:
                from datasets import load_dataset  # type: ignore
                for hf_repo in config.huggingface_repos:
                    try:
                        ds = load_dataset(hf_repo, split="train")
                        temp_csv = target_dir / "job_postings.csv"
                        ds.to_csv(str(temp_csv))
                        if temp_csv.exists() and temp_csv.stat().st_size > 0:
                            download_success = True
                            source_method = f"huggingface_library:{hf_repo}"
                            break
                    except Exception as inner_e:
                        logger.warning(f"Could not load Hugging Face dataset {hf_repo}: {inner_e}")
            except ImportError:
                pass

    # Step 4: Try Direct URL Mirrors
    if not download_success and config.direct_urls:
        logger.info("Attempting direct mirror download...")
        for mirror_url in config.direct_urls:
            ok, status = probe_url(mirror_url)
            if ok:
                if download_file_stream(mirror_url, primary_file):
                    download_success = True
                    source_method = f"direct_mirror:{mirror_url}"
                    break

    # Step 5: Fallback instructions if automated methods could not acquire
    if not download_success and not primary_file.exists():
        logger.warning("Automated download could not retrieve Dataset A.")
        print("\n" + config.manual_instructions.format(target_dir=target_dir))
        return _build_dataset_manifest_entry(config, "missing", "None", instructions=config.manual_instructions)

    status = "downloaded" if download_success else "present_local"
    return _build_dataset_manifest_entry(config, status, source_method)


def acquire_esco(
    config: DatasetConfig = ESCO_CONFIG,
    force: bool = False,
) -> Dict[str, Any]:
    """Acquire Dataset B: ESCO Taxonomy.

    Resolution Strategy:
      1. Check existing files locally in data/raw/esco/
      2. Attempt download from configured direct mirrors or API endpoints
      3. Print official European Commission manual download instructions
    """
    logger.info("=" * 80)
    logger.info(f"Processing Dataset B: {config.name}")
    logger.info("=" * 80)

    target_dir = config.target_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    required_files = [f for f in config.files if f.is_required]
    all_present = True

    for req_f in required_files:
        p = target_dir / req_f.filename
        alt_present = any((target_dir / alt).exists() for alt in req_f.alternative_filenames)
        if not (p.exists() or alt_present):
            all_present = False
            break

    if all_present and not force:
        logger.info(
            f"All required ESCO classification files are already present in {target_dir}. "
            f"Skipping download."
        )
        return _build_dataset_manifest_entry(config, "present_local", "Local Cache")

    download_success = False
    source_method = "manual"

    # Attempt direct mirrors if configured
    logger.info("Attempting direct acquisition from known ESCO mirrors...")
    for direct_url in config.direct_urls:
        filename = direct_url.split("/")[-1]
        dest = target_dir / filename
        if not dest.exists() or force:
            ok, _ = probe_url(direct_url)
            if ok:
                logger.info(f"Fetching {filename} from {direct_url}...")
                if download_file_stream(direct_url, dest):
                    download_success = True
                    source_method = "direct_mirror"

    # Re-evaluate presence
    present_count = sum(1 for req_f in required_files if (target_dir / req_f.filename).exists())

    if present_count < len(required_files):
        logger.warning(
            f"Only {present_count}/{len(required_files)} required ESCO files are present."
        )
        print("\n" + config.manual_instructions.format(target_dir=target_dir))
        return _build_dataset_manifest_entry(
            config,
            "partial" if present_count > 0 else "missing",
            source_method,
            instructions=config.manual_instructions,
        )

    status = "downloaded" if download_success else "present_local"
    return _build_dataset_manifest_entry(config, status, source_method)


def acquire_onet(
    config: DatasetConfig = ONET_CONFIG,
    force: bool = False,
) -> Dict[str, Any]:
    """Acquire Dataset C: O*NET Database.

    Resolution Strategy:
      1. Check existing extracted text files (Skills.txt, etc.)
      2. Dynamic release detection by probing candidate URLs
      3. Stream download the detected database ZIP archive
      4. Extract and normalize files directly into data/raw/onet/
      5. Validate required files exist
    """
    logger.info("=" * 80)
    logger.info(f"Processing Dataset C: {config.name}")
    logger.info("=" * 80)

    target_dir = config.target_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    required_files = [f for f in config.files if f.is_required]
    all_present = all((target_dir / req_f.filename).exists() for req_f in required_files)

    if all_present and not force:
        logger.info(
            f"All required O*NET files are already present in {target_dir}. "
            f"Skipping download."
        )
        return _build_dataset_manifest_entry(config, "present_local", "Local Cache")

    # Dynamic version probe
    logger.info("Detecting current active O*NET database release...")
    active_url: Optional[str] = None

    for candidate_url in config.candidate_archive_urls:
        logger.info(f"Probing O*NET candidate URL: {candidate_url}")
        ok, status = probe_url(candidate_url)
        if ok:
            logger.info(f"Found active O*NET release archive: {candidate_url} (HTTP {status})")
            active_url = candidate_url
            break

    if not active_url:
        logger.warning(
            "Could not connect to online O*NET archives. "
            "Checking local zip archives or manual fallback."
        )
        print("\n" + config.manual_instructions.format(target_dir=target_dir))
        return _build_dataset_manifest_entry(
            config, "missing", "None", instructions=config.manual_instructions
        )

    archive_name = active_url.split("/")[-1]
    zip_dest = target_dir / archive_name

    # Download archive
    download_ok = download_file_stream(active_url, zip_dest)
    if not download_ok or not zip_dest.exists() or zip_dest.stat().st_size == 0:
        logger.error(f"Failed to download O*NET archive from {active_url}.")
        print("\n" + config.manual_instructions.format(target_dir=target_dir))
        return _build_dataset_manifest_entry(
            config, "missing", "None", instructions=config.manual_instructions
        )

    # Extract archive
    logger.info(f"Extracting O*NET archive {zip_dest.name} into {target_dir}...")
    try:
        with zipfile.ZipFile(zip_dest, "r") as zip_ref:
            zip_ref.extractall(target_dir)
        logger.info("Extraction completed successfully.")

        # Flatten nested directory if the archive contained a root folder (e.g., db_31_0_text/)
        for item in target_dir.iterdir():
            if item.is_dir() and item.name.startswith("db_"):
                logger.info(f"Flattening nested folder: {item.name} -> {target_dir}")
                for subfile in item.iterdir():
                    dest_file = target_dir / subfile.name
                    if not dest_file.exists():
                        shutil.move(str(subfile), str(dest_file))
                try:
                    item.rmdir()
                except OSError:
                    pass

        # Cleanup zip archive to save disk space
        if zip_dest.exists():
            zip_dest.unlink()
            logger.info(f"Cleaned up temporary archive {zip_dest.name}")

    except Exception as e:
        logger.error(f"Error extracting O*NET ZIP archive: {e}")
        return _build_dataset_manifest_entry(config, "error", f"Extraction failed: {e}")

    # Validate presence
    all_present_now = all((target_dir / req_f.filename).exists() for req_f in required_files)
    status = "downloaded" if all_present_now else "partial"

    return _build_dataset_manifest_entry(config, status, active_url)


def _build_dataset_manifest_entry(
    config: DatasetConfig,
    processing_status: str,
    source_url: str,
    instructions: str = "",
) -> Dict[str, Any]:
    """Scan the dataset target directory and construct detailed metadata for manifest."""
    target_dir = config.target_dir
    files_metadata: List[Dict[str, Any]] = []

    # Map existing files against configuration
    if target_dir.exists():
        for f_cfg in config.files:
            file_path = target_dir / f_cfg.filename
            if not file_path.exists():
                for alt in f_cfg.alternative_filenames:
                    alt_path = target_dir / alt
                    if alt_path.exists():
                        file_path = alt_path
                        break

            if file_path.exists() and file_path.is_file():
                meta = inspect_file(file_path, f_cfg)
                meta["description"] = f_cfg.description
                meta["is_required"] = f_cfg.is_required
                files_metadata.append(meta)

    return {
        "dataset_key": config.key,
        "name": config.name,
        "alias": config.alias,
        "processing_status": processing_status,
        "source_url": source_url,
        "official_url": config.official_url,
        "license_name": config.license_name,
        "license_url": config.license_url,
        "target_directory": str(config.target_dir.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "files_present_count": len(files_metadata),
        "files_expected_count": len(config.files),
        "files": files_metadata,
        "manual_instructions": instructions if processing_status in ("missing", "partial") else "",
        "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
    }


# ==============================================================================
# Main Orchestrator
# ==============================================================================

def run_download_pipeline(
    dataset_choice: str = "all",
    force: bool = False,
    base_data_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """Execute download pipeline for specified datasets."""
    dirs = ensure_data_directories(base_data_dir)
    manifest = load_manifest()

    chosen = dataset_choice.lower().strip()
    actions: List[Tuple[str, Any]] = []

    if chosen in ("all", "a", "linkedin", "linkedin_jobs"):
        actions.append(("dataset_a_linkedin", acquire_linkedin_jobs))
    if chosen in ("all", "b", "esco"):
        actions.append(("dataset_b_esco", acquire_esco))
    if chosen in ("all", "c", "onet"):
        actions.append(("dataset_c_onet", acquire_onet))

    if not actions:
        raise ValueError(
            f"Invalid dataset option '{dataset_choice}'. Choose from: all, A, B, C, linkedin, esco, onet."
        )

    logger.info(f"Starting acquisition for datasets: {[a[0] for a in actions]}")

    results: Dict[str, Any] = {}
    for key, handler in actions:
        try:
            entry = handler(force=force)
            manifest["datasets"][key] = entry
            results[key] = entry
        except Exception as e:
            logger.error(f"Unexpected error acquiring {key}: {e}", exc_info=True)
            manifest["datasets"][key] = {
                "dataset_key": key,
                "processing_status": "error",
                "error_message": str(e),
                "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
            }
            results[key] = manifest["datasets"][key]

    save_manifest(manifest)
    logger.info("Dataset acquisition routine completed.")
    return results


def main() -> None:
    """CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="SkillGraph AI Dataset Acquisition Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--dataset",
        choices=["all", "A", "B", "C", "linkedin", "esco", "onet"],
        default="all",
        help="Target dataset to acquire (default: all)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-download even if files already exist locally",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=None,
        help="Optional custom base data directory path (defaults to project data/)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()
    if args.verbose:
        logger.setLevel(logging.DEBUG)

    run_download_pipeline(
        dataset_choice=args.dataset,
        force=args.force,
        base_data_dir=args.data_dir,
    )


if __name__ == "__main__":
    main()
