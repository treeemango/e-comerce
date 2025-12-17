import React from 'react';

export const ValueProps: React.FC = () => {
  return (
    <div className="bg-[#FFF8F0] dark:bg-orange-900/10 px-4 py-2 flex items-center justify-between text-xs border-b border-orange-100 dark:border-orange-900/30">
      <div className="flex items-center gap-1 text-banner-green dark:text-green-400 font-bold whitespace-nowrap">
        <span className="material-icons-outlined text-base">check</span>
        Free shipping
      </div>
      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
      <div className="flex items-center gap-1 text-banner-green dark:text-green-400 font-bold overflow-hidden">
        <span className="material-icons-outlined text-base">check</span>
        <span className="truncate">Price adjustment within 30 days</span>
      </div>
      <span className="material-icons-outlined text-gray-400 text-sm ml-1">chevron_right</span>
    </div>
  );
};
