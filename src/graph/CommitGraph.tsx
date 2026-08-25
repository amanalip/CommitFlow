import { useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
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
}

function InnerCommitGraph({ commits, onSelectCommit, isDark = true }: CommitGraphProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [showMinimap, setShowMinimap] = useState(false);

  const layout = useMemo(() => {
    return buildGraphLayout(commits, onSelectCommit);
  }, [commits, onSelectCommit]);

  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
    const timeout = setTimeout(() => {
      fitView({ padding: 0.25, duration: 400 });
    }, 50);
    return () => clearTimeout(timeout);
  }, [layout, fitView, setNodes, setEdges]);

  const handleExportPng = async () => {
    try {
      await exportGraphToPng('commitflow-graph-container');
    } catch {
      // Ignore
    }
  };

  const handleExportSvg = async () => {
    try {
      await exportGraphToSvg('commitflow-graph-container');
    } catch {
      // Ignore
    }
  };

  return (
    <div id="commitflow-graph-container" className={styles.graphContainer}>
      <div className={styles.graphControls}>
        <button
          className={styles.controlButton}
          onClick={() => fitView({ padding: 0.25, duration: 400 })}
          title="Fit graph to view"
        >
          Fit View
        </button>
        <button
          className={styles.controlButton}
          onClick={() => zoomIn({ duration: 300 })}
          title="Zoom In"
        >
          +
        </button>
        <button
          className={styles.controlButton}
          onClick={() => zoomOut({ duration: 300 })}
          title="Zoom Out"
        >
          −
        </button>
        <button
          className={`${styles.controlButton} ${showMinimap ? styles.activeButton : ''}`}
          onClick={() => setShowMinimap((prev) => !prev)}
          title="Toggle Minimap"
        >
          🗺 Map
        </button>
        <button
          className={styles.controlButton}
          onClick={handleExportPng}
          title="Export commit graph as PNG"
        >
          Export PNG
        </button>
        <button
          className={styles.controlButton}
          onClick={handleExportSvg}
          title="Export commit graph as SVG"
        >
          Export SVG
        </button>
      </div>

      {commits.length === 0 && (
        <div className={styles.emptyOverlay}>
          <div className={styles.emptyIcon}>⎇</div>
          <div>No commits yet. Type <code>git commit</code> in the terminal to watch commits flow.</div>
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
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={isDark ? '#334155' : '#cbd5e1'}
        />
        <Controls showInteractive={false} />
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
