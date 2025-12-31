import {
    LogisticsAdapter,
    ShippingRate,
    ShippingRateRequest,
    ShipmentRequest,
    ShipmentResponse,
    TrackingUpdate
} from './logistics-types';

/**
 * Adapter for Sendy API (East Africa Logistics).
 * Documentation: https://api.sendy.co/
 */
export class SendyAdapter implements LogisticsAdapter {
    private apiKey: string;
    private apiUsername: string; // userId in Sendy
    private isSandbox: boolean;

    constructor(apiKey: string, apiUsername: string, isSandbox: boolean = true) {
        this.apiKey = apiKey;
        this.apiUsername = apiUsername;
        this.isSandbox = isSandbox;
    }

    private get baseUrl() {
        return this.isSandbox ? 'https://sandbox.sendyit.com/v1' : 'https://api.sendy.co/v1';
    }

    /**
     * Fetch real-time delivery rates from Sendy
     */
    async getRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
        console.log('[Sendy] Fetching rates for destination:', request.destination.city);

        // Sendy /quote requires coordinates. 
        // If mission, we can't get a real rate from Sendy.
        if (!request.origin.latitude || !request.destination.latitude) {
            console.warn('[Sendy] Missing coordinates for rate request. Skipping Sendy.');
            return [];
        }

        try {
            const body = {
                command: 'price_request',
                data: {
                    api_key: this.apiKey,
                    api_username: this.apiUsername,
                    from_lat: request.origin.latitude,
                    from_long: request.origin.longitude,
                    to_lat: request.destination.latitude,
                    to_long: request.destination.longitude,
                    vendor_type: 1, // 1 = Motorcycle, 2 = Pickup, etc.
                    distance: true
                }
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.status && result.data) {
                return [
                    {
                        carrier_id: 'sendy',
                        carrier_name: 'Sendy',
                        service_name: 'Motorcycle Delivery',
                        service_code: 'BODA',
                        rate_amount: parseFloat(result.data.amount),
                        currency: 'KES',
                        estimated_delivery_days: 0.5
                    }
                ];
            }

            console.error('[Sendy] Quote error:', result.message || 'Unknown error');
            return [];
        } catch (err) {
            console.error('[Sendy] Network error fetching rates:', err);
            return [];
        }
    }

    /**
     * Create a delivery request/shipment in Sendy
     */
    async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
        console.log('[Sendy] Creating shipment for Order:', request.order_id);

        try {
            const body = {
                command: 'request_delivery',
                data: {
                    api_key: this.apiKey,
                    api_username: this.apiUsername,
                    from_name: request.origin.name,
                    from_lat: request.origin.latitude,
                    from_long: request.origin.longitude,
                    from_description: request.origin.street_address,
                    from_phone: request.origin.phone,
                    to_name: request.destination.name,
                    to_lat: request.destination.latitude,
                    to_long: request.destination.longitude,
                    to_description: request.destination.street_address,
                    to_phone: request.destination.phone,
                    vendor_type: 1,
                    order_id: request.order_id
                }
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.status && result.data) {
                return {
                    shipment_id: result.data.order_no,
                    tracking_number: result.data.order_no,
                    carrier_name: 'Sendy',
                    status: 'pending_pickup',
                    raw_response: result.data
                };
            }

            throw new Error(result.message || 'Failed to create Sendy shipment');
        } catch (err) {
            console.error('[Sendy] Shipment creation error:', err);
            throw err;
        }
    }

    /**
     * Track an active order
     */
    async getTracking(trackingNumber: string): Promise<TrackingUpdate[]> {
        console.log('[Sendy] Fetching tracking for:', trackingNumber);

        try {
            const body = {
                command: 'track_order',
                data: {
                    api_key: this.apiKey,
                    api_username: this.apiUsername,
                    order_no: trackingNumber
                }
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.status && result.data) {
                return [
                    {
                        tracking_number: trackingNumber,
                        status_code: result.data.status,
                        status_description: result.data.status_description || `Order ${result.data.status}`,
                        timestamp: new Date().toISOString(),
                        is_delivered: result.data.status === 'DELIVERED'
                    }
                ];
            }

            return [];
        } catch (err) {
            console.error('[Sendy] Tracking error:', err);
            return [];
        }
    }
}
