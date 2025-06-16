'use client';

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface PaginationControlsProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  totalItems,
  itemsPerPage,
  currentPage,
  onPageChange,
}: PaginationControlsProps) {
  // Add safety checks for NaN values
  const safeTotalItems = isNaN(totalItems) || totalItems < 0 ? 0 : totalItems;
  const safeItemsPerPage = isNaN(itemsPerPage) || itemsPerPage <= 0 ? 50 : itemsPerPage;
  const safeCurrentPage = isNaN(currentPage) || currentPage < 1 ? 1 : currentPage;
  
  const totalPages = Math.ceil(safeTotalItems / safeItemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const startItem = (safeCurrentPage - 1) * safeItemsPerPage + 1;
  const endItem = Math.min(safeCurrentPage * safeItemsPerPage, safeTotalItems);

  if (safeTotalItems === 0) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = safeCurrentPage - 1; i <= safeCurrentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mt-4 sm:mt-6 px-2">
      <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
        <span className="font-semibold text-gray-300">{startItem}-{endItem}</span>
        <span className="hidden sm:inline"> of </span>
        <span className="sm:hidden"> / </span>
        <span className="font-semibold text-gray-300">{safeTotalItems}</span>
        <span className="hidden sm:inline"> players</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="p-1.5 sm:p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 group"
          aria-label="Previous page"
        >
          <FaChevronLeft className="text-gray-400 group-hover:text-gray-300 text-sm sm:text-base" />
        </button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' ? handlePageChange(page) : null}
              disabled={page === '...'}
              className={`
                min-w-[32px] sm:min-w-[40px] h-8 sm:h-10 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm
                ${page === safeCurrentPage 
                  ? 'bg-indigo-500 text-white shadow-lg' 
                  : page === '...'
                  ? 'text-gray-500 cursor-default'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }
              `}
            >
              {page}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => handlePageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          className="p-1.5 sm:p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 group"
          aria-label="Next page"
        >
          <FaChevronRight className="text-gray-400 group-hover:text-gray-300 text-sm sm:text-base" />
        </button>
      </div>
    </div>
  );
} 