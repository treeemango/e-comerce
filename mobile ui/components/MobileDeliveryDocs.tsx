
import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../../lib/supabase';
import { compressImageForUpload } from '../../lib/image-utils';

interface MobileDeliveryDocsProps {
    orderId: string;
    onComplete: (url: string, type: 'photo' | 'signature') => void;
    onCancel: () => void;
}

const MobileDeliveryDocs: React.FC<MobileDeliveryDocsProps> = ({ orderId, onComplete, onCancel }) => {
    const [mode, setMode] = useState<'photo' | 'signature'>('photo');
    const [photo, setPhoto] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const sigCanvas = useRef<SignatureCanvas>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhoto(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const clearSignature = () => {
        sigCanvas.current?.clear();
    };

    const handlePhotoSubmit = async () => {
        if (!photo) return;
        setIsSubmitting(true);
        try {
            // Compress photo before uploading
            const compressedPhoto = await compressImageForUpload(photo);
            const ext = compressedPhoto.name.split('.').pop() || 'jpg';

            // Upload compressed photo
            const fileName = `delivery-proof/${orderId}/photo-${Date.now()}.${ext}`;
            const { data, error } = await supabase.storage
                .from('delivery-proofs')
                .upload(fileName, compressedPhoto);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('delivery-proofs')
                .getPublicUrl(fileName);

            onComplete(publicUrl, 'photo');
        } catch (error) {
            console.error('Error uploading photo:', error);
            alert('Failed to upload proof. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignatureSubmit = async () => {
        if (sigCanvas.current?.isEmpty()) {
            alert('Please sign before submitting.');
            return;
        }

        setIsSubmitting(true);
        try {
            const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
            if (!dataUrl) return;

            const blob = await (await fetch(dataUrl)).blob();
            const fileName = `delivery-proof/${orderId}/signature-${Date.now()}.png`;

            const { data, error } = await supabase.storage
                .from('delivery-proofs')
                .upload(fileName, blob);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('delivery-proofs')
                .getPublicUrl(fileName);

            onComplete(publicUrl, 'signature');
        } catch (error) {
            console.error('Error uploading signature:', error);
            alert('Failed to submit signature. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <div className="bg-white border-b border-gray-100 p-4 flex justify-between items-center shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">Proof of Delivery</h2>
                <button
                    onClick={onCancel}
                    className="p-2 -mr-2 text-gray-400 hover:text-gray-600"
                >
                    <span className="material-icons">close</span>
                </button>
            </div>

            <div className="flex p-2 bg-gray-50 border-b border-gray-200">
                <button
                    onClick={() => setMode('photo')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'photo'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Take Photo
                </button>
                <button
                    onClick={() => setMode('signature')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'signature'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Signature
                </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                {mode === 'photo' && (
                    <div className="space-y-6 text-center pt-8">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${previewUrl ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                }`}
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="max-h-64 rounded shadow-sm" />
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                        <span className="material-icons text-3xl">camera_alt</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">Tap to capture photo</p>
                                    <p className="text-xs text-gray-500 mt-1">Take a clear picture of the package</p>
                                </>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                )}

                {mode === 'signature' && (
                    <div className="space-y-4 pt-4">
                        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm bg-gray-50">
                            <SignatureCanvas
                                ref={sigCanvas}
                                canvasProps={{
                                    className: 'w-full h-64 bg-white cursor-crosshair'
                                }}
                                backgroundColor="white"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={clearSignature}
                                className="text-sm text-red-600 font-medium px-3 py-1 hover:bg-red-50 rounded"
                            >
                                Clear Signature
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white safe-area-bottom">
                <button
                    onClick={mode === 'photo' ? handlePhotoSubmit : handleSignatureSubmit}
                    disabled={isSubmitting || (mode === 'photo' && !photo)}
                    className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all ${isSubmitting || (mode === 'photo' && !photo)
                        ? 'bg-gray-300 cursor-not-allowed shadow-none'
                        : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                        }`}
                >
                    {isSubmitting ? 'Uploading...' : 'Confirm Delivery'}
                </button>
            </div>
        </div>
    );
};

export default MobileDeliveryDocs;
