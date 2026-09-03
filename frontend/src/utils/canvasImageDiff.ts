/**
 * Canvas Image Diff & Visual Snapshot Pairing Utility
 * Automatically groups Playwright visual regression snapshots (expected, actual, diff)
 * and computes client-side pixel mismatches and percentage difference using HTML5 Canvas.
 */

export interface VisualArtifact {
  id: string;
  name: string;
  url: string;
  path?: string;
  type?: string;
  size?: number;
}

export interface VisualSnapshotPair {
  id: string;
  name: string; // e.g., "homepage-header", "checkout-cart"
  cleanTitle: string;
  baseline: VisualArtifact; // Expected golden snapshot
  actual: VisualArtifact;   // Actual test execution snapshot
  diff?: VisualArtifact | null; // Playwright generated diff
  mismatchPercentage?: number;
  mismatchPixels?: number;
  dimensions?: { width: number; height: number };
}

/**
 * Normalizes an artifact URL by adding auth token if stored locally
 */
export const getAuthMediaUrl = (url: string): string => {
  if (!url) return '';
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token || url.includes('token=')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
};

/**
 * Cleans a snapshot name by stripping snapshot suffixes like -actual.png, -expected.png, -diff.png
 */
export const cleanSnapshotName = (rawName: string): string => {
  return rawName
    .replace(/[-_.](expected|actual|diff)\.(png|jpe?g|webp)$/i, '')
    .replace(/[-_.](expected|actual|diff)$/i, '')
    .replace(/^(expected|actual|diff)[-_.]/i, '')
    .replace(/\.(png|jpe?g|webp)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
};

/**
 * Scans an array of artifacts and automatically groups matching
 * expected/baseline, actual, and diff snapshots into pairs.
 */
export const detectVisualSnapshotPairs = (artifacts: VisualArtifact[]): VisualSnapshotPair[] => {
  if (!artifacts || artifacts.length === 0) return [];

  // Filter image artifacts
  const imageArtifacts = artifacts.filter((a) => {
    const type = (a.type || '').toLowerCase();
    const name = (a.name || '').toLowerCase();
    const path = (a.path || '').toLowerCase();
    const url = (a.url || '').toLowerCase();

    return (
      type === 'screenshot' ||
      type === 'image' ||
      name.includes('screenshot') ||
      name.includes('-actual') ||
      name.includes('-expected') ||
      name.includes('-diff') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      url.includes('.png') ||
      url.includes('.jpg') ||
      url.includes('.jpeg')
    );
  });

  const pairMap = new Map<
    string,
    {
      expected?: VisualArtifact;
      actual?: VisualArtifact;
      diff?: VisualArtifact;
      rawName: string;
    }
  >();

  // Helper to categorize image role
  for (const artifact of imageArtifacts) {
    const nameLower = (artifact.name || '').toLowerCase();
    const pathLower = (artifact.path || '').toLowerCase();
    const combined = `${nameLower} ${pathLower}`;

    const isExpected = combined.includes('expected') || combined.includes('baseline') || combined.includes('golden');
    const isDiff = combined.includes('diff') || combined.includes('difference') || combined.includes('mismatch');
    const isActual = combined.includes('actual') || combined.includes('received') || (!isExpected && !isDiff);

    const baseKey = cleanSnapshotName(artifact.name || artifact.path || artifact.id);
    const key = baseKey || 'snapshot';

    if (!pairMap.has(key)) {
      pairMap.set(key, { rawName: artifact.name || key });
    }

    const group = pairMap.get(key)!;
    if (isExpected && !group.expected) {
      group.expected = artifact;
    } else if (isDiff && !group.diff) {
      group.diff = artifact;
    } else if (isActual && !group.actual) {
      group.actual = artifact;
    } else {
      // Fallback if multiple actuals exist
      if (!group.actual) group.actual = artifact;
      else if (!group.expected) group.expected = artifact;
      else if (!group.diff) group.diff = artifact;
    }
  }

  const pairs: VisualSnapshotPair[] = [];

  pairMap.forEach((group, key) => {
    // Only consider it a visual comparison pair if it has at least:
    // 1) Both expected and actual, OR
    // 2) Actual and a diff, OR
    // 3) Expected and a diff
    if (group.expected && group.actual) {
      pairs.push({
        id: `pair-${key}-${group.expected.id}-${group.actual.id}`,
        name: group.rawName,
        cleanTitle: key,
        baseline: group.expected,
        actual: group.actual,
        diff: group.diff || null,
      });
    } else if (group.actual && group.diff) {
      pairs.push({
        id: `pair-${key}-${group.actual.id}-${group.diff.id}`,
        name: group.rawName,
        cleanTitle: key,
        baseline: group.diff, // Use diff or actual as baseline placeholder
        actual: group.actual,
        diff: group.diff,
      });
    }
  });

  return pairs;
};

export interface DiffComputeOptions {
  highlightColor?: 'magenta' | 'green' | 'amber' | 'invert';
  threshold?: number; // 0.0 to 1.0 (default 0.1)
}

export interface DiffComputeResult {
  diffDataUrl: string;
  mismatchPixels: number;
  totalPixels: number;
  mismatchPercentage: number;
  width: number;
  height: number;
}

/**
 * Loads an HTMLImageElement asynchronously with crossOrigin support
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

/**
 * Computes a pixel-by-pixel diff between two images using an in-memory Canvas
 * and generates a high-contrast diff overlay with pixel mismatch counts.
 */
export const computeCanvasDiff = async (
  baselineUrl: string,
  actualUrl: string,
  options: DiffComputeOptions = {}
): Promise<DiffComputeResult> => {
  const { highlightColor = 'magenta', threshold = 0.1 } = options;

  const [imgA, imgB] = await Promise.all([loadImage(baselineUrl), loadImage(actualUrl)]);

  const width = Math.max(imgA.naturalWidth || imgA.width, imgB.naturalWidth || imgB.width);
  const height = Math.max(imgA.naturalHeight || imgA.height, imgB.naturalHeight || imgB.height);

  if (width === 0 || height === 0) {
    throw new Error('Image dimensions are zero');
  }

  // Create canvases for baseline, actual, and diff
  const canvasA = document.createElement('canvas');
  canvasA.width = width;
  canvasA.height = height;
  const ctxA = canvasA.getContext('2d');

  const canvasB = document.createElement('canvas');
  canvasB.width = width;
  canvasB.height = height;
  const ctxB = canvasB.getContext('2d');

  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d');

  if (!ctxA || !ctxB || !diffCtx) {
    throw new Error('Failed to acquire 2D canvas context');
  }

  // Draw images
  ctxA.drawImage(imgA, 0, 0);
  ctxB.drawImage(imgB, 0, 0);

  const dataA = ctxA.getImageData(0, 0, width, height).data;
  const dataB = ctxB.getImageData(0, 0, width, height).data;

  const diffImageData = diffCtx.createImageData(width, height);
  const diffData = diffImageData.data;

  const totalPixels = width * height;
  let mismatchPixels = 0;

  // Max Euclidean color distance = sqrt(255^2 * 3) ~ 441.67
  const maxDistance = 441.67;
  const pixelThreshold = threshold * maxDistance;

  // Highlight color channels
  let hr = 255;
  let hg = 0;
  let hb = 100;
  if (highlightColor === 'green') {
    hr = 0;
    hg = 255;
    hb = 102;
  } else if (highlightColor === 'amber') {
    hr = 255;
    hg = 184;
    hb = 0;
  }

  for (let i = 0; i < dataA.length; i += 4) {
    const r1 = dataA[i];
    const g1 = dataA[i + 1];
    const b1 = dataA[i + 2];
    const a1 = dataA[i + 3];

    const r2 = dataB[i];
    const g2 = dataB[i + 1];
    const b2 = dataB[i + 2];
    const a2 = dataB[i + 3];

    // Compute color distance
    const dist = Math.sqrt(
      Math.pow(r1 - r2, 2) +
      Math.pow(g1 - g2, 2) +
      Math.pow(b1 - b2, 2) +
      Math.pow(a1 - a2, 2)
    );

    if (dist > pixelThreshold) {
      mismatchPixels++;
      if (highlightColor === 'invert') {
        // High-contrast inverted diff
        diffData[i] = 255 - Math.abs(r1 - r2);
        diffData[i + 1] = 255 - Math.abs(g1 - g2);
        diffData[i + 2] = 255 - Math.abs(b1 - b2);
        diffData[i + 3] = 255;
      } else {
        // Vibrant neon highlight
        diffData[i] = hr;
        diffData[i + 1] = hg;
        diffData[i + 2] = hb;
        diffData[i + 3] = 255;
      }
    } else {
      // Semi-transparent darkened background for unchanged pixels
      const gray = (r1 * 0.299 + g1 * 0.587 + b1 * 0.114) * 0.2;
      diffData[i] = gray;
      diffData[i + 1] = gray;
      diffData[i + 2] = gray;
      diffData[i + 3] = 180;
    }
  }

  diffCtx.putImageData(diffImageData, 0, 0);

  const mismatchPercentage = totalPixels > 0 ? Number(((mismatchPixels / totalPixels) * 100).toFixed(2)) : 0;
  const diffDataUrl = diffCanvas.toDataURL('image/png');

  return {
    diffDataUrl,
    mismatchPixels,
    totalPixels,
    mismatchPercentage,
    width,
    height,
  };
};
