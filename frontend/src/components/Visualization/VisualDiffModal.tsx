/**
 * Visual Diff Fullscreen Darkroom Modal
 * Provides distraction-free inspection, snapshot carousel switcher, and keyboard dismissal.
 */

import React, { useEffect } from 'react';
import VisualDiffViewer from './VisualDiffViewer';
import { VisualSnapshotPair } from '../../utils/canvasImageDiff';

interface VisualDiffModalProps {
  isOpen: boolean;
  snapshotPair: VisualSnapshotPair | null;
  allPairs?: VisualSnapshotPair[];
  onSelectPair?: (pair: VisualSnapshotPair) => void;
  onApproveBaseline?: (pair: VisualSnapshotPair) => void;
  onClose: () => void;
}

const VisualDiffModal: React.FC<VisualDiffModalProps> = ({
  isOpen,
  snapshotPair,
  allPairs = [],
  onSelectPair,
  onApproveBaseline,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !snapshotPair) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full h-[94vh] max-w-7xl flex flex-col">
        <VisualDiffViewer
          snapshotPair={snapshotPair}
          allPairs={allPairs}
          onSelectPair={onSelectPair}
          onApproveBaseline={onApproveBaseline}
          onClose={onClose}
          isModal={true}
        />
      </div>
    </div>
  );
};

export default VisualDiffModal;
