import React from 'react';

interface HeaderProps {
  onSearchClick?: () => void;
  onCameraClick?: () => void;
  onUserClick?: () => void;
  onNotificationClick?: () => void;
  userAvatar?: string | null;
  userName?: string | null;
  notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchClick,
  onCameraClick,
  onUserClick,
  onNotificationClick,
  userAvatar,
  userName,
  notificationCount = 0
}) => {
  return (
    <header className="bg-white dark:bg-black sticky top-0 z-40 transition-shadow duration-300">
      <div className="flex items-center justify-between px-4 py-3 gap-4 max-w-[520px] mx-auto">

        {/* User / Profile - Moved to left for modern apps like Temu/Shein flow */}
        <button
          className="relative flex-shrink-0 active:scale-95 transition-transform"
          onClick={onUserClick}
        >
          {userAvatar ? (
            <img src={userAvatar} alt={userName || 'User'} className="w-9 h-9 rounded-full border-2 border-gray-100 dark:border-gray-800 object-cover shadow-sm" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black border border-gray-100 dark:border-gray-700">
              {userName ? userName.slice(0, 2).toUpperCase() : <span className="material-icons-round text-xl text-gray-400">person</span>}
            </div>
          )}
        </button>

        {/* Search Bar - Unified */}
        <div
          className="flex-grow relative cursor-pointer group active:scale-[0.98] transition-all"
          onClick={onSearchClick}
        >
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <span className="material-icons-round text-gray-400 text-lg group-hover:text-primary transition-colors">search</span>
          </div>
          <div
            className="block w-full pl-10 pr-10 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-900 text-gray-400 text-[13px] font-medium select-none truncate"
          >
            Search Products
          </div>
          <button
            className="absolute inset-y-0 right-1 px-3 flex items-center"
            onClick={(e) => {
              e.stopPropagation();
              onCameraClick?.();
            }}
          >
            <span className="material-icons-round text-primary text-xl">photo_camera</span>
          </button>
        </div>

        {/* Notification Bell with Badge */}
        <button
          className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors active:scale-90"
          onClick={onNotificationClick}
        >
          <span className="material-icons-round text-gray-800 dark:text-white text-2xl">notifications_none</span>
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-black shadow-md animate-pulse">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
