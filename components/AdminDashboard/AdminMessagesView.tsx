import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminPermissions } from '@/types';
import { sendMessage } from '@/lib/api';

interface AdminMessagesViewProps {
    adminId: string;
    permissions: AdminPermissions;
}

interface AdminConversation {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    user_role: 'buyer' | 'seller' | 'admin';
    last_message?: string;
    last_message_at?: string;
    unread_count: number;
    created_at: string;
}

interface AdminMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
    sender_name?: string;
    sender_role?: string;
}

const AdminMessagesView: React.FC<AdminMessagesViewProps> = ({ adminId, permissions }) => {
    const [conversations, setConversations] = useState<AdminConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null);
    const [messages, setMessages] = useState<AdminMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, [adminId]);

    // Load messages when conversation is selected
    useEffect(() => {
        if (selectedConversation) {
            loadMessages(selectedConversation.id);
        }
    }, [selectedConversation]);

    const loadConversations = async () => {
        setLoading(true);
        try {
            // For admin messaging, we'll show conversations where admin is either seller or buyer
            // This allows admins to message any user in the system
            const { data: convs, error } = await supabase
                .from('admin_conversation_overview')
                .select(`
                    id,
                    seller_id,
                    buyer_id,
                    last_message,
                    last_message_at,
                    buyer_unread_count,
                    seller_unread_count,
                    buyer_full_name,
                    seller_display_name,
                    buyer_avatar_url,
                    seller_avatar_url,
                    product_title
                `)
                .or(`seller_id.eq.${adminId},buyer_id.eq.${adminId}`)
                .order('last_message_at', { ascending: false });

            if (error) throw error;

            // Transform to admin conversation format
            const adminConversations: AdminConversation[] = (convs || []).map((conv: any) => ({
                id: conv.id,
                user_id: conv.seller_id === adminId ? conv.buyer_id : conv.seller_id,
                user_name: conv.seller_id === adminId ? conv.buyer_full_name : conv.seller_display_name,
                user_email: '', // Would need separate query to get user emails
                user_role: conv.seller_id === adminId ? 'buyer' : 'seller',
                last_message: conv.last_message,
                last_message_at: conv.last_message_at,
                unread_count: (conv.seller_id === adminId ? conv.seller_unread_count : conv.buyer_unread_count) || 0,
                created_at: conv.last_message_at || new Date().toISOString()
            }));

            setConversations(adminConversations);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (conversationId: string) => {
        try {
            const { data: msgs, error } = await supabase
                .from('messages')
                .select(`
                    id,
                    conversation_id,
                    sender_id,
                    receiver_id,
                    content,
                    is_read,
                    created_at
                `)
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Transform to admin message format
            const adminMessages: AdminMessage[] = (msgs || []).map(msg => ({
                id: msg.id,
                conversation_id: msg.conversation_id,
                sender_id: msg.sender_id,
                receiver_id: msg.receiver_id,
                content: msg.content,
                is_read: msg.is_read,
                created_at: msg.created_at,
                sender_name: msg.sender_id === adminId ? 'Admin Support' : 'User',
                sender_role: msg.sender_id === adminId ? 'admin' : 'user'
            }));

            setMessages(adminMessages);

            // Mark messages as read
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('conversation_id', conversationId)
                .eq('receiver_id', adminId)
                .eq('is_read', false);

        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedConversation || !messageInput.trim()) return;

        setSending(true);
        try {
            // Use the existing sendMessage API function
            const success = await sendMessage(
                selectedConversation.id,
                adminId,
                selectedConversation.user_id,
                messageInput.trim()
            );

            if (!success) throw new Error('Failed to send message');

            setMessageInput('');

            // Reload messages
            await loadMessages(selectedConversation.id);

            // Refresh conversations
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
        conv.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-200px)] bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
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
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            <p className="text-center text-sm text-gray-400 mt-2">
                                Start a conversation by contacting users from other admin panels
                            </p>
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
                                        className={`w-full text-left p-4 rounded-2xl border transition-all ${selected ? 'border-blue-200 bg-blue-50/40' : (unread ? 'border-blue-100 bg-blue-50/30' : 'border-gray-100 bg-white')}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100">
                                                    <span className="font-black text-xl text-gray-600">
                                                        {conv.user_name?.charAt(0)?.toUpperCase() || 'U'}
                                                    </span>
                                                </div>
                                                {unread && (
                                                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full border-2 border-white ring-2 ring-blue-500/20" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3 mb-1">
                                                    <h3 className={`text-sm font-black truncate ${unread ? 'text-blue-600' : 'text-gray-900'}`}>
                                                        {conv.user_name || 'Unknown User'}
                                                    </h3>
                                                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap uppercase tracking-tighter">
                                                        {conv.last_message_at ? formatTimestamp(conv.last_message_at) : formatTimestamp(conv.created_at)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${conv.user_role === 'seller' ? 'bg-green-100 text-green-700' : conv.user_role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {conv.user_role}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">
                                                        {conv.user_email}
                                                    </span>
                                                </div>

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
                                    <span className="font-black text-lg text-gray-600">
                                        {selectedConversation.user_name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{selectedConversation.user_name || 'Unknown User'}</h3>
                                    <p className="text-sm text-gray-600">{selectedConversation.user_email}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedConversation.user_role === 'seller' ? 'bg-green-100 text-green-700' : selectedConversation.user_role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {selectedConversation.user_role}
                                </span>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((message) => {
                                    const isAdmin = message.sender_id === adminId;
                                    return (
                                        <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] ${isAdmin ? 'order-2' : 'order-1'}`}>
                                                <div className={`rounded-lg px-4 py-2 ${isAdmin
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 text-gray-900'
                                                    }`}>
                                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                                </div>
                                                <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                                    <span>{formatMessageTime(message.created_at)}</span>
                                                    {isAdmin && (
                                                        <span className={`material-icons text-xs ${message.is_read ? 'text-blue-300' : 'text-gray-400'}`}>
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
                                    className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={sending}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim() || sending}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 h-[70px]"
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
                        <p className="text-sm text-gray-400 mt-2">Choose a user from the list to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminMessagesView;
