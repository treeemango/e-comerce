import React, { useState, useEffect, useRef } from 'react';
import {
    getConversations,
    getConversationMessages,
    sendMessage,
    markMessagesRead,
    getUsersLastSeen,
    touchUserLastSeen
} from '../../lib/api';
import { getMessageAttachments, uploadMessageAttachment, type MessageAttachment } from '../../lib/attachments-api';
import { Conversation, Message } from '../../types';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

const MessageImageAttachment: React.FC<{ src?: string; alt: string; className?: string }> = ({ src, alt, className }) => {
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);

    const showSkeleton = !loaded && !errored;

    return (
        <div className={cn('relative w-full h-40 bg-gray-100 dark:bg-gray-900', className)}>
            {showSkeleton && (
                <div className="absolute inset-0 animate-pulse">
                    <div className="w-full h-full bg-gray-200/70 dark:bg-gray-800/60" />
                </div>
            )}

            {errored ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <span className="material-icons text-2xl">broken_image</span>
                </div>
            ) : (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    className={cn(
                        'w-full h-40 object-cover transition-opacity duration-200',
                        loaded ? 'opacity-100' : 'opacity-0'
                    )}
                    onLoad={() => setLoaded(true)}
                    onError={() => setErrored(true)}
                />
            )}
        </div>
    );
};

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

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const filePreviewUrlRef = useRef<Map<File, string>>(new Map());

    const getOrCreatePreviewUrl = (file: File): string => {
        const existing = filePreviewUrlRef.current.get(file);
        if (existing) return existing;
        const url = URL.createObjectURL(file);
        filePreviewUrlRef.current.set(file, url);
        return url;
    };

    const revokePreviewUrl = (file: File) => {
        const url = filePreviewUrlRef.current.get(file);
        if (url) {
            URL.revokeObjectURL(url);
            filePreviewUrlRef.current.delete(file);
        }
    };

    // Cleanup object URLs when files are removed/unmounted
    useEffect(() => {
        const keep = new Set(selectedFiles);
        for (const [file, url] of filePreviewUrlRef.current.entries()) {
            if (!keep.has(file)) {
                URL.revokeObjectURL(url);
                filePreviewUrlRef.current.delete(file);
            }
        }

        return () => {
            for (const url of filePreviewUrlRef.current.values()) {
                URL.revokeObjectURL(url);
            }
            filePreviewUrlRef.current.clear();
        };
    }, [selectedFiles]);

    const prevInUseBlobUrlsRef = useRef<Set<string>>(new Set());

    const pendingAttachmentsRef = useRef<Map<string, File[]>>(new Map());
    const [messageAttachments, setMessageAttachments] = useState<Map<string, MessageAttachment[]>>(new Map());
    const messageAttachmentsRef = useRef<Map<string, MessageAttachment[]>>(new Map());
    const attachmentFetchTimeoutsRef = useRef<number[]>([]);
    const attachmentRetryActiveRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        messageAttachmentsRef.current = messageAttachments;
    }, [messageAttachments]);

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

    const createOptimisticAttachments = (messageId: string, files: File[]): MessageAttachment[] => {
        const now = new Date().toISOString();
        return files.map((file, index) => ({
            id: `temp-${messageId}-${index}`,
            message_id: messageId,
            file_name: file.name,
            storage_path: '',
            file_type: file.type || null,
            file_size: Number.isFinite(file.size) ? file.size : null,
            created_at: now,
            signedUrl: URL.createObjectURL(file)
        }));
    };

    const collectBlobUrls = (map: Map<string, MessageAttachment[]>): Set<string> => {
        const out = new Set<string>();
        for (const atts of map.values()) {
            for (const att of atts) {
                const u = (att as any)?.signedUrl as string | undefined;
                if (u && u.startsWith('blob:')) out.add(u);
            }
        }
        return out;
    };

    // Revoke blob: URLs only after they are no longer referenced in state.
    useEffect(() => {
        const nextInUse = collectBlobUrls(messageAttachments);
        const prevInUse = prevInUseBlobUrlsRef.current;

        for (const u of prevInUse) {
            if (!nextInUse.has(u)) {
                try { URL.revokeObjectURL(u); } catch { /* ignore */ }
            }
        }

        prevInUseBlobUrlsRef.current = nextInUse;

        return () => {
            // On unmount, revoke anything still in use.
            for (const u of nextInUse) {
                try { URL.revokeObjectURL(u); } catch { /* ignore */ }
            }
        };
    }, [messageAttachments]);

    const [otherLastSeenAt, setOtherLastSeenAt] = useState<string | null>(null);
    const [otherTyping, setOtherTyping] = useState(false);

    const typingChannelRef = useRef<any>(null);
    const typingClearTimeoutRef = useRef<number | null>(null);
    const lastTypingSentAtRef = useRef<number>(0);

    useEffect(() => {
        return () => {
            if (typingClearTimeoutRef.current) {
                window.clearTimeout(typingClearTimeoutRef.current);
                typingClearTimeoutRef.current = null;
            }
        };
    }, []);

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
                    sender_id: userId,
                    ts: new Date().toISOString()
                }
            });
        } catch {
            // ignore
        }
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

    const getOtherUserId = (conv: Conversation | null): string | null => {
        if (!conv) return null;
        const other = conv.seller_id === userId ? conv.buyer_id : conv.seller_id;
        return other ? String(other) : null;
    };

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

    // Fetch other user's last_seen for the chat header
    useEffect(() => {
        const otherId = getOtherUserId(selectedConversation);
        if (!otherId) {
            setOtherLastSeenAt(null);
            return;
        }

        let cancelled = false;
        const fetchPresence = async () => {
            const map = await getUsersLastSeen([otherId]);
            if (!cancelled) setOtherLastSeenAt(map[otherId] ?? null);
        };

        void fetchPresence();
        const interval = setInterval(fetchPresence, 20_000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [selectedConversation?.id]);

    // Thread Subscription (Messages)
    useEffect(() => {
        if (!selectedConversation?.id) return;

        loadMessages(selectedConversation.id);
        markRead(selectedConversation.id);

        // Subscribe to new messages for this specific conversation
        let cancelled = false;
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

                    const serverCorrelationId = (newMsg as any)?.metadata?.correlationId as string | undefined;

                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        if (serverCorrelationId) {
                            const idx = prev.findIndex(m => m.id === serverCorrelationId);
                            if (idx >= 0) {
                                const next = [...prev];
                                next[idx] = newMsg;
                                return next;
                            }
                        }
                        return [...prev, newMsg];
                    });
                    setShouldAutoScroll(true);

                    // Instant snippet update in list
                    setConversations(prev => prev.map(c =>
                        c.id === selectedConversation.id
                            ? { ...c, last_message: newMsg.content, last_message_at: newMsg.created_at }
                            : c
                    ));

                    let pendingFiles: File[] | undefined;
                    if (serverCorrelationId) pendingFiles = pendingAttachmentsRef.current.get(serverCorrelationId);
                    if (!pendingFiles) pendingFiles = pendingAttachmentsRef.current.get(newMsg.content);

                    if (serverCorrelationId) {
                        setMessageAttachments(prevMap => {
                            if (!prevMap.has(serverCorrelationId) || prevMap.has(newMsg.id)) return prevMap;
                            const next = new Map(prevMap);
                            const optimistic = next.get(serverCorrelationId);
                            next.delete(serverCorrelationId);
                            if (optimistic) next.set(newMsg.id, optimistic);
                            return next;
                        });
                    }

                    if (pendingFiles && pendingFiles.length > 0) {
                        Promise.all(pendingFiles.map(file => uploadMessageAttachment(newMsg.id, file)))
                            .then(async () => {
                                const attachments = await getMessageAttachments(newMsg.id);
                                if (attachments.length > 0) {
                                    setMessageAttachments(prevMap => {
                                        const next = new Map(prevMap);
                                        next.set(newMsg.id, attachments);
                                        return next;
                                    });
                                } else {
                                    // Attachments were uploaded but not fetched - possible RLS issue
                                    console.warn('Attachments uploaded but not visible - possible RLS or fetch issue');
                                    setMessages(prev => prev.map(m =>
                                        m.id === newMsg.id
                                            ? { ...m, content: m.content + ' (Attachments uploaded but may not be visible)' }
                                            : m
                                    ));
                                }
                            })
                            .catch((error) => {
                                console.error('Error uploading attachments:', error);
                                // Show user-friendly error message
                                setMessages(prev => prev.map(m =>
                                    m.id === newMsg.id
                                        ? { ...m, content: m.content + ' (Failed to upload attachments)' }
                                        : m
                                ));
                            });

                        if (serverCorrelationId) pendingAttachmentsRef.current.delete(serverCorrelationId);
                        pendingAttachmentsRef.current.delete(newMsg.content);
                    } else {
                        // Fetch attachments for messages from other users. This can race the sender's upload,
                        // so retry for a few seconds.
                        if (!cancelled) fetchAttachmentsWithRetry(newMsg.id);
                    }
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
                    if (!sender || sender === String(userId)) return;
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
    }, [selectedConversation?.id, userId]);

    // Fetch attachments for loaded messages (best-effort)
    useEffect(() => {
        if (!messages.length) return;
        let cancelled = false;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        const nowMs = Date.now();

        const raw: Array<{ id: string; createdAtMs: number }> = messages
            .map((m) => {
                const id = String((m as any)?.id ?? '');
                const createdAt = new Date(String((m as any)?.created_at ?? '')).getTime();
                return { id, createdAtMs: Number.isFinite(createdAt) ? createdAt : 0 };
            })
            .filter((x): x is { id: string; createdAtMs: number } => typeof x.id === 'string' && x.id.length > 0);

        const rawIds: string[] = raw.map(r => r.id);

        const idsToFetch: string[] = Array.from(new Set<string>(rawIds))
            .filter((id) => uuidRegex.test(id) && !messageAttachments.has(id));

        if (idsToFetch.length === 0) return;

        const recentThresholdMs = 10 * 60 * 1000;
        const recentIds = new Set(
            raw
                .filter(r => r.createdAtMs > 0 && nowMs - r.createdAtMs <= recentThresholdMs)
                .map(r => r.id)
        );

        const BATCH_SIZE = 6;
        (async () => {
            for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
                const batch = idsToFetch.slice(i, i + BATCH_SIZE);
                await Promise.all(
                    batch.map(async (id) => {
                        try {
                            const attachments = await getMessageAttachments(id);
                            if (!cancelled && attachments.length > 0) {
                                setMessageAttachments(prevMap => {
                                    if (prevMap.has(id)) return prevMap;
                                    return new Map(prevMap).set(id, attachments);
                                });
                            } else if (!cancelled && recentIds.has(id)) {
                                // If the message is recent, uploads may still be in-flight. Retry briefly.
                                fetchAttachmentsWithRetry(id);
                            }
                        } catch {
                            // ignore
                        }
                    })
                );
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [messages]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (shouldAutoScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            setShouldAutoScroll(false);
        }
    }, [messages, shouldAutoScroll]);

    const loadConversations = async () => {
        try {
            const data = await getConversations(userId, false, 'buyer');
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
        if (!selectedConversation) return;
        const text = inputText.trim();
        const filesToUpload = [...selectedFiles];
        if (!text && filesToUpload.length === 0) return;

        const correlationId = `cid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const contentToSend = text || 'Attachment';
        const receiverId = selectedConversation.seller_id === userId ? selectedConversation.buyer_id : selectedConversation.seller_id;

        const optimisticMsg: Message = {
            id: correlationId,
            conversation_id: selectedConversation.id,
            sender_id: userId,
            receiver_id: receiverId,
            content: contentToSend,
            metadata: { correlationId, optimistic: true },
            is_read: true,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        if (filesToUpload.length > 0) {
            const optimisticAtts = createOptimisticAttachments(correlationId, filesToUpload);
            setMessageAttachments(prevMap => new Map(prevMap).set(correlationId, optimisticAtts));
        }
        setShouldAutoScroll(true);

        setSending(true);
        setInputText('');
        setSelectedFiles([]);

        try {
            // Direct insert instead of RPC to get ID immediately
            const { data: sentMsg, error: sendError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: selectedConversation.id,
                    sender_id: userId,
                    receiver_id: receiverId || null,
                    content: contentToSend,
                    metadata: { correlationId }
                })
                .select()
                .single();

            if (sendError || !sentMsg) throw sendError || new Error('Failed to send message');

            if (filesToUpload.length > 0) {
                await Promise.all(filesToUpload.map(file => uploadMessageAttachment(String(sentMsg.id), file)));

                const attachments = await getMessageAttachments(String(sentMsg.id));
                if (attachments.length > 0) {
                    setMessageAttachments(prevMap => {
                        const next = new Map(prevMap);
                        next.set(String(sentMsg.id), attachments);
                        return next;
                    });
                }
            }

            // Refresh conversations to show latest message in sidebar
            loadConversations();

            // Replace optimistic message with real message
            setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? sentMsg : m));

            // Optimistically update the specific conversation in the list as well
            setConversations(prev => prev.map(c =>
                c.id === selectedConversation.id
                    ? { ...c, last_message: contentToSend, last_message_at: new Date().toISOString() }
                    : c
            ));
        } catch (error) {
            console.error('Error sending message:', error);
            // Revert on error
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setMessageAttachments(prevMap => {
                const next = new Map(prevMap);
                const atts = (next.get(correlationId) || []) as MessageAttachment[];
                for (const att of atts) {
                    if (att.id?.startsWith('temp-') && att.signedUrl?.startsWith('blob:')) {
                        try {
                            URL.revokeObjectURL(att.signedUrl);
                        } catch {
                            // ignore
                        }
                    }
                }
                next.delete(correlationId);
                return next;
            });
            setInputText(text);
            setSelectedFiles(filesToUpload);
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
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isOnlineFromLastSeen(otherLastSeenAt) ? "bg-emerald-500" : "bg-gray-300"
                            )} />
                            <span className={cn(
                                "font-bold uppercase tracking-widest text-[8px]",
                                isOnlineFromLastSeen(otherLastSeenAt) ? "text-emerald-600" : "text-gray-400"
                            )}>
                                {isOnlineFromLastSeen(otherLastSeenAt) ? 'Online' : formatLastSeen(otherLastSeenAt)}
                            </span>
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
                            const isPending = !!(msg as any)?.metadata?.optimistic;
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
                                            {messageAttachments.get(msg.id)?.length ? (
                                                <div className={cn(
                                                    "grid gap-2 mb-2",
                                                    (messageAttachments.get(msg.id)?.length || 0) > 1 ? "grid-cols-2" : "grid-cols-1"
                                                )}>
                                                    {messageAttachments.get(msg.id)!.map(att => {
                                                        const isImage = (att.file_type || '').startsWith('image/');
                                                        return (
                                                            <a
                                                                key={att.id}
                                                                href={att.signedUrl || '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={cn(
                                                                    "block overflow-hidden rounded-2xl border",
                                                                    isMe ? "border-orange-300/30" : "border-gray-100"
                                                                )}
                                                            >
                                                                {isImage ? (
                                                                    <MessageImageAttachment src={att.signedUrl} alt={att.file_name} />
                                                                ) : (
                                                                    <div className={cn(
                                                                        "p-3 flex items-center gap-2",
                                                                        isMe ? "bg-orange-500/10" : "bg-white"
                                                                    )}>
                                                                        <span className="material-icons text-base text-gray-500">attach_file</span>
                                                                        <span className="text-xs font-semibold text-gray-700 truncate">{att.file_name}</span>
                                                                    </div>
                                                                )}
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}

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
                                                    isPending ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-400">
                                                            <span className="material-icons text-[14px]">schedule</span>
                                                            <span>Sending…</span>
                                                        </span>
                                                    ) : (
                                                        <span className={cn("material-icons text-[14px]", msg.is_read ? 'text-[#34B7F1]' : 'text-gray-300')}>
                                                            {msg.is_read ? 'done_all' : 'check'}
                                                        </span>
                                                    )
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
                {otherTyping && (
                    <div className="mb-2 px-2 text-xs font-semibold text-gray-500">
                        {(selectedConversation.other_user_name || 'Seller')} is typing…
                    </div>
                )}
                {selectedFiles.length > 0 && (
                    <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar">
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
                                            className="w-16 h-16 rounded-2xl object-cover border border-gray-200"
                                            onLoad={() => URL.revokeObjectURL(previewUrl)}
                                        />
                                    ) : (
                                        <div className="w-40 h-16 rounded-2xl border border-gray-200 bg-white flex items-center gap-2 px-3">
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

                <div className="flex gap-4 items-center mb-3 px-2 text-gray-400">
                    <button type="button" className="hover:text-orange-500 transition-colors" title="Emoji (coming soon)">
                        <span className="material-icons">sentiment_satisfied_alt</span>
                    </button>
                    <label className="relative cursor-pointer hover:text-orange-500 transition-colors" title="Upload image">
                        <input
                            type="file"
                            ref={imageInputRef}
                            accept="image/*"
                            onChange={(e) => {
                                if (e.target.files) {
                                    console.log('Images selected:', e.target.files.length);
                                    setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                                }
                                if (imageInputRef.current) imageInputRef.current.value = '';
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            multiple
                        />
                        <span className="material-icons">image</span>
                    </label>
                    <label className="relative cursor-pointer hover:text-orange-500 transition-colors" title="Attach file">
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".pdf,.doc,.docx,.zip"
                            onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) setSelectedFiles(prev => [...prev, ...files]);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            multiple
                        />
                        <span className="material-icons">attach_file</span>
                    </label>
                    <button type="button" className="hover:text-orange-500 transition-colors" title="More options (coming soon)">
                        <span className="material-icons">grid_view</span>
                    </button>
                </div>
                <div className="flex items-end gap-3 rounded-2xl p-1">
                    <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-2 flex items-end border border-gray-100 focus-within:border-black/10 transition-colors">
                        <textarea
                            value={inputText}
                            onChange={(e) => {
                                setInputText(e.target.value);
                                maybeBroadcastTyping();
                            }}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent max-h-32 min-h-[40px] py-2 focus:outline-none text-sm font-medium resize-none leading-relaxed text-gray-800"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={(!inputText.trim() && selectedFiles.length === 0) || sending}
                        className={cn(
                            "w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-lg active:scale-90",
                            (inputText.trim() || selectedFiles.length > 0)
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
