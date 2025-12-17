import React, { useState } from 'react';

export const TopAppBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative bg-surface-light dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800 p-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <span className="material-icons-outlined text-sm">close</span>
        </button>
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-black text-xs leading-none">
          JuaExpress
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white">JuaExpress: Shop Like a Billionaire</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Shop incredible deals on JuaExpress!</span>
        </div>
      </div>
      <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs px-4 py-1.5 rounded-full transition-colors">
        GET
      </button>
    </div>
  );
};
