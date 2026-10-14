"""
Skill Graph Engine for SkillGraph AI
Constructs and analyzes the NetworkX skill-occupation knowledge graph.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional, Set, Tuple

import networkx as nx
import pandas as pd

logger = logging.getLogger(__name__)


class SkillGraphEngine:
    """Graph intelligence engine backed by NetworkX."""

    def __init__(self, min_cooccurrence_weight: int = 2):
        self.min_cooccurrence_weight = min_cooccurrence_weight
        self.graph: nx.Graph = nx.Graph()
        self.metrics_cache: Dict[str, Dict[str, Any]] = {}
        self.communities: Dict[str, int] = {}

    def build_from_extractions(
        self,
        job_skills_df: pd.DataFrame,
        job_postings_df: Optional[pd.DataFrame] = None,
        occupation_skills_df: Optional[pd.DataFrame] = None,
    ) -> nx.Graph:
        """Construct knowledge graph from job-skill extraction records and taxonomies."""
        self.graph.clear()
        self.metrics_cache.clear()
        self.communities.clear()

        if job_skills_df.empty:
            logger.warning("Empty job_skills dataframe provided to build_from_extractions.")
            return self.graph

        logger.info(f"Building skill graph from {len(job_skills_df)} extraction rows...")

        # 1. Collect skills and frequencies
        skill_counts: Dict[str, int] = defaultdict(int)
        job_to_skills: Dict[Any, Set[str]] = defaultdict(set)

        for _, row in job_skills_df.iterrows():
            job_id = row.get("job_id")
            canonical = str(row.get("canonical_skill", "")).strip()
            if not canonical or canonical.lower() == "nan":
                continue

            skill_counts[canonical] += 1
            if pd.notna(job_id):
                job_to_skills[job_id].add(canonical)

        total_postings = len(job_to_skills) if job_to_skills else 1

        # Add skill nodes
        for skill_name, count in skill_counts.items():
            demand_share = round((count / total_postings) * 100, 2)
            self.graph.add_node(
                skill_name,
                type="skill",
                label=skill_name,
                frequency=count,
                demand_share=demand_share,
                size=max(5, min(30, int(demand_share * 2) + 6)),
            )

        # 2. Build skill-to-skill co-occurrence edges (job posting as observational unit)
        pair_counts: Dict[Tuple[str, str], int] = defaultdict(int)

        for job_id, skills_in_job in job_to_skills.items():
            sorted_skills = sorted(list(skills_in_job))
            for i in range(len(sorted_skills)):
                for j in range(i + 1, len(sorted_skills)):
                    pair = (sorted_skills[i], sorted_skills[j])
                    pair_counts[pair] += 1

        edge_count = 0
        for (u, v), weight in pair_counts.items():
            if weight >= self.min_cooccurrence_weight:
                self.graph.add_edge(
                    u,
                    v,
                    weight=weight,
                    type="co_occurrence",
                    source="job_postings",
                )
                edge_count += 1

        # 3. Add occupation nodes and occupation-to-skill edges if available
        if occupation_skills_df is not None and not occupation_skills_df.empty:
            for _, row in occupation_skills_df.iterrows():
                occ_title = str(row.get("occupation_title", "")).strip()
                skill = str(row.get("skill_name", "")).strip()
                importance = float(row.get("importance", 1.0))

                if occ_title and skill:
                    occ_id = f"occ:{occ_title}"
                    if not self.graph.has_node(occ_id):
                        self.graph.add_node(
                            occ_id,
                            type="occupation",
                            label=occ_title,
                            size=20,
                            frequency=1,
                        )

                    if self.graph.has_node(skill):
                        self.graph.add_edge(
                            occ_id,
                            skill,
                            weight=importance,
                            type="occupation_requirement",
                            source="onet_or_esco",
                        )

        # Compute graph metrics and community clusters
        self._compute_graph_metrics()

        logger.info(
            f"Built graph with {self.graph.number_of_nodes()} nodes and "
            f"{self.graph.number_of_edges()} edges."
        )
        return self.graph

    def _compute_graph_metrics(self):
        """Calculate degree, weighted degree, betweenness centrality and community partitions."""
        if self.graph.number_of_nodes() == 0:
            return

        # Degree & Weighted Degree
        deg = dict(self.graph.degree())
        weighted_deg = dict(self.graph.degree(weight="weight"))

        # Betweenness Centrality (approximate with k sample if graph is large)
        k_sample = min(200, self.graph.number_of_nodes())
        try:
            betweenness = nx.betweenness_centrality(
                self.graph,
                k=k_sample if self.graph.number_of_nodes() > 300 else None,
                weight="weight",
            )
        except Exception as e:
            logger.warning(f"Error computing betweenness centrality: {e}")
            betweenness = {n: 0.0 for n in self.graph.nodes}

        # Community Detection (Greedy Modularity Communities)
        communities: Dict[str, int] = {}
        try:
            # Run only on largest connected components or skill subgraph
            skill_sub = self.graph.subgraph(
                [n for n, d in self.graph.nodes(data=True) if d.get("type") == "skill"]
            )
            if skill_sub.number_of_nodes() > 2:
                comms = nx.community.greedy_modularity_communities(skill_sub)
                for comm_id, comm_nodes in enumerate(comms):
                    for node in comm_nodes:
                        communities[node] = comm_id
        except Exception as e:
            logger.warning(f"Community detection fallback: {e}")

        # Store attributes on nodes
        for node in self.graph.nodes:
            self.graph.nodes[node]["degree"] = deg.get(node, 0)
            self.graph.nodes[node]["weighted_degree"] = weighted_deg.get(node, 0)
            self.graph.nodes[node]["betweenness"] = round(betweenness.get(node, 0.0), 5)
            self.graph.nodes[node]["community"] = communities.get(node, 0)

            # Store in metrics cache
            self.metrics_cache[node] = {
                "degree": deg.get(node, 0),
                "weighted_degree": weighted_deg.get(node, 0),
                "betweenness": round(betweenness.get(node, 0.0), 5),
                "community": communities.get(node, 0),
            }

    def get_focused_subgraph(
        self,
        center_skill: str,
        depth: int = 2,
        min_weight: int = 1,
        max_nodes: int = 40,
    ) -> Dict[str, Any]:
        """Extract ego subgraph around target skill or query."""
        if not self.graph.has_node(center_skill):
            # Attempt case-insensitive or partial match
            matched = None
            lower_center = center_skill.lower().strip()
            for node in self.graph.nodes:
                if node.lower() == lower_center:
                    matched = node
                    break
            if not matched:
                for node in self.graph.nodes:
                    if lower_center in node.lower():
                        matched = node
                        break
            if matched:
                center_skill = matched
            else:
                return {
                    "nodes": [],
                    "edges": [],
                    "total_nodes": 0,
                    "total_edges": 0,
                    "center": center_skill,
                }

        # Extract ego graph
        subgraph = nx.ego_graph(self.graph, center_skill, radius=depth)

        # Filter edges by min_weight
        filtered_edges = [
            (u, v, d)
            for u, v, d in subgraph.edges(data=True)
            if d.get("weight", 1) >= min_weight
        ]

        sub_g = nx.Graph()
        sub_g.add_node(center_skill, **self.graph.nodes[center_skill])

        for u, v, d in filtered_edges:
            sub_g.add_node(u, **self.graph.nodes[u])
            sub_g.add_node(v, **self.graph.nodes[v])
            sub_g.add_edge(u, v, **d)

        # If too large, keep center + top degree neighbors
        if sub_g.number_of_nodes() > max_nodes:
            # Rank neighbors by weight to center
            scored_nodes = [(center_skill, float("inf"))]
            for n in sub_g.nodes:
                if n != center_skill:
                    # Score by edge weight or degree
                    w = sub_g[center_skill][n].get("weight", 1) if sub_g.has_edge(center_skill, n) else 1
                    deg = sub_g.nodes[n].get("degree", 1)
                    scored_nodes.append((n, w * 10 + deg))

            scored_nodes.sort(key=lambda x: x[1], reverse=True)
            kept_nodes = set(n for n, _ in scored_nodes[:max_nodes])
            sub_g = sub_g.subgraph(kept_nodes)

        # Build response formats
        nodes_out = []
        for node_id, data in sub_g.nodes(data=True):
            nodes_out.append({
                "id": node_id,
                "label": data.get("label", node_id),
                "type": data.get("type", "skill"),
                "size": data.get("size", 10),
                "community": data.get("community", 0),
                "centrality": data.get("betweenness", 0.0),
                "demand_share": data.get("demand_share", 0.0),
            })

        edges_out = []
        for u, v, data in sub_g.edges(data=True):
            edges_out.append({
                "id": f"{u}->{v}",
                "source": u,
                "target": v,
                "weight": data.get("weight", 1),
                "type": data.get("type", "co_occurrence"),
            })

        return {
            "nodes": nodes_out,
            "edges": edges_out,
            "total_nodes": len(nodes_out),
            "total_edges": len(edges_out),
            "center": center_skill,
        }

    def get_related_skills(self, skill_name: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """Get strongest co-occurring skills sorted by edge weight."""
        if not self.graph.has_node(skill_name):
            # Try case-insensitive lookup
            for n in self.graph.nodes:
                if n.lower() == skill_name.lower():
                    skill_name = n
                    break

        if not self.graph.has_node(skill_name):
            return []

        neighbors = []
        for neighbor in self.graph.neighbors(skill_name):
            edge_data = self.graph[skill_name][neighbor]
            node_data = self.graph.nodes[neighbor]
            if node_data.get("type") == "skill":
                neighbors.append({
                    "skill_name": neighbor,
                    "weight": edge_data.get("weight", 1),
                    "demand_share": node_data.get("demand_share", 0.0),
                    "community": node_data.get("community", 0),
                })

        neighbors.sort(key=lambda x: x["weight"], reverse=True)
        return neighbors[:top_k]

    def get_related_occupations(self, skill_name: str) -> List[Dict[str, Any]]:
        """Get occupations connected to the skill."""
        if not self.graph.has_node(skill_name):
            for n in self.graph.nodes:
                if n.lower() == skill_name.lower():
                    skill_name = n
                    break

        if not self.graph.has_node(skill_name):
            return []

        occupations = []
        for neighbor in self.graph.neighbors(skill_name):
            node_data = self.graph.nodes[neighbor]
            if node_data.get("type") == "occupation":
                edge_data = self.graph[skill_name][neighbor]
                occupations.append({
                    "occupation_id": neighbor,
                    "title": node_data.get("label", neighbor),
                    "importance": edge_data.get("weight", 1.0),
                })

        occupations.sort(key=lambda x: x["importance"], reverse=True)
        return occupations
