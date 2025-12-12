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
}

const SellerMessagesView: React.FC<SellerMessagesViewProps> = ({ sellerId }) => {
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
        conv.buyer_display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.product_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.order_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        filteredConversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedConversation(conv)}
                                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedConversation?.id === conv.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                                    }`}
                            >
                                {/* Buyer Info */}
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {conv.buyer_avatar_url ? (
                                            <img src={conv.buyer_avatar_url} alt={conv.buyer_display_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="material-icons text-gray-400">person</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-gray-900 truncate">
                                                {conv.buyer_display_name}
                                            </span>
                                            {conv.unread_count > 0 && (
                                                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                        </div>

                                        {/* Product/Order Context */}
                                        {conv.product_title && (
                                            <div className="text-xs text-gray-600 mb-1 truncate">
                                                <span className="material-icons text-xs align-middle mr-1">shopping_bag</span>
                                                {conv.product_title}
                                            </div>
                                        )}
                                        {conv.order_number && (
                                            <div className="text-xs text-gray-600 mb-1">
                                                <span className="material-icons text-xs align-middle mr-1">receipt</span>
                                                Order #{conv.order_number}
                                            </div>
                                        )}

                                        {/* Last Message */}
                                        <p className="text-sm text-gray-600 truncate">{conv.last_message}</p>
                                        <span className="text-xs text-gray-400 mt-1">{formatTimestamp(conv.last_message_at || conv.updated_at)}</span>
                                    </div>
                                </div>
                            </button>
                        ))
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
                                    {selectedConversation.buyer_avatar_url ? (
                                        <img src={selectedConversation.buyer_avatar_url} alt={selectedConversation.buyer_display_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-icons text-gray-400">person</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{selectedConversation.buyer_display_name}</h3>
                                    <p className="text-sm text-gray-600">{selectedConversation.buyer_email}</p>
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
                                            <p className="text-sm font-semibold text-orange-600">${selectedConversation.product_price.toFixed(2)}</p>
                                        )}
                                    </div>
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
                                                    {isSeller && message.is_read && (
                                                        <span className="material-icons text-xs text-blue-500">done_all</span>
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
