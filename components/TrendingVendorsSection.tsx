import React, { useState, useEffect } from 'react';
import { TrendingVendor } from '../types';
import { fetchTrendingVendors, toggleFollowVendor } from '../lib/api';
import './TrendingVendorsSection.css';

interface TrendingVendorsSectionProps {
    userId?: string;
    limit?: number;
}

const TrendingVendorsSection: React.FC<TrendingVendorsSectionProps> = ({
    userId,
    limit = 10
}) => {
    const [vendors, setVendors] = useState<TrendingVendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [followingStates, setFollowingStates] = useState<Map<string, boolean>>(new Map());

    useEffect(() => {
        loadTrendingVendors();
    }, [userId]);

    const loadTrendingVendors = async () => {
        setLoading(true);
        try {
            const data = await fetchTrendingVendors(userId, limit);
            setVendors(data);

            // Initialize following states
            const states = new Map<string, boolean>();
            data.forEach(vendor => {
                states.set(vendor.vendor.id, vendor.is_following);
            });
            setFollowingStates(states);
        } catch (error) {
            console.error('Error loading trending vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async (vendorId: string) => {
        if (!userId) {
            alert('Please sign in to follow vendors');
            return;
        }

        // Optimistic update
        setFollowingStates(prev => new Map(prev).set(vendorId, !prev.get(vendorId)));

        try {
            const result = await toggleFollowVendor(userId, vendorId);
            if (result) {
                // Update actual state from server response
                setFollowingStates(prev => new Map(prev).set(vendorId, result.is_following));

                // Update vendor follower count
                setVendors(prevVendors =>
                    prevVendors.map(v =>
                        v.vendor.id === vendorId
                            ? {
                                ...v,
                                stats: { ...v.stats, follower_count: result.follower_count },
                                is_following: result.is_following
                            }
                            : v
                    )
                );
            }
        } catch (error) {
            console.error('Error  toggling follow:', error);
            // Revert optimistic update on error
            setFollowingStates(prev => new Map(prev).set(vendorId, !prev.get(vendorId)));
        }
    };

    if (loading) {
        return (
            <div className="trending-vendors-section">
                <div className="section-header">
                    <h2 className="section-title">✨ Trending Vendors {userId && '(For You)'}</h2>
                </div>
                <div className="vendors-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading trending vendors...</p>
                </div>
            </div>
        );
    }

    if (vendors.length === 0) {
        return null;
    }

    return (
        <div className="trending-vendors-section">
            <div className="section-header">
                <h2 className="section-title">
                    ✨ Trending Vendors {userId && <span className="personalized-badge">For You</span>}
                </h2>
                <p className="section-subtitle">
                    Discover great sellers with quality products and excellent service
                </p>
            </div>

            <div className="vendors-container">
                {vendors.map((item) => {
                    const { vendor, stats, is_following, reason } = item;
                    const isFollowing = followingStates.get(vendor.id) || false;

                    return (
                        <div key={vendor.id} className="vendor-card">
                            {/* Personalization reason badge */}
                            {reason && (
                                <div className="reason-badge">{reason}</div>
                            )}

                            {/* Vendor logo */}
                            <div className="vendor-logo-container">
                                {vendor.logo_url ? (
                                    <img
                                        src={vendor.logo_url}
                                        alt={vendor.business_name}
                                        className="vendor-logo"
                                    />
                                ) : (
                                    <div className="vendor-logo-placeholder">
                                        <span className="material-icons">storefront</span>
                                    </div>
                                )}
                                {vendor.is_verified && (
                                    <div className="verified-badge">
                                        <span className="material-icons">verified</span>
                                    </div>
                                )}
                            </div>

                            {/* Vendor info */}
                            <div className="vendor-info">
                                <h3 className="vendor-name">{vendor.business_name}</h3>
                                {vendor.business_description && (
                                    <p className="vendor-description">{vendor.business_description}</p>
                                )}

                                {/* Stats */}
                                <div className="vendor-stats">
                                    <div className="stat-item">
                                        <span className="material-icons">star</span>
                                        <span className="stat-value">{vendor.rating.toFixed(1)}</span>
                                        <span className="stat-label">({vendor.review_count})</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="material-icons">inventory_2</span>
                                        <span className="stat-value">{stats.product_count}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="material-icons">people</span>
                                        <span className="stat-value">{stats.follower_count.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Follow button */}
                            <button
                                className={`follow-button ${isFollowing ? 'following' : ''}`}
                                onClick={() => handleFollowToggle(vendor.id)}
                            >
                                <span className="material-icons">
                                    {isFollowing ? 'favorite' : 'favorite_border'}
                                </span>
                                <span>{isFollowing ? 'Following' : 'Follow'}</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TrendingVendorsSection;
