
import React from 'react';
import { infoContent } from '../lib/infoContent';
import { useSEO } from '../lib/useSEO';
import { generateArticleSchema, generateBreadcrumbSchema, SITE_CONFIG } from '../lib/seo-utils';

interface InfoPageViewProps {
    slug: string;
    onClose: () => void;
    onNavigate: (newSlug: string) => void;
}

const InfoPageView: React.FC<InfoPageViewProps> = ({ slug, onClose, onNavigate }) => {
    const page = infoContent[slug] || infoContent['about'];

    const pageUrl = `${SITE_CONFIG.url}/info/${slug}`;

    useSEO({
        title: `${page.title} | JuaExpress`,
        description: page.description,
        keywords: page.keywords,
        url: pageUrl,
        structuredData: [
            generateArticleSchema({
                title: page.title,
                description: page.description,
                image: page.image_url,
                url: pageUrl,
            }),
            generateBreadcrumbSchema([
                { name: 'Home', url: SITE_CONFIG.url },
                { name: 'Help Center', url: `${SITE_CONFIG.url}/help` },
                { name: page.title, url: pageUrl }
            ])
        ]
    });

    const navItems = [
        { label: 'About JuaExpress', slug: 'about' },
        { label: 'Terms of Use', slug: 'terms' },
        { label: 'Privacy Policy', slug: 'privacy' },
        { label: 'Returns & Refunds', slug: 'returns' },
        { label: 'Shipping Info', slug: 'shipping' },
        { label: 'Purchase Protection', slug: 'protection' },
        { label: 'Contact Us', slug: 'contact' },
        { label: 'Sell on JuaExpress', slug: 'sell' },
        { label: 'Affiliate Program', slug: 'affiliate' },
        { label: 'Careers', slug: 'careers' },
        { label: 'Sustainability', slug: 'sustainability' },
        { label: 'Support Center', slug: 'support-center' },
        { label: 'Safety Centre', slug: 'safety-centre' },
        { label: 'Sitemap', slug: 'sitemap' },
        { label: 'Intellectual Property', slug: 'intellectual-property' },
        { label: 'Report Suspicious', slug: 'report-suspicious' },
        { label: 'Company Details', slug: 'company-details' },
        { label: 'Equality & Responsibility', slug: 'corporate-responsibility' },
        { label: 'Minimum Order Info', slug: 'minimum-order' },
    ];

    return (
        <div className="bg-white min-h-screen pb-20">
            {/* Simple Header for Info Page */}
            <div className="border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors"
                    >
                        <span className="material-icons">arrow_back</span>
                        <span className="font-medium">Back to Shopping</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="material-icons text-orange-500">shopping_bag</span>
                        <span className="font-bold text-lg tracking-tight">JuaExpress <span className="text-gray-400 font-normal text-sm ml-2">Help Center</span></span>
                    </div>
                    <div className="w-24"></div> {/* Spacer */}
                </div>
            </div>

            <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Sidebar Navigation */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="sticky top-28 space-y-1">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Navigation</h3>
                            {navItems.map((item) => (
                                <button
                                    key={item.slug}
                                    onClick={() => onNavigate(item.slug)}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${slug === item.slug
                                        ? 'bg-orange-50 text-orange-600'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Areas */}
                    <div className="lg:col-span-3 max-w-4xl">
                        {/* Page Header */}
                        <div className="mb-12">
                            <h1 className="text-4xl lg:text-5xl font-extrabold text-[#222] mb-4 tracking-tight">
                                {page.title}
                            </h1>
                            {page.subtitle && (
                                <p className="text-xl text-gray-500 font-medium">
                                    {page.subtitle}
                                </p>
                            )}
                        </div>

                        {/* Hero Image */}
                        {page.image_url && (
                            <div className="mb-16 rounded-3xl overflow-hidden aspect-[21/9] border border-gray-100 shadow-sm transition-transform hover:scale-[1.01] duration-500">
                                <img
                                    src={page.image_url}
                                    alt={page.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        {/* Content Sections */}
                        <div className="space-y-12">
                            {page.sections.map((section, idx) => (
                                <section key={idx} className="group">
                                    <div className="flex items-start gap-6">
                                        {section.icon && (
                                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                                                <span className="material-icons text-gray-400 group-hover:text-orange-500 transition-colors">
                                                    {section.icon}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h2 className="text-2xl font-bold text-[#222] mb-3">
                                                {section.title}
                                            </h2>
                                            <div className="text-gray-600 leading-relaxed text-lg space-y-4">
                                                {section.content.split('\n').map((para, pIdx) => (
                                                    <p key={pIdx}>{para}</p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {idx < page.sections.length - 1 && (
                                        <div className="h-px bg-gray-100 mt-12 ml-20" />
                                    )}
                                </section>
                            ))}
                        </div>

                        {/* CTA for Trust */}
                        <div className="mt-20 p-8 rounded-3xl bg-gradient-to-br from-[#222] to-black text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
                                <p className="text-gray-400 mb-6 max-w-lg">
                                    Our support team is available 24/7 to help you with any inquiries regarding our platform, shipping, or security.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <button
                                        onClick={() => onNavigate('contact')}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-orange-500/25"
                                    >
                                        Contact Support
                                    </button>
                                    <button
                                        onClick={() => onNavigate('support-center')}
                                        className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-8 rounded-xl transition-all backdrop-blur-sm"
                                    >
                                        Visit Help Center
                                    </button>
                                </div>
                            </div>
                            {/* Decorative element */}
                            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InfoPageView;
