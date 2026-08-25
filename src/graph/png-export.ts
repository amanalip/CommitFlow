import { toPng, toSvg } from 'html-to-image';

export async function exportGraphToPng(elementId = 'commitflow-graph-container'): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) {
    throw new Error('Graph container element not found');
  }

  const dataUrl = await toPng(node, {
    backgroundColor: '#0f172a',
    quality: 0.98,
    pixelRatio: 2,
  });

  const link = document.createElement('a');
  link.download = `commitflow-graph-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

export async function exportGraphToSvg(elementId = 'commitflow-graph-container'): Promise<void> {
  const node = document.getElementById(elementId);
  if (!node) {
    throw new Error('Graph container element not found');
  }

  const dataUrl = await toSvg(node, {
    backgroundColor: '#0f172a',
  });

  const link = document.createElement('a');
  link.download = `commitflow-graph-${Date.now()}.svg`;
  link.href = dataUrl;
  link.click();
}
