"""
Populate full O*NET occupations, software skills, alternate job titles, and career mappings.
Uses the official O*NET database files in data/raw/onet.
"""
from __future__ import annotations

import csv
import json
import logging
import sqlite3
from datetime import datetime
from pathlib import Path
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("populate_occupations")

DATA_DIR = Path("data")
DB_PATH = DATA_DIR / "skillgraph.db"
ONET_DIR = DATA_DIR / "raw" / "onet"

def run_population():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Ensure columns exist on occupations (e.g., aliases_json)
    cur.execute("PRAGMA table_info(occupations)")
    cols = [r[1] for r in cur.fetchall()]
    if "aliases_json" not in cols:
        cur.execute("ALTER TABLE occupations ADD COLUMN aliases_json JSON")
        conn.commit()

    # 2. Load all reported titles from 'Sample of Reported Titles.txt'
    reported_titles_file = ONET_DIR / "Sample of Reported Titles.txt"
    soc_to_aliases = {}
    if reported_titles_file.exists():
        with open(reported_titles_file, encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter="\t")
            for row in reader:
                soc = row.get("O*NET-SOC Code")
                rep_title = row.get("Reported Job Title")
                if soc and rep_title:
                    soc_to_aliases.setdefault(soc, []).append(rep_title)
        logger.info(f"Loaded reported titles for {len(soc_to_aliases)} SOC codes.")

    # 3. Load all occupations from 'Occupation Data.txt'
    occ_file = ONET_DIR / "Occupation Data.txt"
    if not occ_file.exists():
        logger.error("Occupation Data.txt not found!")
        return

    occ_df = pd.read_csv(occ_file, sep="\t")
    logger.info(f"Processing {len(occ_df)} occupations from Occupation Data.txt...")

    # Fetch existing
    cur.execute("SELECT id, onet_code, title FROM occupations")
    existing_by_soc = {}
    for r in cur.fetchall():
        if r[1]:
            existing_by_soc[r[1]] = r[0]

    inserted_occ = 0
    updated_occ = 0

    for _, row in occ_df.iterrows():
        soc = str(row.get("O*NET-SOC Code", "")).strip()
        title = str(row.get("Title", "")).strip()
        desc = str(row.get("Description", "")).strip()
        aliases = soc_to_aliases.get(soc, [])
        aliases_json = json.dumps(aliases)

        if soc in existing_by_soc:
            cur.execute(
                "UPDATE occupations SET description = ?, aliases_json = ? WHERE id = ?",
                (desc, aliases_json, existing_by_soc[soc]),
            )
            updated_occ += 1
        else:
            cur.execute(
                """INSERT INTO occupations (title, esco_code, onet_code, description, taxonomy_source, aliases_json, created_at)
                   VALUES (?, NULL, ?, ?, 'ONET', ?, ?)""",
                (title, soc, desc, aliases_json, datetime.utcnow().isoformat()),
            )
            existing_by_soc[soc] = cur.lastrowid
            inserted_occ += 1

    conn.commit()
    logger.info(f"Occupations updated: {updated_occ}, newly inserted: {inserted_occ}, total: {len(existing_by_soc)}")

    # 4. Ingest Software Skills and Essential Skills into skills & occupation_skills
    cur.execute("SELECT id, canonical_name FROM skills")
    existing_skills = {r[1].lower(): r[0] for r in cur.fetchall()}

    soft_skills_file = ONET_DIR / "Software Skills.txt"
    if soft_skills_file.exists():
        soft_df = pd.read_csv(soft_skills_file, sep="\t")
        logger.info(f"Processing {len(soft_df)} rows from Software Skills.txt...")

        # Find unique skills to insert
        new_skills = []
        now_ts = datetime.utcnow().isoformat()
        for s_name in soft_df["Workplace Example"].dropna().unique():
            s_clean = str(s_name).strip()
            if s_clean.lower() not in existing_skills:
                new_skills.append((s_clean, "Tool", "ONET", now_ts))

        if new_skills:
            logger.info(f"Inserting {len(new_skills)} new tool/software skills...")
            cur.executemany(
                "INSERT OR IGNORE INTO skills (canonical_name, category, taxonomy_source, created_at) VALUES (?, ?, ?, ?)",
                new_skills,
            )
            conn.commit()

            # Refresh skill map
            cur.execute("SELECT id, canonical_name FROM skills")
            existing_skills = {r[1].lower(): r[0] for r in cur.fetchall()}

        # Populate occupation_skills for software skills
        cur.execute("SELECT occupation_id, skill_id FROM occupation_skills")
        existing_occ_skills = set(cur.fetchall())

        occ_skill_rows = []
        for _, row in soft_df.iterrows():
            soc = str(row.get("O*NET-SOC Code", "")).strip()
            s_name = str(row.get("Workplace Example", "")).strip().lower()
            hot = str(row.get("Hot Technology", "N")).strip().upper() == "Y"
            in_demand = str(row.get("In Demand", "N")).strip().upper() == "Y"

            occ_id = existing_by_soc.get(soc)
            skill_id = existing_skills.get(s_name)

            if occ_id and skill_id and (occ_id, skill_id) not in existing_occ_skills:
                importance = 0.95 if hot or in_demand else 0.75
                occ_skill_rows.append((occ_id, skill_id, importance, "ONET", "software_requirement"))
                existing_occ_skills.add((occ_id, skill_id))

        if occ_skill_rows:
            logger.info(f"Inserting {len(occ_skill_rows)} new occupation_skills mappings...")
            cur.executemany(
                """INSERT INTO occupation_skills (occupation_id, skill_id, importance_score, taxonomy_source, relationship_type)
                   VALUES (?, ?, ?, ?, ?)""",
                occ_skill_rows,
            )
            conn.commit()

    # 5. Connect Job Postings to Occupations by Matching Normalized Titles
    cur.execute("PRAGMA table_info(job_postings)")
    jp_cols = [r[1] for r in cur.fetchall()]
    if "occupation_id" not in jp_cols:
        cur.execute("ALTER TABLE job_postings ADD COLUMN occupation_id INTEGER")
        conn.commit()

    # Build title -> occ_id lookup map
    title_to_occ = {}
    for soc, occ_id in existing_by_soc.items():
        pass

    cur.execute("SELECT id, title, aliases_json FROM occupations")
    for oid, o_title, o_aliases_raw in cur.fetchall():
        title_to_occ[o_title.lower()] = oid
        if o_aliases_raw:
            try:
                aliases = json.loads(o_aliases_raw)
                for a in aliases:
                    title_to_occ[a.lower()] = oid
            except Exception:
                pass

    logger.info(f"Built title match dictionary with {len(title_to_occ)} title variations.")

    # Match job postings to occupations
    cur.execute("SELECT id, title, normalized_title FROM job_postings WHERE occupation_id IS NULL")
    unmatched_postings = cur.fetchall()
    matched_count = 0

    updates = []
    for pid, p_title, p_norm_title in unmatched_postings:
        p_clean = (p_norm_title or p_title or "").lower().strip()
        matched_oid = title_to_occ.get(p_clean)

        if not matched_oid:
            # Substring matching for common technical words
            for t_key, oid in title_to_occ.items():
                if len(t_key) >= 4 and t_key in p_clean:
                    matched_oid = oid
                    break

        if matched_oid:
            updates.append((matched_oid, pid))
            matched_count += 1

    if updates:
        cur.executemany("UPDATE job_postings SET occupation_id = ? WHERE id = ?", updates)
        conn.commit()
        logger.info(f"Matched {matched_count} job postings to canonical occupations.")

    conn.close()
    logger.info("Population complete successfully!")

if __name__ == "__main__":
    run_population()
