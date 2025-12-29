import React, { useEffect, useState } from 'react';
import { useA2HS } from '../../hooks/useA2HS';

export const TopAppBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const a2hs = useA2HS();

  useEffect(() => {
    if (a2hs.isStandalone) {
      setIsVisible(false);
      return;
    }

    const dismissedAt = localStorage.getItem('a2hs_banner_dismissed_at');
    if (dismissedAt) {
      const ageMs = Date.now() - Number(dismissedAt);
      if (Number.isFinite(ageMs) && ageMs < 24 * 60 * 60 * 1000) {
        setIsVisible(false);
      }
    }
  }, [a2hs.isStandalone]);

  const shouldRender = isVisible && a2hs.canShowInstallEntry;
  if (!shouldRender) return null;

  return (
    <div className="relative bg-surface-light dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800 p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              localStorage.setItem('a2hs_banner_dismissed_at', String(Date.now()));
              setIsVisible(false);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <span className="material-icons-outlined text-sm">close</span>
          </button>
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-black text-xs leading-none">
            JuaExpress
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white">JuaExpress: Shop Like a Billionaire</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Add to Home Screen for faster access.</span>
          </div>
        </div>

        <button
          onClick={async () => {
            try {
              const outcome = await a2hs.promptInstall();
              if (outcome === 'accepted' || outcome === 'dismissed' || outcome === 'already-installed') {
                setIsVisible(false);
                return;
              }
              if (outcome === 'ios-instructions') {
                setShowIosHelp((v) => !v);
              }
            } catch (e) {
              console.error('A2HS prompt failed:', e);
            }
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs px-4 py-1.5 rounded-full transition-colors"
        >
          GET
        </button>
      </div>

      {a2hs.isIOSSafari && showIosHelp && (
        <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-300 px-2">
          On iPhone/iPad: tap Share, then “Add to Home Screen”.
        </div>
      )}
    </div>
  );
};
