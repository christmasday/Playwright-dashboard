import React, { useState, useEffect } from 'react';

export interface CustomTimeframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryKey: string;
  categoryLabel: string;
  currentDays: number | null;
  defaultDays: number;
  onSave: (days: number | null) => void;
}

const PRESET_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '21 days', days: 21 },
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
  { label: '180 days', days: 180 },
  { label: '1 year (365d)', days: 365 },
  { label: '2 years (730d)', days: 730 },
  { label: 'Unlimited (∞)', days: null },
];

export const CustomTimeframeModal: React.FC<CustomTimeframeModalProps> = ({
  isOpen,
  onClose,
  categoryLabel,
  currentDays,
  defaultDays,
  onSave,
}) => {
  const [selectedDays, setSelectedDays] = useState<number | null>(currentDays);
  const [customInput, setCustomInput] = useState<string>(
    currentDays === null ? '' : String(currentDays)
  );
  const [isUnlimited, setIsUnlimited] = useState<boolean>(currentDays === null);

  useEffect(() => {
    setSelectedDays(currentDays);
    setIsUnlimited(currentDays === null);
    setCustomInput(currentDays === null ? '' : String(currentDays));
  }, [currentDays, isOpen]);

  if (!isOpen) return null;

  const handlePresetClick = (days: number | null) => {
    setSelectedDays(days);
    setIsUnlimited(days === null);
    setCustomInput(days === null ? '' : String(days));
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInput(val);
    if (val.trim() === '') {
      setSelectedDays(defaultDays);
      setIsUnlimited(false);
    } else {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setSelectedDays(parsed);
        setIsUnlimited(false);
      }
    }
  };

  const handleToggleUnlimited = (checked: boolean) => {
    setIsUnlimited(checked);
    if (checked) {
      setSelectedDays(null);
      setCustomInput('');
    } else {
      setSelectedDays(defaultDays);
      setCustomInput(String(defaultDays));
    }
  };

  const handleSave = () => {
    onSave(isUnlimited ? null : selectedDays);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#15151c] border border-[#2b2b3b] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1a24] border-b border-[#2b2b3b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <i className="fas fa-clock-rotate-left text-sm"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f4f4f7]">Custom Storage Timeframe</h2>
              <p className="text-xs text-[#9a9aa5] truncate max-w-xs">{categoryLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9a9aa5] hover:text-[#f4f4f7] hover:bg-[#282838] transition-colors"
          >
            <i className="fas fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-[#9a9aa5] uppercase tracking-wider mb-2.5">
              Quick Preset Durations
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_OPTIONS.map((opt) => {
                const isActive = isUnlimited
                  ? opt.days === null
                  : selectedDays === opt.days && opt.days !== null;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handlePresetClick(opt.days)}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all text-left flex items-center justify-between ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-semibold shadow-sm'
                        : 'bg-[#0e0e13] border-[#252533] text-[#9a9aa5] hover:text-[#f4f4f7] hover:border-[#353547]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isActive && <i className="fas fa-check text-[10px] text-emerald-400"></i>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Number Input */}
          <div className="bg-[#0e0e13] border border-[#252533] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#f4f4f7]">
                Custom Duration (Days)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#9a9aa5]">
                <input
                  type="checkbox"
                  checked={isUnlimited}
                  onChange={(e) => handleToggleUnlimited(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#2b2b3b] bg-[#1a1a24] text-emerald-500"
                />
                <span>Keep Indefinitely</span>
              </label>
            </div>

            {!isUnlimited ? (
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customInput}
                  onChange={handleCustomInputChange}
                  placeholder="Enter number of days (e.g. 45)"
                  className="w-full px-3 py-2 bg-[#15151c] border border-[#2b2b3b] rounded-xl text-xs text-[#f4f4f7] focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="absolute right-3 top-2 text-xs text-[#6e6e80] pointer-events-none">
                  days
                </span>
              </div>
            ) : (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-center gap-2">
                <i className="fas fa-infinity text-sm"></i>
                <span>Data in this category will never be purged by automatic retention policies.</span>
              </div>
            )}

            <p className="text-[11px] text-[#6e6e80]">
              Default standard plan timeframe is <strong className="text-[#9a9aa5]">{defaultDays} days</strong>.
            </p>
          </div>

          {/* Retention Impact Preview */}
          <div className="p-3.5 bg-[#121218] border border-[#20202a] rounded-xl text-xs space-y-1">
            <div className="font-semibold text-[#f4f4f7] flex items-center gap-1.5">
              <i className="fas fa-shield-halved text-emerald-400 text-xs"></i>
              <span>Retention Policy Impact</span>
            </div>
            <p className="text-[#9a9aa5] text-[11px]">
              {isUnlimited
                ? `All items under "${categoryLabel}" will be stored indefinitely unless manually deleted.`
                : `Items under "${categoryLabel}" will be retained for ${selectedDays} days from creation, after which automated cleanup jobs will flag and safely prune them.`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#1a1a24] border-t border-[#2b2b3b] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#9a9aa5] hover:text-[#f4f4f7] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
          >
            <i className="fas fa-check text-xs"></i>
            <span>Set Timeframe</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomTimeframeModal;
