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
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number; offsetX: number; offsetY: number } | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cropCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            setCameraStream(stream);
            setIsCapturing(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (err) {
            console.error('Camera access denied:', err);
            alert('Camera access is required for visual search. Please allow camera permissions.');
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCapturing(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
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

    // Handle crop area drawing
    const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isCropping || !imageContainerRef.current || !imageDimensions) return;

        const container = imageContainerRef.current;
        const rect = container.getBoundingClientRect();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Only start if within image bounds
        if (x >= imageDimensions.offsetX &&
            x <= imageDimensions.offsetX + imageDimensions.width &&
            y >= imageDimensions.offsetY &&
            y <= imageDimensions.offsetY + imageDimensions.height) {
            setIsDragging(true);
            setDragStart({ x, y });
            setCropArea({ x, y, width: 0, height: 0 });
        }
    }, [isCropping, imageDimensions]);

    const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !dragStart || !imageContainerRef.current || !imageDimensions) return;

        e.preventDefault();
        const container = imageContainerRef.current;
        const rect = container.getBoundingClientRect();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        let currentX = clientX - rect.left;
        let currentY = clientY - rect.top;

        // Clamp to image bounds
        currentX = Math.max(imageDimensions.offsetX, Math.min(currentX, imageDimensions.offsetX + imageDimensions.width));
        currentY = Math.max(imageDimensions.offsetY, Math.min(currentY, imageDimensions.offsetY + imageDimensions.height));

        const x = Math.min(dragStart.x, currentX);
        const y = Math.min(dragStart.y, currentY);
        const width = Math.abs(currentX - dragStart.x);
        const height = Math.abs(currentY - dragStart.y);

        setCropArea({ x, y, width, height });
    }, [isDragging, dragStart, imageDimensions]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
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
    }, [capturedImage, cropArea, imageDimensions]);

    const cancelCrop = () => {
        setCropArea(null);
        setIsCropping(false);
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
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
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

                                {/* Instructions */}
                                {!cropArea && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-black/70 px-6 py-4 rounded-2xl text-center">
                                            <span className="material-icons text-orange-500 text-3xl mb-2 block">crop</span>
                                            <p className="text-white font-medium">Drag to select area</p>
                                            <p className="text-white/60 text-sm mt-1">Focus on the product you want to find</p>
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
                                onClick={() => setIsCropping(true)}
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
                )}
            </div>
        </div>
    );
};

export default VisualSearchSheet;
