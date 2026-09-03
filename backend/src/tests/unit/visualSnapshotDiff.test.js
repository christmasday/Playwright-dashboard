/**
 * Unit Tests for Visual Snapshot Pairing Logic
 * Tests pairing rules for Playwright visual regression snapshots (expected, actual, diff).
 */

const cleanSnapshotName = (rawName) => {
  return rawName
    .replace(/[-_.](expected|actual|diff)\.(png|jpe?g|webp)$/i, '')
    .replace(/[-_.](expected|actual|diff)$/i, '')
    .replace(/^(expected|actual|diff)[-_.]/i, '')
    .replace(/\.(png|jpe?g|webp)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
};

const detectVisualSnapshotPairs = (artifacts) => {
  if (!artifacts || artifacts.length === 0) return [];

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

  const pairMap = new Map();

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

    const group = pairMap.get(key);
    if (isExpected && !group.expected) {
      group.expected = artifact;
    } else if (isDiff && !group.diff) {
      group.diff = artifact;
    } else if (isActual && !group.actual) {
      group.actual = artifact;
    } else {
      if (!group.actual) group.actual = artifact;
      else if (!group.expected) group.expected = artifact;
      else if (!group.diff) group.diff = artifact;
    }
  }

  const pairs = [];
  pairMap.forEach((group, key) => {
    if (group.expected && group.actual) {
      pairs.push({
        id: `pair-${key}`,
        cleanTitle: key,
        baseline: group.expected,
        actual: group.actual,
        diff: group.diff || null,
      });
    } else if (group.actual && group.diff) {
      pairs.push({
        id: `pair-${key}`,
        cleanTitle: key,
        baseline: group.diff,
        actual: group.actual,
        diff: group.diff,
      });
    }
  });

  return pairs;
};

describe('Visual Snapshot Pairing Logic', () => {
  describe('cleanSnapshotName', () => {
    it('strips Playwright suffixes from filenames', () => {
      expect(cleanSnapshotName('homepage-header-expected.png')).toBe('homepage header');
      expect(cleanSnapshotName('homepage-header-actual.png')).toBe('homepage header');
      expect(cleanSnapshotName('homepage-header-diff.png')).toBe('homepage header');
    });

    it('handles underscore and hyphen variants', () => {
      expect(cleanSnapshotName('checkout_cart_expected.png')).toBe('checkout cart');
      expect(cleanSnapshotName('expected-login-modal.png')).toBe('login modal');
    });
  });

  describe('detectVisualSnapshotPairs', () => {
    it('returns empty array when no artifacts provided', () => {
      expect(detectVisualSnapshotPairs([])).toEqual([]);
      expect(detectVisualSnapshotPairs(null)).toEqual([]);
    });

    it('correctly pairs Playwright expected, actual, and diff snapshots', () => {
      const mockArtifacts = [
        { id: '1', name: 'landing-page-expected.png', type: 'screenshot', url: '/landing-page-expected.png' },
        { id: '2', name: 'landing-page-actual.png', type: 'screenshot', url: '/landing-page-actual.png' },
        { id: '3', name: 'landing-page-diff.png', type: 'screenshot', url: '/landing-page-diff.png' },
      ];

      const pairs = detectVisualSnapshotPairs(mockArtifacts);
      expect(pairs).toHaveLength(1);
      expect(pairs[0].cleanTitle).toBe('landing page');
      expect(pairs[0].baseline.id).toBe('1');
      expect(pairs[0].actual.id).toBe('2');
      expect(pairs[0].diff.id).toBe('3');
    });

    it('segregates multiple different snapshot pairs', () => {
      const mockArtifacts = [
        { id: '1', name: 'header-expected.png', type: 'screenshot', url: '/header-expected.png' },
        { id: '2', name: 'header-actual.png', type: 'screenshot', url: '/header-actual.png' },
        { id: '3', name: 'footer-expected.png', type: 'screenshot', url: '/footer-expected.png' },
        { id: '4', name: 'footer-actual.png', type: 'screenshot', url: '/footer-actual.png' },
      ];

      const pairs = detectVisualSnapshotPairs(mockArtifacts);
      expect(pairs).toHaveLength(2);
      expect(pairs.map((p) => p.cleanTitle)).toEqual(['header', 'footer']);
    });

    it('ignores non-image artifacts', () => {
      const mockArtifacts = [
        { id: '1', name: 'trace.zip', type: 'trace', url: '/trace.zip' },
        { id: '2', name: 'test.log', type: 'log', url: '/test.log' },
      ];

      const pairs = detectVisualSnapshotPairs(mockArtifacts);
      expect(pairs).toHaveLength(0);
    });
  });
});
