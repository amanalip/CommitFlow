import { toPng, toSvg } from 'html-to-image';

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
  });

  const link = document.createElement('a');
  link.download = `commitflow-graph-${Date.now()}.png`;
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
  });

  const link = document.createElement('a');
  link.download = `commitflow-graph-${Date.now()}.svg`;
  link.href = dataUrl;
  link.click();
}
