/**
 * Interactive Visual Regression Diff Viewer
 * Features 4 inspection modes:
 * 1. Split Slider (Curtain / Swipe) with draggable divider
 * 2. Side-by-Side (2-Up) with synchronized zoom and pan
 * 3. Onion Skin with opacity blend and quick-flash toggling
 * 4. Diff Highlight with customizable color heatmaps
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  VisualSnapshotPair,
  computeCanvasDiff,
  getAuthMediaUrl,
  DiffComputeResult,
} from '../../utils/canvasImageDiff';

export type VisualDiffMode = 'slider' | 'sideBySide' | 'onionSkin' | 'diff';
export type DiffHighlightColor = 'magenta' | 'green' | 'amber' | 'invert';

interface VisualDiffViewerProps {
  snapshotPair: VisualSnapshotPair;
  allPairs?: VisualSnapshotPair[];
  onSelectPair?: (pair: VisualSnapshotPair) => void;
  onApproveBaseline?: (pair: VisualSnapshotPair) => void;
  onClose?: () => void;
  isModal?: boolean;
}

const VisualDiffViewer: React.FC<VisualDiffViewerProps> = ({
  snapshotPair,
  allPairs = [],
  onSelectPair,
  onApproveBaseline,
  onClose,
  isModal = false,
}) => {
  const [mode, setMode] = useState<VisualDiffMode>('slider');
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 - 100
  const [onionOpacity, setOnionOpacity] = useState<number>(50); // percentage 0 - 100
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [highlightColor, setHighlightColor] = useState<DiffHighlightColor>('magenta');
  const [computedDiff, setComputedDiff] = useState<DiffComputeResult | null>(null);
  const [diffCalculating, setDiffCalculating] = useState<boolean>(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  const [copiedState, setCopiedState] = useState<boolean>(false);
  const [flashToggled, setFlashToggled] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingSlider = useRef<boolean>(false);

  const baselineUrl = getAuthMediaUrl(snapshotPair.baseline.url);
  const actualUrl = getAuthMediaUrl(snapshotPair.actual.url);
  const diffUrl = snapshotPair.diff ? getAuthMediaUrl(snapshotPair.diff.url) : computedDiff?.diffDataUrl || '';

  // Calculate client-side canvas diff if no precomputed diff is available or when color changes
  useEffect(() => {
    let isCancelled = false;

    const runDiff = async () => {
      if (!baselineUrl || !actualUrl) return;
      setDiffCalculating(true);
      setDiffError(null);
      try {
        const result = await computeCanvasDiff(baselineUrl, actualUrl, {
          highlightColor,
          threshold: 0.1,
        });
        if (!isCancelled) {
          setComputedDiff(result);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setDiffError(err.message || 'Failed to compute client-side diff');
        }
      } finally {
        if (!isCancelled) {
          setDiffCalculating(false);
        }
      }
    };

    runDiff();

    return () => {
      isCancelled = true;
    };
  }, [baselineUrl, actualUrl, highlightColor]);

  // Handle Split Slider mouse/touch dragging
  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  const handleMouseDownSlider = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSlider.current = true;
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider.current) {
        handleSliderMove(e.clientX);
      } else if (isPanning) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    };

    const handleWindowMouseUp = () => {
      isDraggingSlider.current = false;
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [handleSliderMove, isPanning, panStart]);

  // Keyboard shortcut listener for Spacebar (flip) & Zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setFlashToggled((prev) => !prev);
      } else if (e.key === '1') {
        setMode('slider');
      } else if (e.key === '2') {
        setMode('sideBySide');
      } else if (e.key === '3') {
        setMode('onionSkin');
      } else if (e.key === '4') {
        setMode('diff');
      } else if (e.key === '0') {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
      } else if (e.key === '-' || e.key === '_') {
        setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Zoom helpers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan handlers for sideBySide and zoomed views
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isDraggingSlider.current) return;
    if (zoomLevel > 1 || mode === 'sideBySide') {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      });
    }
  };

  // Download Baseline/Actual
  const handleDownloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const mismatchPercent = computedDiff?.mismatchPercentage ?? snapshotPair.mismatchPercentage;
  const mismatchPixels = computedDiff?.mismatchPixels ?? snapshotPair.mismatchPixels;
  const width = computedDiff?.width || 0;
  const height = computedDiff?.height || 0;

  return (
    <div className={`bg-[#0d0d12] border border-[#20202a] rounded-2xl overflow-hidden shadow-2xl flex flex-col ${isModal ? 'h-full' : 'min-h-[640px]'}`}>
      {/* Top Main Toolbar */}
      <div className="bg-[#14141b] border-b border-[#20202a] p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 select-none">
        {/* Left: Snapshot Title & Navigation */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xs shrink-0">
            <i className="fas fa-images"></i>
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[#f4f4f7] truncate">
                {snapshotPair.cleanTitle || snapshotPair.name}
              </h3>
              {mismatchPercent !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    mismatchPercent === 0
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : mismatchPercent < 1
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}
                >
                  {mismatchPercent === 0 ? 'Exact Match (0%)' : `${mismatchPercent}% Mismatch`}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#9a9aa5] truncate mt-0.5">
              {width && height ? `${width} × ${height}px` : 'Visual Regression Snapshot'}
              {mismatchPixels ? ` • ${mismatchPixels.toLocaleString()} mismatched pixels` : ''}
            </p>
          </div>

          {/* Multiple Snapshots Switcher Dropdown (if multiple pairs) */}
          {allPairs.length > 1 && onSelectPair && (
            <select
              value={snapshotPair.id}
              onChange={(e) => {
                const found = allPairs.find((p) => p.id === e.target.value);
                if (found) onSelectPair(found);
              }}
              className="px-2.5 py-1 bg-[#08080a] border border-[#20202a] text-xs text-[#f4f4f7] rounded-lg focus:outline-none focus:border-blue-500 max-w-[160px] truncate"
            >
              {allPairs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.cleanTitle || p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Center: Mode Switcher Tabs */}
        <div className="flex items-center bg-[#08080a] border border-[#20202a] p-1 rounded-xl text-xs">
          <button
            onClick={() => setMode('slider')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'slider'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
            }`}
            title="Split Slider (Press 1)"
          >
            <i className="fas fa-arrows-left-right text-[11px]"></i>
            <span className="hidden sm:inline">Split Slider</span>
          </button>
          <button
            onClick={() => setMode('sideBySide')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'sideBySide'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
            }`}
            title="Side-by-Side 2-Up (Press 2)"
          >
            <i className="fas fa-columns text-[11px]"></i>
            <span className="hidden sm:inline">2-Up</span>
          </button>
          <button
            onClick={() => setMode('onionSkin')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'onionSkin'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
            }`}
            title="Onion Skin Blend (Press 3)"
          >
            <i className="fas fa-layer-group text-[11px]"></i>
            <span className="hidden sm:inline">Onion Skin</span>
          </button>
          <button
            onClick={() => setMode('diff')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              mode === 'diff'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-[#9a9aa5] hover:text-[#f4f4f7]'
            }`}
            title="Diff Highlight (Press 4)"
          >
            <i className="fas fa-crosshairs text-[11px]"></i>
            <span className="hidden sm:inline">Diff Map</span>
          </button>
        </div>

        {/* Right: Zoom Controls & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-[#08080a] border border-[#20202a] rounded-xl p-0.5 text-xs text-[#9a9aa5]">
            <button
              onClick={handleZoomOut}
              className="w-7 h-7 flex items-center justify-center hover:text-[#f4f4f7] rounded-lg transition-colors"
              title="Zoom Out (-)"
            >
              <i className="fas fa-minus text-[10px]"></i>
            </button>
            <span className="px-1.5 font-mono text-[11px] text-[#f4f4f7]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="w-7 h-7 flex items-center justify-center hover:text-[#f4f4f7] rounded-lg transition-colors"
              title="Zoom In (+)"
            >
              <i className="fas fa-plus text-[10px]"></i>
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 hover:text-[#f4f4f7] border-l border-[#20202a] text-[10px] font-semibold"
              title="Reset Zoom (Press 0)"
            >
              Reset
            </button>
          </div>

          {/* Action: Approve as Baseline */}
          {onApproveBaseline ? (
            <button
              onClick={() => onApproveBaseline(snapshotPair)}
              className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Accept actual image as new golden baseline"
            >
              <i className="fas fa-check-double text-[11px]"></i>
              <span className="hidden md:inline">Approve Baseline</span>
            </button>
          ) : (
            <button
              onClick={() => handleDownloadImage(actualUrl, `${snapshotPair.cleanTitle}-new-baseline.png`)}
              className="px-3 py-1.5 bg-[#08080a] hover:bg-[#1a1a24] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7] rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Download actual snapshot to use as updated baseline"
            >
              <i className="fas fa-download text-[11px]"></i>
              <span className="hidden md:inline">Download Actual</span>
            </button>
          )}

          {/* Close button if inside modal */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#08080a] hover:bg-red-500/20 text-[#9a9aa5] hover:text-red-400 border border-[#20202a] hover:border-red-500/30 flex items-center justify-center text-xs transition-colors"
              title="Close Viewer (Esc)"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Toolbar for Mode-Specific Controls */}
      <div className="bg-[#101017] border-b border-[#20202a] px-5 py-2 flex flex-wrap items-center justify-between text-xs text-[#9a9aa5] gap-3">
        {mode === 'slider' && (
          <div className="flex items-center gap-4 w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#f4f4f7]">Split Position:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="w-36 sm:w-56 accent-blue-500 cursor-pointer h-1.5 bg-[#20202a] rounded-lg"
              />
              <span className="font-mono text-[11px] text-[#f4f4f7]">{Math.round(sliderPos)}%</span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Expected (Golden)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Actual (Current Run)
              </span>
            </div>
          </div>
        )}

        {mode === 'sideBySide' && (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px]">
              <i className="fas fa-hand mr-1.5 text-blue-400"></i>
              Click and drag to pan both viewports synchronously. Mouse wheel to zoom.
            </span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="font-semibold text-blue-400">Left: Expected (Golden)</span>
              <span className="font-semibold text-emerald-400">Right: Actual (Test Run)</span>
            </div>
          </div>
        )}

        {mode === 'onionSkin' && (
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-[#f4f4f7]">Opacity Cross-Fade:</span>
              <span className="text-[10px] text-blue-400 font-semibold">Expected (0%)</span>
              <input
                type="range"
                min="0"
                max="100"
                value={onionOpacity}
                onChange={(e) => setOnionOpacity(Number(e.target.value))}
                className="w-36 sm:w-56 accent-blue-500 cursor-pointer h-1.5 bg-[#20202a] rounded-lg"
              />
              <span className="text-[10px] text-emerald-400 font-semibold">Actual (100%)</span>
              <span className="font-mono text-[11px] text-[#f4f4f7] ml-1">{onionOpacity}%</span>
            </div>
            <button
              onClick={() => setFlashToggled((prev) => !prev)}
              className="px-2.5 py-1 bg-[#08080a] hover:bg-blue-600/20 border border-[#20202a] hover:border-blue-500/30 text-[#f4f4f7] rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5"
              title="Toggle between 0% and 100% (or tap Spacebar)"
            >
              <i className="fas fa-repeat text-[10px] text-blue-400"></i>
              <span>Flash Flip ({flashToggled ? 'Showing Actual' : 'Showing Expected'})</span>
              <span className="text-[10px] text-[#5e5e68] font-mono">[Space]</span>
            </button>
          </div>
        )}

        {mode === 'diff' && (
          <div className="flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#f4f4f7]">Diff Highlight Color:</span>
              {(['magenta', 'green', 'amber', 'invert'] as DiffHighlightColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setHighlightColor(c)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                    highlightColor === c
                      ? c === 'magenta'
                        ? 'bg-rose-500 text-white border-rose-400'
                        : c === 'green'
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : c === 'amber'
                        ? 'bg-amber-500 text-black border-amber-400'
                        : 'bg-white text-black border-white'
                      : 'bg-[#08080a] text-[#9a9aa5] border-[#20202a] hover:text-[#f4f4f7]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-[#9a9aa5] flex items-center gap-2">
              {diffCalculating ? (
                <span className="text-blue-400 flex items-center gap-1.5">
                  <i className="fas fa-spinner fa-spin text-xs"></i> Calculating pixel delta...
                </span>
              ) : (
                <span>High-contrast mismatch overlay</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Viewport Stage */}
      <div
        ref={containerRef}
        onMouseDown={handleContainerMouseDown}
        className="relative flex-1 bg-[#060608] overflow-hidden flex items-center justify-center p-4 select-none cursor-grab active:cursor-grabbing min-h-[440px]"
      >
        {/* Transform container for Pan & Zoom */}
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          }}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          {/* ========================================================================= */}
          {/* 1. Split Slider Mode */}
          {/* ========================================================================= */}
          {mode === 'slider' && (
            <div className="relative inline-block overflow-hidden shadow-2xl rounded-lg border border-[#20202a]">
              {/* Underneath Image: Actual (Current Run) */}
              <img
                src={actualUrl}
                alt="Actual Snapshot"
                className="block max-h-[70vh] object-contain pointer-events-none"
                draggable={false}
              />

              {/* Overlay Image: Baseline (Expected), clipped to sliderPos */}
              <div
                style={{
                  clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                }}
                className="absolute inset-0 pointer-events-none"
              >
                <img
                  src={baselineUrl}
                  alt="Expected Baseline"
                  className="block w-full h-full object-contain"
                  draggable={false}
                />
              </div>

              {/* Draggable Divider Line & Pill */}
              <div
                style={{ left: `${sliderPos}%` }}
                onMouseDown={handleMouseDownSlider}
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_12px_rgba(0,0,0,0.8)]"
              >
                {/* Center Handle Grabber */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform text-white text-xs">
                  <i className="fas fa-arrows-left-right text-[10px]"></i>
                </div>

                {/* Floating Tags */}
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-blue-600/90 text-white font-bold text-[10px] pointer-events-none shadow backdrop-blur-sm whitespace-nowrap">
                  Expected
                </span>
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-emerald-600/90 text-white font-bold text-[10px] pointer-events-none shadow backdrop-blur-sm whitespace-nowrap">
                  Actual
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. Side-by-Side (2-Up) Mode */}
          {/* ========================================================================= */}
          {mode === 'sideBySide' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2 max-w-6xl w-full">
              {/* Left Panel: Expected */}
              <div className="bg-[#08080a] border border-[#20202a] rounded-xl overflow-hidden flex flex-col shadow-xl">
                <div className="bg-[#14141b] border-b border-[#20202a] px-3.5 py-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Expected (Golden Baseline)
                  </span>
                  <button
                    onClick={() => handleDownloadImage(baselineUrl, `${snapshotPair.cleanTitle}-expected.png`)}
                    className="text-[#9a9aa5] hover:text-[#f4f4f7] text-[11px]"
                    title="Download Golden Baseline"
                  >
                    <i className="fas fa-download"></i>
                  </button>
                </div>
                <div className="p-3 flex items-center justify-center bg-[#0a0a0f] min-h-[360px]">
                  <img
                    src={baselineUrl}
                    alt="Expected Baseline"
                    className="max-h-[60vh] object-contain rounded"
                    draggable={false}
                  />
                </div>
              </div>

              {/* Right Panel: Actual */}
              <div className="bg-[#08080a] border border-[#20202a] rounded-xl overflow-hidden flex flex-col shadow-xl">
                <div className="bg-[#14141b] border-b border-[#20202a] px-3.5 py-2 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Actual (Current Run)
                  </span>
                  <button
                    onClick={() => handleDownloadImage(actualUrl, `${snapshotPair.cleanTitle}-actual.png`)}
                    className="text-[#9a9aa5] hover:text-[#f4f4f7] text-[11px]"
                    title="Download Actual Test Output"
                  >
                    <i className="fas fa-download"></i>
                  </button>
                </div>
                <div className="p-3 flex items-center justify-center bg-[#0a0a0f] min-h-[360px]">
                  <img
                    src={actualUrl}
                    alt="Actual Snapshot"
                    className="max-h-[60vh] object-contain rounded"
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. Onion Skin Mode */}
          {/* ========================================================================= */}
          {mode === 'onionSkin' && (
            <div className="relative inline-block overflow-hidden shadow-2xl rounded-lg border border-[#20202a]">
              {/* Baseline Image */}
              <img
                src={baselineUrl}
                alt="Expected Baseline"
                className="block max-h-[70vh] object-contain pointer-events-none"
                draggable={false}
              />

              {/* Actual Image overlaid with opacity */}
              <img
                src={actualUrl}
                alt="Actual Snapshot"
                style={{
                  opacity: flashToggled ? 1 : onionOpacity / 100,
                }}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-150"
                draggable={false}
              />

              {/* Current Status Watermark Pill */}
              <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#08080a]/80 backdrop-blur-md border border-[#20202a] text-[10px] text-[#f4f4f7] font-mono">
                {flashToggled ? '100% Actual' : `${onionOpacity}% Actual / ${100 - onionOpacity}% Expected`}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. Diff Highlight Mode */}
          {/* ========================================================================= */}
          {mode === 'diff' && (
            <div className="relative inline-block overflow-hidden shadow-2xl rounded-lg border border-[#20202a]">
              {diffUrl ? (
                <img
                  src={diffUrl}
                  alt="Pixel Diff Highlight Map"
                  className="block max-h-[70vh] object-contain pointer-events-none"
                  draggable={false}
                />
              ) : diffCalculating ? (
                <div className="w-[600px] h-[400px] bg-[#0a0a0f] flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-[#9a9aa5]">Comparing pixel buffers...</p>
                </div>
              ) : (
                <div className="w-[600px] h-[400px] bg-[#0a0a0f] flex flex-col items-center justify-center text-center p-6 text-xs text-[#9a9aa5]">
                  <i className="fas fa-circle-exclamation text-amber-400 text-xl mb-2"></i>
                  <span>{diffError ? `Error calculating diff: ${diffError}` : 'No diff image generated. Images may be identical or failed to load.'}</span>
                </div>
              )}

              {/* Diff Metric Chip */}
              {mismatchPercent !== undefined && (
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#08080a]/85 backdrop-blur-md border border-[#20202a] text-[11px] text-[#f4f4f7] flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="font-bold">{mismatchPercent}% pixel deviation</span>
                  {mismatchPixels && (
                    <span className="text-[#9a9aa5] font-mono text-[10px]">({mismatchPixels.toLocaleString()} px)</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Info Bar */}
      <div className="bg-[#14141b] border-t border-[#20202a] p-3 px-5 flex flex-wrap items-center justify-between text-xs text-[#9a9aa5] gap-3">
        <div className="flex items-center gap-4 text-[11px]">
          <span>
            Golden Baseline: <strong className="text-[#f4f4f7] font-mono">{snapshotPair.baseline.name || 'expected.png'}</strong>
          </span>
          <span>•</span>
          <span>
            Actual Test Snapshot: <strong className="text-[#f4f4f7] font-mono">{snapshotPair.actual.name || 'actual.png'}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setCopiedState(true);
              setTimeout(() => setCopiedState(false), 2000);
            }}
            className="px-3 py-1 bg-[#08080a] hover:bg-[#1a1a24] border border-[#20202a] text-[#9a9aa5] hover:text-[#f4f4f7] rounded-lg text-xs transition-colors flex items-center gap-1.5"
          >
            <i className={`fas ${copiedState ? 'fa-check text-emerald-400' : 'fa-link'} text-[10px]`}></i>
            <span>{copiedState ? 'Link Copied' : 'Share Diff'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisualDiffViewer;
