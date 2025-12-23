import React from 'react';

interface HeaderProps {
  onSearchClick?: () => void;
  onUserClick?: () => void;
  userAvatar?: string | null;
  userName?: string | null;
  notificationCount?: number;
  cartCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchClick,
  onUserClick,
  userAvatar,
  userName,
  notificationCount = 0,
  cartCount = 0
}) => {
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
            {userAvatar ? (
              <img src={userAvatar} alt={userName || 'User'} className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold">
                {userName ? userName.slice(0, 2).toUpperCase() : <span className="material-icons text-lg">person</span>}
              </div>
            )}
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-white dark:border-surface-dark">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          <button className="relative p-1">
            <span className="material-icons-outlined text-2xl">shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-white dark:border-surface-dark">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
