import { Category, Product, SubCategory, SidebarCategory } from './types';

// Helper to generate generic products
const generateProducts = (category: string, count: number): Product[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${category}-${i}`,
    title: `${category} Item ${i + 1} with a very long descriptive title that truncates`,
    price: parseFloat((Math.random() * 20 + 2).toFixed(2)),
    originalPrice: parseFloat((Math.random() * 40 + 5).toFixed(2)),
    imageUrl: `https://picsum.photos/seed/${category}${i}/300/400`,
    rating: 4 + Math.random(),
    soldCount: Math.floor(Math.random() * 10000),
    isNew: Math.random() > 0.8,
    isBestSeller: Math.random() > 0.9,
    isStarSeller: Math.random() > 0.8,
    discountPercentage: Math.floor(Math.random() * 50) + 10,
    shippingInfo: Math.random() > 0.5 ? "3 BUSINESS DAYS to UK" : undefined,
    video: Math.random() > 0.7,
  }));
};

export const TV_PRODUCTS: Product[] = [
    {
        id: 'tv-1',
        title: 'Hisense Smart TV 40 Inch QLED FHD 1080p Quantum Dot Colour...',
        price: 168.57,
        originalPrice: 209.00,
        imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80',
        rating: 4.8,
        reviewCount: 46,
        soldCount: 222,
        badges: ['DEAL', 'Local'],
        features: ['40"', 'QLED', '2x HDMI', 'SMART'],
        brandName: 'Hisense',
        bestSellingText: 'Best-Selling Item in Home Ent...',
        deliveryText: 'Arrives in 2+ BUSINESS DAYS',
    },
    {
        id: 'tv-2',
        title: '25 inch Full HD Smart TV powered by Tizen OS...',
        price: 99.29,
        originalPrice: 109.00,
        imageUrl: 'https://images.unsplash.com/photo-1552975084-6e027cd345c2?auto=format&fit=crop&w=600&q=80',
        rating: 4.9,
        reviewCount: 39,
        soldCount: 139,
        badges: ['Local'],
        isStarSeller: true,
        brandName: 'TEEVIEW',
        features: ['25"', 'FHD', 'Tizen OS'],
        deliveryText: 'Arrives in 1+ BUSINESS DAYS',
    },
    {
        id: 'tv-3',
        title: 'Samsung 2025 QLED 4K Smart TV',
        price: 349.00,
        imageUrl: 'https://images.unsplash.com/photo-1601944179066-29786cb9d32a?auto=format&fit=crop&w=600&q=80',
        rating: 4.5,
        reviewCount: 12,
        soldCount: 56,
        features: ['2025 QLED'],
        deliveryText: 'Free shipping',
    },
    {
        id: 'tv-4',
        title: 'Hisense 32 Inch Smart TV',
        price: 139.00,
        originalPrice: 159.00,
        imageUrl: 'https://images.unsplash.com/photo-1593784991095-a20506948430?auto=format&fit=crop&w=600&q=80',
        rating: 4.7,
        reviewCount: 128,
        soldCount: 890,
        cartOverlay: true,
        deliveryText: 'Arrives tomorrow',
    }
];

const womenSubCategories: SubCategory[] = [
  { id: 'all', name: 'All', imageUrl: 'https://picsum.photos/seed/womenall/100/100' },
  { id: 'clothing', name: 'Clothing', imageUrl: 'https://picsum.photos/seed/womenclothing/100/100' },
  { id: 'jewellery', name: 'Jewellery & Accessories', imageUrl: 'https://picsum.photos/seed/jewellery/100/100' },
  { id: 'underwear', name: 'Underwear & Sleepwear', imageUrl: 'https://picsum.photos/seed/underwear/100/100' },
  { id: 'curve', name: 'Curve', imageUrl: 'https://picsum.photos/seed/curve/100/100' },
  { id: 'shoes', name: 'Shoes', imageUrl: 'https://picsum.photos/seed/shoes/100/100' },
];

export const CATEGORIES: Category[] = [
  {
    id: 'all',
    name: 'All',
    products: generateProducts('General', 20),
  },
  {
    id: 'women',
    name: 'Women',
    subCategories: womenSubCategories,
    products: [
        {
            id: 'w1',
            title: 'Cozy Hooded Sweater Soft Durable Casual',
            price: 12.95,
            originalPrice: 20.73,
            imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            rating: 4.8,
            soldCount: 428,
            shippingInfo: '3 BUSINESS DAYS to UK',
            video: true,
            discountPercentage: 37,
        },
        {
            id: 'w2',
            title: "Winter Women's Warm Fleece Pyjamas Set Bear Embroidery",
            price: 9.88,
            originalPrice: 32.79,
            imageUrl: 'https://images.unsplash.com/photo-1620799140408-ed5341cd2431?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            rating: 4.7,
            soldCount: 7800,
            isStarSeller: true,
            shippingInfo: '3 BUSINESS DAYS to UK',
            discountPercentage: 69,
        },
        ...generateProducts('Women', 10)
    ],
  },
  {
    id: 'men',
    name: 'Men',
    subCategories: [
        { id: 'm-all', name: 'All', imageUrl: 'https://picsum.photos/seed/menall/100/100' },
        { id: 'm-tops', name: 'Tops', imageUrl: 'https://picsum.photos/seed/mentops/100/100' },
        { id: 'm-bottoms', name: 'Bottoms', imageUrl: 'https://picsum.photos/seed/menbottoms/100/100' },
    ],
    products: generateProducts('Men', 12),
  },
  {
    id: 'sports',
    name: 'Sports',
    subCategories: [
         { id: 's-all', name: 'All', imageUrl: 'https://picsum.photos/seed/sportsall/100/100' },
         { id: 's-gym', name: 'Gym', imageUrl: 'https://picsum.photos/seed/gym/100/100' },
    ],
    products: generateProducts('Sports', 12),
  },
  {
    id: 'jewellery',
    name: 'Jewellery',
    products: generateProducts('Jewellery', 12),
  },
  {
    id: 'kids',
    name: 'Kids',
    products: generateProducts('Kids', 12),
  },
  {
    id: 'industry',
    name: 'Industry',
    products: generateProducts('Industry', 12),
  }
];

export const SIDEBAR_DATA: SidebarCategory[] = [
    {
        id: 'featured',
        name: 'Featured',
        items: [
            { name: 'Bedding', imageUrl: 'https://images.unsplash.com/photo-1522771753018-be16d7ac4433?auto=format&fit=crop&w=150&q=80' },
            { name: 'Seasonal Decor', imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=150&q=80' },
            { name: 'Home Decor Products', imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=150&q=80' },
            { name: "Women's Dresses", imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=150&q=80' },
            { name: "Women's Jewellery", imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=150&q=80' },
            { name: "Women's Coats & Jackets", imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=150&q=80' },
            { name: "Women's Jumpers", imageUrl: 'https://images.unsplash.com/photo-1620799140408-ed5341cd2431?auto=format&fit=crop&w=150&q=80' },
            { name: "Women's T-Shirts", imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=150&q=80' },
            { name: "Cases, Holsters & Sleeves", imageUrl: 'https://images.unsplash.com/photo-1586953229671-e806210f3c4e?auto=format&fit=crop&w=150&q=80', isHot: true },
            { name: "Men's Activewear", imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=150&q=80', isHot: true },
            { name: "Men's Jackets & Coats", imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=150&q=80', isHot: true },
            { name: "Mobile Phones", imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=150&q=80' },
            { name: "Women's Two Piece Sets", imageUrl: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=150&q=80' },
            { name: "Kitchen Utensils & Supplies", imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&w=150&q=80' },
            { name: "Headphones, Earbuds & Accessories", imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=150&q=80', isHot: true },
        ]
    },
    {
        id: 'home_kitchen',
        name: 'Home & Kitchen',
        items: [
             { name: 'Bedding', imageUrl: 'https://images.unsplash.com/photo-1522771753018-be16d7ac4433?auto=format&fit=crop&w=150&q=80' },
             { name: 'Kitchen', imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&w=150&q=80' },
             { name: 'Decor', imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=150&q=80' },
        ]
    },
    {
        id: 'women_clothing',
        name: "Women's Clothing",
        items: [
            { name: "Dresses", imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=150&q=80' },
            { name: "Tops", imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=150&q=80' },
        ]
    },
    { id: 'women_curve', name: "Women's Curve Clothing", items: [] },
    { id: 'women_shoes', name: "Women's Shoes", items: [] },
    { id: 'women_lingerie', name: "Women's Lingerie & Lounge", items: [] },
    { id: 'men_clothing', name: "Men's Clothing", items: [] },
    { id: 'men_shoes', name: "Men's Shoes", items: [] },
    { id: 'men_big_tall', name: "Men's Big & Tall", items: [] },
    { id: 'men_underwear', name: "Men's Underwear & Sleepwear", items: [] },
    { id: 'sports_outdoors', name: "Sports & Outdoors", items: [] },
    { id: 'jewellery', name: "Jewellery & Accessories", items: [] },
];

export const RECENT_SEARCHES = [
    { id: '1', text: 'tv', imageUrl: 'https://images.unsplash.com/photo-1593784991095-a20506948430?auto=format&fit=crop&w=50&q=80' },
    { id: '2', text: 'smartphone', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=50&q=80' },
];

export const POPULAR_SEARCHES = [
    { id: '1', text: 'pillows for sleeping', imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e6?auto=format&fit=crop&w=50&q=80' },
    { id: '2', text: 'pillows', imageUrl: 'https://images.unsplash.com/photo-1579656381226-5fc7085532bc?auto=format&fit=crop&w=50&q=80' },
    { id: '3', text: 'winter gloves men', imageUrl: 'https://images.unsplash.com/photo-1578351502447-0e6e73361421?auto=format&fit=crop&w=50&q=80' },
    { id: '4', text: 'gloves for men', imageUrl: 'https://images.unsplash.com/photo-1608249033480-1a108781613d?auto=format&fit=crop&w=50&q=80' },
    { id: '5', text: 'men clothing on sale', imageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=50&q=80' },
    { id: '6', text: 'bedroom ideas', imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=50&q=80' },
    { id: '7', text: 'mens hoodie', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=50&q=80' },
];

export const FILTER_SECTIONS = [
    {
        id: 'category',
        name: 'Category',
        type: 'chips',
        options: ['Home Entertainment', 'Office Electronics', 'Smart Lighting', 'Audio & Radio', 'Closet & Laundry Storage', 'RV Furniture']
    },
    {
        id: 'colour',
        name: 'Colour',
        type: 'colour',
        options: [
            { name: 'Black', code: '#000000' },
            { name: 'White', code: '#FFFFFF' },
            { name: 'Grey', code: '#808080' },
            { name: 'Brown', code: '#A52A2A' },
            { name: 'Blue', code: '#0000FF' },
            { name: 'Red', code: '#FF0000' },
            { name: 'Pink', code: '#FFC0CB' },
        ]
    },
    { id: 'connectivity', name: 'Connectivity', type: 'chips', options: ['Bluetooth', 'Wi-Fi', 'HDMI', 'USB', 'Aux'] },
    { id: 'power', name: 'Power Mode', type: 'chips', options: ['Battery', 'Plug-in', 'Solar'] },
    { id: 'voltage', name: 'Operating Voltage', type: 'chips', options: ['110V', '220V', 'Dual Voltage'] },
    { id: 'brand', name: 'Brand', type: 'chips', options: ['Samsung', 'Hisense', 'Sony', 'LG'] },
];
