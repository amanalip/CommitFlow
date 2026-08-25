import { useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import { Download, FileCode, Image, Map, Maximize, Minus, Plus } from 'lucide-react';
import '@xyflow/react/dist/style.css';

import { CommitInfo } from '../model/types';
import { buildGraphLayout } from '../layout/graph-layout';
import { CommitNode } from './CommitNode';
import { BranchEdge } from './BranchEdge';
import { exportGraphToPng, exportGraphToSvg } from './png-export';
import styles from './CommitGraph.module.css';

const nodeTypes = {
  commitNode: CommitNode,
};

const edgeTypes = {
  branchEdge: BranchEdge,
};

interface CommitGraphProps {
  commits: CommitInfo[];
  onSelectCommit?: (commit: CommitInfo) => void;
  isDark?: boolean;
  graphId?: string;
}

function InnerCommitGraph({
  commits,
  onSelectCommit,
  isDark = true,
  graphId = 'commitflow-graph-container',
}: CommitGraphProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [showMinimap, setShowMinimap] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');

  const layout = useMemo(() => {
    return buildGraphLayout(commits, onSelectCommit);
  }, [commits, onSelectCommit]);

  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
    const timeout = setTimeout(() => {
      fitView({ padding: 0.25, duration: 400, maxZoom: 1 });
    }, 50);
    return () => clearTimeout(timeout);
  }, [layout, fitView, setNodes, setEdges]);

  const handleExport = async (format: 'png' | 'svg') => {
    setExportStatus('exporting');
    setShowExportMenu(false);
    try {
      if (format === 'png') {
        await exportGraphToPng(graphId, isDark ? '#0f172a' : '#f8fafc');
      } else {
        await exportGraphToSvg(graphId, isDark ? '#0f172a' : '#f8fafc');
      }
      setExportStatus('success');
    } catch {
      setExportStatus('error');
    }
    window.setTimeout(() => setExportStatus('idle'), 2200);
  };

  return (
    <div id={graphId} className={styles.graphContainer}>
      {commits.length === 0 && (
        <div className={styles.emptyOverlay} data-export-exclude="true">
          <div className={styles.emptyIcon}>⎇</div>
          <div className={styles.emptyTitle}>Your commit history will appear here</div>
          <div className={styles.emptyDescription}>
            Start with <code>git init</code>, create a file, stage it, and commit it.
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        minZoom={0.2}
        maxZoom={2.0}
        colorMode={isDark ? 'dark' : 'light'}
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Panel position="top-right" className={styles.graphPanel}>
          <div className={styles.graphControls} data-export-exclude="true">
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => fitView({ padding: 0.25, duration: 400, maxZoom: 1 })}
              aria-label="Fit graph to view"
              title="Fit graph to view"
            >
              <Maximize size={15} aria-hidden="true" />
              <span>Fit</span>
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => zoomIn({ duration: 300 })}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => zoomOut({ duration: 300 })}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <Minus size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.controlButton} ${showMinimap ? styles.activeButton : ''}`}
              onClick={() => setShowMinimap((prev) => !prev)}
              aria-pressed={showMinimap}
              title="Toggle minimap"
            >
              <Map size={15} aria-hidden="true" />
              <span>Map</span>
            </button>
            <div className={styles.exportControl}>
              <button
                type="button"
                className={styles.controlButton}
                onClick={() => setShowExportMenu((current) => !current)}
                aria-expanded={showExportMenu}
                aria-haspopup="menu"
                disabled={exportStatus === 'exporting'}
              >
                <Download size={15} aria-hidden="true" />
                <span>{exportStatus === 'exporting' ? 'Exporting' : 'Export'}</span>
              </button>
              {showExportMenu && (
                <div className={styles.exportMenu} role="menu">
                  <button type="button" role="menuitem" onClick={() => handleExport('png')}>
                    <Image size={15} aria-hidden="true" />
                    PNG image
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleExport('svg')}>
                    <FileCode size={15} aria-hidden="true" />
                    SVG vector
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className={styles.exportFeedback} aria-live="polite">
            {exportStatus === 'success' && 'Graph exported'}
            {exportStatus === 'error' && 'Export failed'}
          </div>
        </Panel>
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={isDark ? '#334155' : '#cbd5e1'}
        />
        {showMinimap && (
          <MiniMap
            nodeColor={(n: any) => n.data?.color || '#38bdf8'}
            maskColor={isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(248, 250, 252, 0.7)'}
            style={{
              background: isDark ? '#1e293b' : '#ffffff',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          />
        )}
      </ReactFlow>
    </div>
  );
}

export function CommitGraph(props: CommitGraphProps) {
  return (
    <ReactFlowProvider>
      <InnerCommitGraph {...props} />
    </ReactFlowProvider>
  );
}
