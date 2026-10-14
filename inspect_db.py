import sqlite3

conn = sqlite3.connect("data/skillgraph.db")
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]

print("Database Tables & Counts:")
for t in tables:
    cur.execute(f"SELECT count(*) FROM {t}")
    cnt = cur.fetchone()[0]
    print(f"  {t}: {cnt}")

print("\nTech & Common Occupations:")
cur.execute("SELECT id, title, onet_code FROM occupations WHERE title LIKE '%Data%' OR title LIKE '%Developer%' OR title LIKE '%Engineer%' OR title LIKE '%Analyst%' OR title LIKE '%Designer%' OR title LIKE '%Manager%' LIMIT 30")
for r in cur.fetchall():
    print(" ", r)

print("\nTotal Unique Titles in job_postings:")
cur.execute("SELECT count(DISTINCT normalized_title) FROM job_postings")
print(" ", cur.fetchone()[0])

print("\nSample Skills:")
cur.execute("SELECT id, canonical_name, category, taxonomy_source FROM skills LIMIT 10")
for r in cur.fetchall():
    print(" ", r)

print("\nSample Job Postings:")
cur.execute("SELECT id, title, normalized_title, company, location FROM job_postings LIMIT 5")
for r in cur.fetchall():
    print(" ", r)

conn.close()
