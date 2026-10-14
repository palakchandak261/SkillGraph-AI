"""Seed job_skills and occupation_skills tables in skillgraph.db."""
import sqlite3
from pathlib import Path
import pandas as pd

DB_PATH = Path("data/skillgraph.db")


def seed_job_skills(conn):
    parquet_path = Path("data/processed/job_skills.parquet")
    if not parquet_path.exists():
        print(f"Parquet file {parquet_path} not found.")
        return

    print("Loading job_skills.parquet...")
    df_js = pd.read_parquet(parquet_path)
    
    # Map job external_id / id
    jobs = pd.read_sql_query("SELECT id, external_id FROM job_postings", conn)
    job_map = dict(zip(jobs['external_id'], jobs['id']))
    
    skills = pd.read_sql_query("SELECT id, canonical_name FROM skills", conn)
    skill_map = dict(zip(skills['canonical_name'], skills['id']))

    from datetime import datetime
    now = datetime.utcnow().isoformat()
    rows = []
    seen = set()
    for _, r in df_js.iterrows():
        ext_jid = str(r['job_id'])
        sk_name = str(r['canonical_skill'])
        jid = job_map.get(ext_jid)
        sid = skill_map.get(sk_name)
        if jid and sid and (jid, sid) not in seen:
            seen.add((jid, sid))
            phrase = str(r.get('matched_phrase', sk_name))[:100]
            conf = float(r.get('confidence', 0.95))
            meth = str(r.get('extraction_method', 'exact'))[:20]
            rows.append((jid, sid, phrase, conf, meth, now))

    print(f"Inserting {len(rows)} job_skills records...")
    cur = conn.cursor()
    cur.execute("DELETE FROM job_skills")
    cur.executemany(
        """INSERT OR IGNORE INTO job_skills (job_id, skill_id, matched_phrase, confidence, extraction_method, created_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        rows,
    )
    conn.commit()
    print("job_skills seeded successfully.")


def seed_occupation_skills(conn):
    onet_file = Path("data/raw/onet/Software Skills.txt")
    if not onet_file.exists():
        print("Software Skills.txt not found.")
        return

    print("Loading Software Skills.txt...")
    df_sw = pd.read_csv(onet_file, sep="\t", low_memory=False)

    occs = pd.read_sql_query("SELECT id, onet_code FROM occupations WHERE onet_code IS NOT NULL", conn)
    occ_map = dict(zip(occs['onet_code'], occs['id']))

    skills = pd.read_sql_query("SELECT id, canonical_name FROM skills", conn)
    skill_map = dict(zip(skills['canonical_name'].str.lower(), skills['id']))

    records = []
    seen = set()
    for _, r in df_sw.iterrows():
        code = str(r['O*NET-SOC Code']).strip()
        sk_name = str(r['Workplace Example']).strip().lower()
        hot = str(r.get('Hot Technology', 'N')).strip()
        in_demand = str(r.get('In Demand', 'N')).strip()

        oid = occ_map.get(code)
        sid = skill_map.get(sk_name)
        if oid and sid and (oid, sid) not in seen:
            seen.add((oid, sid))
            importance = 0.95 if hot == 'Y' else (0.85 if in_demand == 'Y' else 0.70)
            records.append((oid, sid, importance, "ONET", "software_requirement"))

    print(f"Inserting {len(records)} occupation_skills records...")
    cur = conn.cursor()
    cur.execute("DELETE FROM occupation_skills")
    cur.executemany(
        """INSERT INTO occupation_skills (occupation_id, skill_id, importance_score, taxonomy_source, relationship_type)
           VALUES (?, ?, ?, ?, ?)""",
        records,
    )
    conn.commit()
    print("occupation_skills seeded successfully.")


def main():
    conn = sqlite3.connect(DB_PATH)
    seed_job_skills(conn)
    seed_occupation_skills(conn)
    conn.close()


if __name__ == "__main__":
    main()
