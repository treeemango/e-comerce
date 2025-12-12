import React, { useState, useEffect } from 'react';
import { fetchHeroSlides } from '@/lib/api';
import type { HeroSlide } from '@/types';

// Fallback slides if database is empty or fails
const FALLBACK_SLIDES = [
  {
    id: '1',
    image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
    title: "Black Friday Deals",
    subtitle: "UP TO 80% OFF",
    cta_text: "Shop Now",
    cta_link: "/deals",
    theme: "red" as const,
    display_order: 0,
    is_active: true
  },
  {
    id: '2',
    image_url: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
    title: "Next Gen Electronics",
    subtitle: "The Future is Here",
    cta_text: "Explore Tech",
    cta_link: "/electronics",
    theme: "blue" as const,
    display_order: 1,
    is_active: true
  },
  {
    id: '3',
    image_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80",
    title: "Fashion Trends",
    subtitle: "New Collection 2025",
    cta_text: "View Lookbook",
    cta_link: "/fashion",
    theme: "purple" as const,
    display_order: 2,
    is_active: true
  }
];

const THEME_GRADIENTS: Record<HeroSlide['theme'], string> = {
  red: 'from-red-900/70 via-red-800/50 to-transparent',
  blue: 'from-blue-900/70 via-blue-800/50 to-transparent',
  purple: 'from-purple-900/70 via-purple-800/50 to-transparent',
  orange: 'from-orange-900/70 via-orange-800/50 to-transparent',
  green: 'from-green-900/70 via-green-800/50 to-transparent',
  black: 'from-gray-900/70 via-gray-800/50 to-transparent',
  gold: 'from-amber-900/70 via-amber-800/50 to-transparent'
};

const HeroSection: React.FC = () => {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSlides();
  }, []);

  const loadSlides = async () => {
    // 1. Try to load from LocalStorage first for instant render
    const cached = localStorage.getItem('hero_slides');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setSlides(parsed);
        setIsLoading(false); // Show cached content immediately
      } catch (e) {
        console.error('Error parsing cached slides', e);
      }
    }

    // 2. Fetch fresh data in the background (stale-while-revalidate)
    try {
      const data = await fetchHeroSlides();
      if (data && data.length > 0) {
        // Only update if different
        if (JSON.stringify(data) !== cached) {
          setSlides(data);
          localStorage.setItem('hero_slides', JSON.stringify(data));
        }
      } else if (!cached) {
        // Only fallback if nothing in cache AND api failed/empty
        setSlides(FALLBACK_SLIDES);
      }
    } catch (error) {
      console.error('Error loading hero slides:', error);
      if (!cached) setSlides(FALLBACK_SLIDES);
    }

    // Ensure loading state is off
    setIsLoading(false);
  };

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Skeleton loader - instant shimmer effect
  if (isLoading) {
    return (
      <section className="mb-8 lg:mb-12 relative">
        <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden shadow-2xl bg-gray-200">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"
            style={{ backgroundSize: '200% 100%' }} />
          {/* Content skeleton */}
          <div className="absolute inset-0 flex items-center px-8 md:px-16">
            <div className="max-w-xl space-y-4">
              <div className="h-12 md:h-16 bg-gray-300/50 rounded-lg w-80 animate-pulse"></div>
              <div className="h-8 md:h-10 bg-gray-300/50 rounded-lg w-60 animate-pulse"></div>
              <div className="h-12 bg-gray-300/50 rounded-full w-40 mt-6 animate-pulse"></div>
            </div>
          </div>
          {/* Indicator skeleton */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-gray-300/50 animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (slides.length === 0) return null;

  return (
    <section className="mb-8 lg:mb-12 relative group">
      <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden shadow-2xl">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
          >
            {/* Background Image */}
            {/* Optimization: Use standard img tag for better control over loading priority for LCP */}
            <img
              src={slide.image_url}
              alt={slide.title}
              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[5000ms] ease-linear overflow-hidden ${index === currentSlide ? 'scale-105' : 'scale-100'}`}
              // @ts-ignore - fetchPriority is a valid newer attribute
              fetchPriority={index === 0 ? "high" : "auto"}
              loading={index === 0 ? "eager" : "lazy"}
              draggable="false"
            />

            {/* Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-r ${THEME_GRADIENTS[slide.theme] || THEME_GRADIENTS.purple}`} />
            <div className="absolute inset-0 bg-black/30" />

            {/* Content */}
            <div className="absolute inset-0 flex items-center px-8 md:px-16">
              <div className="max-w-xl text-white space-y-4">
                <h2 className={`text-4xl md:text-6xl font-black uppercase tracking-tight drop-shadow-lg transition-all duration-700 delay-300 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                  }`}>
                  {slide.title}
                </h2>
                <p
                  className={`text-2xl md:text-4xl font-bold drop-shadow-md transition-all duration-700 delay-500 ${index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                    }`}
                  style={{ color: slide.subtitle_color || '#FACC15' }}
                >
                  {slide.subtitle}
                </p>
                <a
                  href={slide.cta_link || '#'}
                  className={`mt-6 px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-all duration-300 shadow-lg flex items-center gap-2 group/btn w-fit ${index === currentSlide ? 'translate-y-0 opacity-100 delay-700' : 'translate-y-10 opacity-0'
                    }`}
                >
                  {slide.cta_text}
                  <span className="material-icons group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
      >
        <span className="material-icons">chevron_left</span>
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
      >
        <span className="material-icons">chevron_right</span>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
