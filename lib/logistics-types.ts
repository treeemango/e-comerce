import { Product } from '@/types';

export type CarrierProvider = 'dhl' | 'sendy' | 'terminal_africa' | 'shipengine' | 'mock' | 'local_parcel';

export interface Address {
    name: string;
    phone: string;
    email?: string;
    street_address: string;
    city: string;
    state?: string;
    country_code: string; // ISO 2-letter
    postal_code?: string;
    latitude?: number;
    longitude?: number;
}

export interface Parcel {
    weight: number; // in kg
    length: number; // in cm
    width: number; // in cm
    height: number; // in cm
    description?: string;
}

export interface ShippingRateRequest {
    origin: Address;
    destination: Address;
    parcels: Parcel[];
    currency?: string;
}

export interface ShippingRate {
    carrier_id: string;
    carrier_name: string;
    service_name: string;
    service_code: string;
    rate_amount: number;
    currency: string;
    estimated_delivery_days: number;
    estimated_delivery_date?: string;
}

export interface ShipmentRequest extends ShippingRateRequest {
    order_id: string;
    service_code: string;
    carrier_id: string;
    metadata?: any;
}

export interface ShipmentResponse {
    shipment_id: string;
    tracking_number: string;
    carrier_name: string;
    status: string;
    label_url?: string;
    estimated_delivery?: string;
    raw_response?: any;
}

export interface TrackingUpdate {
    tracking_number: string;
    status_code: string;
    status_description: string;
    location_name?: string;
    timestamp: string;
    is_delivered: boolean;
}

export interface LogisticsAdapter {
    getRates(request: ShippingRateRequest): Promise<ShippingRate[]>;
    createShipment(request: ShipmentRequest): Promise<ShipmentResponse>;
    getTracking(trackingNumber: string): Promise<TrackingUpdate[]>;
    cancelShipment?(shipmentId: string): Promise<boolean>;
}
