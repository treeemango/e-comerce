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

    const loadSuggestionsThrottled = setTimeout(loadSuggestions, 300);
    return () => clearTimeout(loadSuggestionsThrottled);
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
    <div className="fixed inset-0 z-[60] bg-white dark:bg-black flex flex-col animate-premium-pop">
      {/* Search Header */}
      <div className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={onClose}
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-900 transition-colors"
        >
          <span className="material-icons-round text-gray-800 dark:text-white text-2xl">chevron_left</span>
        </button>

        <div className="flex-grow relative group">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-11 pr-12 py-3 rounded-2xl bg-gray-100 dark:bg-gray-900 border-none focus:ring-2 focus:ring-primary/20 text-sm font-medium text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
            placeholder="Search for items, brands..."
          />
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
            <span className="material-icons-round text-gray-400 text-xl group-focus-within:text-primary transition-colors">search</span>
          </div>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center"
            >
              <span className="material-icons-round text-gray-500 dark:text-gray-400 text-xs">close</span>
            </button>
          )}
        </div>

        <button
          onClick={() => query.trim() && onSearch(query)}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${query.trim() ? 'bg-primary text-white shadow-lg' : 'text-gray-400'}`}
        >
          Search
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto pb-8">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Live Suggestions */}
        {!loading && query.length >= 2 && suggestions.length > 0 && (
          <div className="mt-4 px-4">
            <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">Best Matches</h3>
            <div className="space-y-1">
              {suggestions.slice(0, 8).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSearchClick(item.keyword)}
                  className="flex items-center gap-4 p-3.5 rounded-2xl active:bg-gray-50 dark:active:bg-gray-950 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 group-active:scale-90 transition-transform">
                    <span className="material-icons-round text-xl">search</span>
                  </div>
                  <div className="flex-grow">
                    <span className="text-[15px] font-medium text-gray-800 dark:text-gray-200">{item.keyword}</span>
                  </div>
                  {item.search_count && item.search_count > 10 && (
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full uppercase">
                      Popular
                    </span>
                  )}
                  <span className="material-icons-round text-gray-300 dark:text-gray-700 text-xl">north_west</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Searched */}
        {!query && recentSearches.length > 0 && (
          <div className="mt-6 px-4">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">History</h3>
              <button className="text-[10px] font-bold text-primary active:opacity-60 transition-opacity">Clear All</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearchClick(item.keyword)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 active:scale-95 transition-all"
                >
                  <span className="material-icons-round text-gray-400 text-sm">history</span>
                  <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{item.keyword}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Tags */}
        {!query && popularSearches.length > 0 && (
          <div className="mt-8 px-4">
            <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 px-1">Trending Searches</h3>
            <div className="grid grid-cols-1 gap-2">
              {popularSearches.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSearchClick(item.keyword)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 font-black text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-grow">
                    <div className="text-[15px] font-bold text-gray-800 dark:text-gray-100">{item.keyword}</div>
                    <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                      {item.search_count} searches
                    </div>
                  </div>
                  <span className="material-icons-round text-orange-500 text-xl animate-pulse">trending_up</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

