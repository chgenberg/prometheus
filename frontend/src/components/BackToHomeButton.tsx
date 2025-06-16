'use client';

import { useRouter } from 'next/navigation';

export default function BackToHomeButton() {
  const router = useRouter();

  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <button
      onClick={handleBackToHome}
      className="btn-primary flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transform hover:scale-105 shadow-lg text-sm sm:text-base disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span className="font-semibold">Back to Home</span>
    </button>
  );
} 