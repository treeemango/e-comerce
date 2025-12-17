import React, { useState, useEffect } from 'react';

interface BottomNavProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    cartCount?: number;
    notificationCount?: number;
}

interface Ripple {
    id: number;
    x: number;
    y: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  cartCount = 0,
  notificationCount = 0
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleTabClick = (tabName: string, e: React.MouseEvent | React.TouchEvent) => {
    // Create ripple effect
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    const newRipple: Ripple = {
      id: Date.now(),
      x,
      y
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);

    // Navigate with haptic feedback (if supported)
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    onTabChange(tabName);
  };

  const getTabClass = (tabName: string) => {
    const isActive = activeTab === tabName;
    return `relative flex flex-col items-center gap-1 w-1/5 py-2 px-1 cursor-pointer transition-all duration-300 rounded-xl overflow-hidden ${
      isActive
        ? 'text-primary transform scale-105'
        : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-primary dark:hover:text-primary active:scale-95'
    }`;
  };

  const tabs = [
    { id: 'home', icon: 'home', label: 'Home', badge: null },
    { id: 'categories', icon: 'category', label: 'Categories', badge: null },
    { id: 'you', icon: 'storefront', label: 'Seller', badge: null },
    { id: 'support', icon: 'support_agent', label: 'Support', badge: notificationCount > 0 ? notificationCount : null },
    { id: 'cart', icon: 'shopping_cart', label: 'Cart', badge: cartCount > 0 ? cartCount : null }
  ];

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] px-3 pb-safe z-50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="rounded-2xl bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08),0_10px_30px_rgba(0,0,0,0.12)] py-2">
        <div className="flex justify-around items-center text-[10px] relative">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={(e) => handleTabClick(tab.id, e)}
              onTouchStart={(e) => handleTabClick(tab.id, e)}
              className={getTabClass(tab.id)}
              aria-label={`${tab.label}${tab.badge ? ` (${tab.badge} items)` : ''}`}
              aria-pressed={activeTab === tab.id}
            >
              {/* Ripple Effects */}
              {ripples
                .filter(ripple => ripples.length > 0) // Only show ripples for this button if any exist
                .map((ripple) => (
                  <span
                    key={ripple.id}
                    className="absolute rounded-full bg-white/30 dark:bg-white/20 animate-ping"
                    style={{
                      left: ripple.x - 20,
                      top: ripple.y - 20,
                      width: 40,
                      height: 40,
                      animationDuration: '0.6s'
                    }}
                  />
                ))}

              {/* Icon Container */}
              <div className="relative">
                <span className={`material-icons-outlined text-xl transition-transform duration-200 ${
                  activeTab === tab.id ? 'scale-110' : ''
                }`}>
                  {tab.icon}
                </span>

                {/* Badge */}
                {tab.badge && (
                  <span className={`absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-sm transition-all duration-300 ${
                    activeTab === tab.id ? 'animate-bounce scale-110' : ''
                  }`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`font-medium transition-all duration-200 ${
                activeTab === tab.id ? 'font-semibold' : ''
              }`}>
                {tab.label}
              </span>

              {/* Active Indicator */}
              {activeTab === tab.id && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full animate-in slide-in-from-top duration-200" />
              )}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
