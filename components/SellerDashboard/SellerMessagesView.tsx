import React, { useState, useEffect } from 'react';
import {
    fetchSellerConversations,
    fetchSellerConversationMessages,
    sendSellerMessage,
    markSellerMessagesAsRead,
    getMessageAttachmentUrl
} from '@/lib/api';
import { SellerConversation, SellerMessage } from '@/types';

interface SellerMessagesViewProps {
    sellerId: string;
    onNavigate?: (tab: string) => void;
    initialConversationId?: string | null;
}

const SellerMessagesView: React.FC<SellerMessagesViewProps> = ({ sellerId, onNavigate, initialConversationId }) => {
    const [conversations, setConversations] = useState<SellerConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<SellerConversation | null>(null);
    const [messages, setMessages] = useState<SellerMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, [sellerId]);

    // Handle initial conversation selection
    useEffect(() => {
        if (!loading && initialConversationId && conversations.length > 0) {
            const conversation = conversations.find(c => c.id === initialConversationId);
            if (conversation) {
                setSelectedConversation(conversation);
            }
        }
    }, [loading, initialConversationId, conversations]);

    // Load messages when conversation is selected
    useEffect(() => {
        if (selectedConversation) {
            loadMessages(selectedConversation.id);
            markMessagesAsRead(selectedConversation.id);
        }
    }, [selectedConversation]);

    const loadConversations = async () => {
        setLoading(true);
        try {
            const data = await fetchSellerConversations(sellerId);
            setConversations(data);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };


    const loadMessages = async (conversationId: string) => {
        try {
            const data = await fetchSellerConversationMessages(conversationId, sellerId);
            setMessages(data);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const markMessagesAsRead = async (conversationId: string) => {
        try {
            await markSellerMessagesAsRead(conversationId, sellerId);
            // Update local state to reflect read status
            setConversations(prev =>
                prev.map(conv =>
                    conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
                )
            );
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedConversation || !messageInput.trim()) return;

        setSending(true);
        try {
            await sendSellerMessage(
                selectedConversation.id,
                sellerId,
                selectedConversation.buyer_id,
                messageInput.trim()
            );

            // Clear input
            setMessageInput('');

            // Reload messages
            await loadMessages(selectedConversation.id);

            // Refresh conversation list to update last message
            await loadConversations();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    const formatMessageTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const filteredConversations = conversations.filter(conv =>
        searchQuery === '' ||
        (String(
            (conv as any).buyer_display_name ||
            (conv as any).buyer_full_name ||
            (conv as any).buyer_name ||
            (conv as any).other_party_name ||
            (conv as any).other_user_name ||
            ''
        ).toLowerCase().includes(searchQuery.toLowerCase())) ||
        conv.product_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.order_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getBuyerDisplayName = (conv: any) => {
        if (conv?.subject === 'Support Request') {
            return 'Admin';
        }
        return (
            conv?.buyer_display_name ||
            conv?.buyer_full_name ||
            conv?.buyer_name ||
            conv?.other_party_name ||
            conv?.other_user_name ||
            'Unknown Buyer'
        );
    };

    const getBuyerAvatarUrl = (conv: any) => {
        if (conv?.subject === 'Support Request') {
            return null;
        }
        return conv?.buyer_avatar_url || conv?.buyer_avatar || conv?.other_user_avatar || null;
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Left Panel - Conversations List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-gray-500">Loading conversations...</div>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
                            <span className="material-icons text-6xl mb-4 text-gray-300">forum</span>
                            <p className="text-center">No conversations found</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-2">
                            {filteredConversations.map((conv) => {
                                const unread = (conv.unread_count || 0) > 0;
                                const selected = selectedConversation?.id === conv.id;
                                return (
                                    <button
                                        key={conv.id}
                                        onClick={() => setSelectedConversation(conv)}
                                        className={`w-full text-left p-4 rounded-2xl border transition-all ${selected ? 'border-orange-200 bg-orange-50/40' : (unread ? 'border-orange-100 bg-orange-50/30' : 'border-gray-100 bg-white')}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100">
                                                    {getBuyerAvatarUrl(conv) ? (
                                                        <img src={getBuyerAvatarUrl(conv)} alt={getBuyerDisplayName(conv)} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-black text-xl bg-slate-50">
                                                            {String(getBuyerDisplayName(conv) || 'B').slice(0, 1).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                {unread && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white ring-2 ring-orange-500/20" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3 mb-1">
                                                    <h3 className={`text-sm font-black truncate ${unread ? 'text-orange-600' : 'text-gray-900'}`}>
                                                        {getBuyerDisplayName(conv)}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap uppercase tracking-tighter">
                                                        {formatTimestamp(conv.last_message_at || conv.updated_at)}
                                                    </span>
                                                </div>

                                                {conv.product_title && (
                                                    <div className="flex items-center gap-1.5 mb-1.5">
                                                        <span className="material-icons text-[10px] text-gray-400">shopping_bag</span>
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[220px]">
                                                            {conv.product_title}
                                                        </span>
                                                    </div>
                                                )}

                                                <p className={`text-xs truncate leading-snug ${unread ? 'font-bold text-gray-800' : 'text-gray-500 font-medium'}`}>
                                                    {conv.last_message || 'Start chatting...'}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Message Thread */}
            <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                    <>
                        {/* Conversation Header */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {getBuyerAvatarUrl(selectedConversation) ? (
                                        <img src={getBuyerAvatarUrl(selectedConversation)} alt={getBuyerDisplayName(selectedConversation)} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-icons text-gray-400">person</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{getBuyerDisplayName(selectedConversation)}</h3>
                                    {selectedConversation.subject !== 'Support Request' && (
                                        <p className="text-sm text-gray-600">{(selectedConversation as any).buyer_email || ''}</p>
                                    )}
                                </div>
                            </div>

                            {/* Product/Order Context */}
                            {(selectedConversation.product_title || selectedConversation.order_number) && (
                                <div className="flex items-center gap-4 mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                    {selectedConversation.product_primary_image && (
                                        <img
                                            src={selectedConversation.product_primary_image}
                                            alt={selectedConversation.product_title}
                                            className="w-12 h-12 object-cover rounded"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        {selectedConversation.product_title && (
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {selectedConversation.product_title}
                                            </p>
                                        )}
                                        {selectedConversation.order_number && (
                                            <p className="text-xs text-gray-600">Order #{selectedConversation.order_number}</p>
                                        )}
                                        {selectedConversation.product_price && (
                                            <p className="text-sm font-semibold text-orange-600">
                                                KES {selectedConversation.product_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </p>
                                        )}
                                    </div>

                                    {selectedConversation.order_id && (
                                        <button
                                            type="button"
                                            onClick={() => onNavigate?.('orders')}
                                            className="ml-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
                                        >
                                            View Order
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <p>No messages yet</p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const isSeller = message.sender_id === sellerId;
                                    return (
                                        <div key={message.id} className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] ${isSeller ? 'order-2' : 'order-1'}`}>
                                                <div className={`rounded-lg px-4 py-2 ${isSeller
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-gray-100 text-gray-900'
                                                    }`}>
                                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

                                                    {/* Attachments */}
                                                    {message.attachments && message.attachments.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {message.attachments.map((attachment) => (
                                                                <a
                                                                    key={attachment.id}
                                                                    href={getMessageAttachmentUrl(attachment.storage_path)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={`flex items-center gap-2 p-2 rounded ${isSeller ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-200 hover:bg-gray-300'
                                                                        }`}
                                                                >
                                                                    <span className="material-icons text-sm">attach_file</span>
                                                                    <span className="text-xs truncate">{attachment.file_name}</span>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isSeller ? 'justify-end' : 'justify-start'}`}>
                                                    <span>{formatMessageTime(message.created_at)}</span>
                                                    {isSeller && (
                                                        <span className={`material-icons text-xs ${message.is_read ? 'text-blue-500' : 'text-gray-400'}`}>
                                                            {message.is_read ? 'done_all' : 'done'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Compose Area */}
                        <div className="p-4 border-t border-gray-200 bg-white">
                            <div className="flex items-end gap-2">
                                <textarea
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type your message..."
                                    rows={2}
                                    className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    disabled={sending}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim() || sending}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 h-[70px]"
                                >
                                    <span className="material-icons">send</span>
                                    <span>{sending ? 'Sending...' : 'Send'}</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <span className="material-icons text-8xl mb-4 text-gray-300">forum</span>
                        <p className="text-lg">Select a conversation to view messages</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SellerMessagesView;
