import { Node, Edge, MarkerType } from '@xyflow/react';
import { CommitInfo } from '../model/types';
import { computeLanesAndColumns } from './lane-assignment';
import { getLaneColor } from '../theme/theme';

export interface CommitNodeData {
  commit: CommitInfo;
  lane: number;
  color: string;
  isHead: boolean;
  branches: string[];
  tags: string[];
  onSelectCommit?: (commit: CommitInfo) => void;
  [key: string]: unknown;
}

export interface GraphLayoutResult {
  nodes: Node<CommitNodeData>[];
  edges: Edge[];
}

const COLUMN_SPACING = 285;
const LANE_SPACING = 190;
const MARGIN_X = 60;
const MARGIN_Y = 60;

export function buildGraphLayout(
  commits: CommitInfo[],
  onSelectCommit?: (commit: CommitInfo) => void
): GraphLayoutResult {
  if (commits.length === 0) {
    return { nodes: [], edges: [] };
  }

  const { commitLanes, commitColumns } = computeLanesAndColumns(commits);
  const nodes: Node<CommitNodeData>[] = [];
  const edges: Edge[] = [];

  for (const commit of commits) {
    const lane = commitLanes.get(commit.oid) ?? 0;
    const col = commitColumns.get(commit.oid) ?? 0;

    const x = MARGIN_X + col * COLUMN_SPACING;
    const y = MARGIN_Y + lane * LANE_SPACING;
    const color = getLaneColor(lane);

    nodes.push({
      id: commit.oid,
      type: 'commitNode',
      position: { x, y },
      data: {
        commit,
        lane,
        color,
        isHead: commit.isHead,
        branches: commit.branches,
        tags: commit.tags,
        onSelectCommit,
      },
    });

    // Edges from parents to this commit
    for (let pIdx = 0; pIdx < commit.parentOids.length; pIdx++) {
      const parentOid = commit.parentOids[pIdx];
      // Only draw edge if parent exists in our commit set
      if (commits.some((c) => c.oid === parentOid)) {
        const isPrimary = pIdx === 0;
        edges.push({
          id: `edge-${parentOid}-${commit.oid}`,
          source: parentOid,
          target: commit.oid,
          type: 'branchEdge',
          data: {
            color,
            isPrimary,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color,
          },
        });
      }
    }
  }

  return { nodes, edges };
}
