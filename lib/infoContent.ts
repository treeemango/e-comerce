
export interface InfoPageContent {
    title: string;
    subtitle?: string;
    image_url?: string;
    description: string;
    keywords: string;
    sections: {
        title: string;
        content: string;
        icon?: string;
    }[];
}

export const infoContent: Record<string, InfoPageContent> = {
    'about': {
        title: 'About JuaExpress',
        subtitle: 'Connecting Continents, Empowering Commerce',
        image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
        description: 'Learn about JuaExpress, the premier multi-vendor marketplace bridge between Europe and Africa.',
        keywords: 'about juaexpress, africa europe ecommerce, multi-vendor marketplace',
        sections: [
            {
                title: 'Our Mission',
                content: 'JuaExpress was founded with a single vision: to bridge the gap between European and African markets. We believe that distance shouldn\'t be a barrier to high-quality products or global entrepreneurial success. Our platform empowers vendors across both continents to reach millions of customers, offering a seamless, secure, and multi-currency shopping experience.',
                icon: 'rocket_launch'
            },
            {
                title: 'The Europe-Africa Bridge',
                content: 'We specialize in logistics and trade between European nations and the entire African continent. By handling complex shipping regulations, currency conversions, and customs, we make it as easy to buy a product from Nairobi for delivery in Berlin as it is to shop locally.',
                icon: 'language'
            },
            {
                title: 'Trust & Security',
                content: 'At JuaExpress, trust is our currency. We manage every transaction through our rigorous JuaExpress Purchase Protection system, ensuring that both buyers and sellers are protected, payments are secure, and delivery is guaranteed.',
                icon: 'verified_user'
            }
        ]
    },
    'affiliate': {
        title: 'Affiliate & Influencer Program',
        subtitle: 'Grow Together, Earn Together',
        image_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80',
        description: 'Join the JuaExpress Affiliate and Influencer program to earn commissions while bridging markets.',
        keywords: 'affiliate program, influencer earnings, earn money online africa',
        sections: [
            {
                title: 'How it Works',
                content: 'Join the JuaExpress Affiliate network and start earning commissions immediately. Simply share your unique affiliate links on your social media, blog, or website. When someone makes a purchase through your link, you earn a percentage of the sale.',
                icon: 'share'
            },
            {
                title: 'Commissions',
                content: 'We offer some of the most competitive commission rates in the industry, ranging from 5% to 15% depending on the product category. Our transparent dashboard allows you to track your earnings in real-time.',
                icon: 'payments'
            },
            {
                title: 'Creator Resources',
                content: 'Access a suite of marketing tools, including high-quality banners, product feeds, and performance reports to help you maximize your success.',
                icon: 'auto_graph'
            }
        ]
    },
    'returns': {
        title: 'Return and Refund Policy',
        subtitle: 'Hassle-Free Shopping, Guaranteed',
        image_url: 'https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?w=1200&auto=format&fit=crop&q=80',
        description: 'Understand the simple and fair return and refund process at JuaExpress.',
        keywords: 'return policy, refund guarantee, juaexpress returns',
        sections: [
            {
                title: '30-Day Return Window',
                content: 'We want you to love your purchase. If you\'re not entirely satisfied, you can return most items within 30 days of delivery for a full refund or exchange.',
                icon: 'history'
            },
            {
                title: 'Easy Returns Process',
                content: 'Initiate a return directly from your account. Print your prepaid return label (available for eligible orders) and drop off the package at any of our partner logistics centers across Europe and Africa.',
                icon: 'local_post_office'
            },
            {
                title: 'Refund Timeline',
                content: 'Once your return is received and inspected, we process refunds within 3-5 business days. Funds are returned to your original payment method, taking into account the exchange rate at the time of purchase.',
                icon: 'currency_exchange'
            }
        ]
    },
    'protection': {
        title: 'JuaExpress Purchase Protection',
        subtitle: 'Your Safety is Our Priority',
        image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80',
        description: 'Detailed information about JuaExpress Purchase Protection for buyers and sellers.',
        keywords: 'purchase protection, buyer protection, secure shopping africa',
        sections: [
            {
                title: 'The JuaExpress Guarantee',
                content: 'When you buy on JuaExpress, your money is held in a secure escrow-like system. We only release payment to the seller once you confirm you have received the item in the described condition.',
                icon: 'gpp_good'
            },
            {
                title: 'Dispute Resolution',
                content: 'In the rare event of a disagreement, our dedicated support team steps in to mediate. We investigate all claims fairly, looking at tracking data and communication logs to reach a just resolution for both buyer and seller.',
                icon: 'gavel'
            },
            {
                title: 'Secure Payments',
                content: 'We use industry-standard encryption and are PCI-DSS compliant. Whether you pay with Visa, Mastercard, PayPal, or local mobile money like M-Pesa, your financial data is always protected.',
                icon: 'lock'
            }
        ]
    },
    'shipping': {
        title: 'Shipping Information',
        subtitle: 'The Europe-Africa Bridge: Fast, Secure, Reliable',
        image_url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1200&auto=format&fit=crop&q=80',
        description: 'Comprehensive shipping details for JuaExpress, specializing in cross-continental delivery between Europe and Africa.',
        keywords: 'shipping info, international delivery africa, europe shipping, juaexpress logistics',
        sections: [
            {
                title: 'Continental Logistics Network',
                content: 'JuaExpress operates a proprietary logistics network with primary sorting hubs in London, Amsterdam, Nairobi, and Lagos. This allows us to offer industry-leading delivery times (7-14 business days) for cross-continental shipments, managed entirely within our secure ecosystem.',
                icon: 'hub'
            },
            {
                title: 'Real-Time Precise Tracking',
                content: 'Stop wondering where your package is. Every shipment is equipped with high-precision tracking that updates at every milestone: from the vendor\'s warehouse and international export hubs to local customs clearance and final-mile delivery in over 50 countries.',
                icon: 'location_on'
            },
            {
                title: 'Guaranteed Customs Clearance',
                content: 'We take the headache out of international trade. For European-to-African shipments, all customs duties and taxes are calculated at checkout. Our specialized clearance teams handle all paperwork in advance, ensuring your products are never stuck in port or subject to hidden fees upon arrival.',
                icon: 'description'
            },
            {
                title: 'Safe Last-Mile Delivery',
                content: 'Through our network of local delivery partners and JuaExpress Driver fleet, we ensure your package reaches you safely, whether you\'re in a major metropolitan hub or a remote regional center. We require secure verification for all high-value deliveries.',
                icon: 'local_shipping'
            }
        ]
    },
    'sell': {
        title: 'Sell on JuaExpress',
        subtitle: 'Scale Your Business Globally',
        image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
        description: 'Empowering vendors from Europe and Africa to reach millions of international buyers.',
        keywords: 'sell on juaexpress, vendor onboarding, global ecommerce africa, cross-border selling',
        sections: [
            {
                title: 'Unmatched Market Reach',
                content: 'JuaExpress is the first platform designed specifically to bridge European and African markets. As a seller, your listings are automatically optimized for cross-border SEO, making your products discoverable to millions of ready-to-buy customers across both continents.',
                icon: 'public'
            },
            {
                title: 'AI-Powered Selling Tools',
                content: 'Don\'t worry about copywriting or SEO. Our integrated AI assistants help you generate high-converting titles, descriptions, and tags. We also provide intelligent pricing suggestions based on real-time market data from both Europe and Africa.',
                icon: 'auto_awesome'
            },
            {
                title: 'Multi-Currency Settlement',
                content: 'We eliminate currency risk for our vendors. List products in your local currency, and we handle the conversion at competitive rates. Choose to be paid in your local currency, USD, EUR, or GBP—directly into your bank account or mobile wallet.',
                icon: 'payments'
            },
            {
                title: 'Integrated Fulfillment',
                content: 'Focus on your products while we handle the heavy lifting. Our "Fulfilled by JuaExpress" (FBJ) service manages storage, packing, shipping, and customer support, allowing you to scale without needing your own international logistics team.',
                icon: 'conveyor_belt'
            }
        ]
    },
    'privacy': {
        title: 'Privacy Policy',
        subtitle: 'Protecting Your Data Globally',
        image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80',
        description: 'Our commitment to protecting your privacy and managing your data securely.',
        keywords: 'privacy policy, data protection, gdpr compliance',
        sections: [
            {
                title: 'Data Collection',
                content: 'We collect only the information necessary to provide our services, such as your contact details, shipping address, and order history. We never sell your data to third parties.',
                icon: 'folder_shared'
            },
            {
                title: 'Your Rights',
                content: 'You have the right to access, correct, or delete your personal data at any time. We are committed to GDPR compliance and similar data protection standards across Africa.',
                icon: 'gpp_maybe'
            },
            {
                title: 'Security Measures',
                content: 'We use advanced security protocols to protect your information from unauthorized access, ensuring your shopping experience remains private and secure.',
                icon: 'shield'
            }
        ]
    },
    'terms': {
        title: 'Terms of Use',
        subtitle: 'Rules for Our Community',
        image_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&auto=format&fit=crop&q=80',
        description: 'The agreement between you and JuaExpress regarding the use of our platform.',
        keywords: 'terms of service, user agreement, legal terms',
        sections: [
            {
                title: 'User Conduct',
                content: 'By using JuaExpress, you agree to act in good faith, providing accurate information and respecting other members of our multi-vendor community.',
                icon: 'groups'
            },
            {
                title: 'Account Security',
                content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.',
                icon: 'vpn_key'
            },
            {
                title: 'Intellectual Property',
                content: 'All content on the platform, including logos, text, and graphics, is the property of JuaExpress or its content suppliers and is protected by international copyright laws.',
                icon: 'copyright'
            }
        ]
    },
    'contact': {
        title: 'Contact JuaExpress',
        subtitle: 'We\'re Always Listening',
        image_url: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=1200&auto=format&fit=crop&q=80',
        description: 'Connect with JuaExpress through our dedicated support, business, and media channels.',
        keywords: 'contact juaexpress, customer support, business inquiry, juaexpress address',
        sections: [
            {
                title: '24/7 Customer Support',
                content: 'For questions about orders, shipping, or returns, our team is available around the clock.\nEmail: juaexpress01@gmail.com\nLive Chat: Available in the JuaExpress App and on the website.',
                icon: 'support_agent'
            },
            {
                title: 'Business & Vendor Partnerships',
                content: 'Interested in selling on JuaExpress or exploring corporate partnerships?\nEmail: juaexpress01@gmail.com\nSeller Portal: seller.juaexpress.com',
                icon: 'handshake'
            },
            {
                title: 'Global Offices',
                content: 'Nairobi HQ: Avenue 5, Rose Avenue, Nairobi, Kenya\nLondon Office: 124 City Road, London, United Kingdom, EC1V 2NX\nLagos Hub: 15B Adeola Hopewell St, Victoria Island, Lagos, Nigeria',
                icon: 'business'
            },
            {
                title: 'Media & Legal',
                content: 'Press Inquiries: juaexpress01@gmail.com\nLegal Department: juaexpress01@gmail.com',
                icon: 'gavel'
            }
        ]
    },
    'company-details': {
        title: 'Company Information',
        subtitle: 'The JuaExpress Global Infrastructure',
        image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
        description: 'Official corporate, registration, and regulatory information for JuaExpress Group Operations.',
        keywords: 'company registration, juaexpress headquarters, VAT number, corporate governance',
        sections: [
            {
                title: 'Corporate Identity',
                content: 'JuaExpress is the primary trading name of JuaExpress Group Holdings, a multi-national technology and logistics consortium dedicated to cross-border commerce.',
                icon: 'account_balance'
            },
            {
                title: 'Regional Registrations',
                content: 'Kenya: JuaExpress Kenya Ltd (Reg: CPR/2022/123456)\nUK: JuaExpress Europe Ltd (Company No: 12345678)\nNigeria: JuaExpress West Africa Ltd (RC: 9876543)',
                icon: 'domain'
            },
            {
                title: 'Regulatory Compliance',
                content: 'We operate under the regulatory frameworks of the Communications Authority of Kenya (CA), the UK Financial Conduct Authority (FCA) for payment processing, and relevant regional trade bodies across the African Union.',
                icon: 'fact_check'
            },
            {
                title: 'Tax & VAT',
                content: 'Kenya PIN: P051234567A\nUK VAT: GB 123 4567 89\nEU VAT: EU 372 000 123',
                icon: 'receipt_long'
            }
        ]
    },
    'careers': {
        title: 'Careers',
        subtitle: 'Join Our Growing Team',
        image_url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&auto=format&fit=crop&q=80',
        description: 'Explore career opportunities at JuaExpress and help us build the future of commerce.',
        keywords: 'jobs at juaexpress, ecommerce careers, tech jobs africa',
        sections: [
            {
                title: 'Our Culture',
                content: 'We value innovation, diversity, and a passion for solving complex problems. Join a team that\'s making a real impact on how people shop and sell across continents.',
                icon: 'diversity_3'
            },
            {
                title: 'Open Positions',
                content: 'We are always looking for talented engineers, logistics experts, and customer success specialists. Check our LinkedIn page for current openings.',
                icon: 'work_outline'
            }
        ]
    },
    'press': {
        title: 'Press & Media',
        subtitle: 'JuaExpress in the News',
        image_url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80',
        description: 'Latest news, press releases, and media resources from JuaExpress.',
        keywords: 'press releases, media kit, juaexpress news',
        sections: [
            {
                title: 'Media Kit',
                content: 'Download our official brand assets, including logos, high-resolution photos, and executive bios for media use.',
                icon: 'auto_stories'
            },
            {
                title: 'Media Contact',
                content: 'For press inquiries, please reach out to our communications team at juaexpress01@gmail.com.',
                icon: 'mail'
            }
        ]
    },
    'sustainability': {
        title: 'Sustainability at JuaExpress',
        subtitle: 'Building a Greener Future',
        image_url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200&auto=format&fit=crop&q=80',
        description: 'Our commitment to environmental responsibility and sustainable commerce.',
        keywords: 'green ecommerce, sustainability africa, eco-friendly shipping',
        sections: [
            {
                title: 'Eco-Friendly Packaging',
                content: 'We are working with our vendors to reduce plastic waste and transition to 100% recyclable or biodegradable packaging materials.',
                icon: 'eco'
            },
            {
                title: 'Carbon Neutral Goals',
                content: 'JuaExpress is investing in carbon offset programs and optimizing our logistics networks to reduce the environmental impact of cross-continental shipping.',
                icon: 'forest'
            }
        ]
    },
    'corporate-responsibility': {
        title: 'Corporate Responsibility',
        subtitle: 'Empowering Communities',
        image_url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&auto=format&fit=crop&q=80',
        description: 'How JuaExpress gives back and supports ethical trade.',
        keywords: 'corporate social responsibility, ethical trade, community support',
        sections: [
            {
                title: 'Ethical Sourcing',
                content: 'We support vendors who prioritize fair wages and safe working conditions. Our platform provides visibility into the origins of products to promote transparency.',
                icon: 'handshake'
            },
            {
                title: 'Small Business Support',
                content: 'Our "Growing Together" initiative provides training and financial tools to help small-scale African artisans reach global markets.',
                icon: 'storefront'
            }
        ]
    },
    'intellectual-property': {
        title: 'Intellectual Property Policy',
        subtitle: 'The JuaExpress Global IP Standard',
        image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=80',
        description: 'JuaExpress is committed to protecting the creative and commercial rights of brands and creators across the European and African continents.',
        keywords: 'intellectual property, IP protection, brand safety, anti-counterfeit, ARIPO, EUIPO',
        sections: [
            {
                title: 'Global Brand Protection',
                content: 'We provide a world-class environment for intellectual property owners. JuaExpress utilizes advanced recognition technologies to identify and prevent the listing of infringing products before they reach our marketplace.',
                icon: 'shield_lock'
            },
            {
                title: 'Strict Anti-Counterfeit Policy',
                content: 'Counterfeiting undermines the trust of our cross-border bridge. We enforce a zero-tolerance policy against unauthorized replicas. Any vendor found in violation is subject to immediate removal, funds freezing, and legal referral to relevant continental authorities.',
                icon: 'verified'
            },
            {
                title: 'Reporting Infringement (DMCA & Beyond)',
                content: 'If you represent a brand or hold a copyright/trademark, our simplified Notice and Action (N&A) portal allows you to submit takedown requests. We aim to process all valid IP claims within 24 hours.',
                icon: 'gavel'
            },
            {
                title: 'Creator & Artisan Support',
                content: 'Specifically for our African partners, we provide guidance on how to register and protect traditional knowledge and local crafts within the digital trade ecosystem, ensuring small businesses retain their unique value.',
                icon: 'lightbulb'
            }
        ]
    },
    'report-suspicious': {
        title: 'Report Suspicious Activity',
        subtitle: 'Help Us Protect the marketplace',
        image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80',
        description: 'JuaExpress maintains a comprehensive reporting system for fraud, phishing, and security threats.',
        keywords: 'report scam, online safety africa, security alert, report phishing juaexpress',
        sections: [
            {
                title: 'Security Alert Triage',
                content: 'If you encounter any suspected fraudulent listings, unusual requests for off-platform payment, or phishing attempts, please use our prioritized reporting portal. Our security agents operate in shifts to ensure 24-hour response times.',
                icon: 'emergency'
            },
            {
                title: 'Our Protection Pledge',
                content: 'JuaExpress will NEVER ask for your password, bank PIN, or two-factor authentication code via email or text. Any such request is a phishing attempt and should be reported immediately.',
                icon: 'verified_user'
            },
            {
                title: 'Safe Communication',
                content: 'To stay protected by JuaExpress Purchase Protection, always keep your conversations and payments within our secure platform. Reports of off-platform activity help us identify and ban malicious actors permanently.',
                icon: 'chat'
            }
        ]
    },
    'minimum-order': {
        title: 'Minimum Order Value',
        subtitle: 'Understanding Order Minimums',
        image_url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&auto=format&fit=crop&q=80',
        description: 'Details on why some vendors or shipping routes have a minimum order value.',
        keywords: 'minimum order, shipping thresholds, vendor requirements',
        sections: [
            {
                title: 'Vendor Settings',
                content: 'Individual vendors may set a minimum order value to ensure sustainable shipping and handling for their specific product types.',
                icon: 'shopping_bag'
            },
            {
                title: 'Free Shipping Thresholds',
                content: 'While we strive to offer free shipping, some cross-continental routes may require a minimum purchase amount to qualify for zero-cost delivery.',
                icon: 'info'
            }
        ]
    },
    'support-center': {
        title: 'Support Center',
        subtitle: 'Expert Help When You Need It',
        image_url: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&auto=format&fit=crop&q=80',
        description: 'The central hub for JuaExpress help, featuring FAQs, guides, and direct support access.',
        keywords: 'help center, juaexpress support, customer guide Africa, ecommerce help',
        sections: [
            {
                title: 'Comprehensive Knowledge Base',
                content: 'Access hundreds of articles covering topics from "Setting up your Buyer Account" to "Optimizing international shipping for Vendors". Our documentation is updated daily.',
                icon: 'auto_stories'
            },
            {
                title: 'Interactive Tutorials',
                content: 'Watch video walkthroughs of our most advanced features, including the JuaExpress Purchase Protection flow and how to use our AI listing assistant.',
                icon: 'play_circle'
            },
            {
                title: 'Multilingual Support',
                content: 'Get help in the language you are most comfortable with. Our support documentation and live agents are available in English, French, Kiswahili, and Portuguese.',
                icon: 'translate'
            },
            {
                title: 'Community Forum',
                content: 'Join our growing community of sellers and buyers to share experiences, tips, and best practices for cross-continental trade.',
                icon: 'forum'
            }
        ]
    },
    'safety-centre': {
        title: 'Safety Centre',
        subtitle: 'Your Guide to Secure Shopping',
        image_url: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1200&auto=format&fit=crop&q=80',
        description: 'Learn how to protect yourself and your data while shopping online.',
        keywords: 'online safety, secure payments, phising protection',
        sections: [
            {
                title: 'Phishing Awareness',
                content: 'Learn how to identify and avoid suspicious emails or messages claiming to be from JuaExpress.',
                icon: 'security'
            },
            {
                title: 'Safe Payment Practices',
                content: 'Always complete your transactions within the JuaExpress platform to stay protected by our guarantee.',
                icon: 'credit_card'
            }
        ]
    },
    'sitemap': {
        title: 'Sitemap',
        subtitle: 'The JuaExpress Platform Architecture',
        image_url: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1200&auto=format&fit=crop&q=80',
        description: 'A comprehensive structural overview of the JuaExpress ecosystem, from buyer services to vendor infrastructure.',
        keywords: 'sitemap, platform structure, navigation hub',
        sections: [
            {
                title: 'Customer Experience',
                content: 'Shop by Category, JuaExpress Flash Deals, Best Selling, Purchase Protection, and our Support Center.',
                icon: 'shopping_cart'
            },
            {
                title: 'Vendor & Partner Network',
                content: 'Seller Onboarding, Affiliate Portal, Driver Hub, Logistics Sorting Centers, and Global Distribution Tracking.',
                icon: 'hub'
            },
            {
                title: 'Corporate & Transparency',
                content: 'About JuaExpress, Careers, Sustainability reports, Press Kit, and Investor Relations.',
                icon: 'corporate_fare'
            },
            {
                title: 'Legal & Security',
                content: 'Privacy Policy, Terms of Use, IP Policy, Safety Centre, and our Suspicious Activity reporting tool.',
                icon: 'security'
            }
        ]
    }
};
