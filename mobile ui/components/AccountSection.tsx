import React from 'react';

interface AccountSectionProps {
  title: string;
  description?: string;
  onBack: () => void;
  children?: React.ReactNode;
  accent?: string;
}

export const AccountSection: React.FC<AccountSectionProps> = ({ title, description, onBack, children, accent = 'bg-primary/10 text-primary' }) => {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col pb-20">
      <header className="sticky top-0 z-40 bg-surface-light dark:bg-surface-dark shadow-sm">
        <div className="flex items-center gap-3 px-3 py-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <span className="material-icons-outlined text-black dark:text-white">arrow_back_ios_new</span>
          </button>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-black dark:text-white">{title}</span>
            {description && <span className="text-xs text-gray-500">{description}</span>}
          </div>
        </div>
      </header>

      <div className="p-3 flex flex-col gap-3">
        <div className={`rounded-xl p-3 text-sm font-semibold ${accent}`}>
          {description || `Manage your ${title.toLowerCase()}`}
        </div>
        {children}
      </div>
    </div>
  );
};
