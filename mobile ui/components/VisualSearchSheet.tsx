import React, { useState, useRef, useCallback, useEffect } from 'react';
import { aiService } from '@/lib/ai-service';

interface VisualSearchSheetProps {
    onClose: () => void;
    onSearchResults: (searchQuery: string, keywords: string[]) => void;
}

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

const VisualSearchSheet: React.FC<VisualSearchSheetProps> = ({ onClose, onSearchResults }) => {
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState<string>('');
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [cropArea, setCropArea] = useState<CropArea | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState<'move' | 'resize' | null>(null);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number } | null>(null);
    const [resizeCenter, setResizeCenter] = useState<{ x: number; y: number } | null>(null);
    const [cropCursor, setCropCursor] = useState<React.CSSProperties['cursor']>('default');
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number; offsetX: number; offsetY: number } | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cropCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const startCamera = async () => {
        try {
            if (!window.isSecureContext) {
                alert('Camera requires HTTPS (or localhost). Please open the site over https://');
                return;
            }
            if (!navigator.mediaDevices?.getUserMedia) {
                alert('Camera is not supported in this browser.');
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });

            setCameraStream(stream);
            setIsCapturing(true);
        } catch (err) {
            console.error('Camera access denied:', err);
            alert('Unable to access camera. Please allow camera permissions and try again.');
        }
    };

    const stopCamera = () => {
        const video = videoRef.current;
        if (video) {
            try {
                video.pause();
            } catch {
                // ignore
            }
            video.srcObject = null;
        }

        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }

        setIsCapturing(false);
    };

    // Attach the stream after the <video> element mounts.
    // (The video is conditionally rendered, so refs are null during startCamera.)
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isCapturing && cameraStream) {
            if (video.srcObject !== cameraStream) {
                video.srcObject = cameraStream;
            }

            const playWhenReady = () => {
                const p = video.play();
                if (p && typeof (p as Promise<void>).catch === 'function') {
                    (p as Promise<void>).catch(() => {
                        // autoplay can be blocked in some environments; user can retry.
                    });
                }
            };

            if (video.readyState >= 1) {
                playWhenReady();
            } else {
                video.onloadedmetadata = () => playWhenReady();
            }

            return;
        }

        if (video.srcObject) {
            video.srcObject = null;
        }
    }, [cameraStream, isCapturing]);

    // Ensure we stop tracks if the sheet unmounts.
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video.videoWidth || !video.videoHeight) return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setCapturedImage(imageDataUrl);
                stopCamera();
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCapturedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Calculate image dimensions for proper crop area mapping
    const updateImageDimensions = useCallback(() => {
        if (imageRef.current && imageContainerRef.current) {
            const img = imageRef.current;
            const container = imageContainerRef.current;
            const containerRect = container.getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();

            setImageDimensions({
                width: imgRect.width,
                height: imgRect.height,
                offsetX: imgRect.left - containerRect.left,
                offsetY: imgRect.top - containerRect.top
            });
        }
    }, []);

    useEffect(() => {
        if (capturedImage && isCropping) {
            // Wait for image to load before calculating dimensions
            const timer = setTimeout(updateImageDimensions, 100);
            window.addEventListener('resize', updateImageDimensions);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateImageDimensions);
            };
        }
    }, [capturedImage, isCropping, updateImageDimensions]);

    const clampCropToImage = useCallback((area: CropArea): CropArea => {
        if (!imageDimensions) return area;

        const minX = imageDimensions.offsetX;
        const minY = imageDimensions.offsetY;
        const maxX = imageDimensions.offsetX + imageDimensions.width;
        const maxY = imageDimensions.offsetY + imageDimensions.height;

        const width = Math.min(area.width, imageDimensions.width);
        const height = Math.min(area.height, imageDimensions.height);

        const x = Math.max(minX, Math.min(area.x, maxX - width));
        const y = Math.max(minY, Math.min(area.y, maxY - height));

        return { x, y, width, height };
    }, [imageDimensions]);

    const createDefaultCrop = useCallback((): CropArea | null => {
        if (!imageDimensions) return null;
        const size = Math.max(80, Math.floor(Math.min(imageDimensions.width, imageDimensions.height) * 0.7));
        const x = imageDimensions.offsetX + (imageDimensions.width - size) / 2;
        const y = imageDimensions.offsetY + (imageDimensions.height - size) / 2;
        return clampCropToImage({ x, y, width: size, height: size });
    }, [clampCropToImage, imageDimensions]);

    const resizeCrop = useCallback((direction: 'smaller' | 'larger') => {
        if (!cropArea || !imageDimensions) return;

        const step = Math.floor(Math.min(imageDimensions.width, imageDimensions.height) * 0.12);
        const delta = direction === 'larger' ? step : -step;

        const centerX = cropArea.x + cropArea.width / 2;
        const centerY = cropArea.y + cropArea.height / 2;

        const newSize = Math.max(80, cropArea.width + delta);
        const next = clampCropToImage({
            x: centerX - newSize / 2,
            y: centerY - newSize / 2,
            width: newSize,
            height: newSize
        });

        setCropArea(next);
    }, [clampCropToImage, cropArea, imageDimensions]);

    const getPointerClientXY = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) {
            const touch = e.touches[0] || e.changedTouches[0];
            return { clientX: touch?.clientX ?? 0, clientY: touch?.clientY ?? 0 };
        }
        return { clientX: e.clientX, clientY: e.clientY };
    };

    const getCropHover = useCallback((x: number, y: number) => {
        if (!cropArea) return { cursor: 'crosshair' as const, mode: null as null | 'move' | 'resize' };

        const withinCrop = (
            x >= cropArea.x &&
            x <= cropArea.x + cropArea.width &&
            y >= cropArea.y &&
            y <= cropArea.y + cropArea.height
        );

        if (!withinCrop) return { cursor: 'crosshair' as const, mode: null as null | 'move' | 'resize' };

        const border = 12;
        const distLeft = Math.abs(x - cropArea.x);
        const distRight = Math.abs((cropArea.x + cropArea.width) - x);
        const distTop = Math.abs(y - cropArea.y);
        const distBottom = Math.abs((cropArea.y + cropArea.height) - y);

        const nearLeft = distLeft <= border;
        const nearRight = distRight <= border;
        const nearTop = distTop <= border;
        const nearBottom = distBottom <= border;

        const onBorder = nearLeft || nearRight || nearTop || nearBottom;
        if (!onBorder) return { cursor: 'move' as const, mode: 'move' as const };

        // Corner/edge resize cursors are the common "double arrow" affordance.
        if ((nearLeft && nearTop) || (nearRight && nearBottom)) return { cursor: 'nwse-resize' as const, mode: 'resize' as const };
        if ((nearRight && nearTop) || (nearLeft && nearBottom)) return { cursor: 'nesw-resize' as const, mode: 'resize' as const };
        if (nearLeft || nearRight) return { cursor: 'ew-resize' as const, mode: 'resize' as const };
        return { cursor: 'ns-resize' as const, mode: 'resize' as const };
    }, [cropArea]);

    // When entering crop mode, auto-create a centered crop box (touch friendly)
    useEffect(() => {
        if (!isCropping) return;
        if (!capturedImage) return;
        if (cropArea) return;

        const defaultCrop = createDefaultCrop();
        if (defaultCrop) setCropArea(defaultCrop);
    }, [capturedImage, createDefaultCrop, cropArea, isCropping]);

    // Handle crop box interaction (drag to move; tap to recenter)
    const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isCropping || !imageContainerRef.current || !imageDimensions) return;

        const container = imageContainerRef.current;
        const rect = container.getBoundingClientRect();

        const { clientX, clientY } = getPointerClientXY(e);

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Only operate within image bounds
        const withinImage = (
            x >= imageDimensions.offsetX &&
            x <= imageDimensions.offsetX + imageDimensions.width &&
            y >= imageDimensions.offsetY &&
            y <= imageDimensions.offsetY + imageDimensions.height
        );
        if (!withinImage) return;

        // Ensure we have a crop box
        if (!cropArea) {
            const defaultCrop = createDefaultCrop();
            if (defaultCrop) setCropArea(defaultCrop);
            return;
        }

        const hover = getCropHover(x, y);
        setCropCursor(hover.cursor);

        if (hover.mode === 'resize') {
            setIsDragging(true);
            setDragMode('resize');
            setDragStart({ x, y });
            setResizeCenter({
                x: cropArea.x + cropArea.width / 2,
                y: cropArea.y + cropArea.height / 2
            });
            return;
        }

        if (hover.mode === 'move') {
            setIsDragging(true);
            setDragMode('move');
            setDragStart({ x, y });
            setDragOrigin({ x: cropArea.x, y: cropArea.y });
            return;
        }

        // Tap outside the crop box (but inside image): recenter crop around tap
        const half = cropArea.width / 2;
        const next = clampCropToImage({
            x: x - half,
            y: y - half,
            width: cropArea.width,
            height: cropArea.height
        });
        setCropArea(next);
    }, [clampCropToImage, createDefaultCrop, cropArea, getCropHover, imageDimensions, isCropping]);

    const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isCropping || !imageContainerRef.current) return;

        const container = imageContainerRef.current;
        const rect = container.getBoundingClientRect();
        const { clientX, clientY } = getPointerClientXY(e);
        const currentX = clientX - rect.left;
        const currentY = clientY - rect.top;

        if (cropArea) {
            const hover = getCropHover(currentX, currentY);
            setCropCursor(hover.cursor);
        }

        if (!isDragging || !dragStart || !cropArea || !dragMode) return;
        // React may attach touchmove listeners as passive in some environments.
        // Only call preventDefault when the event is cancelable.
        if ('cancelable' in e && e.cancelable) {
            e.preventDefault();
        }

        if (dragMode === 'move') {
            if (!dragOrigin || !imageDimensions) return;
            const dx = currentX - dragStart.x;
            const dy = currentY - dragStart.y;

            const next = clampCropToImage({
                x: dragOrigin.x + dx,
                y: dragOrigin.y + dy,
                width: cropArea.width,
                height: cropArea.height
            });
            setCropArea(next);
            return;
        }

        if (dragMode === 'resize') {
            if (!resizeCenter) return;
            // Keep crop square; resize based on distance from center.
            const dx = Math.abs(currentX - resizeCenter.x);
            const dy = Math.abs(currentY - resizeCenter.y);
            const halfSize = Math.max(40, Math.max(dx, dy));
            const size = halfSize * 2;

            const next = clampCropToImage({
                x: resizeCenter.x - size / 2,
                y: resizeCenter.y - size / 2,
                width: size,
                height: size
            });
            setCropArea(next);
        }
    }, [clampCropToImage, cropArea, dragMode, dragOrigin, dragStart, getCropHover, imageDimensions, isCropping, isDragging, resizeCenter]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setDragMode(null);
        setDragStart(null);
        setDragOrigin(null);
        setResizeCenter(null);
    }, []);

    // Apply crop and get cropped image
    const applyCrop = useCallback(async () => {
        if (!capturedImage || !cropArea || !imageDimensions || !cropCanvasRef.current) return;

        // Calculate crop coordinates relative to actual image
        const img = new Image();
        img.src = capturedImage;

        await new Promise((resolve) => {
            img.onload = resolve;
        });

        const scaleX = img.naturalWidth / imageDimensions.width;
        const scaleY = img.naturalHeight / imageDimensions.height;

        const cropX = (cropArea.x - imageDimensions.offsetX) * scaleX;
        const cropY = (cropArea.y - imageDimensions.offsetY) * scaleY;
        const cropW = cropArea.width * scaleX;
        const cropH = cropArea.height * scaleY;

        if (cropW < 20 || cropH < 20) {
            // Too small, cancel crop
            setCropArea(null);
            setIsCropping(false);
            return;
        }

        const canvas = cropCanvasRef.current;
        canvas.width = cropW;
        canvas.height = cropH;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setCapturedImage(croppedDataUrl);
        }

        setCropArea(null);
        setIsCropping(false);
        setCropCursor('default');
        setDragMode(null);
        setResizeCenter(null);
    }, [capturedImage, cropArea, imageDimensions]);

    const cancelCrop = () => {
        setCropArea(null);
        setIsCropping(false);
        setCropCursor('default');
    };

    const beginCropping = () => {
        setCropArea(null);
        setIsCropping(true);
        setCropCursor('crosshair');
    };

    const handleSearch = async () => {
        if (!capturedImage) return;

        setIsAnalyzing(true);
        setAnalysisStatus('Analyzing image with AI...');

        try {
            // Call Grok Vision API to analyze the image
            const analysis = await aiService.analyzeProductImage(capturedImage);

            console.log('Image analysis result:', analysis);
            setAnalysisStatus('Finding similar products...');

            // Return the search query and keywords to the parent
            onSearchResults(analysis.search_query, analysis.keywords);
        } catch (error) {
            console.error('Image analysis failed:', error);
            setAnalysisStatus('Analysis failed, using basic search...');

            // Fallback: just return a generic search
            setTimeout(() => {
                onSearchResults('product', []);
            }, 500);
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
        setCropArea(null);
        setIsCropping(false);
        startCamera();
    };

    const handleClose = () => {
        stopCamera();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-4 flex items-center justify-between">
                <button onClick={handleClose} className="p-2 text-white">
                    <span className="material-icons">close</span>
                </button>
                <h2 className="text-white font-bold text-lg">
                    {isCropping ? 'Select Area to Search' : 'Visual Search'}
                </h2>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Camera / Preview Area */}
            <div
                ref={imageContainerRef}
                className="flex-1 flex items-center justify-center relative overflow-hidden"
                style={isCropping ? { cursor: cropCursor, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' } : undefined}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
            >
                {isCapturing && !capturedImage && (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {/* Scanning overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-64 h-64 border-2 border-white/50 rounded-3xl">
                                <div className="absolute inset-0 animate-pulse bg-white/5 rounded-3xl" />
                            </div>
                        </div>
                        <p className="absolute bottom-24 text-white text-sm text-center px-4">
                            Point your camera at a product you want to find
                        </p>
                    </>
                )}

                {capturedImage && (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img
                            ref={imageRef}
                            src={capturedImage}
                            alt="Captured"
                            className="max-w-full max-h-full object-contain"
                            onLoad={updateImageDimensions}
                        />

                        {/* Crop overlay */}
                        {isCropping && (
                            <>
                                {/* Darkened overlay outside crop area */}
                                <div className="absolute inset-0 bg-black/50 pointer-events-none" style={{
                                    clipPath: cropArea && cropArea.width > 0 && cropArea.height > 0
                                        ? `polygon(
                                            0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                                            ${cropArea.x}px ${cropArea.y}px,
                                            ${cropArea.x}px ${cropArea.y + cropArea.height}px,
                                            ${cropArea.x + cropArea.width}px ${cropArea.y + cropArea.height}px,
                                            ${cropArea.x + cropArea.width}px ${cropArea.y}px,
                                            ${cropArea.x}px ${cropArea.y}px
                                        )`
                                        : 'none'
                                }} />

                                {/* Crop selection box */}
                                {cropArea && cropArea.width > 0 && cropArea.height > 0 && (
                                    <div
                                        className="absolute border-2 border-orange-500 bg-transparent pointer-events-none"
                                        style={{
                                            left: cropArea.x,
                                            top: cropArea.y,
                                            width: cropArea.width,
                                            height: cropArea.height,
                                        }}
                                    >
                                        {/* Corner handles */}
                                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-orange-500 rounded-full shadow-lg" />
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full shadow-lg" />
                                        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-orange-500 rounded-full shadow-lg" />
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full shadow-lg" />

                                        {/* Grid lines */}
                                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                                            {[...Array(9)].map((_, i) => (
                                                <div key={i} className="border border-white/20" />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Instructions (shown if crop box not ready yet) */}
                                {!cropArea && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-black/70 px-6 py-4 rounded-2xl text-center">
                                            <span className="material-icons text-orange-500 text-3xl mb-2 block">crop</span>
                                            <p className="text-white font-medium">Preparing crop…</p>
                                            <p className="text-white/60 text-sm mt-1">One moment</p>
                                        </div>
                                    </div>
                                )}

                                {/* Simple hint */}
                                {cropArea && (
                                    <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-black/70 px-4 py-2 rounded-full text-white/80 text-xs">
                                            {dragMode === 'resize' ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="material-icons" style={{ fontSize: 16 }}>unfold_more</span>
                                                    Resizing… drag border to adjust
                                                </span>
                                            ) : (
                                                'Drag box to move • Drag border to resize'
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
                                <p className="text-white font-medium">Analyzing image...</p>
                                <p className="text-white/70 text-sm mt-1">Finding similar products</p>
                            </div>
                        )}
                    </div>
                )}

                {!isCapturing && !capturedImage && (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-24 h-24 rounded-full bg-orange-500/20 flex items-center justify-center mb-6">
                            <span className="material-icons text-orange-500 text-5xl">photo_camera</span>
                        </div>
                        <h3 className="text-white text-xl font-bold mb-2">Search with Image</h3>
                        <p className="text-white/60 text-sm mb-8 max-w-xs">
                            Take a photo or upload an image to find similar products
                        </p>
                    </div>
                )}
            </div>

            {/* Hidden canvases for processing */}
            <canvas ref={canvasRef} className="hidden" />
            <canvas ref={cropCanvasRef} className="hidden" />

            {/* Controls */}
            <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-8 px-6 safe-area-bottom">
                {!capturedImage && !isCapturing && (
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={startCamera}
                            className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-orange-500/30"
                        >
                            <span className="material-icons">photo_camera</span>
                            Take Photo
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-4 bg-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-3 border border-white/20"
                        >
                            <span className="material-icons">photo_library</span>
                            Upload from Gallery
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>
                )}

                {isCapturing && !capturedImage && (
                    <div className="flex items-center justify-center gap-8">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center"
                        >
                            <span className="material-icons text-white">photo_library</span>
                        </button>
                        <button
                            onClick={capturePhoto}
                            className="w-20 h-20 bg-white rounded-full flex items-center justify-center border-4 border-orange-500 shadow-lg"
                        >
                            <div className="w-16 h-16 bg-orange-500 rounded-full" />
                        </button>
                        <button
                            onClick={stopCamera}
                            className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center"
                        >
                            <span className="material-icons text-white">close</span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>
                )}

                {capturedImage && !isAnalyzing && !isCropping && (
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <button
                                onClick={handleRetake}
                                className="flex-1 py-4 bg-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 border border-white/20"
                            >
                                <span className="material-icons">refresh</span>
                                Retake
                            </button>
                            <button
                                onClick={beginCropping}
                                className="flex-1 py-4 bg-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 border border-white/20"
                            >
                                <span className="material-icons">crop</span>
                                Crop
                            </button>
                        </div>
                        <button
                            onClick={handleSearch}
                            className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
                        >
                            <span className="material-icons">search</span>
                            Search Entire Image
                        </button>
                    </div>
                )}

                {capturedImage && isCropping && (
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                            <button
                                onClick={() => resizeCrop('smaller')}
                                className="flex-1 py-3 bg-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 border border-white/20"
                            >
                                <span className="material-icons">close_fullscreen</span>
                                Smaller
                            </button>
                            <button
                                onClick={() => resizeCrop('larger')}
                                className="flex-1 py-3 bg-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 border border-white/20"
                            >
                                <span className="material-icons">open_in_full</span>
                                Larger
                            </button>
                        </div>

                        <div className="flex gap-3">
                        <button
                            onClick={cancelCrop}
                            className="flex-1 py-4 bg-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 border border-white/20"
                        >
                            <span className="material-icons">close</span>
                            Cancel
                        </button>
                        <button
                            onClick={applyCrop}
                            disabled={!cropArea || cropArea.width < 20 || cropArea.height < 20}
                            className="flex-1 py-4 bg-orange-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="material-icons">check</span>
                            Apply Crop
                        </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisualSearchSheet;
