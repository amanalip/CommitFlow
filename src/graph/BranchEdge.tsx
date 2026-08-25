import { memo } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';

export const BranchEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const color = (data?.color as string) || '#38bdf8';
  const isPrimary = (data?.isPrimary as boolean) ?? true;

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: color,
        strokeWidth: isPrimary ? 3 : 2,
        strokeDasharray: isPrimary ? undefined : '5,5',
        opacity: 0.9,
      }}
    />
  );
});

BranchEdge.displayName = 'BranchEdge';
