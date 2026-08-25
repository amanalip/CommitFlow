import { describe, it, expect } from 'vitest';
import { CommitInfo } from '../src/model/types';
import { computeLanesAndColumns } from '../src/layout/lane-assignment';
import { buildGraphLayout } from '../src/layout/graph-layout';

describe('Lane Assignment & Graph Layout', () => {
  const mockCommits: CommitInfo[] = [
    {
      oid: 'c111111111111111111111111111111111111111',
      shortOid: 'c111111',
      message: 'init',
      author: { name: 'Dev', email: 'dev@test.com', timestamp: 1000, timezoneOffset: 0 },
      committer: { name: 'Dev', email: 'dev@test.com', timestamp: 1000, timezoneOffset: 0 },
      parentOids: [],
      treeOid: 't1',
      branches: ['main'],
      tags: [],
      isHead: false,
    },
    {
      oid: 'c222222222222222222222222222222222222222',
      shortOid: 'c222222',
      message: 'feature commit',
      author: { name: 'Dev', email: 'dev@test.com', timestamp: 2000, timezoneOffset: 0 },
      committer: { name: 'Dev', email: 'dev@test.com', timestamp: 2000, timezoneOffset: 0 },
      parentOids: ['c111111111111111111111111111111111111111'],
      treeOid: 't2',
      branches: ['feature'],
      tags: [],
      isHead: false,
    },
    {
      oid: 'c333333333333333333333333333333333333333',
      shortOid: 'c333333',
      message: 'main update',
      author: { name: 'Dev', email: 'dev@test.com', timestamp: 3000, timezoneOffset: 0 },
      committer: { name: 'Dev', email: 'dev@test.com', timestamp: 3000, timezoneOffset: 0 },
      parentOids: ['c111111111111111111111111111111111111111'],
      treeOid: 't3',
      branches: ['main'],
      tags: [],
      isHead: true,
    },
  ];

  it('assigns lanes and columns without collisions', () => {
    const { commitLanes, commitColumns } = computeLanesAndColumns(mockCommits);
    expect(commitLanes.get(mockCommits[0].oid)).toBe(0);
    expect(commitColumns.size).toBe(3);
  });

  it('builds nodes and edges for React Flow', () => {
    const layout = buildGraphLayout(mockCommits);
    expect(layout.nodes.length).toBe(3);
    expect(layout.edges.length).toBe(2);
    expect(layout.nodes.find((n) => n.id === mockCommits[2].oid)?.data.isHead).toBe(true);
  });

  it('correctly handles merge commit with two parents in DAG layout', () => {
    const mergeCommit: CommitInfo = {
      oid: 'c444444444444444444444444444444444444444',
      shortOid: 'c444444',
      message: 'Merge branch feature into main',
      author: { name: 'Dev', email: 'dev@test.com', timestamp: 4000, timezoneOffset: 0 },
      committer: { name: 'Dev', email: 'dev@test.com', timestamp: 4000, timezoneOffset: 0 },
      parentOids: [
        'c333333333333333333333333333333333333333',
        'c222222222222222222222222222222222222222',
      ],
      treeOid: 't4',
      branches: ['main'],
      tags: ['v1.0.0'],
      isHead: true,
    };

    const commits = [...mockCommits, mergeCommit];
    const layout = buildGraphLayout(commits);
    expect(layout.nodes.length).toBe(4);
    expect(layout.edges.length).toBe(4); // 2 previous + 2 for the merge parents
  });

  it('handles empty commit history gracefully', () => {
    const layout = buildGraphLayout([]);
    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
  });
});
