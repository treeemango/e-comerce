import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { AdminPermissions } from '@/types';
import { getUsersLastSeen, sendMessage, touchUserLastSeen } from '@/lib/api';
import { getMessageAttachments, uploadMessageAttachment, type MessageAttachment } from '@/lib/attachments-api';

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
    metadata?: any;
}

const AdminMessagesView: React.FC<AdminMessagesViewProps> = ({ adminId, permissions }) => {
    const [conversations, setConversations] = useState<AdminConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null);
    const [messages, setMessages] = useState<AdminMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [otherLastSeenAt, setOtherLastSeenAt] = useState<string | null>(null);

    const [resolvedProductImages, setResolvedProductImages] = useState<Map<string, string>>(new Map());

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [messageAttachments, setMessageAttachments] = useState<Map<string, MessageAttachment[]>>(new Map());

    const messageAttachmentsRef = useRef<Map<string, MessageAttachment[]>>(new Map());
    const attachmentFetchTimeoutsRef = useRef<number[]>([]);
    const attachmentRetryActiveRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        messageAttachmentsRef.current = messageAttachments;
    }, [messageAttachments]);

    const openProduct = (productId?: string | null) => {
        if (!productId) return;
        window.dispatchEvent(
            new CustomEvent('juax:notification-action', {
                detail: { target: 'product', id: String(productId) }
            })
        );
    };

    const getMessageProductRef = (metadata: any): { id: string; title?: string; image?: string } | null => {
        const m = metadata ?? {};
        const id =
            m.product_id ??
            m.productId ??
            m.productID ??
            m.product?.id ??
            m.product?.product_id ??
            null;
        if (!id) return null;

        const fallbackImage = resolvedProductImages.get(String(id));
        return {
            id: String(id),
            title: m.product_title ?? m.productTitle ?? m.product?.title ?? m.product?.name ?? undefined,
            image: m.product_image ?? m.productImage ?? m.product?.image ?? m.product?.primary_image ?? fallbackImage ?? undefined
        };
    };

    // Best-effort: resolve product images for cards when metadata lacks a thumbnail.
    useEffect(() => {
        const missingIds: string[] = [];

        for (const msg of messages) {
            const md = (msg as any)?.metadata ?? {};
            const id =
                md.product_id ??
                md.productId ??
                md.productID ??
                md.product?.id ??
                md.product?.product_id ??
                null;
            if (!id) continue;
            const pid = String(id);

            const hasImage = Boolean(md.product_image ?? md.productImage ?? md.product?.image ?? md.product?.primary_image);
            if (hasImage) continue;
            if (resolvedProductImages.has(pid)) continue;

            missingIds.push(pid);
        }

        const unique = Array.from(new Set(missingIds)).slice(0, 6);
        if (unique.length === 0) return;

        let cancelled = false;
        void (async () => {
            for (const pid of unique) {
                try {
                    const { data, error } = await supabase
                        .from('media')
                        .select('image_url, is_main, position, created_at')
                        .eq('product_id', pid)
                        .order('is_main', { ascending: false })
                        .order('position', { ascending: true, nullsFirst: false })
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (cancelled) return;
                    if (error) continue;

                    const url = (data as any)?.[0]?.image_url || null;
                    if (!url) continue;

                    setResolvedProductImages(prev => {
                        if (prev.has(pid)) return prev;
                        const next = new Map(prev);
                        next.set(pid, String(url));
                        return next;
                    });
                } catch {
                    // ignore
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [messages, resolvedProductImages]);

    const fetchAttachmentsWithRetry = (messageId: string) => {
        if (!messageId) return;
        if (messageAttachmentsRef.current.has(messageId)) return;
        if (attachmentRetryActiveRef.current.has(messageId)) return;

        attachmentRetryActiveRef.current.add(messageId);

        const delaysMs = [300, 800, 1500, 2500, 4000];

        const attempt = (idx: number) => {
            const delay = delaysMs[idx];
            if (delay == null) {
                attachmentRetryActiveRef.current.delete(messageId);
                return;
            }

            const t = window.setTimeout(async () => {
                if (messageAttachmentsRef.current.has(messageId)) {
                    attachmentRetryActiveRef.current.delete(messageId);
                    return;
                }

                try {
                    const attachments = await getMessageAttachments(messageId);
                    if (attachments.length > 0) {
                        setMessageAttachments(prevMap => {
                            if (prevMap.has(messageId)) return prevMap;
                            const next = new Map(prevMap);
                            next.set(messageId, attachments);
                            return next;
                        });
                        attachmentRetryActiveRef.current.delete(messageId);
                        return;
                    }
                } catch {
                    // ignore
                }

                attempt(idx + 1);
            }, delay);

            attachmentFetchTimeoutsRef.current.push(t);
        };

        attempt(0);
    };

    const isOnlineFromLastSeen = (ts: string | null): boolean => {
        if (!ts) return false;
        const t = new Date(ts).getTime();
        if (!Number.isFinite(t)) return false;
        return Date.now() - t <= 2 * 60 * 1000;
    };

    const formatLastSeen = (ts: string | null): string => {
        if (!ts) return 'Offline';
        const t = new Date(ts).getTime();
        if (!Number.isFinite(t)) return 'Offline';
        const diffMs = Date.now() - t;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Last seen just now';
        if (diffMin < 60) return `Last seen ${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `Last seen ${diffHr}h ago`;
        const diffDay = Math.floor(diffHr / 24);
        if (diffDay === 1) return 'Last seen yesterday';
        if (diffDay < 7) return `Last seen ${diffDay}d ago`;
        return `Last seen ${new Date(ts).toLocaleDateString()}`;
    };

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, [adminId]);

    // Keep our last_seen updated while this view is mounted
    useEffect(() => {
        let cancelled = false;
        const touch = async () => {
            try {
                await touchUserLastSeen();
            } catch {
                // ignore
            }
        };
        void touch();
        const interval = setInterval(() => {
            if (!cancelled) void touch();
        }, 30_000);

        const onVisible = () => {
            if (document.visibilityState === 'visible') void touch();
        };
        window.addEventListener('focus', touch);
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener('focus', touch);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    // Load messages when conversation is selected
    useEffect(() => {
        if (selectedConversation) {
            loadMessages(selectedConversation.id);
        }
    }, [selectedConversation]);

    // Subscribe to new messages for the selected conversation (keeps admin inbox live)
    useEffect(() => {
        if (!selectedConversation?.id) return;
        let cancelled = false;

        const channel = supabase
            .channel(`admin-conv:${selectedConversation.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${selectedConversation.id}`
                },
                (payload) => {
                    const newMsg = payload.new as any;
                    const msgId = String(newMsg?.id ?? '');
                    if (!msgId) return;

                    setMessages(prev => {
                        if (prev.some(m => String(m.id) === msgId)) return prev;
                        const mapped: AdminMessage = {
                            id: msgId,
                            conversation_id: String(newMsg.conversation_id),
                            sender_id: String(newMsg.sender_id),
                            receiver_id: String(newMsg.receiver_id),
                            content: String(newMsg.content ?? ''),
                            is_read: Boolean(newMsg.is_read),
                            created_at: String(newMsg.created_at),
                            metadata: (newMsg as any).metadata,
                            sender_name: String(newMsg.sender_id) === adminId ? 'Admin Support' : 'User',
                            sender_role: String(newMsg.sender_id) === adminId ? 'admin' : 'user'
                        };
                        return [...prev, mapped];
                    });

                    if (!cancelled) fetchAttachmentsWithRetry(msgId);
                }
            )
            .subscribe();

        return () => {
            cancelled = true;
            for (const t of attachmentFetchTimeoutsRef.current) {
                try { window.clearTimeout(t); } catch { /* ignore */ }
            }
            attachmentFetchTimeoutsRef.current = [];
            supabase.removeChannel(channel);
        };
    }, [selectedConversation?.id]);

    // Poll other user's last_seen while a conversation is open
    useEffect(() => {
        const otherUserId = selectedConversation?.user_id ? String(selectedConversation.user_id) : null;
        if (!otherUserId) {
            setOtherLastSeenAt(null);
            return;
        }

        let cancelled = false;
        const fetchLastSeen = async () => {
            try {
                const map = await getUsersLastSeen([otherUserId]);
                const ts = map[otherUserId] ?? null;
                if (!cancelled) setOtherLastSeenAt(ts);
            } catch {
                // ignore
            }
        };

        void fetchLastSeen();
        const interval = setInterval(() => {
            if (!cancelled) void fetchLastSeen();
        }, 20_000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [selectedConversation?.id]);

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
                    created_at,
                    metadata
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
                metadata: (msg as any).metadata,
                sender_name: msg.sender_id === adminId ? 'Admin Support' : 'User',
                sender_role: msg.sender_id === adminId ? 'admin' : 'user'
            }));

            setMessages(adminMessages);

            // Best-effort: fetch attachments for newest messages. If a message is recent and attachments
            // aren't visible yet, retry briefly (sender uploads can finish after initial fetch).
            const nowMs = Date.now();
            const recentThresholdMs = 10 * 60 * 1000;

            const idsToFetch = adminMessages
                .slice(-30)
                .map(m => ({ id: String(m.id), createdAtMs: new Date(String(m.created_at)).getTime() }))
                .filter(x => x.id && !messageAttachmentsRef.current.has(x.id));

            for (const { id, createdAtMs } of idsToFetch) {
                try {
                    const atts = await getMessageAttachments(id);
                    if (atts.length > 0) {
                        setMessageAttachments(prev => new Map(prev).set(id, atts));
                    } else if (Number.isFinite(createdAtMs) && nowMs - createdAtMs <= recentThresholdMs) {
                        fetchAttachmentsWithRetry(id);
                    }
                } catch {
                    if (Number.isFinite(createdAtMs) && nowMs - createdAtMs <= recentThresholdMs) {
                        fetchAttachmentsWithRetry(id);
                    }
                }
            }

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
        if (!selectedConversation) return;
        const text = messageInput.trim();
        const filesToUpload = [...selectedFiles];
        if (!text && filesToUpload.length === 0) return;

        setSending(true);
        try {
            // Use the existing sendMessage API function
            const correlationId = `cid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const contentToSend = text || 'Attachment';

            // If this thread already has product context in any prior message metadata,
            // carry it forward so the product card stays visible in admin replies.
            const lastProduct = [...messages]
                .reverse()
                .map(m => getMessageProductRef((m as any)?.metadata))
                .find(Boolean) as { id: string; title?: string; image?: string } | undefined;

            const lastProductImage = lastProduct?.id
                ? (lastProduct.image || resolvedProductImages.get(String(lastProduct.id)) || undefined)
                : (lastProduct?.image || undefined);

            const messageMetadata = {
                correlationId,
                ...(lastProduct ? { product_id: lastProduct.id, product_title: lastProduct.title, product_image: lastProductImage } : {})
            };

            const success = await sendMessage(selectedConversation.id, adminId, selectedConversation.user_id, contentToSend, messageMetadata);

            if (!success) throw new Error('Failed to send message');

            setMessageInput('');
            setSelectedFiles([]);

            // Reload messages
            await loadMessages(selectedConversation.id);

            // Upload attachments after we can identify the message id
            const fresh = await supabase
                .from('messages')
                .select('id, sender_id, content, created_at, metadata')
                .eq('conversation_id', selectedConversation.id)
                .order('created_at', { ascending: false })
                .limit(15);

            const sent = (fresh.data || []).find((m: any) => {
                const cid = m?.metadata?.correlationId;
                if (cid && cid === correlationId) return true;
                if (m?.sender_id === adminId && m?.content === contentToSend) return true;
                return false;
            });

            if (sent?.id && filesToUpload.length > 0) {
                await Promise.all(filesToUpload.map(file => uploadMessageAttachment(String(sent.id), file)));
                const atts = await getMessageAttachments(String(sent.id));
                if (atts.length > 0) {
                    setMessageAttachments(prev => new Map(prev).set(String(sent.id), atts));
                } else {
                    // Upload might complete after DB row becomes visible; retry briefly.
                    fetchAttachmentsWithRetry(String(sent.id));
                }
            }

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
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-2 h-2 rounded-full ${isOnlineFromLastSeen(otherLastSeenAt) ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                        <span className={`text-xs font-semibold ${isOnlineFromLastSeen(otherLastSeenAt) ? 'text-emerald-600' : 'text-gray-500'}`}>
                                            {isOnlineFromLastSeen(otherLastSeenAt) ? 'Online' : formatLastSeen(otherLastSeenAt)}
                                        </span>
                                    </div>
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
                                    const atts = messageAttachments.get(String(message.id)) || [];
                                    const productRef = getMessageProductRef((message as any)?.metadata);
                                    return (
                                        <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] ${isAdmin ? 'order-2' : 'order-1'}`}>
                                                <div className={`rounded-lg px-4 py-2 ${isAdmin
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 text-gray-900'
                                                    }`}>
                                                    {productRef && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openProduct(productRef.id)}
                                                            className={`w-full mb-2 text-left rounded-lg border overflow-hidden ${isAdmin ? 'border-white/30 bg-white/10 hover:bg-white/15' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                                        >
                                                            <div className="flex items-center gap-3 p-3">
                                                                <div className={`w-12 h-12 rounded-md overflow-hidden flex-shrink-0 ${isAdmin ? 'bg-white/15' : 'bg-gray-100'}`}>
                                                                    {productRef.image ? (
                                                                        <img src={productRef.image} alt={productRef.title || 'Product'} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className={`w-full h-full flex items-center justify-center ${isAdmin ? 'text-white/80' : 'text-gray-300'}`}>
                                                                            <span className="material-icons text-xl">shopping_bag</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className={`text-[10px] font-bold uppercase tracking-widest ${isAdmin ? 'text-white/80' : 'text-blue-600'}`}>Product</div>
                                                                    <div className={`text-sm font-semibold truncate ${isAdmin ? 'text-white' : 'text-gray-900'}`}>{productRef.title || 'View product'}</div>
                                                                </div>
                                                                <span className={`material-icons text-lg ${isAdmin ? 'text-white/90' : 'text-gray-400'}`}>chevron_right</span>
                                                            </div>
                                                        </button>
                                                    )}
                                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

                                                    {atts.length > 0 && (
                                                        <div className={`mt-2 grid gap-2 ${atts.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                            {atts.map(att => {
                                                                const isImage = (att.file_type || '').startsWith('image/');
                                                                return (
                                                                    <a
                                                                        key={att.id}
                                                                        href={att.signedUrl || '#'}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`block overflow-hidden rounded-lg border ${isAdmin ? 'border-white/20' : 'border-gray-200'}`}
                                                                    >
                                                                        {isImage ? (
                                                                            <img src={att.signedUrl} alt={att.file_name} className="w-full h-40 object-cover" />
                                                                        ) : (
                                                                            <div className={`p-2 flex items-center gap-2 ${isAdmin ? 'bg-white/10' : 'bg-white'}`}>
                                                                                <span className="material-icons text-sm">attach_file</span>
                                                                                <span className="text-xs font-semibold truncate">{att.file_name}</span>
                                                                            </div>
                                                                        )}
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
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
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) setSelectedFiles(prev => [...prev, ...files]);
                                    e.target.value = '';
                                }}
                            />

                            {selectedFiles.length > 0 && (
                                <div className="mb-3 flex gap-2 overflow-x-auto">
                                    {selectedFiles.map((file, idx) => {
                                        const isImage = file.type.startsWith('image/');
                                        const previewUrl = isImage ? URL.createObjectURL(file) : null;
                                        return (
                                            <div key={`${file.name}-${idx}`} className="relative flex-shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center"
                                                    aria-label="Remove attachment"
                                                >
                                                    <span className="material-icons text-[16px]">close</span>
                                                </button>
                                                {isImage && previewUrl ? (
                                                    <img
                                                        src={previewUrl}
                                                        alt={file.name}
                                                        className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                                                        onLoad={() => URL.revokeObjectURL(previewUrl)}
                                                    />
                                                ) : (
                                                    <div className="w-56 h-20 rounded-lg border border-gray-200 bg-white flex items-center gap-2 px-3">
                                                        <span className="material-icons text-gray-500">attach_file</span>
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-semibold text-gray-800 truncate">{file.name}</div>
                                                            <div className="text-[10px] font-medium text-gray-400">{Math.ceil(file.size / 1024)} KB</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex items-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2 h-[70px]"
                                    title="Attach"
                                >
                                    <span className="material-icons">attach_file</span>
                                </button>
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
                                    disabled={(!messageInput.trim() && selectedFiles.length === 0) || sending}
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
