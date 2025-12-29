export class EmbeddingService {
    private static instance: EmbeddingService;
    private workerFrame: HTMLIFrameElement | null = null;
    private pendingRequests: Map<string, { resolve: (value: number[]) => void, reject: (reason: any) => void, timeout: any, blobUrlToRevoke?: string }> = new Map();
    private isWorkerReady: boolean = false;
    private workerCreationPromise: Promise<void> | null = null;

    private readonly AI_WORKER_ID = 'ai-worker-frame';
    private readonly TIMEOUT_MS = 45000;
    private readonly MAX_RETRIES = 3;

    private constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('message', this.handleMessage.bind(this));
        }
    }

    public static getInstance(): EmbeddingService {
        if (!EmbeddingService.instance) {
            EmbeddingService.instance = new EmbeddingService();
        }
        return EmbeddingService.instance;
    }

    public isReady(): boolean {
        return this.isWorkerReady;
    }

    private handleMessage(event: MessageEvent) {
        const { type, id, embedding, error, ready } = event.data;

        if (type === 'transformers-iframe-ready') {
            console.log('[EmbeddingService] AI Worker reported ready.');
            this.isWorkerReady = true;
            return;
        }

        if (type === 'transformers-embed-response' && id) {
            const request = this.pendingRequests.get(id);
            if (request) {
                clearTimeout(request.timeout);
                if (request.blobUrlToRevoke) {
                    URL.revokeObjectURL(request.blobUrlToRevoke);
                }
                this.pendingRequests.delete(id);

                if (error) {
                    console.error('[EmbeddingService] Worker error:', error);
                    request.reject(new Error(error));
                } else {
                    request.resolve(embedding);
                }
            }
        }
    }

    private getWorkerFrame(): HTMLIFrameElement | null {
        if (!this.workerFrame) {
            this.workerFrame = document.querySelector(`iframe#${this.AI_WORKER_ID}`);
        }
        return this.workerFrame;
    }

    /**
     * Ensures the worker is ready. Waits for the existing iframe to signal readiness.
     * Note: The iframe is created by AIBackgroundLayer in the layout.
     * The model download can take 1-2 minutes on slow connections.
     */
    public async ensureInitialized(attempt = 1): Promise<void> {
        if (this.isWorkerReady) return;

        const frame = this.getWorkerFrame();
        if (!frame) {
            console.warn('[EmbeddingService] Worker frame not found in DOM.');
            // We rely on AIBackgroundLayer to mount it.
            // If it's missing, we can't do much but wait.
        }

        // Wait for readiness signal - model download can take 1-2 minutes
        return new Promise((resolve, reject) => {
            if (this.isWorkerReady) {
                resolve();
                return;
            }

            // Extended timeout: 120 seconds (600 checks × 200ms) to allow full model download
            let checkCount = 0;
            const MAX_CHECKS = 600; // 120 seconds total wait time
            const CHECK_INTERVAL = 200; // Check every 200ms

            const checkInterval = setInterval(() => {
                checkCount++;
                if (this.isWorkerReady) {
                    clearInterval(checkInterval);
                    console.log('[EmbeddingService] Model is now ready for embedding generation.');
                    resolve();
                } else if (checkCount > MAX_CHECKS) {
                    clearInterval(checkInterval);
                    console.warn('[EmbeddingService] Model initialization timed out after 120 seconds. Model may still be downloading.');
                    // Don't resolve - reject to indicate model is not ready
                    reject(new Error('Model initialization timed out. Please wait for the model to finish downloading.'));
                } else if (checkCount % 50 === 0) {
                    // Log progress every 10 seconds
                    console.log(`[EmbeddingService] Waiting for model... (${checkCount * CHECK_INTERVAL / 1000}s elapsed)`);
                }
            }, CHECK_INTERVAL);
        });
    }

    public async generateTextEmbedding(text: string): Promise<number[]> {
        // Text embedding not currently supported by vision-only worker
        console.warn('[EmbeddingService] Text embedding requested but worker is vision-only.');
        return new Array(512).fill(0);
    }

    /**
     * Preloads the model worker to ensure it's ready for requests.
     * Useful to call on app load or admin login.
     */
    public async preloadModel(): Promise<void> {
        console.log('[EmbeddingService] Preloading model...');
        await this.ensureInitialized();
        console.log('[EmbeddingService] Model preloaded.');
    }

    public async generateImageEmbedding(imageUrlOrBlob: string | Blob): Promise<number[]> {
        await this.ensureInitialized();

        // If input is a URL string, try to fetch it first in global scope to handle network errors better
        // and avoid worker "Failed to fetch" spam or QUIC errors.
        let blobInput: Blob | null = null;
        if (typeof imageUrlOrBlob === 'string' && imageUrlOrBlob.startsWith('http')) {
            try {
                // Pre-fetch image
                const response = await fetch(imageUrlOrBlob, { cache: 'no-cache' }); // Force fresh fetch usually helps with protocol errors? Or maybe just simple fetch.
                if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                blobInput = await response.blob();
            } catch (err) {
                console.warn('[EmbeddingService] Main thread fetch failed, falling back:', err);
                // If main thread fetch fails, we can't generate embedding. Return fallback immediately.
                return this.getFallbackEmbedding(imageUrlOrBlob);
            }
        }

        const inputToWorker = blobInput || imageUrlOrBlob;

        // Retry logic for worker communication
        for (let i = 0; i < this.MAX_RETRIES; i++) {
            try {
                return await this.sendRequest(inputToWorker);
            } catch (error) {
                console.warn(`[EmbeddingService] Attempt ${i + 1} failed:`, error);

                // If error is "Failed to fetch" from worker (meaning blob url failed?), it's unlikely to recover if it was valid blob.
                // But generally retry is fine.
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        console.error('[EmbeddingService] All attempts failed. Return fallback.');
        return this.getFallbackEmbedding(imageUrlOrBlob);
    }

    private async sendRequest(input: string | Blob): Promise<number[]> {
        return new Promise(async (resolve, reject) => {
            const frame = this.getWorkerFrame();
            if (!frame || !frame.contentWindow) {
                reject(new Error('AI Worker not available'));
                return;
            }

            const id = crypto.randomUUID();

            // Set timeout
            const timeout = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.get(id)?.reject(new Error('Embedding generation timed out'));
                    this.pendingRequests.delete(id);
                }
            }, this.TIMEOUT_MS);

            let blobUrlToRevoke: string | undefined;

            // Prepare payload
            const payload: any = { type: 'transformers-embed-request', id };

            if (input instanceof Blob) {
                // If blob, we can pass it as a blob URL to avoid large message cloning
                // The worker will fetch it.
                const blobUrl = URL.createObjectURL(input);
                payload.blobUrl = blobUrl;
                blobUrlToRevoke = blobUrl;
            } else if (typeof input === 'string') {
                // Assume URL (data or http)
                payload.dataUrl = input;
            }

            this.pendingRequests.set(id, { resolve, reject, timeout, blobUrlToRevoke });

            frame.contentWindow.postMessage(payload, '*');
        });
    }

    /**
     * Fallback: Generate a consistent random vector if AI fails.
     * Use when robust behavior is critical.
     */
    private async getFallbackEmbedding(input: string | Blob): Promise<number[]> {
        console.warn('[EmbeddingService] Generating fallback embedding.');
        // Simple hash-based embedding for consistency
        const seed = input instanceof Blob ? input.size : input.length;
        const embedding = new Array(512);
        for (let i = 0; i < 512; i++) {
            embedding[i] = Math.sin(seed + i);
        }
        return embedding;
    }
}
