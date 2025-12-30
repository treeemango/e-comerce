import React, { useEffect, useState } from 'react';
import { createConversation, fetchPendingSellerVerifications, approveSeller, rejectSeller, hasResourcePermission, sendMessage, findConversationId } from '@/lib/api';
import type { SellerVerificationRequest, AdminPermissions, MediaItem } from '@/types';

// ==========================================
// Sub-components
// ==========================================

interface MediaGridProps {
    items: MediaItem[];
}

const MediaGrid: React.FC<MediaGridProps> = ({ items }) => {
    if (!items || items.length === 0) {
        return <p className="text-gray-500 text-sm italic">No documents uploaded.</p>;
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item, idx) => (
                <a
                    key={item.id || idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 transition-all flex flex-col"
                >
                    <div className="flex-1 relative overflow-hidden">
                        {item.type === 'image' ? (
                            <img src={item.url} alt={item.name || "Document"} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                                <i className={`fas fa-${item.type === 'video' ? 'video' : 'file-alt'} text-2xl`}></i>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-900 text-xs font-bold px-2 py-1 rounded shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                                View
                            </span>
                        </div>
                    </div>
                    {item.name && (
                        <div className="bg-white px-2 py-1.5 border-t border-gray-100 text-xs font-medium text-gray-700 truncate text-center">
                            {item.name}
                        </div>
                    )}
                </a>
            ))}
        </div>
    );
};

interface VerificationDetailsModalProps {
    request: SellerVerificationRequest;
    isOpen: boolean;
    onClose: () => void;
    onApprove: (id: string) => void;
    onReject: (id: string, reason: string) => void;
    isProcessing: boolean;
}

const VerificationDetailsModal: React.FC<VerificationDetailsModalProps> = ({
    request,
    isOpen,
    onClose,
    onApprove,
    onReject,
    isProcessing
}) => {
    const [activeTab, setActiveTab] = useState<'business' | 'financial' | 'documents'>('business');
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    if (!isOpen) return null;

    const tabs = [
        { id: 'business', label: 'Business Info', icon: 'business' },
        { id: 'financial', label: 'Financials', icon: 'payments' },
        { id: 'documents', label: 'Documents', icon: 'folder_open' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold text-gray-900">{request.business_name}</h2>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                Pending Review
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5">
                                <i className="material-icons text-base text-gray-400">email</i>
                                {request.business_email}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <i className="material-icons text-base text-gray-400">calendar_today</i>
                                Applied {new Date(request.submitted_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-100 hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label="Close"
                        type="button"
                    >
                        <i className="material-icons">close</i>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-8 border-b border-gray-100">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <i className="material-icons text-lg">{tab.icon}</i>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                    {activeTab === 'business' && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Contact Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Phone Number</label>
                                        <div className="text-sm font-medium text-gray-900">{request.business_phone || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Business Address</label>
                                        <div className="text-sm font-medium text-gray-900">{request.business_address || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Business Experience</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Years in Business</label>
                                        <div className="text-sm font-medium text-gray-900">{request.years_in_business ?? 'N/A'} Years</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Tax ID</label>
                                        <div className="text-sm font-medium text-gray-900">{request.tax_id || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Revenue & Operations</h3>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Estimated Monthly Revenue</label>
                                    <div className="text-lg font-bold text-gray-900">{request.monthly_revenue || 'Not provided'}</div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-10 -mt-10 opacity-50"></div>
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 relative z-10">Bank Details</h3>

                                {request.bank_details ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 relative z-10">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Bank Name</label>
                                            <div className="text-sm font-medium text-gray-900">{request.bank_details.bank_name}</div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Account Holder</label>
                                            <div className="text-sm font-medium text-gray-900">{request.bank_details.account_holder}</div>
                                        </div>
                                        <div className="md:col-span-2 pt-2 border-t border-dashed border-gray-200 mt-2">
                                            <label className="block text-xs text-gray-500 mb-1">Account Number</label>
                                            <div className="text-base font-mono font-medium text-gray-900 tracking-wider">
                                                {request.bank_details.account_number}
                                            </div>
                                        </div>
                                        {request.bank_details.routing_number && (
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Routing Number</label>
                                                <div className="text-sm font-medium text-gray-900">{request.bank_details.routing_number}</div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-gray-500 italic text-sm">No bank details provided.</div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Uploaded Documents</h3>
                            <MediaGrid items={request.documents || []} />
                        </div>
                    )}
                </div>

                {/* Footer / Actions */}
                <div className="px-8 py-5 border-t border-gray-100 bg-white flex justify-between items-center">
                    {showRejectInput ? (
                        <div className="flex-1 flex gap-3 animate-in fade-in slide-in-from-right-4 duration-200">
                            <input
                                type="text"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Reason for rejection..."
                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                autoFocus
                            />
                            <button
                                onClick={() => setShowRejectInput(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onReject(request.user_id, rejectReason)}
                                disabled={!rejectReason.trim() || isProcessing}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {isProcessing ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-3 w-full justify-end">
                            <button
                                onClick={() => setShowRejectInput(true)}
                                disabled={isProcessing}
                                className="px-6 py-2.5 border border-red-200 text-red-600 bg-white hover:bg-red-50 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-red-100"
                            >
                                Reject Application
                            </button>
                            <button
                                onClick={() => onApprove(request.user_id)}
                                disabled={isProcessing}
                                className="px-6 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium transition-colors shadow-sm focus:ring-2 focus:ring-green-500 focus:ring-offset-1 flex items-center gap-2"
                            >
                                <i className="material-icons text-sm">check</i>
                                {isProcessing ? 'Approving...' : 'Approve Application'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ==========================================
// Main Components
// ==========================================

interface VerificationCardProps {
    request: SellerVerificationRequest;
    onClick: () => void;
    onMessageSeller?: (request: SellerVerificationRequest) => void;
    canMessageSeller?: boolean;
}

const VerificationCard: React.FC<VerificationCardProps> = ({ request, onClick, onMessageSeller, canMessageSeller }) => {
    return (
        <div
            onClick={onClick}
            className="group bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col h-full"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                        {request.business_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{request.business_name}</h3>
                        <p className="text-xs text-gray-500">{new Date(request.submitted_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {canMessageSeller && onMessageSeller && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMessageSeller(request);
                            }}
                            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-100 hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Message seller"
                            aria-label={`Message ${request.business_name}`}
                            type="button"
                        >
                            <i className="fas fa-comment-dots text-sm" />
                        </button>
                    )}
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                </div>
            </div>

            <div className="space-y-2 mt-auto">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <i className="material-icons text-gray-400 text-base">email</i>
                    <span className="truncate">{request.business_email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <i className="material-icons text-gray-400 text-base">attach_money</i>
                    <span className="truncate">{request.monthly_revenue || 'Rev. Not Provided'}</span>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>{request.documents?.length || 0} Documents</span>
                <span className="group-hover:translate-x-1 transition-transform text-blue-600 font-medium flex items-center">
                    Review <i className="material-icons text-sm ml-0.5">arrow_forward</i>
                </span>
            </div>
        </div>
    );
};

interface SellerVerificationViewProps {
    permissions?: AdminPermissions;
}

const SellerVerificationView: React.FC<SellerVerificationViewProps> = ({ permissions }) => {
    const [requests, setRequests] = useState<SellerVerificationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<SellerVerificationRequest | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [messageTarget, setMessageTarget] = useState<SellerVerificationRequest | null>(null);
    const [messageText, setMessageText] = useState('');
    const [messageSending, setMessageSending] = useState(false);

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

    const handleApprove = async (sellerId: string) => {
        try {
            setIsProcessing(true);
            const adminId = permissions?.user_id;
            if (!adminId) {
                alert('Admin ID not found. Please re-login.');
                return;
            }
            const success = await approveSeller(sellerId, adminId);

            if (success) {
                setRequests(prev => prev.filter(r => r.user_id !== sellerId));
                setSelectedRequest(null); // Close modal
            } else {
                alert('Failed to approve seller. Please try again.');
            }
        } catch (err) {
            console.error('Error approving seller:', err);
            alert('An error occurred while approving.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async (sellerId: string, reason: string) => {
        try {
            setIsProcessing(true);
            const adminId = permissions?.user_id;
            if (!adminId) {
                alert('Admin ID not found. Please re-login.');
                return;
            }
            const success = await rejectSeller(sellerId, adminId, reason);

            if (success) {
                // Automate rejection message
                try {
                    const existingConversationId = await findConversationId({
                        sellerId,
                        buyerId: adminId,
                        productId: null,
                        subject: 'Seller Verification'
                    });

                    const msg = `Your seller application has been rejected.\n\nReason: ${reason}`;
                    if (existingConversationId) {
                        await sendMessage(existingConversationId, adminId, sellerId, msg, {
                            context: 'seller_verification'
                        });
                    } else {
                        await createConversation(sellerId, adminId, undefined, 'Seller Verification', msg);
                    }
                } catch (msgErr) {
                    console.error('Failed to send rejection message:', msgErr);
                }

                setRequests(prev => prev.filter(r => r.user_id !== sellerId));
                setSelectedRequest(null); // Close modal
            } else {
                alert('Failed to reject seller. Please try again.');
            }
        } catch (err) {
            console.error('Error rejecting seller:', err);
            alert('An error occurred while rejecting.');
        } finally {
            setIsProcessing(false);
        }
    };

    const openMessageSeller = (request: SellerVerificationRequest) => {
        setMessageTarget(request);
        setMessageText('');
        setMessageModalOpen(true);
    };

    const handleSendQuickMessage = async () => {
        if (!messageTarget) return;
        const adminId = permissions?.user_id;
        const sellerId = messageTarget.user_id;
        const content = messageText.trim();

        if (!adminId) {
            setError('Admin ID not found');
            return;
        }
        if (!sellerId) {
            setError('Seller ID not found');
            return;
        }
        if (!content) return;

        setMessageSending(true);
        try {
            const existingConversationId = await findConversationId({
                sellerId,
                buyerId: adminId,
                productId: null,
                subject: 'Seller Verification'
            });

            let ok = false;
            if (existingConversationId) {
                ok = await sendMessage(existingConversationId, adminId, sellerId, content, {
                    context: 'seller_verification'
                });
            } else {
                const conversationId = await createConversation(
                    sellerId,
                    adminId,
                    undefined,
                    'Seller Verification',
                    content
                );
                ok = Boolean(conversationId);
            }

            if (!ok) throw new Error('Failed to send message');

            setMessageModalOpen(false);
            setMessageTarget(null);
            setMessageText('');
        } catch (err) {
            console.error('Error sending quick message:', err);
            alert('Failed to send message. Please try again.');
        } finally {
            setMessageSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Seller Verification</h1>
                    <p className="text-gray-500 mt-2">Review and verify new seller applications.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium border border-blue-100">
                        {requests.length} Pending
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <i className="material-icons text-red-500">error</i>
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <i className="material-icons text-green-500 text-3xl">check</i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
                    <p className="text-gray-500 max-w-sm text-center">There are no pending seller applications at this time.</p>
                    <button
                        onClick={loadRequests}
                        className="mt-6 text-blue-600 font-medium hover:text-blue-800 flex items-center gap-2"
                    >
                        <i className="material-icons text-sm">refresh</i>
                        Check again
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {requests.map(request => (
                        <VerificationCard
                            key={request.id}
                            request={request}
                            onClick={() => setSelectedRequest(request)}
                            onMessageSeller={openMessageSeller}
                            canMessageSeller={Boolean(permissions?.user_id)}
                        />
                    ))}
                </div>
            )}

            {/* Quick Message Modal */}
            {messageModalOpen && messageTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden">
                        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gray-50/60">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-blue-600 font-bold">Quick Message</p>
                                <h3 className="text-xl font-bold text-gray-900 mt-1">Message {messageTarget.business_name}</h3>
                                <p className="text-sm text-gray-600 mt-1">Seller verification application</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (messageSending) return;
                                    setMessageModalOpen(false);
                                    setMessageTarget(null);
                                    setMessageText('');
                                }}
                                className="h-11 w-11 rounded-xl border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-100 hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                type="button"
                                aria-label="Close"
                            >
                                <i className="material-icons">close</i>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                        e.preventDefault();
                                        if (!messageSending) handleSendQuickMessage();
                                    }
                                }}
                                className="w-full min-h-[140px] rounded-xl border border-gray-200 bg-white p-4 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Write a message to the seller…"
                            />

                            <div className="flex items-center justify-between gap-3">
                                <div className="text-xs text-gray-500">
                                    <span className="font-semibold">Tip:</span> Press <span className="font-mono">Ctrl</span>+<span className="font-mono">Enter</span> to send
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (messageSending) return;
                                            setMessageModalOpen(false);
                                            setMessageTarget(null);
                                            setMessageText('');
                                        }}
                                        className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                                        type="button"
                                        disabled={messageSending}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendQuickMessage}
                                        className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-60"
                                        type="button"
                                        disabled={messageSending || !messageText.trim()}
                                    >
                                        {messageSending ? 'Sending…' : 'Send'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Modal */}
            {selectedRequest && (
                <VerificationDetailsModal
                    request={selectedRequest}
                    isOpen={!!selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isProcessing={isProcessing}
                />
            )}
        </div>
    );
};

export default SellerVerificationView;
