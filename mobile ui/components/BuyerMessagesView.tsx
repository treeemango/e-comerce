import React, { useState, useEffect, useRef } from 'react';
import {
    getConversations,
    getConversationMessages,
    sendMessage,
    markMessagesRead
} from '../../lib/api';
import { Conversation, Message } from '../../types';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface BuyerMessagesViewProps {
    userId: string;
    onBack?: () => void;
    activeConversationId?: string | null;
}

export const BuyerMessagesView: React.FC<BuyerMessagesViewProps> = ({ userId, onBack, activeConversationId }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

    // Auto-select conversation based on prop
    useEffect(() => {
        if (activeConversationId && conversations.length > 0) {
            const target = conversations.find(c => c.id === activeConversationId);
            if (target && target.id !== selectedConversation?.id) {
                setSelectedConversation(target);
            }
        }
    }, [activeConversationId, conversations]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Message Input
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load & Real-time Global Updates (Conversations)
    useEffect(() => {
        loadConversations();

        // Subscribe to any changes in the buyer's conversations
        const channel = supabase
            .channel(`buyer-global:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversations',
                    filter: `buyer_id=eq.${userId}`
                },
                () => {
                    loadConversations();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    // Thread Subscription (Messages)
    useEffect(() => {
        if (!selectedConversation?.id) return;

        loadMessages(selectedConversation.id);
        markRead(selectedConversation.id);

        // Subscribe to new messages for this specific conversation
        const channel = supabase
            .channel(`conv:${selectedConversation.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${selectedConversation.id}`
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    setMessages(prev => {
                        // Avoid duplicates if we just sent it
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                    setShouldAutoScroll(true);

                    // Instant snippet update in list
                    setConversations(prev => prev.map(c =>
                        c.id === selectedConversation.id
                            ? { ...c, last_message: newMsg.content, last_message_at: newMsg.created_at }
                            : c
                    ));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedConversation?.id]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (shouldAutoScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            setShouldAutoScroll(false);
        }
    }, [messages, shouldAutoScroll]);

    const loadConversations = async () => {
        try {
            const data = await getConversations(userId);
            setConversations(data);
        } catch (error) {
            console.error('Failed to load conversations', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (convId: string, showLoading = true) => {
        if (showLoading) setLoadingMessages(true);
        try {
            const data = await getConversationMessages(convId);
            setMessages(data);
            setShouldAutoScroll(true);
        } catch (error) {
            console.error('Failed to load messages', error);
        } finally {
            if (showLoading) setLoadingMessages(false);
        }
    };

    const markRead = async (convId: string) => {
        try {
            await markMessagesRead(convId, userId);
            setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
        } catch (e) {
            console.error("Failed to mark read", e);
        }
    };

    const handleSend = async () => {
        if (!selectedConversation || !inputText.trim()) return;
        setSending(true);
        const text = inputText.trim();
        setInputText('');

        try {
            const receiverId = selectedConversation.seller_id === userId ? selectedConversation.buyer_id : selectedConversation.seller_id;

            const success = await sendMessage(
                selectedConversation.id,
                userId,
                receiverId,
                text
            );

            if (!success) {
                setInputText(text);
                alert('Failed to send');
            }
            // Note: Subscription will handle adding the message to UI
        } catch (error) {
            setInputText(text);
            alert('Error sending message');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (ts?: string) => {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return d.toLocaleDateString([], { weekday: 'short' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    if (!selectedConversation) {
        return (
            <div className="bg-white min-h-screen flex flex-col pb-20">
                <div className="bg-white px-5 pt-12 pb-4 sticky top-0 z-10 border-b border-gray-50 bg-white/80 backdrop-blur-md">
                    <div className="flex items-center gap-4 mb-4">
                        {onBack && (
                            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl active:scale-90 transition-all">
                                <span className="material-icons">arrow_back</span>
                            </button>
                        )}
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Messages</h2>
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Chat with Sellers ({conversations.filter(c => (c.unread_count || 0) > 0).length} Unread)</p>
                        </div>
                    </div>

                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-outlined text-gray-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Search sellers or products..."
                            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {loading ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="flex gap-4 p-4 rounded-2xl bg-gray-50 animate-pulse">
                                <div className="w-12 h-12 rounded-full bg-gray-200" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                                </div>
                            </div>
                        ))
                    ) : conversations.length === 0 ? (
                        <div className="text-center py-20 px-8">
                            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-icons text-orange-200 text-4xl">chat_bubble</span>
                            </div>
                            <h3 className="font-bold text-gray-900">No chats yet</h3>
                            <p className="text-sm text-gray-500 mt-2 text-balance leading-relaxed">
                                Chat with sellers directly from any product page to ask questions about items before you buy.
                            </p>
                        </div>
                    ) : (
                        conversations.map(conv => {
                            const unread = (conv.unread_count || 0) > 0;
                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv)}
                                    className={cn(
                                        "group flex gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98]",
                                        unread ? "bg-orange-50/40 border-orange-100 shadow-sm shadow-orange-500/5" : "bg-white border-gray-100 shadow-sm"
                                    )}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-100">
                                            {conv.other_user_avatar ? (
                                                <img src={conv.other_user_avatar} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-black text-xl bg-slate-50">
                                                    {(conv.other_user_name || 'S')[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {unread && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white ring-2 ring-orange-500/20" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={cn("text-sm font-black text-gray-900 truncate", unread ? "text-orange-600" : "")}>
                                                {conv.other_user_name || 'Seller'}
                                            </h3>
                                            <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap ml-2 uppercase tracking-tighter">
                                                {formatTime(conv.last_message_at)}
                                            </span>
                                        </div>

                                        {conv.product_title && (
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <span className="material-icons text-[10px] text-gray-400">shopping_bag</span>
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                                                    {conv.product_title}
                                                </span>
                                            </div>
                                        )}

                                        <p className={cn(
                                            "text-xs truncate leading-snug",
                                            unread ? "font-bold text-gray-800" : "text-gray-500 font-medium"
                                        )}>
                                            {conv.last_message || 'Start chatting...'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 fixed inset-0 z-[110]">
            <div className="bg-white/80 backdrop-blur-md px-4 pt-10 pb-3 border-b border-gray-100 flex items-center gap-3 shadow-sm z-10 sticky top-0">
                <button onClick={() => setSelectedConversation(null)} className="p-2 -ml-2 text-gray-900 active:scale-90 transition-all">
                    <span className="material-icons font-black">arrow_back</span>
                </button>
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 border border-gray-100 overflow-hidden flex-shrink-0">
                        {selectedConversation.other_user_avatar ? (
                            <img src={selectedConversation.other_user_avatar} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-black bg-slate-50">
                                {(selectedConversation.other_user_name || 'S')[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="font-black text-gray-900 text-sm truncate leading-tight">{selectedConversation.other_user_name || 'Seller'}</div>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest text-[8px]">Available</span>
                        </div>
                    </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                    <span className="material-icons-outlined">storefront</span>
                </button>
            </div>

            {selectedConversation.product_title && (
                <div className="bg-white px-4 py-2 border-b border-gray-50 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden border">
                        {selectedConversation.product_image ? (
                            <img src={selectedConversation.product_image} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <span className="material-icons text-xl">image</span>
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Inquiry About</div>
                        <div className="text-xs font-bold text-gray-900 truncate leading-tight">
                            {selectedConversation.product_title}
                        </div>
                    </div>
                    <button className="text-[10px] font-black text-white bg-black px-3 py-1.5 rounded-full uppercase tracking-tighter active:scale-95 transition-all">
                        View Product
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 pb-24 no-scrollbar">
                {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                        <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest">Loading history...</span>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((msg, idx) => {
                            const isMe = msg.sender_id === userId;
                            const showTime = idx === 0 || (new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 600000);

                            return (
                                <div key={msg.id} className="space-y-2">
                                    {showTime && (
                                        <div className="flex justify-center my-4">
                                            <span className="bg-gray-200/50 text-[9px] font-black text-gray-500 px-3 py-1 rounded-full uppercase tracking-widest">
                                                {formatTime(msg.created_at)}
                                            </span>
                                        </div>
                                    )}
                                    <div className={cn("flex w-full group", isMe ? "justify-end" : "justify-start")}>
                                        <div className={cn(
                                            "max-w-[85%] relative",
                                            isMe ? "items-end" : "items-start"
                                        )}>
                                            <div className={cn(
                                                "px-4 py-3 rounded-[1.25rem] text-sm leading-relaxed shadow-sm",
                                                isMe
                                                    ? "bg-orange-500 text-white rounded-br-none shadow-orange-500/10"
                                                    : "bg-white text-gray-800 border border-white rounded-bl-none shadow-slate-200/50"
                                            )}>
                                                {msg.content}
                                            </div>
                                            <div className={cn(
                                                "flex items-center gap-1 mt-1 px-1",
                                                isMe ? "justify-end" : "justify-start"
                                            )}>
                                                <span className="text-[10px] font-medium text-gray-400">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMe && (
                                                    <span className={cn("material-icons text-[14px]", msg.is_read ? 'text-[#34B7F1]' : 'text-gray-300')}>
                                                        {msg.is_read ? 'done_all' : 'check'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            <div className="p-4 bg-white/90 backdrop-blur-lg border-t border-gray-100 safe-area-bottom sticky bottom-0 z-20">
                <div className="flex items-end gap-3 rounded-2xl p-1">
                    <button className="w-10 h-10 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl active:scale-95 transition-all">
                        <span className="material-icons-outlined text-xl">image</span>
                    </button>
                    <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-2 flex items-end border border-gray-100 focus-within:border-black/10 transition-colors">
                        <textarea
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent max-h-32 min-h-[40px] py-2 focus:outline-none text-sm font-medium resize-none leading-relaxed text-gray-800"
                            rows={1}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || sending}
                        className={cn(
                            "w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-lg active:scale-90",
                            inputText.trim()
                                ? "bg-orange-500 text-white shadow-orange-500/20"
                                : "bg-gray-100 text-gray-300"
                        )}
                    >
                        {sending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="material-icons pl-0.5">send</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
