import React from 'react';

type VerificationLevel = 'unverified' | 'basic' | 'premium' | 'enterprise';

interface VerificationBadgeProps {
    level?: VerificationLevel;
    isVerified?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const BADGE_CONFIG: Record<VerificationLevel, {
    icon: string;
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    iconColor: string;
    description: string;
}> = {
    unverified: {
        icon: 'verified_user',
        label: 'Seller',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        textColor: 'text-gray-500 dark:text-gray-400',
        borderColor: 'border-gray-200 dark:border-gray-700',
        iconColor: 'text-gray-400',
        description: 'This seller has not completed verification'
    },
    basic: {
        icon: 'verified',
        label: 'Verified',
        bgColor: 'bg-blue-50 dark:bg-blue-900/30',
        textColor: 'text-blue-600 dark:text-blue-400',
        borderColor: 'border-blue-200 dark:border-blue-800',
        iconColor: 'text-blue-500',
        description: 'Verified seller with confirmed identity'
    },
    premium: {
        icon: 'workspace_premium',
        label: 'Pro Seller',
        bgColor: 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30',
        textColor: 'text-amber-700 dark:text-amber-400',
        borderColor: 'border-amber-300 dark:border-amber-700',
        iconColor: 'text-amber-500',
        description: 'Premium verified seller with excellent track record'
    },
    enterprise: {
        icon: 'diamond',
        label: 'Enterprise',
        bgColor: 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30',
        textColor: 'text-purple-700 dark:text-purple-400',
        borderColor: 'border-purple-300 dark:border-purple-700',
        iconColor: 'text-purple-500',
        description: 'Enterprise partner with full verification and priority support'
    }
};

const SIZE_CONFIG = {
    sm: {
        container: 'px-2 py-1 gap-1 rounded-lg',
        icon: 'text-sm',
        label: 'text-[10px]'
    },
    md: {
        container: 'px-3 py-1.5 gap-1.5 rounded-xl',
        icon: 'text-base',
        label: 'text-[11px]'
    },
    lg: {
        container: 'px-4 py-2 gap-2 rounded-2xl',
        icon: 'text-lg',
        label: 'text-xs'
    }
};

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
    level,
    isVerified,
    size = 'md',
    showLabel = true,
    className = ''
}) => {
    // Validate and determine the level based on props
    const validLevels: VerificationLevel[] = ['unverified', 'basic', 'premium', 'enterprise'];
    const isValidLevel = level && validLevels.includes(level as VerificationLevel);

    const resolvedLevel: VerificationLevel = isValidLevel
        ? (level as VerificationLevel)
        : (isVerified ? 'basic' : 'unverified');

    const config = BADGE_CONFIG[resolvedLevel] || BADGE_CONFIG.unverified;
    const sizeConfig = SIZE_CONFIG[size];

    const [showTooltip, setShowTooltip] = React.useState(false);

    return (
        <div className="relative inline-flex">
            <div
                className={`
          inline-flex items-center border font-black uppercase tracking-wider
          transition-all duration-200 cursor-default
          ${config.bgColor} ${config.textColor} ${config.borderColor}
          ${sizeConfig.container}
          ${className}
        `}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onTouchStart={() => setShowTooltip(true)}
                onTouchEnd={() => setTimeout(() => setShowTooltip(false), 2000)}
            >
                <span className={`material-icons ${config.iconColor} ${sizeConfig.icon}`}>
                    {config.icon}
                </span>
                {showLabel && (
                    <span className={sizeConfig.label}>{config.label}</span>
                )}
            </div>

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-gray-900 dark:bg-gray-800 text-white text-[11px] font-medium px-3 py-2 rounded-xl shadow-xl max-w-[200px] text-center">
                        {config.description}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Simple inline badge for tight spaces
export const VerificationIcon: React.FC<{
    level?: VerificationLevel;
    isVerified?: boolean;
    className?: string;
}> = ({ level, isVerified, className = '' }) => {
    const validLevels: VerificationLevel[] = ['unverified', 'basic', 'premium', 'enterprise'];
    const isValidLevel = level && validLevels.includes(level as VerificationLevel);

    const resolvedLevel: VerificationLevel = isValidLevel
        ? (level as VerificationLevel)
        : (isVerified ? 'basic' : 'unverified');

    const config = BADGE_CONFIG[resolvedLevel] || BADGE_CONFIG.unverified;

    if (resolvedLevel === 'unverified') return null;

    return (
        <span className={`material-icons ${config.iconColor} ${className}`}>
            {config.icon}
        </span>
    );
};

export default VerificationBadge;
