import React, { useEffect, useState } from 'react';
import type { AdminPermissions, HeroSlide } from '@/types';
import { fetchAllHeroSlides, createHeroSlide, updateHeroSlide, deleteHeroSlide, reorderHeroSlides } from '@/lib/api';

interface HeroSlidesViewProps {
    permissions?: AdminPermissions;
    refreshTrigger?: number;
}

const THEME_COLORS: Record<HeroSlide['theme'], string> = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    black: 'bg-gray-900',
    gold: 'bg-yellow-500'
};

const THEME_GRADIENTS: Record<HeroSlide['theme'], string> = {
    red: 'from-red-600 to-red-900',
    blue: 'from-blue-600 to-blue-900',
    purple: 'from-purple-600 to-purple-900',
    orange: 'from-orange-600 to-orange-900',
    green: 'from-green-600 to-green-900',
    black: 'from-gray-700 to-gray-950',
    gold: 'from-yellow-500 to-amber-700'
};

const HeroSlidesView: React.FC<HeroSlidesViewProps> = ({ permissions, refreshTrigger = 0 }) => {
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [previewSlide, setPreviewSlide] = useState<HeroSlide | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        cta_text: 'Shop Now',
        cta_link: '',
        image_url: '',
        theme: 'purple' as HeroSlide['theme'],
        text_color: '#FFFFFF',
        subtitle_color: '#FACC15',
        is_active: true
    });

    useEffect(() => {
        loadSlides();
    }, [refreshTrigger]);

    const loadSlides = async () => {
        setIsLoading(true);
        const data = await fetchAllHeroSlides();
        setSlides(data);
        setIsLoading(false);
    };

    const openCreateModal = () => {
        setEditingSlide(null);
        setFormData({
            title: '',
            subtitle: '',
            cta_text: 'Shop Now',
            cta_link: '',
            image_url: '',
            theme: 'purple',
            text_color: '#FFFFFF',
            subtitle_color: '#FACC15',
            is_active: true
        });
        setIsModalOpen(true);
    };

    const openEditModal = (slide: HeroSlide) => {
        setEditingSlide(slide);
        setFormData({
            title: slide.title,
            subtitle: slide.subtitle || '',
            cta_text: slide.cta_text,
            cta_link: slide.cta_link || '',
            image_url: slide.image_url,
            theme: slide.theme,
            text_color: slide.text_color || '#FFFFFF',
            subtitle_color: slide.subtitle_color || '#FACC15',
            is_active: slide.is_active
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.image_url) {
            alert('Title and Image URL are required');
            return;
        }

        setIsSaving(true);
        try {
            if (editingSlide) {
                await updateHeroSlide(editingSlide.id, formData);
            } else {
                await createHeroSlide({
                    ...formData,
                    display_order: slides.length
                });
            }
            await loadSlides();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving slide:', error);
            alert('Failed to save slide');
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        const success = await deleteHeroSlide(id);
        if (success) {
            await loadSlides();
        }
        setDeleteConfirm(null);
    };

    const handleMoveUp = async (index: number) => {
        if (index === 0) return;
        const newSlides = [...slides];
        [newSlides[index - 1], newSlides[index]] = [newSlides[index], newSlides[index - 1]];
        setSlides(newSlides);
        await reorderHeroSlides(newSlides.map(s => s.id));
    };

    const handleMoveDown = async (index: number) => {
        if (index === slides.length - 1) return;
        const newSlides = [...slides];
        [newSlides[index], newSlides[index + 1]] = [newSlides[index + 1], newSlides[index]];
        setSlides(newSlides);
        await reorderHeroSlides(newSlides.map(s => s.id));
    };

    const toggleActive = async (slide: HeroSlide) => {
        await updateHeroSlide(slide.id, { is_active: !slide.is_active });
        await loadSlides();
    };

    // Skeleton loader
    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                    <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded w-28 animate-pulse"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-gray-100 rounded-xl overflow-hidden">
                            <div className="h-40 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer"></div>
                            <div className="p-4 space-y-2">
                                <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Hero Slides</h3>
                    <p className="text-sm text-gray-500">Manage homepage banner slides</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                >
                    <i className="fas fa-plus text-sm"></i>
                    Add Slide
                </button>
            </div>

            {/* Slides Grid */}
            {slides.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <i className="fas fa-images text-4xl text-gray-400 mb-3"></i>
                    <p className="text-gray-500">No slides yet. Create your first slide!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className={`relative rounded-xl overflow-hidden shadow-lg group transition-all duration-300 hover:shadow-xl ${!slide.is_active ? 'opacity-60' : ''}`}
                        >
                            {/* Slide Preview */}
                            <div
                                className="h-44 bg-cover bg-center relative cursor-pointer"
                                style={{ backgroundImage: `url('${slide.image_url}')` }}
                                onClick={() => setPreviewSlide(slide)}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-r ${THEME_GRADIENTS[slide.theme]} opacity-60`}></div>
                                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                                    <h4 className="text-white font-bold text-lg truncate drop-shadow-lg">{slide.title}</h4>
                                    <p className="text-yellow-400 text-sm truncate">{slide.subtitle}</p>
                                </div>
                                {/* Order Badge */}
                                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                    #{index + 1}
                                </div>
                                {/* Status Badge */}
                                <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${slide.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                                    {slide.is_active ? 'Active' : 'Inactive'}
                                </div>
                            </div>

                            {/* Card Actions */}
                            <div className="p-3 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                    {/* Theme indicator */}
                                    <span className={`w-4 h-4 rounded-full ${THEME_COLORS[slide.theme]}`}></span>
                                    <span className="text-xs text-gray-500 capitalize">{slide.theme}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Move buttons */}
                                    <button
                                        onClick={() => handleMoveUp(index)}
                                        disabled={index === 0}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move up"
                                    >
                                        <i className="fas fa-chevron-up text-xs"></i>
                                    </button>
                                    <button
                                        onClick={() => handleMoveDown(index)}
                                        disabled={index === slides.length - 1}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move down"
                                    >
                                        <i className="fas fa-chevron-down text-xs"></i>
                                    </button>
                                    {/* Toggle active */}
                                    <button
                                        onClick={() => toggleActive(slide)}
                                        className={`p-1.5 ${slide.is_active ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        title={slide.is_active ? 'Deactivate' : 'Activate'}
                                    >
                                        <i className={`fas ${slide.is_active ? 'fa-eye' : 'fa-eye-slash'} text-sm`}></i>
                                    </button>
                                    {/* Edit button */}
                                    <button
                                        onClick={() => openEditModal(slide)}
                                        className="p-1.5 text-blue-500 hover:text-blue-600"
                                        title="Edit"
                                    >
                                        <i className="fas fa-edit text-sm"></i>
                                    </button>
                                    {/* Delete button */}
                                    <button
                                        onClick={() => setDeleteConfirm(slide.id)}
                                        className="p-1.5 text-red-500 hover:text-red-600"
                                        title="Delete"
                                    >
                                        <i className="fas fa-trash text-sm"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingSlide ? 'Edit Slide' : 'Create New Slide'}
                            </h3>
                        </div>

                        <div className="p-6 grid md:grid-cols-2 gap-6">
                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g. Fashion Trends"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
                                    <input
                                        type="text"
                                        value={formData.subtitle}
                                        onChange={e => setFormData(f => ({ ...f, subtitle: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g. New Collection 2025"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                                        <input
                                            type="text"
                                            value={formData.cta_text}
                                            onChange={e => setFormData(f => ({ ...f, cta_text: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="e.g. Shop Now"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link</label>
                                        <input
                                            type="text"
                                            value={formData.cta_link}
                                            onChange={e => setFormData(f => ({ ...f, cta_link: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="e.g. /fashion"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
                                    <input
                                        type="url"
                                        value={formData.image_url}
                                        onChange={e => setFormData(f => ({ ...f, image_url: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Theme Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {(Object.keys(THEME_COLORS) as HeroSlide['theme'][]).map(theme => (
                                            <button
                                                key={theme}
                                                onClick={() => setFormData(f => ({ ...f, theme }))}
                                                className={`w-8 h-8 rounded-full ${THEME_COLORS[theme]} transition-all ${formData.theme === theme ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                                                title={theme}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData(f => ({ ...f, is_active: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                    <span className="text-sm text-gray-700">Active (visible on homepage)</span>
                                </div>
                            </div>

                            {/* Live Preview */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Live Preview</label>
                                <div className="relative rounded-xl overflow-hidden shadow-lg h-56 bg-gray-200">
                                    {formData.image_url ? (
                                        <>
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
                                                style={{ backgroundImage: `url('${formData.image_url}')` }}
                                            />
                                            <div className={`absolute inset-0 bg-gradient-to-r ${THEME_GRADIENTS[formData.theme]} opacity-50`}></div>
                                            <div className="absolute inset-0 flex items-center px-4">
                                                <div className="max-w-xs text-white space-y-2">
                                                    <h2 className="text-2xl font-black uppercase tracking-tight drop-shadow-lg">
                                                        {formData.title || 'Title'}
                                                    </h2>
                                                    <p className="text-lg font-bold drop-shadow-md" style={{ color: formData.subtitle_color }}>
                                                        {formData.subtitle || 'Subtitle'}
                                                    </p>
                                                    <button className="mt-2 px-4 py-1.5 bg-white text-black text-sm font-bold rounded-full flex items-center gap-1 shadow-lg">
                                                        {formData.cta_text || 'Shop Now'}
                                                        <span className="material-icons text-sm">arrow_forward</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                            <div className="text-center">
                                                <i className="fas fa-image text-4xl mb-2"></i>
                                                <p className="text-sm">Enter image URL to preview</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save"></i>
                                        {editingSlide ? 'Update Slide' : 'Create Slide'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <i className="fas fa-trash text-red-500 text-xl"></i>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Slide?</h3>
                            <p className="text-gray-500 mb-6">This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Preview Modal */}
            {previewSlide && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
                    onClick={() => setPreviewSlide(null)}
                >
                    <div className="w-full max-w-5xl mx-4">
                        <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden shadow-2xl">
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url('${previewSlide.image_url}')` }}
                            />
                            <div className={`absolute inset-0 bg-gradient-to-r ${THEME_GRADIENTS[previewSlide.theme]} opacity-50`}></div>
                            <div className="absolute inset-0 flex items-center px-8 md:px-16">
                                <div className="max-w-xl text-white space-y-4 animate-fade-in-up">
                                    <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight drop-shadow-lg">
                                        {previewSlide.title}
                                    </h2>
                                    <p className="text-2xl md:text-4xl font-bold drop-shadow-md" style={{ color: previewSlide.subtitle_color }}>
                                        {previewSlide.subtitle}
                                    </p>
                                    <button className="mt-6 px-8 py-3 bg-white text-black font-bold rounded-full flex items-center gap-2 shadow-lg">
                                        {previewSlide.cta_text}
                                        <span className="material-icons">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-white/60 mt-4 text-sm">Click anywhere to close</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeroSlidesView;
