import React, { useState, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle,
  Network,
  ListTree,
  ChevronRight,
  Info,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const ConceptMap = ({ conceptMap = {}, weakTopics = [] }) => {
  const nodes = conceptMap?.nodes || [];
  const edges = conceptMap?.edges || [];

  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id || null);
  const [viewMode, setViewMode] = useState('graph'); // 'graph' | 'tree'
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const svgRef = useRef(null);

  // Normalizes weak topic list for fast lookup
  const weakTopicSet = useMemo(() => {
    return new Set(
      (weakTopics || []).map((t) => (typeof t === 'string' ? t.toLowerCase().trim() : ''))
    );
  }, [weakTopics]);

  const isNodeWeak = (node) => {
    if (!node || !node.label) return false;
    const labelLower = node.label.toLowerCase().trim();
    return Array.from(weakTopicSet).some(
      (wt) => wt && (labelLower.includes(wt) || wt.includes(labelLower))
    );
  };

  // Calculate Node Layout Coordinates (Layers: topics at top, subtopics mid, concepts bottom)
  const nodePositions = useMemo(() => {
    const topicNodes = nodes.filter((n) => n.type === 'topic');
    const subtopicNodes = nodes.filter((n) => n.type === 'subtopic');
    const conceptNodes = nodes.filter((n) => n.type === 'concept');
    const otherNodes = nodes.filter(
      (n) => !['topic', 'subtopic', 'concept'].includes(n.type)
    );

    const layers = [
      topicNodes.length > 0 ? topicNodes : nodes.slice(0, Math.ceil(nodes.length / 3)),
      subtopicNodes.length > 0 ? subtopicNodes : nodes.slice(Math.ceil(nodes.length / 3), Math.ceil((2 * nodes.length) / 3)),
      conceptNodes.concat(otherNodes).length > 0
        ? conceptNodes.concat(otherNodes)
        : nodes.slice(Math.ceil((2 * nodes.length) / 3)),
    ].filter((layer) => layer.length > 0);

    const positions = {};
    const width = 800;
    const height = 450;

    layers.forEach((layer, layerIdx) => {
      const y = ((layerIdx + 1) * height) / (layers.length + 1);
      layer.forEach((node, nodeIdx) => {
        const x = ((nodeIdx + 1) * width) / (layer.length + 1);
        positions[node.id] = { x, y };
      });
    });

    return positions;
  }, [nodes]);

  // Pan & Zoom Controls
  const handleZoomIn = () => setTransform((prev) => ({ ...prev, scale: Math.min(prev.scale + 0.2, 2.5) }));
  const handleZoomOut = () => setTransform((prev) => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.5) }));
  const handleResetZoom = () => setTransform({ scale: 1, x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'rect' || e.target.tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null;

  // Find connected edges for selected node
  const connectedEdges = edges.filter(
    (e) => e.source === selectedNodeId || e.target === selectedNodeId
  );

  if (nodes.length === 0) {
    return (
      <Card className="p-8 text-center bg-white border border-surface-200">
        <Network className="w-8 h-8 text-surface-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-surface-800">No Concept Map Generated</h3>
        <p className="text-xs text-surface-500 mt-1">
          Concept map visualization will be generated upon uploading study material.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-surface-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-brand-600" />
          <div>
            <h3 className="text-sm font-bold text-surface-900">Interactive Concept Map</h3>
            <p className="text-xs text-surface-500">
              Visual graph of topics, concepts, and relationships derived from your study guide.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex bg-surface-100 p-1 rounded-lg border border-surface-200/80">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'graph'
                  ? 'bg-white text-brand-700 shadow-2xs'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" /> Graph View
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'tree'
                  ? 'bg-white text-brand-700 shadow-2xs'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" /> Tree List
            </button>
          </div>

          {/* Zoom Buttons (Graph View only) */}
          {viewMode === 'graph' && (
            <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-lg border border-surface-200/80">
              <button
                onClick={handleZoomIn}
                className="p-1 text-surface-600 hover:text-surface-900 hover:bg-white rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1 text-surface-600 hover:text-surface-900 hover:bg-white rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 text-surface-600 hover:text-surface-900 hover:bg-white rounded"
                title="Reset View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* GRAPH VIEW */}
      {viewMode === 'graph' ? (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Canvas Area */}
          <div className="md:col-span-2 bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 min-h-[420px] select-none">
            <svg
              ref={svgRef}
              className="w-full h-[420px] cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                </marker>
              </defs>

              <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                {/* Background Grid Dots */}
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#334155" />
                </pattern>
                <rect width="1000" height="600" fill="url(#grid)" />

                {/* Render Directed Edges */}
                {edges.map((edge, idx) => {
                  const sourcePos = nodePositions[edge.source];
                  const targetPos = nodePositions[edge.target];
                  if (!sourcePos || !targetPos) return null;

                  const isConnected =
                    edge.source === selectedNodeId || edge.target === selectedNodeId;

                  const midX = (sourcePos.x + targetPos.x) / 2;
                  const midY = (sourcePos.y + targetPos.y) / 2;

                  return (
                    <g key={`edge-${idx}`}>
                      <line
                        x1={sourcePos.x}
                        y1={sourcePos.y}
                        x2={targetPos.x}
                        y2={targetPos.y}
                        stroke={isConnected ? '#3b82f6' : '#475569'}
                        strokeWidth={isConnected ? 2.5 : 1.5}
                        strokeDasharray={edge.relationship === 'relates_to' ? '4 4' : undefined}
                        markerEnd={isConnected ? 'url(#arrow-active)' : 'url(#arrow)'}
                      />
                      {/* Edge Relationship Pill Label */}
                      <rect
                        x={midX - 35}
                        y={midY - 10}
                        width="70"
                        height="18"
                        rx="9"
                        fill="#1e293b"
                        stroke={isConnected ? '#3b82f6' : '#334155'}
                        strokeWidth="1"
                      />
                      <text
                        x={midX}
                        y={midY + 3}
                        fill={isConnected ? '#93c5fd' : '#94a3b8'}
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {edge.relationship}
                      </text>
                    </g>
                  );
                })}

                {/* Render Nodes */}
                {nodes.map((node) => {
                  const pos = nodePositions[node.id] || { x: 400, y: 225 };
                  const isSelected = node.id === selectedNodeId;
                  const isWeak = isNodeWeak(node);

                  let bgFill = '#1e293b';
                  let strokeColor = '#475569';
                  let textColor = '#e2e8f0';

                  if (node.type === 'topic') {
                    bgFill = isSelected ? '#1e3a8a' : '#0f172a';
                    strokeColor = isSelected ? '#3b82f6' : '#2563eb';
                  } else if (node.type === 'subtopic') {
                    bgFill = isSelected ? '#064e3b' : '#022c22';
                    strokeColor = isSelected ? '#10b981' : '#059669';
                  } else {
                    bgFill = isSelected ? '#312e81' : '#1e1b4b';
                    strokeColor = isSelected ? '#818cf8' : '#6366f1';
                  }

                  if (isWeak) {
                    strokeColor = '#f59e0b';
                  }

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                      }}
                      className="cursor-pointer transition-transform hover:scale-105"
                    >
                      {/* Node Pulsing Outer Ring for Weak Topics */}
                      {isWeak && (
                        <circle
                          r="28"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2"
                          className="animate-ping opacity-75"
                        />
                      )}

                      {/* Node Shape Card */}
                      <rect
                        x="-75"
                        y="-20"
                        width="150"
                        height="40"
                        rx="12"
                        fill={bgFill}
                        stroke={strokeColor}
                        strokeWidth={isSelected || isWeak ? 2.5 : 1.5}
                        className="transition-all"
                      />

                      {/* Weak Topic Alert Marker */}
                      {isWeak && (
                        <circle cx="60" cy="-15" r="8" fill="#f59e0b" />
                      )}

                      {/* Node Label Text */}
                      <text
                        x="0"
                        y="4"
                        fill={textColor}
                        fontSize="11"
                        fontWeight="700"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {node.label.length > 18
                          ? node.label.substring(0, 16) + '...'
                          : node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Visual Legend Overlay */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-xs p-2.5 rounded-xl border border-slate-800 flex items-center gap-3 text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Major Topic
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Subtopic
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Concept
              </span>
              <span className="flex items-center gap-1.5 font-medium text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Weak Topic
              </span>
            </div>
          </div>

          {/* Node Detail Drawer Card */}
          <Card className="bg-white border border-surface-200 flex flex-col justify-between p-5">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-surface-100">
                  <Badge
                    variant={
                      selectedNode.type === 'topic'
                        ? 'primary'
                        : selectedNode.type === 'subtopic'
                        ? 'success'
                        : 'secondary'
                    }
                    className="capitalize font-bold text-xs"
                  >
                    {selectedNode.type}
                  </Badge>
                  {isNodeWeak(selectedNode) && (
                    <Badge variant="warning" className="gap-1 font-semibold text-xs">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Focus Area
                    </Badge>
                  )}
                </div>

                <div>
                  <h4 className="text-base font-bold text-surface-900 leading-snug">
                    {selectedNode.label}
                  </h4>
                  <p className="text-xs text-surface-600 mt-2 leading-relaxed">
                    {selectedNode.description || 'No detailed explanation provided for this concept node.'}
                  </p>
                </div>

                {/* Relationships List */}
                {connectedEdges.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-surface-100">
                    <span className="text-[11px] font-bold text-surface-500 uppercase tracking-wider block">
                      Direct Relationships ({connectedEdges.length})
                    </span>
                    <div className="space-y-1.5">
                      {connectedEdges.map((edge, idx) => {
                        const targetNode = nodes.find(
                          (n) => n.id === (edge.source === selectedNodeId ? edge.target : edge.source)
                        );
                        return (
                          <div
                            key={idx}
                            onClick={() => targetNode && setSelectedNodeId(targetNode.id)}
                            className="p-2 rounded-lg bg-surface-50 hover:bg-surface-100 border border-surface-200/60 cursor-pointer flex items-center justify-between text-xs transition-all"
                          >
                            <span className="text-surface-700 font-medium">
                              {edge.relationship}{' '}
                              <strong className="text-surface-900 font-semibold">
                                {targetNode?.label || 'Node'}
                              </strong>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-surface-400" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-surface-500 py-8 text-center">
                Click any node on the graph to inspect its concept explanation.
              </p>
            )}

            <p className="text-[11px] text-surface-400 pt-4 border-t border-surface-100 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-surface-400" /> Click nodes to inspect relationships
            </p>
          </Card>
        </div>
      ) : (
        /* ACCESSIBLE TREE LIST VIEW (Mobile Default) */
        <Card className="p-6 bg-white border border-surface-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100">
            <h3 className="text-sm font-bold text-surface-900">Concept Hierarchy List</h3>
            <span className="text-xs text-surface-500 font-medium">{nodes.length} Total Nodes</span>
          </div>

          <div className="space-y-3">
            {nodes.map((node) => {
              const isWeak = isNodeWeak(node);
              const nodeEdges = edges.filter((e) => e.source === node.id);

              return (
                <div
                  key={node.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isWeak
                      ? 'border-amber-300 bg-amber-50/50'
                      : 'border-surface-200 bg-surface-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-surface-900">{node.label}</span>
                      <Badge
                        variant={
                          node.type === 'topic'
                            ? 'primary'
                            : node.type === 'subtopic'
                            ? 'success'
                            : 'secondary'
                        }
                        className="capitalize text-[11px]"
                      >
                        {node.type}
                      </Badge>
                    </div>
                    {isWeak && (
                      <Badge variant="warning" className="gap-1 text-[11px] font-semibold">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Weak Topic
                      </Badge>
                    )}
                  </div>

                  {node.description && (
                    <p className="text-xs text-surface-600 mt-1.5 leading-relaxed">
                      {node.description}
                    </p>
                  )}

                  {nodeEdges.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-surface-200/60 flex flex-wrap gap-2 text-xs">
                      {nodeEdges.map((e, idx) => {
                        const targetNode = nodes.find((n) => n.id === e.target);
                        return (
                          <span
                            key={idx}
                            className="bg-white px-2.5 py-1 rounded-md border border-surface-200 text-surface-600 font-medium flex items-center gap-1"
                          >
                            <span className="text-surface-400">{e.relationship}</span>
                            <ArrowRight className="w-3 h-3 text-surface-400" />
                            <strong className="text-surface-800">{targetNode?.label || e.target}</strong>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
