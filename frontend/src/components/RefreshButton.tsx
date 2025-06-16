"use client";

import { useRouter } from 'next/navigation';
import { FaChartLine } from 'react-icons/fa';
import { useState } from 'react';

export default function RefreshButton() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    // Prevent the button from staying in the refreshing state if navigation is fast
    setTimeout(() => setIsRefreshing(false), 1000); 
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="btn-primary flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transform hover:scale-105 shadow-lg text-sm sm:text-base disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
    >
      <FaChartLine className={`text-sm sm:text-base ${isRefreshing ? 'animate-spin' : ''}`} />
      <span className="font-semibold hidden sm:inline">
        {isRefreshing ? 'Refreshing...' : 'Refresh Analysis'}
      </span>
      <span className="font-semibold sm:hidden">
        {isRefreshing ? '...' : 'Refresh'}
      </span>
    </button>
  );
} 