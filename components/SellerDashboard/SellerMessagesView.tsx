import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
    fetchSellerConversations,
    fetchSellerConversationMessages,
    sendMessage,
    markSellerMessagesAsRead,
    getUsersLastSeen,
    touchUserLastSeen
} from '@/lib/api';
import { getAttachmentUrl, getMessageAttachments, uploadMessageAttachment, type MessageAttachment } from '@/lib/attachments-api';
import { SellerConversation, SellerMessage } from '@/types';

interface SellerMessagesViewProps {
    sellerId: string;
    onNavigate?: (tab: string) => void;
    initialConversationId?: string | null;
}

const SellerMessagesView: React.FC<SellerMessagesViewProps> = ({ sellerId, onNavigate, initialConversationId }) => {
    const [conversations, setConversations] = useState<SellerConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<SellerConversation | null>(null);

    const [resolvedProductImages, setResolvedProductImages] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        const pid = selectedConversation?.product_id ? String(selectedConversation.product_id) : '';
        const existing = (selectedConversation as any)?.product_primary_image || (selectedConversation as any)?.product_image;
        if (!pid) return;
        if (existing) return;
        if (resolvedProductImages.has(pid)) return;

        let cancelled = false;
        void (async () => {
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
                if (error) return;

                const url = (data as any)?.[0]?.image_url || null;
                if (!url) return;

                setResolvedProductImages(prev => {
                    const next = new Map(prev);
                    next.set(pid, String(url));
                    return next;
                });
            } catch {
                // ignore
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedConversation?.product_id, (selectedConversation as any)?.product_primary_image, (selectedConversation as any)?.product_image, resolvedProductImages]);

    const selectedConversationProductImage = selectedConversation?.product_id
        ? (((selectedConversation as any).product_primary_image || (selectedConversation as any).product_image || resolvedProductImages.get(String(selectedConversation.product_id)) || undefined) as string | undefined)
        : (((selectedConversation as any)?.product_primary_image || (selectedConversation as any)?.product_image || undefined) as string | undefined);

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
    const [messages, setMessages] = useState<SellerMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [otherLastSeenAt, setOtherLastSeenAt] = useState<string | null>(null);
    const [otherTyping, setOtherTyping] = useState(false);

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [messageAttachments, setMessageAttachments] = useState<Map<string, MessageAttachment[]>>(new Map());

    const messageAttachmentsRef = useRef<Map<string, MessageAttachment[]>>(new Map());
    const attachmentFetchInFlightRef = useRef<Set<string>>(new Set());

    const typingChannelRef = useRef<any>(null);
    const typingClearTimeoutRef = useRef<number | null>(null);
    const lastTypingSentAtRef = useRef<number>(0);

    useEffect(() => {
        messageAttachmentsRef.current = messageAttachments;
    }, [messageAttachments]);

    useEffect(() => {
        return () => {
            if (typingClearTimeoutRef.current) {
                window.clearTimeout(typingClearTimeoutRef.current);
                typingClearTimeoutRef.current = null;
            }
        };
    }, []);

    const openAttachment = async (storagePath: string) => {
        const url = await getAttachmentUrl(storagePath);
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const filterConversationsForSellerRole = (data: SellerConversation[]) => {
        const me = String(sellerId);
        return (Array.isArray(data) ? data : []).filter((c: any) => {
            const sid = c?.seller_id ?? c?.seller_uid ?? c?.seller;
            return sid != null && String(sid) === me;
        });
    };

    const isLikelyImage = (fileType: string | null | undefined, fileName: string | null | undefined, url: string | null | undefined) => {
        if ((fileType || '').startsWith('image/')) return true;
        const candidate = (fileName || url || '').toLowerCase();
        return /\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?|#|$)/.test(candidate);
    };

    const maybeBroadcastTyping = () => {
        if (!selectedConversation?.id) return;
        const now = Date.now();
        if (now - lastTypingSentAtRef.current < 1200) return;
        lastTypingSentAtRef.current = now;

        try {
            typingChannelRef.current?.send({
                type: 'broadcast',
                event: 'typing',
                payload: {
                    conversation_id: selectedConversation.id,
                    sender_id: sellerId,
                    ts: new Date().toISOString()
                }
            });
        } catch {
            // ignore
        }
    };

    // Typing indicator (best-effort) for the active conversation
    useEffect(() => {
        setOtherTyping(false);
        if (!selectedConversation?.id) return;

        const channel = supabase
            .channel(`typing:${selectedConversation.id}`)
            .on(
                'broadcast',
                { event: 'typing' },
                ({ payload }) => {
                    const sender = String((payload as any)?.sender_id ?? '');
                    if (!sender || sender === String(sellerId)) return;
                    setOtherTyping(true);
                    if (typingClearTimeoutRef.current) {
                        window.clearTimeout(typingClearTimeoutRef.current);
                    }
                    typingClearTimeoutRef.current = window.setTimeout(() => {
                        setOtherTyping(false);
                        typingClearTimeoutRef.current = null;
                    }, 2200);
                }
            )
            .subscribe();

        typingChannelRef.current = channel;

        return () => {
            try {
                supabase.removeChannel(channel);
            } catch {
                // ignore
            }
            if (typingClearTimeoutRef.current) {
                window.clearTimeout(typingClearTimeoutRef.current);
                typingClearTimeoutRef.current = null;
            }
            typingChannelRef.current = null;
            setOtherTyping(false);
        };
    }, [selectedConversation?.id, sellerId]);

    const ensureAttachmentsLoaded = async (messageId: string, known?: any[]) => {
        if (!messageId) return;
        if (messageAttachmentsRef.current.has(messageId)) return;
        if (attachmentFetchInFlightRef.current.has(messageId)) return;

        attachmentFetchInFlightRef.current.add(messageId);
        try {
            let atts: MessageAttachment[] = [];

            if (known && Array.isArray(known) && known.length > 0) {
                atts = await Promise.all(
                    known.map(async (a: any) => ({
                        ...a,
                        message_id: a.message_id ?? messageId,
                        signedUrl: a.signedUrl || a.url || a.public_url || (a.storage_path ? await getAttachmentUrl(a.storage_path) : undefined)
                    }))
                );
            } else {
                atts = await getMessageAttachments(messageId);
            }

            if (atts.length > 0) {
                setMessageAttachments(prev => {
                    if (prev.has(messageId)) return prev;
                    const next = new Map(prev);
                    next.set(messageId, atts);
                    return next;
                });
            }
        } catch {
            // ignore
        } finally {
            attachmentFetchInFlightRef.current.delete(messageId);
        }
    };

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, [sellerId]);

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

    const getOtherUserId = (conv: SellerConversation | null): string | null => {
        if (!conv) return null;
        if ((conv as any).subject === 'Support Request') return null;
        const buyerId = (conv as any).buyer_id;
        return buyerId ? String(buyerId) : null;
    };

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

    // Poll other user's last_seen while a conversation is open
    useEffect(() => {
        const otherUserId = getOtherUserId(selectedConversation);
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

    // Handle initial conversation selection
    useEffect(() => {
        if (!loading && initialConversationId && conversations.length > 0) {
            const conversation = conversations.find(c => c.id === initialConversationId);
            if (conversation) {
                setSelectedConversation(conversation);
            }
        }
    }, [loading, initialConversationId, conversations]);

    const handleSelectConversation = (conversation: SellerConversation) => {
        // Cleanup old previews if any
        selectedFiles.forEach(file => {
            const url = (file as any).previewUrl;
            if (url) URL.revokeObjectURL(url);
        });
        setSelectedFiles([]);
        setSelectedConversation(conversation);
        loadMessages(conversation.id);
    };

    // Mark messages as read when conversation is selected
    useEffect(() => {
        if (selectedConversation) {
            markSellerMessagesAsRead(selectedConversation.id);
        }
    }, [selectedConversation]);

    const loadConversations = async () => {
        setLoading(true);
        try {
            const data = await fetchSellerConversations(sellerId);
            setConversations(filterConversationsForSellerRole(data as any));
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

            // Process attachments returned by the RPC
            const newAttachmentsMap = new Map(messageAttachments);
            let hasNew = false;

            for (const msg of data) {
                if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
                    const mappedAtts: MessageAttachment[] = await Promise.all(msg.attachments.map(async (a: any) => ({
                        ...a,
                        signedUrl: a.signedUrl || await getAttachmentUrl(a.storage_path)
                    })));
                    newAttachmentsMap.set(String(msg.id), mappedAtts);
                    hasNew = true;
                }
            }

            if (hasNew) {
                setMessageAttachments(newAttachmentsMap);
            }

            // Fallback: fetch attachments for messages that don't have them in the result set but might have them in DB
            const idsToFetch = (data || [])
                .slice(-20)
                .map((m: any) => m.id)
                .filter((id: string) => id && !newAttachmentsMap.has(String(id)));

            if (idsToFetch.length > 0) {
                for (const id of idsToFetch) {
                    try {
                        const atts = await getMessageAttachments(String(id));
                        if (atts.length > 0) {
                            setMessageAttachments(prev => new Map(prev).set(String(id), atts));
                        }
                    } catch { /* ignore */ }
                }
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    // Best-effort: ensure attachments are hydrated for visible/recent messages (older threads too)
    useEffect(() => {
        if (!messages.length) return;

        const recent = messages.slice(-60);
        const BATCH_SIZE = 6;
        let cancelled = false;

        (async () => {
            for (let i = 0; i < recent.length; i += BATCH_SIZE) {
                if (cancelled) return;
                const batch = recent.slice(i, i + BATCH_SIZE);
                await Promise.all(
                    batch.map(async (m: any) => {
                        const id = String(m?.id ?? '');
                        if (!id) return;
                        if (messageAttachmentsRef.current.has(id)) return;
                        const known = Array.isArray(m?.attachments) ? m.attachments : undefined;
                        await ensureAttachmentsLoaded(id, known);
                    })
                );
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [messages]);

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
        if (!selectedConversation) return;
        const text = messageInput.trim();
        const filesToUpload = [...selectedFiles];
        if (!text && filesToUpload.length === 0) return;

        const correlationId = `cid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const contentToSend = text || (filesToUpload.length > 0 ? 'Sent an attachment' : '');
        if (!contentToSend) return;

        const productContext = selectedConversation?.product_id
            ? {
                product_id: String(selectedConversation.product_id),
                product_title: selectedConversation.product_title || undefined,
                product_image: selectedConversationProductImage
            }
            : null;

        const messageMetadata = {
            correlationId,
            ...(productContext ? productContext : {})
        };

        const restoreText = messageInput;
        const restoreFiles = filesToUpload;

        const optimisticMsg: any = {
            id: correlationId,
            conversation_id: selectedConversation.id,
            sender_id: sellerId,
            receiver_id: selectedConversation.buyer_id,
            content: contentToSend,
            is_read: true,
            created_at: new Date().toISOString(),
            metadata: { ...messageMetadata, optimistic: true }
        };

        setMessages(prev => [...prev, optimisticMsg]);

        // Clear input immediately for a modern feel
        setMessageInput('');
        selectedFiles.forEach(file => {
            const url = (file as any).previewUrl;
            if (url) URL.revokeObjectURL(url);
        });
        setSelectedFiles([]);

        setSending(true);
        try {
            // Insert message directly to get the ID immediately
            const { data: sentMsg, error: sendError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: selectedConversation.id,
                    sender_id: sellerId,
                    receiver_id: selectedConversation.buyer_id,
                    content: contentToSend,
                    metadata: messageMetadata
                })
                .select()
                .single();

            if (sendError || !sentMsg) throw sendError || new Error('Failed to send message');

            // Replace optimistic message with real one
            setMessages(prev => prev.map((m: any) => (String(m?.id) === correlationId ? ({ ...sentMsg } as any) : m)));

            // Handle attachments if any
            if (filesToUpload.length > 0) {
                const uploadResults = await Promise.allSettled(
                    filesToUpload.map(file => uploadMessageAttachment(String(sentMsg.id), file))
                );

                // Fetch the newly created attachments to get their data properly
                const atts = await getMessageAttachments(String(sentMsg.id));
                if (atts.length > 0) {
                    setMessageAttachments(prev => new Map(prev).set(String(sentMsg.id), atts));
                }
            }

            // Reload conversations (preview + unread counts)
            await loadConversations();
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove optimistic message and restore draft
            setMessages(prev => prev.filter((m: any) => String(m?.id) !== correlationId));
            setMessageInput(restoreText);
            setSelectedFiles(restoreFiles);
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
                                        onClick={() => handleSelectConversation(conv)}
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
                                    {selectedConversation.subject !== 'Support Request' && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`w-2 h-2 rounded-full ${isOnlineFromLastSeen(otherLastSeenAt) ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                            <span className={`text-xs font-semibold ${isOnlineFromLastSeen(otherLastSeenAt) ? 'text-emerald-600' : 'text-gray-500'}`}>
                                                {isOnlineFromLastSeen(otherLastSeenAt) ? 'Online' : formatLastSeen(otherLastSeenAt)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Product/Order Context */}
                            {(selectedConversation.product_title || selectedConversation.order_number) && (
                                <div className="flex items-center gap-4 mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                    {selectedConversationProductImage && (
                                        <img
                                            src={selectedConversationProductImage}
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

                                    {selectedConversation.product_id && (
                                        <button
                                            type="button"
                                            onClick={() => openProduct(selectedConversation.product_id)}
                                            className="ml-2 px-3 py-2 text-sm font-medium rounded-lg bg-black text-white hover:opacity-90"
                                        >
                                            View Product
                                        </button>
                                    )}

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
                                    const isPending = !!(message as any)?.metadata?.optimistic;
                                    const atts = messageAttachments.get(String(message.id)) || [];
                                    const productRef = getMessageProductRef((message as any)?.metadata);
                                    return (
                                        <div key={message.id} className={`flex ${isSeller ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] ${isSeller ? 'order-2' : 'order-1'}`}>
                                                <div className={`rounded-lg px-4 py-2 ${isSeller
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-gray-100 text-gray-900'
                                                    }`}>
                                                    {productRef && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openProduct(productRef.id)}
                                                            className={`w-full mb-2 text-left rounded-lg border overflow-hidden ${isSeller ? 'border-white/30 bg-white/10 hover:bg-white/15' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                                        >
                                                            <div className="flex items-center gap-3 p-3">
                                                                <div className={`w-12 h-12 rounded-md overflow-hidden flex-shrink-0 ${isSeller ? 'bg-white/15' : 'bg-gray-100'}`}>
                                                                    {productRef.image ? (
                                                                        <img src={productRef.image} alt={productRef.title || 'Product'} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className={`w-full h-full flex items-center justify-center ${isSeller ? 'text-white/80' : 'text-gray-300'}`}>
                                                                            <span className="material-icons text-xl">shopping_bag</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className={`text-[10px] font-bold uppercase tracking-widest ${isSeller ? 'text-white/80' : 'text-orange-600'}`}>Product</div>
                                                                    <div className={`text-sm font-semibold truncate ${isSeller ? 'text-white' : 'text-gray-900'}`}>{productRef.title || 'View product'}</div>
                                                                </div>
                                                                <span className={`material-icons text-lg ${isSeller ? 'text-white/90' : 'text-gray-400'}`}>chevron_right</span>
                                                            </div>
                                                        </button>
                                                    )}
                                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

                                                    {atts.length > 0 && (
                                                        <div className={`mt-2 grid gap-2 ${atts.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                                            {atts.map((att, idx) => {
                                                                const isImage = isLikelyImage(att.file_type, att.file_name, att.signedUrl);
                                                                return (
                                                                    <a
                                                                        key={att.id || `att-${idx}`}
                                                                        href={att.signedUrl || '#'}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`block overflow-hidden rounded-lg border shadow-sm hover:shadow-md transition-shadow ${isSeller ? 'border-white/20' : 'border-gray-200'}`}
                                                                    >
                                                                        {isImage && att.signedUrl ? (
                                                                            <img src={att.signedUrl} alt={att.file_name} className="w-full h-40 object-cover bg-gray-50" />
                                                                        ) : (
                                                                            <div className={`p-3 flex items-center gap-2 ${isSeller ? 'bg-white/10' : 'bg-white text-gray-800'}`}>
                                                                                <span className="material-icons text-lg">description</span>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-xs font-bold truncate">{att.file_name}</div>
                                                                                    {att.file_size && (
                                                                                        <div className={`text-[10px] ${isSeller ? 'text-white/60' : 'text-gray-400'}`}>
                                                                                            {(att.file_size / 1024).toFixed(1)} KB
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <span className="material-icons text-sm">download</span>
                                                                            </div>
                                                                        )}
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isSeller ? 'justify-end' : 'justify-start'}`}>
                                                    <span>{formatMessageTime(message.created_at)}</span>
                                                    {isSeller && (
                                                        isPending ? (
                                                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                                <span className="material-icons text-xs">schedule</span>
                                                                <span>Sending…</span>
                                                            </span>
                                                        ) : (
                                                            <span className={`material-icons text-xs ${message.is_read ? 'text-blue-500' : 'text-gray-400'}`}>
                                                                {message.is_read ? 'done_all' : 'done'}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Compose Area */}
                        <div className="p-4 bg-white border-t">
                            {otherTyping && selectedConversation.subject !== 'Support Request' && (
                                <div className="mb-2 px-2 text-xs font-semibold text-gray-500">
                                    {getBuyerDisplayName(selectedConversation)} is typing…
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                                multiple
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) setSelectedFiles(prev => [...prev, ...files]);
                                    e.target.value = '';
                                }}
                            />

                            {selectedFiles.length > 0 && (
                                <div className="mb-4 flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
                                    {selectedFiles.map((file, idx) => {
                                        const isImage = file.type.startsWith('image/');
                                        const previewUrl = isImage ? URL.createObjectURL(file) : null;
                                        return (
                                            <div key={`${file.name}-${idx}`} className="relative flex-shrink-0 group">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                                                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                                                    }}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
                                                    aria-label="Remove attachment"
                                                >
                                                    <span className="material-icons text-[16px]">close</span>
                                                </button>
                                                {isImage && previewUrl ? (
                                                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-orange-100 shadow-sm transition-transform group-hover:scale-105">
                                                        <img
                                                            src={previewUrl}
                                                            alt={file.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-48 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center gap-2 px-3 transition-transform group-hover:scale-105">
                                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                                            <span className="material-icons text-orange-500">description</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-bold text-gray-800 truncate">{file.name}</div>
                                                            <div className="text-[10px] font-medium text-gray-400">{(file.size / 1024).toFixed(1)} KB</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2 px-1">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all flex items-center gap-2"
                                        title="Attach Image or File"
                                    >
                                        <span className="material-icons">add_photo_alternate</span>
                                        <span className="text-xs font-semibold">Add Media</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-2"
                                        title="Attach Document"
                                    >
                                        <span className="material-icons">attach_file</span>
                                        <span className="text-xs font-semibold">Attach File</span>
                                    </button>
                                    <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                                    <span className="text-[10px] text-gray-400 font-medium">Shift + Enter for new line</span>
                                </div>

                                <div className="flex items-end gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 focus-within:border-orange-200 focus-within:ring-4 focus-within:ring-orange-500/5 transition-all">
                                    <textarea
                                        value={messageInput}
                                        onChange={(e) => {
                                            setMessageInput(e.target.value);
                                            maybeBroadcastTyping();
                                        }}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Type your message to the customer..."
                                        rows={Math.min(5, messageInput.split('\n').length || 1)}
                                        className="flex-1 p-2 bg-transparent resize-none focus:outline-none text-sm leading-relaxed"
                                        disabled={sending}
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={(!messageInput.trim() && selectedFiles.length === 0) || sending}
                                        className={`p-3 rounded-xl shadow-lg flex items-center justify-center transition-all ${(!messageInput.trim() && selectedFiles.length === 0) || sending
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                            : 'bg-gradient-to-tr from-orange-500 to-orange-400 text-white hover:shadow-orange-500/20 hover:scale-105 active:scale-95'
                                            }`}
                                    >
                                        {sending ? (
                                            <span className="material-icons animate-spin">sync</span>
                                        ) : (
                                            <span className="material-icons transform -rotate-45">send</span>
                                        )}
                                    </button>
                                </div>
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
