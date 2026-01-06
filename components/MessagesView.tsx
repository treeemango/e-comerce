import React, { useState, useEffect, useRef } from 'react';
import { User, Conversation, Message } from '../types';
import { getConversations, getConversationMessages, sendMessage, markMessagesRead, getConversationParticipants, getUsersLastSeen, touchUserLastSeen } from '../lib/api';
import { getAttachmentUrl, uploadMessageAttachment, getMessageAttachments, MessageAttachment } from '../lib/attachments-api';
import { supabase } from '../lib/supabase';

const MessageImageAttachment: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);

    const showSkeleton = !loaded && !errored;

    return (
        <div className="relative w-full max-w-xs h-64 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            {showSkeleton && (
                <div className="absolute inset-0 animate-pulse">
                    <div className="w-full h-full bg-gray-200/70 dark:bg-gray-700/60" />
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
                    className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setErrored(true)}
                />
            )}
        </div>
    );
};

interface MessagesViewProps {
    user: User;
    activeConversationId?: string | null;
    compactMode?: boolean; // forces single-pane (list then conversation) UX
}

const MessagesView: React.FC<MessagesViewProps> = ({ user, activeConversationId, compactMode = false }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

    const [resolvedProductImages, setResolvedProductImages] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        const pid = selectedConversation?.product_id ? String(selectedConversation.product_id) : '';
        const existing = selectedConversation?.product_image;
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
    }, [selectedConversation?.product_id, selectedConversation?.product_image, resolvedProductImages]);

    const selectedConversationProductImage = selectedConversation?.product_id
        ? (selectedConversation.product_image || resolvedProductImages.get(String(selectedConversation.product_id)) || undefined)
        : (selectedConversation?.product_image || undefined);

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
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
    const [showList, setShowList] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [messageAttachments, setMessageAttachments] = useState<Map<string, MessageAttachment[]>>(new Map());
    const pendingAttachmentsRef = useRef<Map<string, File[]>>(new Map()); // Map: correlationId -> files
    const filePreviewUrlRef = useRef<Map<File, string>>(new Map());

    const [otherLastSeenAt, setOtherLastSeenAt] = useState<string | null>(null);
    const [otherTyping, setOtherTyping] = useState(false);

    const typingChannelRef = useRef<any>(null);
    const typingClearTimeoutRef = useRef<number | null>(null);
    const lastTypingSentAtRef = useRef<number>(0);

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFiles]);

    const getOtherUserId = (conv: Conversation | null): string | null => {
        if (!conv) return null;
        const other = conv.seller_id === user.id ? conv.buyer_id : conv.seller_id;
        return other ? String(other) : null;
    };

    const isOnlineFromLastSeen = (ts: string | null): boolean => {
        if (!ts) return false;
        const t = new Date(ts).getTime();
        if (!Number.isFinite(t)) return false;
        return Date.now() - t <= 2 * 60 * 1000; // 2 minutes
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
                    sender_id: user.id,
                    ts: new Date().toISOString()
                }
            });
        } catch {
            // ignore
        }
    };

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, [user.id]);

    // Update our own last_seen periodically while MessagesView is mounted
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

    // Fetch other user's last_seen for header
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

    // Handle activeConversationId prop - only select if not already selected
    useEffect(() => {
        if (activeConversationId && conversations.length > 0) {
            if (selectedConversation?.id === activeConversationId) return;
            const target = conversations.find(c => c.id === activeConversationId);
            if (target) {
                handleSelectConversation(target);
            }
        }
    }, [activeConversationId, conversations.length]);

    // Auto-scroll to bottom when shouldAutoScroll flag is set
    useEffect(() => {
        if (!shouldAutoScroll || messages.length === 0) return;

        const timer = setTimeout(() => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
            setShouldAutoScroll(false);
        }, 100);

        return () => clearTimeout(timer);
    }, [messages, shouldAutoScroll]);

    // Realtime Subscription
    useEffect(() => {
        if (!selectedConversation?.id) return;

        const channel = supabase
            .channel(`conversation:${selectedConversation.id}`)
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
                    const tempId = serverCorrelationId ? `temp-${serverCorrelationId}` : undefined;

                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;

                        if (tempId) {
                            const idx = prev.findIndex(m => m.id === tempId || (m as any)?.metadata?.correlationId === serverCorrelationId);
                            if (idx >= 0) {
                                const next = [...prev];
                                next[idx] = newMsg;
                                return next;
                            }
                        }

                        return [...prev, newMsg];
                    });

                    setShouldAutoScroll(true);

                    setConversations(prev => prev.map(c =>
                        c.id === selectedConversation.id
                            ? { ...c, last_message: newMsg.content, last_message_at: newMsg.created_at }
                            : c
                    ));

                    // Move any locally-rendered optimistic attachments onto the real message id
                    if (tempId) {
                        setMessageAttachments(prevMap => {
                            if (!prevMap.has(tempId)) return prevMap;
                            const next = new Map<string, MessageAttachment[]>(prevMap);
                            const local = next.get(tempId) || [];
                            next.delete(tempId);
                            if (!next.has(newMsg.id)) next.set(newMsg.id, local);
                            return next;
                        });
                    }

                    // Prefer matching pending attachments by server-returned correlation id (metadata.correlationId)
                    let pendingFiles: File[] | undefined = undefined;
                    if (serverCorrelationId) {
                        pendingFiles = pendingAttachmentsRef.current.get(serverCorrelationId);
                    }

                    // Fallback to legacy content-based matching for backward compatibility
                    if (!pendingFiles) pendingFiles = pendingAttachmentsRef.current.get(newMsg.content);

                    if (pendingFiles && pendingFiles.length > 0) {
                        console.log('Found pending attachments for message:', serverCorrelationId || newMsg.content, pendingFiles.length);
                        // Upload attachments with real message ID
                        Promise.all(pendingFiles.map(file => uploadMessageAttachment(newMsg.id, file)))
                            .then((results) => {
                                const failed = results.filter(r => !r).length;
                                if (failed > 0) {
                                    console.error('Some attachments failed to upload', { failed, total: results.length, messageId: newMsg.id });
                                    // Show user-friendly error message
                                    setMessages(prev => prev.map(m =>
                                        m.id === newMsg.id
                                            ? { ...m, content: m.content + ' (Some attachments failed to upload)' }
                                            : m
                                    ));
                                }
                                console.log('Attachments uploaded, fetching...');
                                // Small delay to ensure DB is updated
                                setTimeout(() => {
                                    getMessageAttachments(newMsg.id).then(attachments => {
                                        console.log('Fetched attachments:', attachments.length);
                                        if (attachments.length > 0) {
                                            setMessageAttachments(prevMap => {
                                                const next = new Map<string, MessageAttachment[]>(prevMap);
                                                const existing = next.get(newMsg.id) || [];
                                                for (const att of existing) {
                                                    if (att.id?.startsWith('local-') && att.signedUrl?.startsWith('blob:')) {
                                                        try {
                                                            URL.revokeObjectURL(att.signedUrl);
                                                        } catch {
                                                            // ignore
                                                        }
                                                    }
                                                }
                                                next.set(newMsg.id, attachments);
                                                return next;
                                            });
                                        } else if (pendingFiles && pendingFiles.length > 0 && failed === 0) {
                                            // Attachments were uploaded but not fetched - this indicates a display issue
                                            console.warn('Attachments uploaded but not visible - possible RLS or fetch issue');
                                            setMessages(prev => prev.map(m =>
                                                m.id === newMsg.id
                                                    ? { ...m, content: m.content + ' (Attachments uploaded but may not be visible)' }
                                                    : m
                                            ));
                                        }
                                    }).catch(fetchError => {
                                        console.error('Failed to fetch attachments:', fetchError);
                                        setMessages(prev => prev.map(m =>
                                            m.id === newMsg.id
                                                ? { ...m, content: m.content + ' (Failed to load attachments)' }
                                                : m
                                        ));
                                    });
                                }, 500);
                            })
                            .catch(err => console.error('Error uploading attachments:', err));

                        // Remove from pending (delete both correlation and content keys)
                        if (serverCorrelationId) pendingAttachmentsRef.current.delete(serverCorrelationId);
                        pendingAttachmentsRef.current.delete(newMsg.content);
                    } else {
                        // Always try to fetch attachments (for messages from other users)
                        setTimeout(() => {
                            getMessageAttachments(newMsg.id).then(attachments => {
                                if (attachments.length > 0) {
                                    console.log('Fetched attachments from other user:', attachments.length);
                                    setMessageAttachments(prevMap => new Map<string, MessageAttachment[]>(prevMap).set(newMsg.id, attachments));
                                }
                            });
                        }, 300);
                    }
                }
            )
            .subscribe();

        return () => {
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
                    if (!sender || sender === String(user.id)) return;
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
    }, [selectedConversation?.id, user.id]);

    const loadConversations = async () => {
        setIsLoading(true);
        try {
            const data = await getConversations(user.id);
            setConversations(data);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMessages = async (conversationId: string) => {
        if (!conversationId) return;

        setIsLoadingMessages(true);
        try {
            const data = await getConversationMessages(conversationId);
            setMessages(data);

            // Process attachments returned by the RPC
            const newAttachmentsMap = new Map(messageAttachments);
            let hasNew = false;

            for (const msg of data) {
                if ((msg as any).attachments && Array.isArray((msg as any).attachments) && (msg as any).attachments.length > 0) {
                    const mappedAtts: MessageAttachment[] = await Promise.all((msg as any).attachments.map(async (a: any) => ({
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

            // Fallback for background fetching if needed
            void (async () => {
                const idsToFetch = (data || [])
                    .slice(-20)
                    .map(m => String(m.id))
                    .filter(id => id && !newAttachmentsMap.has(id) && !id.startsWith('temp-'));

                for (const id of idsToFetch) {
                    try {
                        const atts = await getMessageAttachments(id);
                        if (atts.length > 0) {
                            setMessageAttachments(prev => new Map(prev).set(id, atts));
                        }
                    } catch { /* ignore */ }
                }
            })();

            // Mark as read
            if (data.length > 0) {
                const unread = data.some(m => !m.is_read && m.sender_id !== user.id);
                if (unread) {
                    markMessagesRead(conversationId, user.id);
                }
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsLoadingMessages(false);
            setShouldAutoScroll(true);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();

        const messageContent = newMessage.trim();
        const filesToUpload = [...selectedFiles];

        if ((!messageContent && filesToUpload.length === 0) || !selectedConversation || isSending) return;

        setIsSending(true);

        const correlationId = `cid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tempId = `temp-${correlationId}`;
        const contentToSend = messageContent || 'Attachment';

        const productContext = selectedConversation?.product_id
            ? {
                product_id: String(selectedConversation.product_id),
                product_title: selectedConversation.product_title || undefined,
                product_image: selectedConversationProductImage || undefined
            }
            : null;

        const messageMetadata = {
            correlationId,
            ...(productContext ? productContext : {})
        };

        // Optimistic update
        const optimisticMessage: Message = {
            id: tempId,
            conversation_id: selectedConversation.id,
            sender_id: user.id,
            receiver_id: '', // Will be filled by server or derived
            content: contentToSend,
            created_at: new Date().toISOString(),
            is_read: false
        };

        // Attach correlation id in optimistic message metadata so realtime insertion can match it
        (optimisticMessage as any).metadata = messageMetadata;

        if (filesToUpload.length > 0) {
            const localAttachments: MessageAttachment[] = filesToUpload.map((file, idx) => {
                const url = getOrCreatePreviewUrl(file);
                return {
                    id: `local-${correlationId}-${idx}`,
                    message_id: tempId,
                    file_name: file.name,
                    storage_path: '',
                    file_type: file.type || null,
                    file_size: file.size,
                    created_at: new Date().toISOString(),
                    signedUrl: url
                } as MessageAttachment;
            });
            setMessageAttachments(prevMap => new Map(prevMap).set(tempId, localAttachments));
        }

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        setSelectedFiles([]);
        setShouldAutoScroll(true);

        if (filesToUpload.length > 0) {
            pendingAttachmentsRef.current.set(correlationId, filesToUpload);
            // Fallback key for older server paths that don't return metadata
            pendingAttachmentsRef.current.set(contentToSend, filesToUpload);
        }

        try {
            let receiverId = ''; // Let server derive it if possible

            // Try to find receiver locally
            // First: try to read participants directly from the conversations table (most reliable)
            try {
                const parts = await getConversationParticipants(selectedConversation.id);
                if (parts) {
                    const maybe = (v: any) => (v === undefined || v === null) ? undefined : String(v);
                    const found = [maybe(parts.seller_id), maybe(parts.buyer_id)].find(c => c && c !== user.id);
                    if (found) receiverId = found as string;
                }
            } catch (err) {
                console.error('Error fetching conversation participants directly', err);
            }

            if (!receiverId) {
                // Next: try to refresh the conversation list and pick up normalized fields
                try {
                    const freshConvs = await getConversations(user.id);
                    const fresh = freshConvs.find(c => c.id === selectedConversation.id);
                    if (fresh) {
                        const maybe = (v: any) => (v === undefined || v === null) ? undefined : String(v);
                        const candidates = [maybe(fresh.seller_id), maybe(fresh.buyer_id), maybe((fresh as any).seller_uid), maybe((fresh as any).buyer_uid), maybe((fresh as any).seller), maybe((fresh as any).buyer)];
                        const found = candidates.find(c => c && c !== user.id);
                        if (found) receiverId = found as string;
                    }
                } catch (err) {
                    console.error('Error refreshing conversations to derive receiverId', err);
                }
            }

            // Second: try to derive participant id from recent messages as a fallback
            if (!receiverId) {
                try {
                    const recent = await getConversationMessages(selectedConversation.id, 10, 0);
                    if (Array.isArray(recent) && recent.length > 0) {
                        // find a participant id that's not the current user
                        const otherFromMsgs = recent.map(m => [m.sender_id, m.receiver_id]).flat().find(id => id && id !== user.id);
                        if (otherFromMsgs) receiverId = String(otherFromMsgs);
                    }
                } catch (err) {
                    console.error('Error fetching recent messages to derive receiverId', err);
                }
            }

            if (!receiverId) {
                // Couldn't derive receiverId client-side. Let the server derive it via `send_message` RPC.
                console.warn('Could not determine receiverId for conversation; proceeding to call server RPC to derive receiver', { conversation: selectedConversation.id, userId: user.id });
                // Use empty string to signal server-derived path in `lib/api.sendMessage`
                receiverId = '';
            }

            // Direct insert instead of RPC to get ID immediately
            const { data: sentMsg, error: sendError } = await supabase
                .from('messages')
                .insert({
                    conversation_id: selectedConversation.id,
                    sender_id: user.id,
                    receiver_id: receiverId || null,
                    content: contentToSend,
                    metadata: messageMetadata
                })
                .select()
                .single();

            if (sendError || !sentMsg) throw sendError || new Error('Failed to send message');

            if (filesToUpload.length > 0) {
                const results = await Promise.all(filesToUpload.map(file => uploadMessageAttachment(String(sentMsg.id), file)));

                const attachments = await getMessageAttachments(String(sentMsg.id));
                if (attachments.length > 0) {
                    setMessageAttachments(prevMap => {
                        const next = new Map<string, MessageAttachment[]>(prevMap);
                        next.set(String(sentMsg.id), attachments);
                        return next;
                    });
                }
                pendingAttachmentsRef.current.delete(correlationId);
                pendingAttachmentsRef.current.delete(contentToSend);
            }

            // Refresh conversations to show latest message in sidebar
            loadConversations();

            // Replace optimistic message with real message
            setMessages(prev => prev.map(m => m.id === optimisticMessage.id ? sentMsg : m));

            // Optimistically update the specific conversation in the list as well
            setConversations(prev => prev.map(c =>
                c.id === selectedConversation.id
                    ? { ...c, last_message: messageContent, last_message_at: new Date().toISOString() }
                    : c
            ));
        } catch (error) {
            console.error('Error sending message:', error);
            // Revert on error
            setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
            setNewMessage(messageContent);
            setSelectedFiles(filesToUpload);
            pendingAttachmentsRef.current.delete(correlationId);
            pendingAttachmentsRef.current.delete(contentToSend);
            setMessageAttachments(prevMap => {
                const next = new Map<string, MessageAttachment[]>(prevMap);
                const atts = next.get(tempId) || [];
                for (const att of atts) {
                    if (att.id?.startsWith('local-') && att.signedUrl?.startsWith('blob:')) {
                        try {
                            URL.revokeObjectURL(att.signedUrl);
                        } catch {
                            // ignore
                        }
                    }
                }
                next.delete(tempId);
                return next;
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            console.log('Files selected:', e.target.files.length);
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles(prev => {
            const file = prev[index];
            if (file) revokePreviewUrl(file);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedConversation(conv);
        setMessages([]);
        loadMessages(conv.id);
        if (compactMode || window.innerWidth < 768) setShowList(false);
        // Mark as read immediately
        if (conv.unread_count > 0) {
            markMessagesRead(conv.id, user.id);
            setConversations(prev => prev.map(c =>
                c.id === conv.id ? { ...c, unread_count: 0 } : c
            ));
        }
    };

    const handleBackToList = () => {
        setShowList(true);
        setSelectedConversation(null);
    };

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const rootHeightClass = compactMode ? 'h-full' : 'h-[calc(100vh-64px)]';

    const listWidthClass = compactMode ? 'w-full' : 'w-full md:w-80';

    return (
        <div className={`flex ${rootHeightClass} overflow-hidden`}>
            {/* Sidebar */}
            <div className={`${listWidthClass} border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col ${compactMode ? (showList ? 'flex' : 'hidden') : (showList ? 'flex' : 'hidden md:flex')}`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Messages</h2>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search messages..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg text-sm focus:ring-2 focus:ring-orange-500/50"
                        />
                        <span className="material-icons absolute left-3 top-2.5 text-gray-400 text-lg">search</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>No conversations yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    onClick={() => handleSelectConversation(conv)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative group ${selectedConversation?.id === conv.id ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`font-bold text-sm truncate pr-2 ${selectedConversation?.id === conv.id ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'}`}>
                                            {conv.other_user_name || 'Unknown User'}
                                        </h3>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                            {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                                        </span>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-500 overflow-hidden">
                                            {conv.other_user_avatar ? (
                                                <img src={conv.other_user_avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-lg">{conv.other_user_name?.charAt(0) || '?'}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-slate-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {conv.last_message || <span className="italic text-gray-400">[Empty Message]</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedConversation?.id === conv.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 ${compactMode ? (showList ? 'hidden' : 'flex') : (showList ? 'hidden md:flex' : 'flex')}`}>
                {selectedConversation ? (
                    <>
                        <div className="h-16 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center gap-4">
                                <button onClick={handleBackToList} className={`${compactMode ? '' : 'md:hidden'} text-gray-500 hover:text-slate-900`}>
                                    <span className="material-icons">arrow_back</span>
                                </button>

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-lg border-2 border-white dark:border-gray-700 shadow-sm">
                                        {selectedConversation.other_user_avatar ? (
                                            <img src={selectedConversation.other_user_avatar} alt="" className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            selectedConversation.other_user_name?.charAt(0) || '?'
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                                            {selectedConversation.other_user_name || 'Unknown User'}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span
                                                className={
                                                    `w-2 h-2 rounded-full ` +
                                                    (isOnlineFromLastSeen(otherLastSeenAt)
                                                        ? 'bg-emerald-500'
                                                        : 'bg-gray-300 dark:bg-gray-600')
                                                }
                                            />
                                            <span className={
                                                `text-[11px] font-bold uppercase tracking-widest ` +
                                                (otherTyping
                                                    ? 'text-orange-600 dark:text-orange-400'
                                                    : (isOnlineFromLastSeen(otherLastSeenAt)
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-gray-400'))
                                            }>
                                                {otherTyping ? 'Typing…' : (isOnlineFromLastSeen(otherLastSeenAt) ? 'Online' : formatLastSeen(otherLastSeenAt))}
                                            </span>
                                        </div>
                                        {selectedConversation.product_title && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <span>Regarding:</span>
                                                <span className="font-medium text-slate-700 dark:text-gray-300 truncate max-w-[200px]">{selectedConversation.product_title}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <span className="material-icons">settings</span>
                            </button>
                        </div>
                        {selectedConversation.product_title && (
                            <div className="px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-900 overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                                    {selectedConversationProductImage ? (
                                        <img src={selectedConversationProductImage} alt={selectedConversation.product_title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                                            <span className="material-icons text-xl">image</span>
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest">Inquiry About</div>
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{selectedConversation.product_title}</div>
                                </div>
                                {selectedConversation.product_id && (
                                    <button
                                        type="button"
                                        onClick={() => openProduct(selectedConversation.product_id)}
                                        className="text-xs font-bold text-white bg-black px-4 py-2 rounded-full hover:opacity-90"
                                    >
                                        View Product
                                    </button>
                                )}
                            </div>
                        )}

                        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900">
                            {isLoadingMessages ? (
                                <div className="flex justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <span className="material-icons text-5xl text-gray-300">chat</span>
                                    </div>
                                    <p>No messages yet</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.sender_id === user.id;
                                    const attachments = messageAttachments.get(msg.id) || [];
                                    const isPending = isMe && String(msg.id || '').startsWith('temp-');
                                    const productRef = getMessageProductRef((msg as any)?.metadata);

                                    return (
                                        <div key={msg.id || `msg-${idx}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className="max-w-[70%]">
                                                <div className={`rounded-2xl px-5 py-3 text-sm shadow-sm ${isMe
                                                    ? 'bg-orange-500 text-white rounded-br-none'
                                                    : 'bg-white dark:bg-gray-800 text-slate-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                                                    }`}>
                                                    {productRef && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openProduct(productRef.id)}
                                                            className={`w-full mb-3 text-left rounded-xl border overflow-hidden ${isMe ? 'border-white/30 bg-white/10 hover:bg-white/15' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/60'}`}
                                                        >
                                                            <div className="flex items-center gap-3 p-3">
                                                                <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ${isMe ? 'bg-white/15' : 'bg-white dark:bg-gray-800'}`}>
                                                                    {productRef.image ? (
                                                                        <img src={productRef.image} alt={productRef.title || 'Product'} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className={`w-full h-full flex items-center justify-center ${isMe ? 'text-white/70' : 'text-gray-300 dark:text-gray-600'}`}>
                                                                            <span className="material-icons text-xl">shopping_bag</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className={`text-[10px] font-bold uppercase tracking-widest ${isMe ? 'text-white/80' : 'text-orange-600 dark:text-orange-400'}`}>Product</div>
                                                                    <div className={`text-sm font-semibold truncate ${isMe ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{productRef.title || 'View product'}</div>
                                                                </div>
                                                                <span className={`material-icons text-lg ${isMe ? 'text-white/90' : 'text-gray-400 dark:text-gray-500'}`}>chevron_right</span>
                                                            </div>
                                                        </button>
                                                    )}
                                                    {msg.content && <p className="leading-relaxed">{msg.content}</p>}

                                                    {/* Display attachments */}
                                                    {attachments.length > 0 && (
                                                        <div className="mt-2 space-y-2">
                                                            {attachments.map((attachment, index) => {
                                                                const isImage = attachment.file_type?.startsWith('image/');

                                                                return isImage ? (
                                                                    <a
                                                                        key={attachment.id || `att-${index}`}
                                                                        href={attachment.signedUrl || '#'}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="block rounded-lg overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                                                                    >
                                                                        <MessageImageAttachment src={attachment.signedUrl} alt={attachment.file_name} />
                                                                    </a>
                                                                ) : (
                                                                    <a
                                                                        key={attachment.id || `att-${index}`}
                                                                        href={attachment.signedUrl || '#'}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-gray-50 group ${isMe
                                                                                ? 'bg-orange-600/10 border-orange-600/20 text-orange-900'
                                                                                : 'bg-gray-100 border-gray-200 text-gray-900'
                                                                            }`}
                                                                    >
                                                                        <div className={`p-2 rounded-lg ${isMe ? 'bg-orange-600/20' : 'bg-white shadow-sm'}`}>
                                                                            <span className="material-icons text-xl">
                                                                                {attachment.file_type?.includes('pdf') ? 'picture_as_pdf' : 'description'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-sm font-semibold truncate">{attachment.file_name}</div>
                                                                            {attachment.file_size && (
                                                                                <p className={`text-xs ${isMe ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                                                                    {(attachment.file_size / 1024).toFixed(1)} KB
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <span className={`material-icons text-sm ${isMe ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                                            download
                                                                        </span>
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? 'justify-end text-gray-400' : 'justify-start text-gray-400'}`}>
                                                    {formatTime(msg.created_at)}
                                                    {isMe && (
                                                        isPending ? (
                                                            <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                                                <span className="material-icons text-[10px]">schedule</span>
                                                                <span className="font-bold">Sending…</span>
                                                            </span>
                                                        ) : (
                                                            <span className="material-icons text-[10px]">
                                                                {msg.is_read ? 'done_all' : 'check'}
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

                        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                            {otherTyping && (
                                <div className="mb-2 px-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {selectedConversation.other_user_name || 'User'} is typing…
                                </div>
                            )}
                            {/* Selected files preview (Instagram-like) */}
                            {selectedFiles.length > 0 && (
                                <div className="mb-3 px-2">
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {selectedFiles.map((file, index) => {
                                            const isImage = (file.type || '').startsWith('image/');
                                            const previewUrl = isImage ? getOrCreatePreviewUrl(file) : '';
                                            const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';

                                            return (
                                                <div
                                                    key={`${file.name}-${file.size}-${index}`}
                                                    className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex-shrink-0"
                                                >
                                                    {isImage ? (
                                                        <img
                                                            src={previewUrl}
                                                            alt={file.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-center px-2">
                                                            <span className="material-icons text-gray-500">description</span>
                                                            <div className="text-[10px] font-bold text-gray-600 dark:text-gray-200 mt-1">{ext}</div>
                                                        </div>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => removeSelectedFile(index)}
                                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/70"
                                                        aria-label="Remove attachment"
                                                    >
                                                        <span className="material-icons text-[14px]">close</span>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-2 text-[11px] font-bold text-gray-400">
                                        {selectedFiles.length} attachment{selectedFiles.length === 1 ? '' : 's'} selected
                                    </div>
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
                                        onChange={handleFileChange}
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
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        multiple
                                    />
                                    <span className="material-icons">attach_file</span>
                                </label>
                                <button type="button" className="hover:text-orange-500 transition-colors" title="More options (coming soon)">
                                    <span className="material-icons">grid_view</span>
                                </button>
                            </div>
                            <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                                <div className="flex-1 relative">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            maybeBroadcastTyping();
                                        }}
                                        placeholder="Write your questions here..."
                                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 transition-all resize-none text-sm"
                                        rows={1}
                                        disabled={isSending}
                                        onKeyDown={(e) => {
                                            if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
                                                maybeBroadcastTyping();
                                            }
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={(!newMessage.trim() && selectedFiles.length === 0) || isSending}
                                    className="px-6 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2"
                                >
                                    <span>{isUploading ? 'Uploading...' : 'Send'}</span>
                                    <span className="material-icons text-sm transform -rotate-45 mb-1">{isSending ? 'hourglass_empty' : 'send'}</span>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-8 text-center">
                        <div className="w-32 h-32 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <span className="material-icons text-6xl text-orange-200 dark:text-orange-900">chat_bubble</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">My Messages</h3>
                        <p className="text-gray-500 max-w-xs">Select a conversation from the list to start chatting with sellers.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesView;
