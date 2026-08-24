/**
 * Reusable Pagination Component
 * Features page number buttons with ellipsis, first/prev/next/last controls,
 * current range indicator, and configurable page size selector.
 */

import React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'items',
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);

      if (start > 2) {
        pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalItems <= pageSize || totalPages <= 1) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-xs text-[#9a9aa5] ${className}`}
    >
      {/* Range Info */}
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="font-semibold text-[#f4f4f7]">{startItem}</span> to{' '}
          <span className="font-semibold text-[#f4f4f7]">{endItem}</span> of{' '}
          <span className="font-semibold text-[#f4f4f7]">{totalItems.toLocaleString()}</span> {itemLabel}
        </span>

        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-[#20202a]">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-[#14141b] border border-[#20202a] rounded-lg px-2 py-1 text-xs text-[#f4f4f7] focus:outline-none focus:border-[#3b82f6] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 hover:text-[#f4f4f7] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="First Page"
        >
          <i className="fas fa-angle-double-left text-[10px]"></i>
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 hover:text-[#f4f4f7] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="Previous Page"
        >
          <i className="fas fa-chevron-left text-[10px]"></i>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) =>
            typeof p === 'number' ? (
              <button
                key={idx}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  p === safePage
                    ? 'bg-[#3b82f6] text-white font-bold shadow-lg shadow-[#3b82f6]/20'
                    : 'bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 hover:text-[#f4f4f7]'
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={idx} className="w-6 text-center text-[#5e5e68]">
                ...
              </span>
            )
          )}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 hover:text-[#f4f4f7] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="Next Page"
        >
          <i className="fas fa-chevron-right text-[10px]"></i>
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#14141b] border border-[#20202a] hover:border-[#3b82f6]/40 hover:text-[#f4f4f7] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="Last Page"
        >
          <i className="fas fa-angle-double-right text-[10px]"></i>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
