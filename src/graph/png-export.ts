import { toPng, toSvg } from 'html-to-image';

function includeInExport(node: HTMLElement): boolean {
  if (node.dataset.exportExclude === 'true') return false;
  if (node.classList.contains('react-flow__panel')) return false;
  if (node.classList.contains('react-flow__minimap')) return false;
  return true;
}

function exportFilename(elementId: string, extension: 'png' | 'svg'): string {
  const context = elementId
    .replace(/^commitflow-/, '')
    .replace(/-container$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'history';
  return `commitflow-${context}.${extension}`;
}

export async function exportGraphToPng(
  elementId = 'commitflow-graph-container',
  backgroundColor = '#0f172a'
): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) {
    throw new Error('Graph container element not found');
  }

  const dataUrl = await toPng(node, {
    backgroundColor,
    quality: 0.98,
    pixelRatio: 2,
    filter: includeInExport,
  });

  const link = document.createElement('a');
  link.download = exportFilename(elementId, 'png');
  link.href = dataUrl;
  link.click();
}

export async function exportGraphToSvg(
  elementId = 'commitflow-graph-container',
  backgroundColor = '#0f172a'
): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) {
    throw new Error('Graph container element not found');
  }

  const dataUrl = await toSvg(node, {
    backgroundColor,
    filter: includeInExport,
  });

  const link = document.createElement('a');
  link.download = exportFilename(elementId, 'svg');
  link.href = dataUrl;
  link.click();
}
