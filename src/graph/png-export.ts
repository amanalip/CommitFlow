import { toPng } from 'html-to-image';

export async function exportGraphToPng(elementId = 'commitflow-graph-container'): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) {
    throw new Error('Graph container element not found');
  }

  const dataUrl = await toPng(node, {
    backgroundColor: '#0f172a',
    quality: 0.95,
  });

  const link = document.createElement('a');
  link.download = `commitflow-graph-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}
