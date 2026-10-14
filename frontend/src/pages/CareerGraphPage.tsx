import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Network,
  Search,
  Compass,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Info,
  RefreshCw,
} from 'lucide-react';
import { getCareerGraph, searchCareers } from '../services/api';
import type { CareerGraphPayload, CareerSearchItem } from '../types';
import { useStudent } from '../context/StudentContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function CareerGraphPage() {
  const navigate = useNavigate();
  const { targetCareer, setTargetCareer, studentSkills, addSkill } = useStudent();
  const activeCareerId = targetCareer?.career_id || 1;

  const [graphData, setGraphData] = useState<CareerGraphPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected node for detail drawer
  const [selectedNode, setSelectedNode] = useState<{ id: string; label: string; type: string; status: string; category?: string } | null>(null);

  // Career switcher search
  const [careerSearch, setCareerSearch] = useState('');
  const [careerSuggestions, setCareerSuggestions] = useState<CareerSearchItem[]>([]);

  // Nodes & Edges state for React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skillNames = studentSkills.map((s) => s.skill_name);
      const res = await getCareerGraph(activeCareerId, skillNames);
      setGraphData(res.data);

      // Compute radial layout coordinates around center career node
      const centerNode = res.data.nodes.find((n) => n.id.startsWith('occ-') && n.status === 'target_career') || res.data.nodes[0];
      const otherNodes = res.data.nodes.filter((n) => n.id !== centerNode?.id);

      const flowNodes: Node[] = [];
      const centerX = 400;
      const centerY = 300;

      if (centerNode) {
        flowNodes.push({
          id: centerNode.id,
          position: { x: centerX, y: centerY },
          data: { label: centerNode.label, raw: centerNode },
          style: {
            background: '#0f172a',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '12px 18px',
            fontWeight: 'bold',
            border: '2px solid #0d9488',
            fontSize: '13px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
        });
      }

      const radius = 240;
      otherNodes.forEach((node, index) => {
        const angle = (2 * Math.PI * index) / otherNodes.length;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        let bg = '#ffffff';
        let color = '#1e293b';
        let border = '1px solid #cbd5e1';

        if (node.status === 'student_owned') {
          bg = '#ecfdf5';
          color = '#065f46';
          border = '2px solid #10b981';
        } else if (node.status === 'target_required') {
          bg = '#f0fdfa';
          color = '#115e59';
          border = '1.5px solid #0d9488';
        } else if (node.status === 'alternative_career') {
          bg = '#eef2ff';
          color = '#3730a3';
          border = '2px solid #6366f1';
        }

        flowNodes.push({
          id: node.id,
          position: { x, y },
          data: { label: node.label, raw: node },
          style: {
            background: bg,
            color,
            border,
            borderRadius: node.type === 'career' ? '12px' : '9999px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: '600',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
          },
        });
      });

      const flowEdges: Edge[] = res.data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.type === 'requires',
        style: {
          stroke: e.type === 'career_mobility' ? '#6366f1' : (e.type === 'requires' ? '#0d9488' : '#94a3b8'),
          strokeWidth: Math.max(1.5, Math.min(4, e.weight * 2.5)),
        },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load career graph');
    } finally {
      setLoading(false);
    }
  }, [activeCareerId, studentSkills, setNodes, setEdges]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Handle career search
  useEffect(() => {
    if (!careerSearch.trim()) {
      setCareerSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await searchCareers(careerSearch.trim(), 5);
        setCareerSuggestions(res.data);
      } catch (err) {
        console.error(err);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [careerSearch]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    const raw = (node.data as any).raw;
    if (raw) {
      setSelectedNode({
        id: raw.id,
        label: raw.label,
        type: raw.type,
        status: raw.status,
        category: raw.category,
      });
    }
  };

  if (loading) {
    return <LoadingSpinner message="Synthesizing career topology and skill co-occurrence network..." />;
  }

  if (error || !graphData) {
    return <ErrorMessage message={error || 'Graph unavailable'} onRetry={fetchGraph} />;
  }

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header & Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Step 7 of Journey</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
            Interactive Career-Skill Graph
          </h1>
          <p className="text-xs text-slate-500">
            Network topology for <strong className="text-slate-800">{graphData.career_title}</strong> with student skill status overlay
          </p>
        </div>

        {/* Switcher Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={careerSearch}
            onChange={(e) => setCareerSearch(e.target.value)}
            placeholder="Switch graph career..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
          />
          {careerSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 overflow-hidden divide-y divide-slate-100">
              {careerSuggestions.map((item) => (
                <button
                  key={item.career_id}
                  onClick={() => {
                    setTargetCareer(item);
                    setCareerSearch('');
                    setCareerSuggestions([]);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 text-xs flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-800">{item.title}</span>
                  <span className="text-[10px] text-teal-600">{item.demand_status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visual Legend */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-700">Graph Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-slate-900 border border-teal-500 inline-block" />
            <span className="text-slate-600">Target Career</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-100 border-2 border-emerald-500 inline-block" />
            <span className="text-slate-600">You Already Have This</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-50 border border-teal-600 inline-block" />
            <span className="text-slate-600">Target Skill Required</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-indigo-100 border-2 border-indigo-500 inline-block" />
            <span className="text-slate-600">Alternative Career</span>
          </div>
        </div>

        <button
          onClick={fetchGraph}
          className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-center
        </button>
      </div>

      {/* React Flow Graph Canvas */}
      <div className="relative h-[550px] w-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#cbd5e1" gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(n: any) => {
              if (n.data?.raw?.status === 'student_owned') return '#10b981';
              if (n.data?.raw?.status === 'alternative_career') return '#6366f1';
              return '#0d9488';
            }}
            maskColor="rgba(241, 245, 249, 0.7)"
          />
        </ReactFlow>

        {/* Node Detail Drawer / Flyout */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl p-4 space-y-3 z-40 text-xs animate-in fade-in slide-in-from-right-4 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">
                  {selectedNode.type === 'career' ? 'Career Entity' : 'Skill Entity'}
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-0.5">{selectedNode.label}</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Node Status:</span>
                <span className="font-semibold capitalize text-slate-700">
                  {selectedNode.status.replace('_', ' ')}
                </span>
              </div>
              {selectedNode.category && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-semibold text-slate-700">{selectedNode.category}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
              {selectedNode.type === 'skill' && selectedNode.status !== 'student_owned' && (
                <button
                  onClick={() => {
                    addSkill({ skill_name: selectedNode.label, proficiency: 'intermediate' });
                    setSelectedNode(null);
                  }}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to My Profile
                </button>
              )}

              {selectedNode.type === 'career' && selectedNode.status === 'alternative_career' && (
                <button
                  onClick={() => {
                    const cId = Number(selectedNode.id.replace('occ-', ''));
                    navigate(`/careers/${cId}`);
                  }}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                >
                  Switch to This Career <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
