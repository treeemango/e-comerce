import React from 'react';

interface HeaderProps {
  onSearchClick?: () => void;
  onUserClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchClick, onUserClick }) => {
  return (
    <header className="bg-surface-light dark:bg-surface-dark shadow-sm pt-2">
      <div className="flex items-center justify-between px-3 py-2 gap-3">


        {/* Search Bar */}
        <div className="flex-grow relative cursor-pointer" onClick={onSearchClick}>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-icons-outlined text-gray-400 text-lg">search</span>
          </div>
          <div
            className="block w-full pl-9 pr-3 py-2 border-none rounded-md leading-5 bg-gray-100 dark:bg-gray-800 text-gray-500 sm:text-sm transition-shadow truncate select-none"
          >
            Search JuaExpress
          </div>
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            <span className="material-icons-outlined text-gray-400 text-lg">photo_camera</span>
          </div>
        </div>

        {/* Icons */}
        <div className="flex items-center gap-2 flex-shrink-0 text-gray-700 dark:text-gray-300">
          <button className="p-1">
            <span className="material-icons-outlined text-2xl">format_list_bulleted</span>
          </button>

          <button className="relative p-1" onClick={onUserClick}>
            <img src="https://i.pravatar.cc/100?img=5" alt="User" className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700" />
            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center border border-white dark:border-surface-dark">24</span>
          </button>

          <button className="relative p-1">
            <span className="material-icons-outlined text-2xl">shopping_cart</span>
            <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center border border-white dark:border-surface-dark">4</span>
          </button>
        </div>
      </div>
    </header>
  );
};
