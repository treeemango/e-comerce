import React from 'react';
import { createPortal } from 'react-dom';
import { Product } from '../types';
import { getCurrencySymbol } from '@/lib/currency';

interface PreviewModalProps {
  product: Product;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ product, onClose }) => {
  // Prevent scrolling on body when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const [activeMediaIndex, setActiveMediaIndex] = React.useState(0);

  // Prepare media list: prioritize videos, then images. Fallback to main image if no media.
  const mediaList = React.useMemo(() => {
    if (product.media && product.media.length > 0) {
      // Sort: videos first
      return [...product.media].sort((a, b) => {
        if (a.type === 'video' || a.type === 'youtube') return -1;
        if (b.type === 'video' || b.type === 'youtube') return 1;
        return 0;
      });
    }
    return [{ type: 'image', url: product.image, id: 0, isMain: true }];
  }, [product]);

  const activeMedia = mediaList[activeMediaIndex];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl mx-auto z-50 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-10 p-2 bg-white/50 dark:bg-black/50 rounded-full"
        >
          <span className="material-icons">close</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left Column: Media Gallery */}
          <div className="p-6">
            <div className="flex flex-col gap-4">
              {/* Main Media View */}
              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                {activeMedia.type === 'youtube' ? (
                  <iframe
                    src={`${activeMedia.url}?autoplay=1&mute=0&controls=1&loop=1`}
                    className="w-full h-full object-cover"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : activeMedia.type === 'video' ? (
                  <video
                    src={activeMedia.url}
                    className="w-full h-full object-contain bg-black"
                    controls
                    autoPlay
                  />
                ) : (
                  <img
                    alt={product.title}
                    className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                    src={activeMedia.url}
                  />
                )}
              </div>

              {/* Thumbnails */}
              {mediaList.length > 1 && (
                <div className="grid grid-cols-6 gap-2 overflow-x-auto pb-2">
                  {mediaList.map((media: any, i: number) => (
                    <div
                      key={media.id || i}
                      onClick={() => setActiveMediaIndex(i)}
                      className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${i === activeMediaIndex
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                    >
                      {(media.type === 'video' || media.type === 'youtube') && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
                          <span className="material-icons text-white text-lg drop-shadow-md">play_circle</span>
                        </div>
                      )}
                      <img
                        alt={`Thumbnail ${i}`}
                        className="w-full h-full object-cover"
                        src={media.thumbnail || media.url}
                        onError={(e) => {
                          // Fallback for video thumbnails if not provided
                          if (media.type === 'youtube') {
                            // Try to get youtube thumbnail
                            const videoId = media.url.split('embed/')[1]?.split('?')[0];
                            if (videoId) (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="p-6 flex flex-col">
            <div className="flex-grow">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {product.title}
              </h1>

              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="material-icons text-yellow-400 text-base">star</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{product.rating}</span>
                </div>
                <span className="w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
                <span>{product.reviews} Reviews</span>
                <span className="w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
                <span>1k+ sold</span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{getCurrencySymbol(product.currency)}{product.price.toFixed(2)}</span>
                <span className="text-lg text-gray-400 line-through">{getCurrencySymbol(product.currency)}{(product.price * 1.5).toFixed(2)}</span>
                <span className="bg-primary/10 text-primary text-sm font-semibold px-2 py-1 rounded">33% off</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tax excluded, add at checkout if applicable</p>

              <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center justify-between text-sm cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">%</span>
                  <span className="text-red-700 dark:text-red-300">New User Deal: Save $10 on first order</span>
                </div>
                <span className="material-icons text-gray-400 text-lg">chevron_right</span>
              </div>

              {/* Static Color Selection */}
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Color: <span className="text-gray-500 font-normal">Standard</span></p>
                <div className="flex gap-2 mt-2">
                  <button className="p-0.5 border-2 border-primary rounded-md w-12 h-12 overflow-hidden">
                    <img alt="Color 1" className="w-full h-full object-cover" src={product.image} />
                  </button>
                  {[...Array(3)].map((_, i) => (
                    <button key={i} className="p-0.5 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-500 rounded-md w-12 h-12 overflow-hidden">
                      <img alt={`Color ${i + 2}`} className="w-full h-full object-cover grayscale opacity-70" src={product.image} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Static Size Selection */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Size</p>
                  <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Size Chart</a>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 text-sm">
                  {['S', 'M', 'L', 'XL', 'XXL'].map((size, i) => (
                    <button
                      key={size}
                      className={`py-2 px-3 border rounded-md transition-colors ${i === 1
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-6">
              <div className="flex flex-col gap-3">
                <button className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30">
                  Add to cart
                </button>
                <div className="flex items-center gap-3">
                  <button className="flex-1 text-center py-3 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors">
                    View details
                  </button>
                  <button className="flex items-center justify-center gap-2 flex-1 text-center py-3 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors">
                    <span className="material-icons text-lg text-gray-400">favorite_border</span>
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PreviewModal;
