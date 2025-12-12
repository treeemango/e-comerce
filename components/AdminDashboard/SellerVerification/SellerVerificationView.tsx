import React, { useEffect, useState } from 'react';
import { fetchPendingSellerVerifications, approveSeller, rejectSeller, hasResourcePermission } from '@/lib/api';
import type { SellerVerificationRequest, AdminPermissions } from '@/types';

interface VerificationCardProps {
    request: SellerVerificationRequest;
    onApprove: (sellerId: string) => void;
    onReject: (sellerId: string, reason: string) => void;
    canApprove: boolean;
    canReject: boolean;
}

const VerificationCard: React.FC<VerificationCardProps> = ({
    request,
    onApprove,
    onReject,
    canApprove,
    canReject
}) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const handleReject = () => {
        if (rejectionReason.trim()) {
            onReject(request.user_id, rejectionReason);
            setShowRejectModal(false);
            setRejectionReason('');
        }
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <i className="fas fa-store text-blue-600 text-xl"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{request.business_name}</h3>
                                <p className="text-sm text-gray-500">{request.business_email}</p>
                            </div>
                        </div>
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                            Pending
                        </span>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                            <i className="fas fa-phone mt-1 w-4"></i>
                            <span>{request.business_phone || 'No phone provided'}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                            <i className="fas fa-map-marker-alt mt-1 w-4"></i>
                            <span>{request.business_address || 'No address provided'}</span>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                            <i className="fas fa-calendar mt-1 w-4"></i>
                            <span>Applied: {new Date(request.submitted_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Documents Section - Placeholder for now */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Documents</h4>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer">
                                <i className="fas fa-file-pdf"></i>
                                <span>Business License</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {canApprove && (
                            <button
                                onClick={() => onApprove(request.user_id)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-check"></i>
                                <span>Approve</span>
                            </button>
                        )}
                        {canReject && (
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-times"></i>
                                <span>Reject</span>
                            </button>
                        )}
                        {!canApprove && !canReject && (
                            <div className="w-full text-center text-gray-400 text-sm py-2 bg-gray-50 rounded-lg">
                                Read Only
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reject Application</h2>
                        <p className="text-gray-600 mb-4">Please provide a reason for rejecting this seller application:</p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            rows={4}
                            placeholder="Enter rejection reason..."
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!rejectionReason.trim()}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

interface SellerVerificationViewProps {
    permissions?: AdminPermissions;
}

const SellerVerificationView: React.FC<SellerVerificationViewProps> = ({ permissions }) => {
    const [requests, setRequests] = useState<SellerVerificationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const data = await fetchPendingSellerVerifications();
            setRequests(data);
            setError(null);
        } catch (err) {
            console.error('Error loading verification requests:', err);
            setError('Failed to load verification requests');
        } finally {
            setLoading(false);
        }
    };

    const canApprove = hasResourcePermission(permissions?.permissions, 'sellers', 'verify');
    const canReject = hasResourcePermission(permissions?.permissions, 'sellers', 'delete');

    const handleApprove = async (sellerId: string) => {
        try {
            const adminId = 'current-admin-id'; // TODO: Get from auth context
            const success = await approveSeller(sellerId, adminId);

            if (success) {
                setRequests(requests.filter(r => r.user_id !== sellerId));
            } else {
                setError('Failed to approve seller');
            }
        } catch (err) {
            console.error('Error approving seller:', err);
            setError('Failed to approve seller');
        }
    };

    const handleReject = async (sellerId: string, reason: string) => {
        try {
            const adminId = 'current-admin-id'; // TODO: Get from auth context
            const success = await rejectSeller(sellerId, adminId, reason);

            if (success) {
                setRequests(requests.filter(r => r.user_id !== sellerId));
            } else {
                setError('Failed to reject seller');
            }
        } catch (err) {
            console.error('Error rejecting seller:', err);
            setError('Failed to reject seller');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Seller Verification</h1>
                    <p className="text-gray-600 mt-1">{requests.length} pending applications</p>
                </div>
                <button
                    onClick={loadRequests}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <i className="fas fa-sync-alt"></i>
                    <span>Refresh</span>
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <i className="fas fa-exclamation-circle text-red-500"></i>
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {requests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <i className="fas fa-check-circle text-green-500 text-5xl mb-4"></i>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No pending seller verifications to review.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requests.map(request => (
                        <VerificationCard
                            key={request.id}
                            request={request}
                            onApprove={handleApprove}
                            onReject={handleReject}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SellerVerificationView;
