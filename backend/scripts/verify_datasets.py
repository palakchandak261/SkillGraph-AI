"""Dataset verification and integrity validation tool for SkillGraph AI.

Verifies the presence, file sizes, row counts, schema headers, and SHA-256
checksums of raw datasets against `dataset_config.py` and `dataset_manifest.json`.

Usage:
  python -m backend.scripts.verify_datasets
  python -m backend.scripts.verify_datasets --dataset A
  python -m backend.scripts.verify_datasets --dataset B
  python -m backend.scripts.verify_datasets --dataset C
  python -m backend.scripts.verify_datasets --update-manifest
  python -m backend.scripts.verify_datasets --json
"""

from __future__ import annotations

import argparse
import csv
import datetime
import json
import os
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.scripts.dataset_config import (
    DATA_DIR,
    DATASETS_CONFIG,
    MANIFEST_PATH,
    PROJECT_ROOT,
    RAW_DATA_DIR,
    RAW_MANIFEST_PATH,
    DatasetConfig,
    DatasetFileConfig,
    get_dataset_config,
)
from backend.scripts.download_datasets import (
    compute_sha256,
    format_bytes,
    inspect_file,
    load_manifest,
    quick_line_count,
    save_manifest,
)


# ==============================================================================
# Verification Logic
# ==============================================================================

class DatasetVerifier:
    """Performs integrity checks and schema validation for datasets."""

    def __init__(self, manifest: Optional[Dict[str, Any]] = None):
        self.manifest = manifest or load_manifest()
        self.manifest_datasets = self.manifest.get("datasets", {})

    def verify_file(
        self,
        dataset_cfg: DatasetConfig,
        file_cfg: DatasetFileConfig,
    ) -> Dict[str, Any]:
        """Verify an individual expected file.

        Checks:
          - Physical existence (including aliases)
          - File size
          - Real-time SHA-256 vs manifest SHA-256
          - Header columns and key column validation
          - Row count estimation
        """
        target_dir = dataset_cfg.target_dir
        actual_path = target_dir / file_cfg.filename

        # Check alternative filenames if primary is missing
        if not actual_path.exists():
            for alt in file_cfg.alternative_filenames:
                alt_path = target_dir / alt
                if alt_path.exists():
                    actual_path = alt_path
                    break

        if not actual_path.exists():
            return {
                "file_name": file_cfg.filename,
                "is_required": file_cfg.is_required,
                "status": "MISSING",
                "status_code": 1 if file_cfg.is_required else 0,
                "exists": False,
                "size_bytes": 0,
                "size_human": "-",
                "row_count": 0,
                "sha256": "-",
                "manifest_sha256": "-",
                "checksum_valid": False,
                "missing_key_columns": [],
                "columns_found": 0,
                "message": "File not found on disk",
            }

        # File is present
        size_bytes = actual_path.stat().st_size
        size_human = format_bytes(size_bytes)
        current_sha256 = compute_sha256(actual_path)

        # Look up manifest entry
        manifest_record: Optional[Dict[str, Any]] = None
        ds_record = self.manifest_datasets.get(dataset_cfg.key, {})
        for mf in ds_record.get("files", []):
            if mf.get("file_name", "").lower() == actual_path.name.lower():
                manifest_record = mf
                break

        manifest_sha256 = manifest_record.get("sha256", "-") if manifest_record else "-"

        # Determine checksum status
        if manifest_sha256 == "-":
            checksum_status = "UNRECORDED"
            checksum_valid = True  # Not failing if manifest doesn't have it yet
        elif current_sha256 == manifest_sha256:
            checksum_status = "MATCH"
            checksum_valid = True
        else:
            checksum_status = "MISMATCH"
            checksum_valid = False

        # Inspect schema header and key columns
        missing_key_cols: List[str] = []
        columns_found: List[str] = []
        row_count = 0

        try:
            with open(actual_path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f, delimiter=file_cfg.delimiter)
                header = next(reader, [])
                columns_found = [c.strip().strip('"').strip("'") for c in header]

                # Check key columns
                lower_cols = [c.lower() for c in columns_found]
                for key_col in file_cfg.key_columns:
                    if key_col.lower() not in lower_cols:
                        missing_key_cols.append(key_col)

            total_lines = quick_line_count(actual_path)
            row_count = max(0, total_lines - 1)
        except Exception as e:
            missing_key_cols.append(f"read_error: {e}")

        # Overall file status determination
        if not checksum_valid:
            status = "CHECKSUM_MISMATCH"
        elif missing_key_cols:
            status = "SCHEMA_WARNING"
        elif size_bytes == 0:
            status = "EMPTY_FILE"
        elif checksum_status == "UNRECORDED":
            status = "PRESENT_UNRECORDED"
        else:
            status = "VALID"

        return {
            "file_name": actual_path.name,
            "configured_name": file_cfg.filename,
            "is_required": file_cfg.is_required,
            "status": status,
            "status_code": 0 if status in ("VALID", "PRESENT_UNRECORDED") else (1 if file_cfg.is_required else 0),
            "exists": True,
            "size_bytes": size_bytes,
            "size_human": size_human,
            "row_count": row_count,
            "sha256": current_sha256,
            "manifest_sha256": manifest_sha256,
            "checksum_valid": checksum_valid,
            "missing_key_columns": missing_key_cols,
            "columns_found": len(columns_found),
            "message": f"{row_count:,} rows, {len(columns_found)} cols",
        }

    def verify_dataset(self, dataset_cfg: DatasetConfig) -> Dict[str, Any]:
        """Verify all files belonging to a single dataset."""
        file_results = []
        required_missing = 0
        required_total = 0
        valid_count = 0

        for f_cfg in dataset_cfg.files:
            if f_cfg.is_required:
                required_total += 1
            res = self.verify_file(dataset_cfg, f_cfg)
            if f_cfg.is_required and not res["exists"]:
                required_missing += 1
            if res["status"] in ("VALID", "PRESENT_UNRECORDED"):
                valid_count += 1
            file_results.append(res)

        # Dataset overall readiness
        if required_missing == 0 and required_total > 0:
            readiness = "READY"
        elif required_missing < required_total:
            readiness = "PARTIAL"
        else:
            readiness = "NOT_ACQUIRED"

        return {
            "dataset_key": dataset_cfg.key,
            "name": dataset_cfg.name,
            "alias": dataset_cfg.alias,
            "target_dir": str(dataset_cfg.target_dir.relative_to(PROJECT_ROOT)).replace("\\", "/"),
            "readiness": readiness,
            "required_present": required_total - required_missing,
            "required_total": required_total,
            "total_files_present": sum(1 for r in file_results if r["exists"]),
            "total_files_configured": len(file_results),
            "files": file_results,
        }

    def verify_all(self, dataset_filter: Optional[str] = None) -> Dict[str, Any]:
        """Run verification across datasets."""
        configs = []
        if dataset_filter and dataset_filter.lower() != "all":
            configs.append(get_dataset_config(dataset_filter))
        else:
            configs.extend(DATASETS_CONFIG.values())

        dataset_reports = {}
        all_ready = True

        for cfg in configs:
            rep = self.verify_dataset(cfg)
            dataset_reports[cfg.key] = rep
            if rep["readiness"] != "READY":
                all_ready = False

        return {
            "verified_at": datetime.datetime.utcnow().isoformat() + "Z",
            "overall_status": "READY" if all_ready else "INCOMPLETE",
            "datasets": dataset_reports,
        }


# ==============================================================================
# Reporting & Table Presentation
# ==============================================================================

def print_verification_report(report: Dict[str, Any]) -> None:
    """Format and print an executive ASCII status table to stdout."""
    term_width = 110
    print("\n" + "=" * term_width)
    print("SKILLGRAPH AI - DATASET ACQUISITION & INTEGRITY REPORT".center(term_width))
    print(f"Timestamp (UTC): {report['verified_at']}".center(term_width))
    print("=" * term_width)

    status_symbols = {
        "VALID": "[OK] VALID",
        "PRESENT_UNRECORDED": "[+] UNRECORDED",
        "MISSING": "[!] MISSING",
        "CHECKSUM_MISMATCH": "[X] MISMATCH",
        "SCHEMA_WARNING": "[?] SCHEMA WARN",
        "EMPTY_FILE": "[!] EMPTY",
    }

    for ds_key, ds_data in report["datasets"].items():
        print("\n" + "-" * term_width)
        print(
            f"Dataset: {ds_data['name']} (Key: {ds_data['dataset_key']}, Alias: {ds_data['alias']})"
        )
        print(
            f"Directory: {ds_data['target_dir']} | Status: {ds_data['readiness']} "
            f"({ds_data['required_present']}/{ds_data['required_total']} required present)"
        )
        print("-" * term_width)

        header_fmt = "{:<32} {:<10} {:<18} {:<12} {:<12} {:<16}"
        row_fmt = "{:<32} {:<10} {:<18} {:<12} {:<12} {:<16}"

        print(header_fmt.format("File Name", "Required", "Status", "Size", "Rows", "Checksum"))
        print("." * term_width)

        for f_res in ds_data["files"]:
            req_str = "YES" if f_res["is_required"] else "opt"
            raw_status = f_res["status"]
            pretty_status = status_symbols.get(raw_status, raw_status)
            size_str = f_res["size_human"]
            rows_str = f"{f_res['row_count']:,}" if f_res["exists"] else "-"

            sha = f_res["sha256"]
            short_sha = f"{sha[:7]}...{sha[-4:]}" if sha != "-" else "-"

            print(row_fmt.format(
                f_res["file_name"][:30],
                req_str,
                pretty_status,
                size_str,
                rows_str,
                short_sha,
            ))

            if f_res["missing_key_columns"]:
                print(f"     |-- WARNING: Missing expected columns: {f_res['missing_key_columns']}")

    print("\n" + "=" * term_width)
    overall = report["overall_status"]
    print(f"OVERALL ACQUISITION STATUS: {overall}".center(term_width))
    print("=" * term_width)

    if overall != "READY":
        print("\nACTION ITEMS:")
        for ds_key, ds_data in report["datasets"].items():
            if ds_data["readiness"] != "READY":
                print(f"  - Dataset {ds_data['name']}: Run command:")
                print(f"      python -m backend.scripts.download_datasets --dataset {ds_data['alias']}")
        print()


# ==============================================================================
# Manifest Sync Helper
# ==============================================================================

def update_manifest_from_filesystem(
    report: Dict[str, Any],
    manifest_path: Path = MANIFEST_PATH,
) -> None:
    """Sync newly discovered local files into the dataset manifest."""
    manifest = load_manifest(manifest_path)

    for ds_key, ds_data in report["datasets"].items():
        cfg = DATASETS_CONFIG[ds_key]
        entry = manifest.get("datasets", {}).get(ds_key, {})
        entry["dataset_key"] = ds_key
        entry["name"] = cfg.name
        entry["alias"] = cfg.alias
        entry["official_url"] = cfg.official_url
        entry["license_name"] = cfg.license_name
        entry["license_url"] = cfg.license_url
        entry["target_directory"] = ds_data["target_dir"]

        files_meta = []
        for f_res in ds_data["files"]:
            if f_res["exists"]:
                f_path = cfg.target_dir / f_res["file_name"]
                meta = inspect_file(f_path)
                meta["description"] = f_res.get("file_name", "")
                meta["is_required"] = f_res["is_required"]
                files_meta.append(meta)

        entry["files"] = files_meta
        entry["files_present_count"] = len(files_meta)
        entry["files_expected_count"] = len(cfg.files)
        entry["processing_status"] = "present_local" if files_meta else "missing"
        manifest["datasets"][ds_key] = entry

    save_manifest(manifest, manifest_path, RAW_MANIFEST_PATH)
    print("Manifest successfully updated with current filesystem states.")


# ==============================================================================
# CLI Entrypoint
# ==============================================================================

def main() -> None:
    """CLI runner."""
    parser = argparse.ArgumentParser(
        description="Verify SkillGraph AI Datasets Presence and Integrity",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--dataset",
        choices=["all", "A", "B", "C", "linkedin", "esco", "onet"],
        default="all",
        help="Specify which dataset to verify (default: all)",
    )
    parser.add_argument(
        "--update-manifest",
        action="store_true",
        help="Update dataset_manifest.json with currently detected local files",
    )
    parser.add_argument(
        "--allow-missing",
        action="store_true",
        help="Always exit with 0 even if datasets are missing or partial",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print report in JSON format to stdout",
    )

    args = parser.parse_args()

    verifier = DatasetVerifier()
    report = verifier.verify_all(dataset_filter=args.dataset)

    if args.update_manifest:
        update_manifest_from_filesystem(report)
        # Re-run verification to reflect manifest sync
        verifier = DatasetVerifier()
        report = verifier.verify_all(dataset_filter=args.dataset)

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print_verification_report(report)

    # Exit code determination
    if args.allow_missing:
        sys.exit(0)

    if report["overall_status"] == "READY":
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
