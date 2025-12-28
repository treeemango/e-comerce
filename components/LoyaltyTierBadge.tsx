import React from 'react';
import { LoyaltyProfile } from '../types';
import { OrderPrice } from './OrderPrice';
import './LoyaltyTierBadge.css';

interface LoyaltyTierBadgeProps {
    loyaltyProfile: LoyaltyProfile;
    size?: 'small' | 'medium' | 'large';
    showPoints?: boolean;
}

const LoyaltyTierBadge: React.FC<LoyaltyTierBadgeProps> = ({
    loyaltyProfile,
    size = 'medium',
    showPoints = true
}) => {
    const getTierConfig = (tier: string) => {
        const configs = {
            'Bronze': {
                gradient: 'from-orange-800 via-orange-600 to-orange-700',
                icon: '🥉',
                textColor: 'text-orange-100'
            },
            'Silver': {
                gradient: 'from-gray-400 via-gray-300 to-gray-400',
                icon: '🥈',
                textColor: 'text-gray-900'
            },
            'Gold': {
                gradient: 'from-yellow-600 via-yellow-400 to-yellow-500',
                icon: '🥇',
                textColor: 'text-yellow-900'
            },
            'Platinum': {
                gradient: 'from-purple-600 via-purple-400 to-purple-500',
                icon: '💎',
                textColor: 'text-purple-100'
            }
        };
        return configs[tier as keyof typeof configs] || configs['Bronze'];
    };

    const sizeClasses = {
        small: 'px-2 py-1 text-xs',
        medium: 'px-3 py-1.5 text-sm',
        large: 'px-4 py-2 text-base'
    };

    const config = getTierConfig(loyaltyProfile.current_tier);

    return (
        <div className="loyalty-tier-badge-container group relative inline-block">
            <div
                className={`loyalty-tier-badge bg-gradient-to-r ${config.gradient} ${sizeClasses[size]} ${config.textColor} font-bold rounded-full shadow-md flex items-center gap-2 cursor-pointer transition-transform hover:scale-105`}
            >
                <span className="tier-icon">{config.icon}</span>
                <span className="tier-name">{loyaltyProfile.current_tier}</span>
                {showPoints && (
                    <span className="points-badge bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                        {loyaltyProfile.loyalty_points.toLocaleString()} pts
                    </span>
                )}
            </div>

            {/* Tooltip on hover */}
            <div className="loyalty-tooltip absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                        <div className="font-bold">{loyaltyProfile.current_tier} Member</div>
                        <div className="text-gray-300">
                            {loyaltyProfile.loyalty_points.toLocaleString()} Points
                        </div>
                        <div className="text-gray-300">
                            <OrderPrice amount={loyaltyProfile.lifetime_spend} currency="USD" /> Lifetime Spend
                        </div>
                    </div>
                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                        <div className="border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoyaltyTierBadge;
