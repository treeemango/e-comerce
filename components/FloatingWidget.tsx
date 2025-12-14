import React from 'react';

const FloatingWidget: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-center gap-3 z-40">
      {/* Rewards Button */}
      <button className="w-13 h-13 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center relative group">
        <span className="material-icons text-white text-2xl">redeem</span>
        <span className="absolute right-full mr-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-xs font-medium px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          Rewards
        </span>
      </button>

      {/* Support Agent Button */}
        <button className="w-12 h-12 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden relative group border-2 border-white dark:border-gray-800">
        <img 
          src="/support-agent.jpg.png" 
          alt="Customer Support Agent"
          className="w-full h-full object-cover object-center"
        />
        <span className="absolute right-full mr-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-xs font-medium px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          Support
        </span>
      </button>

      {/* Contact Us Button */}
      <button className="w-13 h-13 bg-gradient-to-br from-coral-400 to-coral-500 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center relative group" style={{ background: 'linear-gradient(135deg, #ff7e7e 0%, #ff6b6b 100%)' }}>
        <span className="material-icons text-white text-2xl">headset_mic</span>
        <span className="absolute right-full mr-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-xs font-medium px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          Contact
        </span>
      </button>

      {/* Contact Us Label */}
      <div className="text-center mt-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Contact<br/>Us</span>
      </div>
    </div>
  );
};

export default FloatingWidget;