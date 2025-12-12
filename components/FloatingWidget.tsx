import React from 'react';

const FloatingWidget: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
      <button className="bg-white dark:bg-slate-800 p-2.5 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 hover:scale-105 transition-transform group flex items-center justify-center relative">
        <span className="material-icons text-slate-600 dark:text-slate-300">chat_bubble_outline</span>
        <span className="absolute right-full mr-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Messages</span>
      </button>
      
      <button className="bg-white dark:bg-slate-800 p-2.5 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 hover:scale-105 transition-transform group flex items-center justify-center relative">
        <span className="material-icons text-slate-600 dark:text-slate-300">rate_review</span>
        <span className="absolute right-full mr-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Feedback</span>
      </button>

      <button 
        onClick={scrollToTop}
        className="bg-white dark:bg-slate-800 p-2.5 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 hover:scale-105 transition-transform group flex items-center justify-center relative"
      >
        <span className="material-icons text-slate-600 dark:text-slate-300">arrow_upward</span>
        <span className="absolute right-full mr-2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Top</span>
      </button>
    </div>
  );
};

export default FloatingWidget;