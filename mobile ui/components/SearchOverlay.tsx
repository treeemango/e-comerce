import React, { useState } from 'react';
import { fetchSuggestions, fetchRecentSearches, fetchPopularSearches } from '@/lib/api';

interface SearchOverlayProps {
  onClose: () => void;
  onSearch: (query: string) => void;
}

interface SearchSuggestion {
  keyword: string;
  similarity_score?: number;
  search_count?: number;
}

interface PopularSearch {
  keyword: string;
  search_count: number;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ onClose, onSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<PopularSearch[]>([]);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [recent, popular] = await Promise.all([
          fetchRecentSearches(6),
          fetchPopularSearches(6)
        ]);
        setRecentSearches(recent);
        setPopularSearches(popular);
      } catch (error) {
        console.error('Error loading search data:', error);
      }
    };
    loadInitialData();
  }, []);

  React.useEffect(() => {
    const loadSuggestions = async () => {
      if (query.length >= 2) {
        setLoading(true);
        try {
          const results = await fetchSuggestions(query);
          setSuggestions(results);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setSuggestions([]);
      }
    };

    const debounce = setTimeout(loadSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query);
    }
  };

  const handleSearchClick = (searchTerm: string) => {
    onSearch(searchTerm);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-surface-dark flex flex-col animate-in fade-in duration-200">
      {/* Search Header */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <button
          onClick={onClose}
          className="text-gray-600 dark:text-gray-300 p-1 -ml-1"
        >
          <span className="material-icons-outlined text-2xl">arrow_back_ios_new</span>
        </button>

        <div className="flex-grow relative">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-4 pr-12 py-2 rounded-full border border-black dark:border-gray-600 focus:border-black focus:ring-0 text-sm bg-white dark:bg-black text-black dark:text-white placeholder-gray-400"
            placeholder="Search products..."
          />
          <button
            onClick={() => query.trim() && onSearch(query)}
            className="absolute right-[-1px] top-[-1px] bottom-[-1px] w-12 bg-black dark:bg-gray-700 rounded-r-full flex items-center justify-center"
          >
            <span className="material-icons-outlined text-white text-xl">search</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto">
        {/* Live Suggestions (when typing) */}
        {query.length >= 2 && suggestions.length > 0 && (
          <div className="mt-2">
            <div className="px-4 py-2">
              <h3 className="text-sm font-bold text-black dark:text-white">Suggestions</h3>
            </div>
            <div className="bg-white dark:bg-surface-dark">
              {suggestions.slice(0, 6).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSearchClick(item.keyword)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-none"
                >
                  <span className="material-icons-outlined text-gray-400 text-xl">search</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.keyword}</span>
                  {item.search_count && item.search_count > 10 && (
                    <span className="ml-auto text-xs text-gray-400">{item.search_count} searches</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Searched */}
        {!query && recentSearches.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between px-4 py-2">
              <h3 className="text-sm font-bold text-black dark:text-white">Recently searched</h3>
            </div>
            <div className="bg-white dark:bg-surface-dark">
              {recentSearches.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSearchClick(item.keyword)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-none"
                >
                  <span className="material-icons-outlined text-gray-400 text-xl">history</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.keyword}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Right Now */}
        {!query && popularSearches.length > 0 && (
          <div className="mt-4">
            <div className="px-4 py-2">
              <h3 className="text-sm font-bold text-black dark:text-white">Popular right now</h3>
            </div>
            <div className="bg-white dark:bg-surface-dark">
              {popularSearches.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSearchClick(item.keyword)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 cursor-pointer border-b border-gray-50 dark:border-gray-800 last:border-none"
                >
                  <span className="material-icons-outlined text-primary text-xl">trending_up</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.keyword}</span>
                  <span className="ml-auto text-xs text-gray-400">{item.search_count} searches</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

