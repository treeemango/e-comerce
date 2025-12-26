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

  // Keep haptic feedback opt-in to real user activation to avoid browser blocking warnings
  const triggerHaptic = () => {
    if ('vibrate' in navigator && navigator.userActivation?.isActive) {
      navigator.vibrate(10);
    }
  };

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
    triggerHaptic();

    onTabChange(tabName);
  };

  const getTabClass = (tabName: string) => {
    const isActive = activeTab === tabName;
    return `relative flex flex-col items-center gap-1 w-1/5 py-2 px-1 cursor-pointer transition-all duration-300 rounded-xl overflow-hidden ${isActive
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
      className="fixed bottom-3 left-4 right-4 z-50 animate-in slide-in-from-bottom-8 duration-700"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-[420px] mx-auto glass rounded-[32px] shadow-premium p-2 flex items-center justify-around translate-y-[-env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={(e) => handleTabClick(tab.id, e)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 min-w-[64px] transition-all duration-300 ${isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                }`}
            >
              {/* Active Background Glow */}
              {isActive && (
                <div className="absolute inset-x-1 inset-y-1 bg-primary/10 rounded-2xl animate-in fade-in zoom-in duration-300" />
              )}

              <div className="relative">
                <span className={`material-icons-round text-2xl transition-all duration-300 ${isActive ? 'scale-110 -translate-y-0.5' : 'scale-100'
                  }`}>
                  {tab.icon}
                </span>

                {tab.badge && (
                  <span className={`absolute -top-1.5 -right-1.5 bg-price-red text-white text-[9px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white dark:border-surface-dark shadow-sm transition-all duration-300 ${isActive ? 'scale-110' : ''
                    }`}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 font-black uppercase tracking-widest transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 h-0 hidden'
                }`}>
                {tab.label}
              </span>

              {/* Dot Indicator */}
              {isActive && (
                <div className="absolute -bottom-1.5 w-1 h-1 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
