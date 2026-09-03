import React, { useState, useMemo } from 'react';
import { detectVisualSnapshotPairs, VisualSnapshotPair } from '../../utils/canvasImageDiff';
import VisualDiffViewer from './VisualDiffViewer';
import VisualDiffModal from './VisualDiffModal';

interface Artifact {
  id: string;
  type?: string;
  name: string;
  url: string;
  path?: string;
  size: number;
}

interface ScreenshotGalleryProps {
  artifacts: Artifact[];
}

const ScreenshotGallery: React.FC<ScreenshotGalleryProps> = ({ artifacts }) => {
  const [selectedImage, setSelectedImage] = useState<Artifact | null>(null);
  const [selectedVisualPair, setSelectedVisualPair] = useState<VisualSnapshotPair | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);

  const visualPairs = useMemo(() => detectVisualSnapshotPairs(artifacts), [artifacts]);
  const [viewMode, setViewMode] = useState<'gallery' | 'visualDiff'>(() =>
    visualPairs.length > 0 ? 'visualDiff' : 'gallery'
  );

  const activeVisualPair = selectedVisualPair || (visualPairs.length > 0 ? visualPairs[0] : null);

  const handleOpenVisualDiff = (pair: VisualSnapshotPair) => {
    setSelectedVisualPair(pair);
    setIsDiffModalOpen(true);
  };

  const handleImageClick = (artifact: Artifact) => {
    // Check if this artifact belongs to a visual pair
    const matchingPair = visualPairs.find(
      (p) => p.baseline.id === artifact.id || p.actual.id === artifact.id || p.diff?.id === artifact.id
    );
    if (matchingPair) {
      handleOpenVisualDiff(matchingPair);
    } else {
      setSelectedImage(artifact);
    }
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getAuthUrl = (url: string) => {
    if (!url) return '';
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || url.includes('token=')) return url;
    return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
  };

  const screenshots = artifacts.filter((a) => {
    const type = (a.type || '').toLowerCase();
    const name = (a.name || '').toLowerCase();
    const path = ((a as any).path || '').toLowerCase();
    const url = (a.url || '').toLowerCase();
    return (
      type === 'screenshot' ||
      type === 'image' ||
      name.includes('screenshot') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      url.includes('.png') ||
      url.includes('.jpg') ||
      url.includes('.jpeg')
    );
  });

  const videos = artifacts.filter((a) => {
    const type = (a.type || '').toLowerCase();
    const name = (a.name || '').toLowerCase();
    const path = ((a as any).path || '').toLowerCase();
    const url = (a.url || '').toLowerCase();
    return (
      type === 'video' ||
      name.includes('video') ||
      path.endsWith('.webm') ||
      path.endsWith('.mp4') ||
      url.includes('.webm') ||
      url.includes('.mp4')
    );
  });

  if (screenshots.length === 0 && videos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Visual Diff Section (if pairs detected) */}
      {visualPairs.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#14141b] border border-[#20202a] p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-[#f4f4f7] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                  <i className="fas fa-arrows-left-right"></i>
                </span>
                Visual Regression Diff Viewer
              </h3>
              <p className="text-xs text-[#9a9aa5] mt-0.5">
                Automatically matched {visualPairs.length} visual snapshot {visualPairs.length === 1 ? 'pair' : 'pairs'} (Expected vs Actual vs Diff).
              </p>
            </div>

            <div className="flex items-center bg-[#08080a] border border-[#20202a] p-1 rounded-xl text-xs">
              <button
                onClick={() => setViewMode('visualDiff')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'visualDiff'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
                }`}
              >
                <i className="fas fa-columns text-[11px]"></i>
                <span>Visual Diff Mode</span>
              </button>
              <button
                onClick={() => setViewMode('gallery')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'gallery'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
                }`}
              >
                <i className="fas fa-th text-[11px]"></i>
                <span>All Images ({screenshots.length})</span>
              </button>
            </div>
          </div>

          {viewMode === 'visualDiff' && activeVisualPair && (
            <div className="space-y-4">
              <VisualDiffViewer
                snapshotPair={activeVisualPair}
                allPairs={visualPairs}
                onSelectPair={(p) => setSelectedVisualPair(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* Standard Screenshots Grid (shown if gallery mode selected or no visual pairs) */}
      {(viewMode === 'gallery' || visualPairs.length === 0) && screenshots.length > 0 && (
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20202a]">
            <div>
              <h3 className="text-lg font-semibold text-[#f4f4f7]">Test Screenshots</h3>
              <p className="text-xs text-[#9a9aa5]">Captured image snapshots during test execution</p>
            </div>
            <span className="text-xs bg-[#0e0e13] text-[#3b82f6] px-3 py-1 rounded-full font-mono">
              {screenshots.length} images
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {screenshots.map((artifact) => (
              <div
                key={artifact.id}
                onClick={() => handleImageClick(artifact)}
                className="group relative cursor-pointer bg-[#0e0e13] border border-[#20202a] rounded-xl overflow-hidden hover:border-[#3b82f6]/50 transition-all"
              >
                <div className="relative h-48 overflow-hidden bg-[#08080a]">
                  <img
                    src={getAuthUrl(artifact.url)}
                    alt={artifact.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 bg-[#3b82f6] text-white text-xs font-semibold rounded-lg shadow-lg">
                      <i className="fas fa-search-plus mr-1.5"></i> Expand View
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-[#1a1a22]">
                  <p className="text-xs font-medium text-[#f4f4f7] truncate">{artifact.name}</p>
                  {artifact.size > 0 && (
                    <p className="text-[11px] text-[#9a9aa5] mt-0.5">{formatFileSize(artifact.size)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="bg-[#1a1a22] border border-[#20202a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20202a]">
            <div>
              <h3 className="text-lg font-semibold text-[#f4f4f7]">Test Execution Video Recordings</h3>
              <p className="text-xs text-[#9a9aa5]">Screen recording playback of test run</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map((artifact) => (
              <div key={artifact.id} className="bg-[#0e0e13] border border-[#20202a] rounded-xl overflow-hidden p-3">
                <video src={getAuthUrl(artifact.url)} controls className="w-full h-56 rounded-lg bg-black object-contain" />
                <div className="p-2 mt-1 flex items-center justify-between text-xs text-[#9a9aa5]">
                  <span className="font-medium text-[#f4f4f7] truncate">{artifact.name}</span>
                  <span>{formatFileSize(artifact.size)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-[#1a1a22] border border-[#20202a] rounded-2xl max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#20202a] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-[#f4f4f7]">{selectedImage.name}</h4>
                <p className="text-xs text-[#9a9aa5]">{formatFileSize(selectedImage.size)}</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg bg-[#0e0e13] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#20202a] flex items-center justify-center transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4 bg-[#08080a] flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={getAuthUrl(selectedImage.url)}
                alt={selectedImage.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Visual Diff Fullscreen Modal */}
      <VisualDiffModal
        isOpen={isDiffModalOpen}
        snapshotPair={activeVisualPair}
        allPairs={visualPairs}
        onSelectPair={(p) => setSelectedVisualPair(p)}
        onClose={() => setIsDiffModalOpen(false)}
      />
    </div>
  );
};

export default ScreenshotGallery;
