import { CommitInfo } from '../model/types';

export interface LaneAssignmentResult {
  commitLanes: Map<string, number>;
  commitColumns: Map<string, number>;
}

export function computeLanesAndColumns(commits: CommitInfo[]): LaneAssignmentResult {
  const commitLanes = new Map<string, number>();
  const commitColumns = new Map<string, number>();

  if (commits.length === 0) {
    return { commitLanes, commitColumns };
  }

  // Build commit lookup and children mapping
  const commitMap = new Map<string, CommitInfo>();
  const childrenMap = new Map<string, string[]>();

  for (const c of commits) {
    commitMap.set(c.oid, c);
    for (const p of c.parentOids) {
      if (!childrenMap.has(p)) {
        childrenMap.set(p, []);
      }
      childrenMap.get(p)!.push(c.oid);
    }
  }

  // Find root commits (commits with no parents or whose parents are not in the graph)
  const roots: CommitInfo[] = commits.filter(
    (c) => c.parentOids.length === 0 || !c.parentOids.some((p) => commitMap.has(p))
  );

  // Topological sorting (Kahn's algorithm from roots to leaves)
  const inDegree = new Map<string, number>();
  for (const c of commits) {
    let validParents = 0;
    for (const p of c.parentOids) {
      if (commitMap.has(p)) validParents++;
    }
    inDegree.set(c.oid, validParents);
  }

  const queue: string[] = [];
  for (const r of roots) {
    queue.push(r.oid);
  }

  const sortedOids: string[] = [];
  while (queue.length > 0) {
    // Sort queue by timestamp to maintain timeline ordering
    queue.sort((a, b) => {
      const ca = commitMap.get(a)!;
      const cb = commitMap.get(b)!;
      return ca.author.timestamp - cb.author.timestamp;
    });

    const currentOid = queue.shift()!;
    sortedOids.push(currentOid);

    const children = childrenMap.get(currentOid) || [];
    for (const childOid of children) {
      const deg = (inDegree.get(childOid) || 1) - 1;
      inDegree.set(childOid, deg);
      if (deg === 0) {
        queue.push(childOid);
      }
    }
  }

  // Assign columns and lanes
  const activeLanes = new Map<number, string>(); // laneIndex -> tipCommitOid
  let maxLane = 0;

  for (let col = 0; col < sortedOids.length; col++) {
    const oid = sortedOids[col];
    const commit = commitMap.get(oid)!;
    commitColumns.set(oid, col);

    // If root commit
    if (commit.parentOids.length === 0 || !commit.parentOids.some((p) => commitMap.has(p))) {
      // Find lowest available lane
      let assignedLane = 0;
      while (activeLanes.has(assignedLane)) {
        assignedLane++;
      }
      commitLanes.set(oid, assignedLane);
      activeLanes.set(assignedLane, oid);
      if (assignedLane > maxLane) maxLane = assignedLane;
      continue;
    }

    // Has parents: primary parent is parentOids[0]
    const primaryParent = commit.parentOids[0];
    const parentLane = commitLanes.get(primaryParent);

    if (parentLane !== undefined && activeLanes.get(parentLane) === primaryParent) {
      // Continue on same lane
      commitLanes.set(oid, parentLane);
      activeLanes.set(parentLane, oid);
    } else {
      // Fork to a new lane
      let newLane = 1;
      while (activeLanes.has(newLane)) {
        newLane++;
      }
      commitLanes.set(oid, newLane);
      activeLanes.set(newLane, oid);
      if (newLane > maxLane) maxLane = newLane;
    }

    // Free lanes of parents if they have no other pending children
    for (const p of commit.parentOids) {
      const pLane = commitLanes.get(p);
      if (pLane !== undefined && activeLanes.get(pLane) === p) {
        activeLanes.delete(pLane);
      }
    }
    const myLane = commitLanes.get(oid)!;
    activeLanes.set(myLane, oid);
  }

  return { commitLanes, commitColumns };
}
