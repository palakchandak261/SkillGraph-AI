"""
NLP-based Skill Extraction Pipeline for SkillGraph AI
Extracts skills from job descriptions using taxonomy matching and NLP techniques
"""
import re
import json
import logging
from pathlib import Path
from collections import defaultdict
from typing import Optional

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class SkillExtractor:
    """Extract and normalize skills from job descriptions using taxonomy matching."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.skill_dictionary: dict[str, dict] = {}  # normalized_name -> skill info
        self.alias_map: dict[str, str] = {}  # alias -> canonical name
        self.phrase_patterns: list[tuple[str, str, str]] = []  # (pattern, canonical, source)
        self._compiled_patterns: list[tuple[re.Pattern, str, str]] = []
        self.extraction_stats = {
            "total_processed": 0,
            "total_skills_found": 0,
            "unique_skills_found": set(),
            "unresolved_count": 0,
        }

    def load_esco_skills(self, esco_dir: Optional[Path] = None):
        """Load ESCO skill taxonomy."""
        if esco_dir is None:
            esco_dir = self.data_dir / "raw" / "esco"

        skills_file = None
        for pattern in ["skills_en.csv", "skills*.csv", "Skills*.csv"]:
            matches = list(esco_dir.rglob(pattern))
            if matches:
                skills_file = matches[0]
                break

        if skills_file is None or not skills_file.exists():
            logger.warning(f"ESCO skills file not found in {esco_dir}")
            return 0

        df = pd.read_csv(skills_file, low_memory=False)
        count = 0

        # Find relevant columns
        label_col = next((c for c in df.columns if 'preferredlabel' in c.lower() or
                          c.lower() == 'preferred_label' or c.lower() == 'preferredlabel'), None)
        alt_col = next((c for c in df.columns if 'alternativelabel' in c.lower() or
                        c.lower() == 'alt_labels' or c.lower() == 'alternativelabel'), None)
        uri_col = next((c for c in df.columns if 'concepturi' in c.lower() or
                        c.lower() == 'uri' or c.lower() == 'concepturi'), None)
        desc_col = next((c for c in df.columns if 'description' in c.lower()), None)

        if label_col is None:
            # Try first few string columns
            str_cols = df.select_dtypes(include=['object']).columns
            if len(str_cols) > 0:
                label_col = str_cols[0]
            else:
                logger.warning("Could not identify label column in ESCO skills file")
                return 0

        for _, row in df.iterrows():
            label = str(row.get(label_col, '')).strip()
            if not label or label == 'nan':
                continue

            canonical = label.lower().strip()
            esco_id = str(row.get(uri_col, '')) if uri_col else None
            description = str(row.get(desc_col, '')) if desc_col else None

            self.skill_dictionary[canonical] = {
                'canonical_name': label,
                'esco_id': esco_id,
                'onet_id': None,
                'taxonomy_source': 'ESCO',
                'description': description,
                'category': None,
            }
            self.alias_map[canonical] = canonical

            # Parse alternative labels
            if alt_col and pd.notna(row.get(alt_col)):
                for alt in str(row[alt_col]).split('\n'):
                    alt = alt.strip()
                    if alt and alt.lower() != canonical:
                        self.alias_map[alt.lower().strip()] = canonical

            count += 1

        logger.info(f"Loaded {count} ESCO skills with {len(self.alias_map)} aliases")
        return count

    def load_onet_skills(self, onet_dir: Optional[Path] = None):
        """Load O*NET skill taxonomy."""
        if onet_dir is None:
            onet_dir = self.data_dir / "raw" / "onet"

        count = 0

        # Load O*NET skill files (supports versions 29-31)
        onet_files = [
            "Skills.txt", "Technology Skills.txt",
            "Essential Skills.txt", "Software Skills.txt", "Transferable Skills.txt"
        ]
        for filename in onet_files:
            skills_file = onet_dir / filename
            if not skills_file.exists():
                # Search recursively
                matches = list(onet_dir.rglob(filename))
                if matches:
                    skills_file = matches[0]
                else:
                    continue

            try:
                df = pd.read_csv(skills_file, sep='\t', low_memory=False)
            except Exception:
                try:
                    df = pd.read_csv(skills_file, low_memory=False)
                except Exception as e:
                    logger.warning(f"Could not read {filename}: {e}")
                    continue

            # Find element / skill / example name column
            name_col = next((c for c in df.columns if 'workplace example' in c.lower() or
                             c.lower() == 'example' or
                             'element name' in c.lower() or
                             'element_name' in c.lower() or
                             c.lower() == 'title'), None)
            if name_col is None:
                name_col = next((c for c in df.columns if 'name' in c.lower()), None)

            if name_col is None:
                logger.warning(f"Could not find name column in {filename}")
                continue

            onet_col = next((c for c in df.columns if 'o*net' in c.lower() or
                             'onet' in c.lower() or c.lower() == 'code'), None)

            unique_skills = df[name_col].dropna().unique()
            for skill_name in unique_skills:
                canonical = skill_name.strip().lower()
                if not canonical or canonical in self.skill_dictionary:
                    continue

                self.skill_dictionary[canonical] = {
                    'canonical_name': skill_name.strip(),
                    'esco_id': None,
                    'onet_id': str(df[df[name_col] == skill_name][onet_col].iloc[0]) if onet_col else None,
                    'taxonomy_source': 'ONET',
                    'description': None,
                    'category': 'Technology' if 'technology' in filename.lower() else 'Core',
                }
                self.alias_map[canonical] = canonical
                count += 1

        logger.info(f"Loaded {count} O*NET skills")
        return count

    def load_common_tech_skills(self):
        """Load common technology skills not in taxonomies."""
        common_skills = {
            # Programming languages
            'python': 'Python', 'java': 'Java', 'javascript': 'JavaScript',
            'typescript': 'TypeScript', 'c++': 'C++', 'c#': 'C#', 'go': 'Go',
            'rust': 'Rust', 'ruby': 'Ruby', 'php': 'PHP', 'swift': 'Swift',
            'kotlin': 'Kotlin', 'scala': 'Scala', 'r': 'R', 'matlab': 'MATLAB',
            'sql': 'SQL', 'html': 'HTML', 'css': 'CSS',
            # Frameworks
            'react': 'React', 'angular': 'Angular', 'vue.js': 'Vue.js',
            'node.js': 'Node.js', 'django': 'Django', 'flask': 'Flask',
            'spring': 'Spring', 'fastapi': 'FastAPI', '.net': '.NET',
            'tensorflow': 'TensorFlow', 'pytorch': 'PyTorch', 'keras': 'Keras',
            'next.js': 'Next.js', 'express.js': 'Express.js',
            # Cloud & DevOps
            'aws': 'AWS', 'azure': 'Azure', 'gcp': 'Google Cloud Platform',
            'docker': 'Docker', 'kubernetes': 'Kubernetes', 'terraform': 'Terraform',
            'jenkins': 'Jenkins', 'ci/cd': 'CI/CD', 'git': 'Git', 'github': 'GitHub',
            'linux': 'Linux', 'ansible': 'Ansible',
            # Data
            'pandas': 'pandas', 'numpy': 'NumPy', 'scikit-learn': 'scikit-learn',
            'spark': 'Apache Spark', 'hadoop': 'Hadoop', 'kafka': 'Apache Kafka',
            'airflow': 'Apache Airflow', 'snowflake': 'Snowflake',
            'tableau': 'Tableau', 'power bi': 'Power BI', 'looker': 'Looker',
            'postgresql': 'PostgreSQL', 'mysql': 'MySQL', 'mongodb': 'MongoDB',
            'redis': 'Redis', 'elasticsearch': 'Elasticsearch',
            'etl': 'ETL', 'data warehousing': 'Data Warehousing',
            # AI/ML
            'machine learning': 'Machine Learning', 'deep learning': 'Deep Learning',
            'natural language processing': 'Natural Language Processing',
            'nlp': 'NLP', 'computer vision': 'Computer Vision',
            'reinforcement learning': 'Reinforcement Learning',
            'large language models': 'Large Language Models',
            'generative ai': 'Generative AI', 'llm': 'LLM',
            # Soft skills
            'project management': 'Project Management',
            'communication': 'Communication',
            'problem solving': 'Problem Solving', 'teamwork': 'Teamwork',
            'leadership': 'Leadership', 'agile': 'Agile',
            'scrum': 'Scrum', 'critical thinking': 'Critical Thinking',
        }

        count = 0
        for key, display_name in common_skills.items():
            if key not in self.skill_dictionary:
                self.skill_dictionary[key] = {
                    'canonical_name': display_name,
                    'esco_id': None,
                    'onet_id': None,
                    'taxonomy_source': 'common',
                    'description': None,
                    'category': 'Technology',
                }
                self.alias_map[key] = key
                count += 1

        # Add common aliases
        aliases = {
            'js': 'javascript', 'ts': 'typescript', 'py': 'python',
            'k8s': 'kubernetes', 'tf': 'terraform',
            'ml': 'machine learning', 'dl': 'deep learning',
            'ai': 'machine learning', 'cv': 'computer vision',
            'ci cd': 'ci/cd', 'cicd': 'ci/cd',
            'amazon web services': 'aws', 'google cloud': 'gcp',
            'microsoft azure': 'azure', 'node': 'node.js',
            'react.js': 'react', 'reactjs': 'react',
            'vue': 'vue.js', 'vuejs': 'vue.js',
            'nextjs': 'next.js', 'expressjs': 'express.js',
            'postgres': 'postgresql', 'mongo': 'mongodb',
            'elastic search': 'elasticsearch',
            'sklearn': 'scikit-learn', 'sk-learn': 'scikit-learn',
            'powerbi': 'power bi',
        }
        for alias, canonical in aliases.items():
            if canonical in self.skill_dictionary:
                self.alias_map[alias] = canonical

        logger.info(f"Loaded {count} common tech skills with {len(aliases)} aliases")
        return count

    def build_patterns(self):
        """Build high-performance indexed phrase matcher structures."""
        self.single_word_map = {}
        self.multi_word_map = {}
        self.multi_word_index = defaultdict(list)  # first_word -> list of (phrase, canonical)

        for alias, canonical in self.alias_map.items():
            clean_alias = alias.lower().strip()
            if not clean_alias or len(clean_alias) < 2:
                continue

            words = clean_alias.split()
            if len(words) == 1:
                self.single_word_map[clean_alias] = canonical
            else:
                self.multi_word_map[clean_alias] = canonical
                self.multi_word_index[words[0]].append((clean_alias, canonical))

        logger.info(
            f"Built fast phrase matcher index: {len(self.single_word_map)} single-word terms, "
            f"{len(self.multi_word_map)} multi-word phrases across {len(self.multi_word_index)} index buckets."
        )

    def extract_skills(self, text: str) -> list[dict]:
        """Extract skills from text in O(text_length) using token index and phrase verification."""
        if not text or not isinstance(text, str):
            return []

        text_lower = text.lower()
        # Fast regex word tokenization
        tokens = set(re.findall(r'\b[a-zA-Z0-9#+.]+\b', text_lower))
        if not tokens:
            return []

        found_skills: dict[str, dict] = {}

        # 1. Instant single-word matches via set intersection
        for token in tokens:
            if token in self.single_word_map:
                canonical = self.single_word_map[token]
                if canonical not in found_skills:
                    info = self.skill_dictionary.get(canonical, {})
                    source = info.get('taxonomy_source', 'unknown')
                    found_skills[canonical] = {
                        'canonical_skill': info.get('canonical_name', canonical),
                        'matched_phrase': token,
                        'taxonomy_source': source,
                        'confidence': self._calculate_confidence(token, canonical, source),
                        'extraction_method': 'taxonomy_match',
                        'esco_id': info.get('esco_id'),
                        'onet_id': info.get('onet_id'),
                    }

        # 2. Targeted multi-word matches via first-token indexing
        for token in tokens:
            if token in self.multi_word_index:
                for phrase, canonical in self.multi_word_index[token]:
                    if canonical not in found_skills and phrase in text_lower:
                        # Verify word boundary
                        escaped = re.escape(phrase)
                        if re.search(r'(?<![a-zA-Z0-9])' + escaped + r'(?![a-zA-Z0-9])', text_lower):
                            info = self.skill_dictionary.get(canonical, {})
                            source = info.get('taxonomy_source', 'unknown')
                            found_skills[canonical] = {
                                'canonical_skill': info.get('canonical_name', canonical),
                                'matched_phrase': phrase,
                                'taxonomy_source': source,
                                'confidence': self._calculate_confidence(phrase, canonical, source),
                                'extraction_method': 'taxonomy_match',
                                'esco_id': info.get('esco_id'),
                                'onet_id': info.get('onet_id'),
                            }

        return list(found_skills.values())

    def _calculate_confidence(self, matched: str, canonical: str, source: str) -> float:
        """Calculate confidence score for a match."""
        score = 0.5

        # Exact match bonus
        if matched.lower().strip() == canonical:
            score += 0.3
        else:
            score += 0.1  # alias match

        # Taxonomy source bonus
        if source in ('ESCO', 'ONET'):
            score += 0.15
        elif source == 'common':
            score += 0.05

        # Length penalty for very short matches
        if len(matched) <= 2:
            score -= 0.2

        return min(1.0, max(0.0, round(score, 3)))

    def process_dataframe(self, df: pd.DataFrame, text_column: str = 'description',
                          id_column: str = 'job_id') -> pd.DataFrame:
        """Extract skills from all job descriptions in a DataFrame."""
        if not hasattr(self, 'single_word_map') or not self.single_word_map:
            self.build_patterns()

        results = []
        total = len(df)

        for idx, row in df.iterrows():
            text = row.get(text_column, '')
            job_id = row.get(id_column, idx)

            skills = self.extract_skills(text)

            for skill in skills:
                results.append({
                    'job_id': job_id,
                    **skill,
                })

            if (idx + 1) % 5000 == 0:
                logger.info(f"Processed {idx + 1}/{total} descriptions")

        result_df = pd.DataFrame(results)

        self.extraction_stats['total_processed'] = total
        self.extraction_stats['total_skills_found'] = len(results)
        self.extraction_stats['unique_skills_found'] = set(r['canonical_skill'] for r in results)

        logger.info(f"Extracted {len(results)} skill mentions from {total} postings "
                    f"({len(self.extraction_stats['unique_skills_found'])} unique skills)")
        return result_df

    def evaluate_extraction(self, predictions: pd.DataFrame,
                            ground_truth: pd.DataFrame) -> dict:
        """Evaluate extraction quality against annotated ground truth."""
        if predictions.empty or ground_truth.empty:
            return {'precision': 0, 'recall': 0, 'f1': 0, 'note': 'empty data'}

        # Group by job_id
        pred_by_job = predictions.groupby('job_id')['canonical_skill'].apply(set).to_dict()
        truth_by_job = ground_truth.groupby('job_id')['canonical_skill'].apply(set).to_dict()

        total_tp = 0
        total_fp = 0
        total_fn = 0

        for job_id in set(list(pred_by_job.keys()) + list(truth_by_job.keys())):
            pred = pred_by_job.get(job_id, set())
            truth = truth_by_job.get(job_id, set())

            # Normalize for comparison
            pred_norm = {s.lower().strip() for s in pred}
            truth_norm = {s.lower().strip() for s in truth}

            tp = len(pred_norm & truth_norm)
            fp = len(pred_norm - truth_norm)
            fn = len(truth_norm - pred_norm)

            total_tp += tp
            total_fp += fp
            total_fn += fn

        precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0
        recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        return {
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f1': round(f1, 4),
            'true_positives': total_tp,
            'false_positives': total_fp,
            'false_negatives': total_fn,
        }

    def get_skill_catalog(self) -> pd.DataFrame:
        """Get the full skill dictionary as a DataFrame."""
        records = []
        for key, info in self.skill_dictionary.items():
            records.append({
                'canonical_key': key,
                'canonical_name': info['canonical_name'],
                'esco_id': info.get('esco_id'),
                'onet_id': info.get('onet_id'),
                'taxonomy_source': info.get('taxonomy_source'),
                'category': info.get('category'),
                'description': info.get('description'),
            })
        return pd.DataFrame(records)
