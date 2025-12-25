import React, { useState, useRef } from 'react';
import { aiService } from '@/lib/ai-service';

interface VisualSearchSheetProps {
    onClose: () => void;
    onSearchResults: (searchQuery: string, keywords: string[]) => void;
}

const VisualSearchSheet: React.FC<VisualSearchSheetProps> = ({ onClose, onSearchResults }) => {
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState<string>('');
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                <h2 className="text-white font-bold text-lg">Visual Search</h2>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Camera / Preview Area */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
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
                    <div className="relative w-full h-full">
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full h-full object-contain"
                        />
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

            {/* Canvas for capturing (hidden) */}
            <canvas ref={canvasRef} className="hidden" />

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

                {capturedImage && !isAnalyzing && (
                    <div className="flex gap-4">
                        <button
                            onClick={handleRetake}
                            className="flex-1 py-4 bg-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 border border-white/20"
                        >
                            <span className="material-icons">refresh</span>
                            Retake
                        </button>
                        <button
                            onClick={handleSearch}
                            className="flex-1 py-4 bg-orange-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
                        >
                            <span className="material-icons">search</span>
                            Search
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisualSearchSheet;
