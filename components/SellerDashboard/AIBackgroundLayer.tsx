import React, { useEffect, useRef } from 'react';

export const AI_WORKER_URL = '/ai-worker.html';

const AIBackgroundLayer: React.FC = () => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        // Log when the component mounts (dashboard loads)
        console.log('[AIBackgroundLayer] Mounting background AI worker...');

        const handler = (event: MessageEvent) => {
            if (event.data?.type === 'READY') {
                console.log('[AIBackgroundLayer] AI Worker is ready and cached.');
            }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    return (
        <iframe
            ref={iframeRef}
            src={AI_WORKER_URL}
            id="ai-worker-frame"
            title="ai-worker"
            style={{
                width: 0,
                height: 0,
                border: 'none',
                position: 'absolute',
                visibility: 'hidden',
                pointerEvents: 'none',
                zIndex: -1
            }}
            aria-hidden="true"
        />
    );
};

export default AIBackgroundLayer;
