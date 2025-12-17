export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  rating: number; // 0-5
  reviewCount?: number;
  soldCount: number;
  isNew?: boolean;
  isBestSeller?: boolean; // Generic best seller tag
  isStarSeller?: boolean;
  discountPercentage?: number;
  shippingInfo?: string;
  video?: boolean;
  // New fields for search results
  badges?: string[]; // e.g. ["DEAL", "Local"]
  brandName?: string;
  deliveryText?: string;
  bestSellingText?: string; // e.g. "Best-Selling Item in Home Ent..."
  cartOverlay?: boolean; // To show the green cart overlay
  features?: string[]; // e.g. ["40\"", "QLED"]
}

export interface SubCategory {
  id: string;
  name: string;
  imageUrl: string;
}

export interface Category {
  id: string;
  name: string;
  subCategories?: SubCategory[];
  products: Product[];
}

export interface CategoryPageItem {
  name: string;
  imageUrl: string;
  isHot?: boolean;
}

export interface SidebarCategory {
  id: string;
  name: string;
  items: CategoryPageItem[];
}
