"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { FaSearch } from 'react-icons/fa';
import { X } from 'lucide-react';

const QuickPlayerSearch: React.FC = () => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.length > 1) {
        fetch(`/api/player-search?q=${encodeURIComponent(searchQuery)}&limit=5`)
          .then(res => res.json())
          .then(data => {
            setSuggestions(data);
          })
          .catch(error => {
            console.error('Failed to fetch search suggestions:', error);
            setSuggestions([]);
          });
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const updateDropdownPosition = () => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  };

  const handleSuggestionSelect = (name: string) => {
    setSearchQuery(name);
    setShowSuggestions(false);
    router.push(`/?player=${encodeURIComponent(name)}`);
  };

  const handleSearchFocus = () => {
    setShowSuggestions(true);
    updateDropdownPosition();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        const suggestionElement = (target as Element).closest('[data-search-suggestion-dropdown]');
        if (!suggestionElement) {
          setShowSuggestions(false);
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showSuggestions) {
      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [showSuggestions]);
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchQuery.trim()) {
      router.push(`/?player=${encodeURIComponent(searchQuery)}`);
    }
  }
  
  useEffect(() => {
    if (isExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isExpanded]);

  if (!isExpanded) {
    return (
      <div className="flex justify-center my-6">
        <button
          onClick={() => setIsExpanded(true)}
          className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-800/80 to-gray-700/80 hover:from-gray-700/80 hover:to-gray-600/80 rounded-xl font-bold transition-all text-gray-300 hover:text-white border border-gray-600/50 transform hover:scale-105 shadow-lg hover:shadow-xl uppercase tracking-wide"
        >
          <div className="p-2 bg-gray-700/50 rounded-lg group-hover:bg-gray-600/50 transition-colors">
            <FaSearch className="h-4 w-4" />
          </div>
          <span>Quick Search</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-6" ref={searchContainerRef}>
       <form onSubmit={handleFormSubmit} className="relative group/search w-[400px]">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-gray-700/30 rounded-lg pointer-events-none z-10">
            <FaSearch className="text-gray-400 w-4 h-4 group-focus-within/search:text-indigo-400 transition-colors duration-300" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
              updateDropdownPosition();
            }}
            onFocus={handleSearchFocus}
            placeholder="Search for a player..."
            className="relative z-0 w-full bg-gray-800/50 border-2 border-gray-700/50 rounded-xl pl-14 pr-12 py-3.5 text-white text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-gray-500 hover:bg-gray-700/50 hover:border-gray-600/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
                router.push('/');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-all rounded-lg hover:bg-gray-700/50 hover:scale-110 active:scale-95 z-10"
            >
              <X size={18} />
            </button>
          )}
        </form>

      {showSuggestions && suggestions.length > 0 && typeof window !== 'undefined' && createPortal(
        <ul 
          data-search-suggestion-dropdown
          className="fixed bg-gray-900/95 border-2 border-gray-700/50 rounded-xl shadow-2xl max-h-60 overflow-auto backdrop-blur-xl"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 10000
          }}
        >
          {suggestions.map((name, index) => (
            <li 
              key={name} 
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionSelect(name);
              }}
              className={`px-5 py-3 cursor-pointer hover:bg-indigo-600/20 text-white transition-all hover:pl-7 font-medium ${
                index !== suggestions.length - 1 ? 'border-b border-gray-800/50' : ''
              }`}
            >
              {name}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
};

export default QuickPlayerSearch; 