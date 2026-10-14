import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getGraph, getSkillDetail, getRelatedSkills } from '../services/api';
import type { GraphData, GraphNode, Skill } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  Search,
  Sliders,
  Network,
  Brain,
  Building2,
  X,
  ExternalLink,
  Info,
  Maximize2,
  Share2,
  RefreshCw,
} from 'lucide-react';

interface CustomNodeData {
  [key: string]: unknown;
  id: string;
  label: string;
  type: 'skill' | 'occupation';
  size: number;
  centrality?: number;
  community?: number;
  demand_share?: number;
  rawNode?: GraphNode;
}

// Custom Skill Node (Teal circle with size proportional to demand)
function SkillNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  const sizeClass =
    (nodeData.size || 1) > 15
      ? 'w-24 h-24 text-xs'
      : (nodeData.size || 1) > 8
      ? 'w-20 h-20 text-[11px]'
      : 'w-16 h-16 text-[10px]';

  return (
    <div
      className={`rounded-full flex flex-col items-center justify-center p-2 text-center text-white font-medium shadow-md transition-all duration-200 cursor-pointer ${sizeClass} ${
        selected
          ? 'bg-teal-700 ring-4 ring-teal-300 scale-110 z-20'
          : 'bg-teal-600 hover:bg-teal-700 hover:scale-105'
      }`}
      style={{
        boxShadow: selected
          ? '0 10px 25px -5px rgba(13, 148, 136, 0.5)'
          : '0 4px 6px -1px rgba(13, 148, 136, 0.2)',
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-teal-300 !w-1.5 !h-1.5" />
      <Brain className="w-3.5 h-3.5 mb-0.5 opacity-80" />
      <span className="leading-tight px-1 line-clamp-2">{String(nodeData.label || '')}</span>
      <Handle type="source" position={Position.Bottom} className="!bg-teal-300 !w-1.5 !h-1.5" />
    </div>
  );
}

// Custom Occupation Node (Navy square / rounded-xl)
function OccupationNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;
  return (
    <div
      className={`rounded-xl px-4 py-3 flex items-center gap-2 text-white shadow-lg transition-all duration-200 cursor-pointer min-w-36 max-w-56 ${
        selected
          ? 'bg-slate-950 ring-4 ring-blue-400 scale-105 z-20'
          : 'bg-slate-900 hover:bg-slate-800'
      }`}
      style={{
        boxShadow: selected
          ? '0 10px 25px -5px rgba(15, 23, 42, 0.6)'
          : '0 4px 6px -1px rgba(15, 23, 42, 0.3)',
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-2 !h-2" />
      <div className="p-1.5 bg-slate-800 rounded-lg text-blue-400 shrink-0">
        <Building2 className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] font-semibold tracking-wider text-blue-300 uppercase block">
          Occupation
        </span>
        <span className="text-xs font-bold leading-tight line-clamp-2">{String(nodeData.label || '')}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = {
  skill: SkillNodeComponent,
  occupation: OccupationNodeComponent,
};

export default function SkillGraph() {
  // Query parameters
  const [searchTerm, setSearchTerm] = useState('python');
  const [activeQuery, setActiveQuery] = useState('python');
  const [depth, setDepth] = useState<number>(2);
  const [minWeight, setMinWeight] = useState<number>(1);

  // Graph state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rawGraph, setRawGraph] = useState<GraphData | null>(null);

  // Selection & side panel
  const [selectedNode, setSelectedNode] = useState<CustomNodeData | null>(null);
  const [skillDetail, setSkillDetail] = useState<Skill | null>(null);
  const [relatedSkills, setRelatedSkills] = useState<Skill[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch status
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute layout and transform GraphData into React Flow nodes and edges
  const layoutGraph = useCallback((graph: GraphData) => {
    const rawNodes = graph.nodes || [];
    const rawEdges = graph.edges || [];

    const occNodes = rawNodes.filter((n) => n.type === 'occupation');
    const sklNodes = rawNodes.filter((n) => n.type !== 'occupation');

    const centerX = 500;
    const centerY = 350;

    const newNodes: Node[] = [];

    // Layout occupations in center or inner ellipse
    if (occNodes.length > 0) {
      occNodes.forEach((node, idx) => {
        const angle = (idx / occNodes.length) * 2 * Math.PI;
        const radius = occNodes.length === 1 ? 0 : 160;
        newNodes.push({
          id: node.id,
          type: 'occupation',
          position: {
            x: centerX + radius * Math.cos(angle) - 75,
            y: centerY + radius * Math.sin(angle) - 30,
          },
          data: {
            id: node.id,
            label: node.label,
            type: 'occupation',
            size: node.size,
            centrality: node.centrality,
            community: node.community,
            demand_share: node.demand_share,
            rawNode: node,
          },
        });
      });
    }

    // Layout skills in outer concentric circle
    sklNodes.forEach((node, idx) => {
      const angle = (idx / Math.max(sklNodes.length, 1)) * 2 * Math.PI;
      const baseRadius = occNodes.length > 0 ? 320 : 220;
      // Stagger radius slightly for organic visual clarity
      const radius = baseRadius + (idx % 2 === 0 ? 35 : -35);
      newNodes.push({
        id: node.id,
        type: 'skill',
        position: {
          x: centerX + radius * Math.cos(angle) - 40,
          y: centerY + radius * Math.sin(angle) - 40,
        },
        data: {
          id: node.id,
          label: node.label,
          type: 'skill',
          size: node.size,
          centrality: node.centrality,
          community: node.community,
          demand_share: node.demand_share,
          rawNode: node,
        },
      });
    });

    // Edges with thickness scaled to weight
    const newEdges: Edge[] = rawEdges.map((e) => {
      const normalizedWeight = Math.max(1, Math.min(e.weight || 1, 8));
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'default',
        animated: (e.weight || 0) > 4,
        style: {
          strokeWidth: normalizedWeight,
          stroke: (e.weight || 0) > 4 ? '#0d9488' : '#cbd5e1',
          strokeDasharray: (e.weight || 0) <= 2 ? '4 2' : undefined,
        },
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [setNodes, setEdges]);

  // Fetch graph API
  const fetchGraphData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getGraph({
        query: activeQuery,
        depth,
        min_weight: minWeight,
      });
      setRawGraph(res.data);
      layoutGraph(res.data);
      // Reset selected node if not in new data
      setSelectedNode(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query skill co-occurrence graph';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeQuery, depth, minWeight, layoutGraph]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  // Load details when a node is selected
  useEffect(() => {
    if (!selectedNode) {
      setSkillDetail(null);
      setRelatedSkills([]);
      return;
    }

    if (selectedNode.type === 'skill') {
      const numericId = parseInt(selectedNode.id.replace(/\D/g, ''), 10);
      if (!isNaN(numericId) && numericId > 0) {
        setDetailLoading(true);
        Promise.allSettled([getSkillDetail(numericId), getRelatedSkills(numericId)])
          .then(([detailRes, relatedRes]) => {
            if (detailRes.status === 'fulfilled') setSkillDetail(detailRes.value.data);
            if (relatedRes.status === 'fulfilled') setRelatedSkills(relatedRes.value.data);
          })
          .finally(() => {
            setDetailLoading(false);
          });
      }
    } else {
      setSkillDetail(null);
      setRelatedSkills([]);
    }
  }, [selectedNode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setActiveQuery(searchTerm.trim());
    }
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as unknown as CustomNodeData);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Skill Knowledge Graph"
        description="Explore co-occurrence relationships, occupational skill requirements, and knowledge clusters."
      />

      {/* Graph Control & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-96">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search skill (e.g. Python, SQL, Docker)..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors shrink-0"
          >
            Explore
          </button>
        </form>

        {/* Sliders: Depth & Min Weight */}
        <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto">
          {/* Depth Slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              Depth: <strong className="text-teal-700">{depth}</strong>
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={1}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-24 accent-teal-600 cursor-pointer"
            />
          </div>

          {/* Min Weight Slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600">
              Min Weight: <strong className="text-teal-700">{minWeight}</strong>
            </span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={minWeight}
              onChange={(e) => setMinWeight(Number(e.target.value))}
              className="w-24 accent-teal-600 cursor-pointer"
            />
          </div>

          {/* Refresh / Re-layout Button */}
          <button
            onClick={fetchGraphData}
            title="Refresh graph"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Graph Visualization Area */}
      <div className="relative w-full h-[620px] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner flex">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-white/70 backdrop-blur-xs z-30">
            <LoadingSpinner message="Constructing skill relationship topology..." />
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center bg-white">
            <ErrorMessage message={error} onRetry={fetchGraphData} />
          </div>
        ) : nodes.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-white">
            <EmptyState
              title="No Graph Nodes Found"
              description={`No co-occurrence relationships found matching "${activeQuery}" with depth ${depth} and weight >= ${minWeight}.`}
              icon={<Network className="w-8 h-8 text-slate-400" />}
              action={
                <button
                  onClick={() => {
                    setSearchTerm('python');
                    setActiveQuery('python');
                    setMinWeight(1);
                  }}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700"
                >
                  Reset Query
                </button>
              }
            />
          </div>
        ) : (
          <div className="flex-1 h-full relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.2}
              maxZoom={2}
            >
              <Background color="#cbd5e1" gap={20} size={1} />
              <Controls className="!bg-white !border !border-slate-200 !shadow-sm !rounded-lg" />
              <MiniMap
                nodeColor={(node) => (node.type === 'occupation' ? '#0f172a' : '#0d9488')}
                className="!bg-white !border !border-slate-200 !rounded-lg"
              />
            </ReactFlow>

            {/* Floating Legend */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-200 shadow-md text-xs space-y-2 pointer-events-auto z-10">
              <span className="font-semibold text-slate-800 block">Graph Legend</span>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-teal-600 border border-teal-300" />
                <span className="text-slate-600">Skill Node (size = demand)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-slate-900 border border-slate-700" />
                <span className="text-slate-600">Occupation Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-teal-600" />
                <span className="text-slate-600">Co-occurrence Link (weight)</span>
              </div>
              {rawGraph && (
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  {rawGraph.total_nodes} nodes | {rawGraph.total_edges} edges
                </div>
              )}
            </div>
          </div>
        )}

        {/* Side Detail Panel (when a node is clicked) */}
        {selectedNode && (
          <div className="w-80 md:w-96 bg-white border-l border-slate-200 h-full p-5 overflow-y-auto shadow-xl z-20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {selectedNode.type === 'occupation' ? (
                    <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                      <Building2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                      <Brain className="w-4 h-4" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      {selectedNode.type}
                    </span>
                    <h3 className="text-base font-bold text-slate-800 leading-tight">
                      {selectedNode.label}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Node Metrics */}
              <div className="grid grid-cols-2 gap-3 my-4 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Centrality Score</span>
                  <span className="font-bold text-slate-800">
                    {selectedNode.centrality !== undefined
                      ? selectedNode.centrality.toFixed(3)
                      : 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Market Demand</span>
                  <span className="font-bold text-teal-600">
                    {selectedNode.demand_share !== undefined
                      ? `${(selectedNode.demand_share * 100).toFixed(1)}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Skill Details (if skill node) */}
              {detailLoading ? (
                <div className="py-6">
                  <LoadingSpinner message="Fetching taxonomy details..." />
                </div>
              ) : skillDetail ? (
                <div className="space-y-3 text-xs">
                  {skillDetail.category && (
                    <div className="p-2.5 bg-teal-50/60 rounded-lg border border-teal-100">
                      <span className="text-teal-700 font-medium block">Category</span>
                      <span className="text-slate-800">{skillDetail.category}</span>
                    </div>
                  )}

                  {skillDetail.description && (
                    <div>
                      <span className="text-slate-500 font-medium block mb-1">Description</span>
                      <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {skillDetail.description}
                      </p>
                    </div>
                  )}

                  {skillDetail.aliases && skillDetail.aliases.length > 0 && (
                    <div>
                      <span className="text-slate-500 font-medium block mb-1">Known Aliases</span>
                      <div className="flex flex-wrap gap-1">
                        {skillDetail.aliases.map((alias) => (
                          <span
                            key={alias}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px]"
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {relatedSkills.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-slate-700 font-semibold block mb-2">
                        Co-Occurring Skills ({relatedSkills.length})
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {relatedSkills.map((rel) => (
                          <div
                            key={rel.id}
                            onClick={() => {
                              setActiveQuery(rel.canonical_name);
                              setSearchTerm(rel.canonical_name);
                            }}
                            className="p-2 rounded bg-slate-50 hover:bg-teal-50 border border-slate-100 text-slate-700 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <span className="font-medium">{rel.canonical_name}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setActiveQuery(selectedNode.label);
                  setSearchTerm(selectedNode.label);
                }}
                className="w-full py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Network className="w-3.5 h-3.5" /> Center Graph on "{selectedNode.label}"
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
