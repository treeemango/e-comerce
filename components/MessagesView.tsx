import React, { useState, useEffect, useRef } from 'react';
import { User, Conversation, Message } from '../types';
import { getConversations, getConversationMessages, sendMessage, markMessagesRead, getConversationParticipants } from '../lib/api';
import { uploadMessageAttachment, getMessageAttachments, MessageAttachment } from '../lib/attachments-api';
import { supabase } from '../lib/supabase';

interface MessagesViewProps {
    user: User;
    activeConversationId?: string | null;
}

const MessagesView: React.FC<MessagesViewProps> = ({ user, activeConversationId }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
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
    const [pendingAttachments, setPendingAttachments] = useState<Map<string, File[]>>(new Map()); // Map: correlationId -> files

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, [user.id]);

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

                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        const filtered = prev.filter(m =>
                            !(m.id.toString().startsWith('temp-') &&
                                m.content === newMsg.content &&
                                m.sender_id === newMsg.sender_id)
                        );
                        return [...filtered, newMsg];
                    });

                    setShouldAutoScroll(true);

                    setConversations(prev => prev.map(c =>
                        c.id === selectedConversation.id
                            ? { ...c, last_message: newMsg.content, last_message_at: newMsg.created_at }
                            : c
                    ));

                    // Prefer matching pending attachments by server-returned correlation id (metadata.correlationId)
                    const serverCorrelationId = (newMsg as any)?.metadata?.correlationId;
                    let pendingFiles: File[] | undefined = undefined;
                    if (serverCorrelationId) {
                        pendingFiles = pendingAttachments.get(serverCorrelationId);
                    }

                    // Fallback to legacy content-based matching for backward compatibility
                    if (!pendingFiles) pendingFiles = pendingAttachments.get(newMsg.content);

                    if (pendingFiles && pendingFiles.length > 0) {
                        console.log('Found pending attachments for message:', serverCorrelationId || newMsg.content, pendingFiles.length);
                        // Upload attachments with real message ID
                        Promise.all(pendingFiles.map(file => uploadMessageAttachment(newMsg.id, file)))
                            .then(() => {
                                console.log('Attachments uploaded, fetching...');
                                // Small delay to ensure DB is updated
                                setTimeout(() => {
                                    getMessageAttachments(newMsg.id).then(attachments => {
                                        console.log('Fetched attachments:', attachments.length);
                                        if (attachments.length > 0) {
                                            setMessageAttachments(prevMap => new Map(prevMap).set(newMsg.id, attachments));
                                        }
                                    });
                                }, 500);
                            })
                            .catch(err => console.error('Error uploading attachments:', err));

                        // Remove from pending (delete both correlation and content keys)
                        setPendingAttachments(prev => {
                            const newMap = new Map(prev);
                            if (serverCorrelationId) newMap.delete(serverCorrelationId);
                            newMap.delete(newMsg.content);
                            return newMap;
                        });
                    } else {
                        // Always try to fetch attachments (for messages from other users)
                        setTimeout(() => {
                            getMessageAttachments(newMsg.id).then(attachments => {
                                if (attachments.length > 0) {
                                    console.log('Fetched attachments from other user:', attachments.length);
                                    setMessageAttachments(prevMap => new Map(prevMap).set(newMsg.id, attachments));
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

        // Optimistic update
        const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            conversation_id: selectedConversation.id,
            sender_id: user.id,
            receiver_id: '', // Will be filled by server or derived
            content: messageContent,
            created_at: new Date().toISOString(),
            is_read: false
        };

        // Attach correlation id in optimistic message metadata so realtime insertion can match it
        const correlationId = `cid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        (optimisticMessage as any).metadata = { correlationId };

        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
        setSelectedFiles([]);
        setShouldAutoScroll(true);

        if (filesToUpload.length > 0) {
            setPendingAttachments(prev => new Map(prev).set(correlationId, filesToUpload));
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

            // Pass correlation id via metadata so server returns it in the inserted row
            const success = await sendMessage(
                selectedConversation.id,
                user.id,
                receiverId,
                messageContent,
                { correlationId }
            );

            if (!success) {
                setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
                setNewMessage(messageContent);
                setSelectedFiles(filesToUpload);
                setPendingAttachments(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(messageContent);
                    return newMap;
                });
            } else {
                // Refresh conversations to show latest message in sidebar
                loadConversations();

                // Optimistically update the specific conversation in the list as well
                setConversations(prev => prev.map(c =>
                    c.id === selectedConversation.id
                        ? { ...c, last_message: messageContent, last_message_at: new Date().toISOString() }
                        : c
                ));
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Revert on error
            setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
            setNewMessage(messageContent);
            setSelectedFiles(filesToUpload);
        } finally {
            setIsSending(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
    };

    const handleFileSelect = (type: 'image' | 'file') => {
        if (type === 'image') imageInputRef.current?.click();
        else fileInputRef.current?.click();
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedConversation(conv);
        setMessages([]);
        loadMessages(conv.id);
        if (window.innerWidth < 768) setShowList(false);
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

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Sidebar */}
            <div className={`w-full md:w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col ${showList ? 'flex' : 'hidden md:flex'}`}>
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

            <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 ${showList ? 'hidden md:flex' : 'flex'}`}>
                {selectedConversation ? (
                    <>
                        <div className="h-16 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center gap-4">
                                <button onClick={handleBackToList} className="md:hidden text-gray-500 hover:text-slate-900">
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
                                            {selectedConversation.other_user_name}
                                        </h3>
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

                                    return (
                                        <div key={msg.id || `msg-${idx}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className="max-w-[70%]">
                                                <div className={`rounded-2xl px-5 py-3 text-sm shadow-sm ${isMe
                                                    ? 'bg-orange-500 text-white rounded-br-none'
                                                    : 'bg-white dark:bg-gray-800 text-slate-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                                                    }`}>
                                                    {msg.content && <p className="leading-relaxed">{msg.content}</p>}

                                                    {/* Display attachments */}
                                                    {attachments.length > 0 && (
                                                        <div className="mt-2 space-y-2">
                                                            {attachments.map((attachment, index) => {
                                                                const isImage = attachment.file_type?.startsWith('image/');

                                                                return isImage ? (
                                                                    <a
                                                                        key={attachment.id || `att-${index}`}
                                                                        href={attachment.signedUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                                                                    >
                                                                        <img
                                                                            src={attachment.signedUrl}
                                                                            alt={attachment.file_name}
                                                                            className="max-w-full h-auto rounded-lg"
                                                                            style={{ maxHeight: '300px' }}
                                                                        />
                                                                    </a>
                                                                ) : (
                                                                    <a
                                                                        key={attachment.id || `att-file-${index}`}
                                                                        href={attachment.signedUrl}
                                                                        download={attachment.file_name}
                                                                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isMe
                                                                            ? 'bg-orange-600 hover:bg-orange-700'
                                                                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                                            }`}
                                                                    >
                                                                        <span className={`material-icons ${isMe ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                                            description
                                                                        </span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className={`text-sm font-medium truncate ${isMe ? 'text-white' : 'text-slate-800 dark:text-gray-200'}`}>
                                                                                {attachment.file_name}
                                                                            </p>
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
                                                        <span className="material-icons text-[10px]">
                                                            {msg.is_read ? 'done_all' : 'check'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                            {/* Hidden file inputs */}
                            <input
                                type="file"
                                ref={imageInputRef}
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                multiple
                            />
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".pdf,.doc,.docx,.zip"
                                onChange={handleFileChange}
                                className="hidden"
                                multiple
                            />

                            {/* Selected files preview */}
                            {selectedFiles.length > 0 && (
                                <div className="flex gap-2 flex-wrap mb-3 px-2">
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                                            <span className="material-icons text-xs text-gray-500">attach_file</span>
                                            <span className="text-gray-700 dark:text-gray-300 max-w-[150px] truncate">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeSelectedFile(index)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-icons text-xs">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-4 items-center mb-3 px-2 text-gray-400">
                                <button type="button" className="hover:text-orange-500 transition-colors" title="Emoji (coming soon)">
                                    <span className="material-icons">sentiment_satisfied_alt</span>
                                </button>
                                <button type="button" onClick={() => handleFileSelect('image')} className="hover:text-orange-500 transition-colors" title="Upload image">
                                    <span className="material-icons">image</span>
                                </button>
                                <button type="button" onClick={() => handleFileSelect('file')} className="hover:text-orange-500 transition-colors" title="Attach file">
                                    <span className="material-icons">attach_file</span>
                                </button>
                                <button type="button" className="hover:text-orange-500 transition-colors" title="More options (coming soon)">
                                    <span className="material-icons">grid_view</span>
                                </button>
                            </div>
                            <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                                <div className="flex-1 relative">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Write your questions here..."
                                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 transition-all resize-none text-sm"
                                        rows={1}
                                        disabled={isSending}
                                        onKeyDown={(e) => {
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
