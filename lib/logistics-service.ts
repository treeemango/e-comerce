import {
    CarrierProvider,
    LogisticsAdapter,
    ShippingRate,
    ShippingRateRequest,
    ShipmentRequest,
    ShipmentResponse,
    TrackingUpdate
} from './logistics-types';
import { SendyAdapter } from './logistics-sendy-adapter';

/**
 * Unified Logistics Service to handle multiple carrier adapters.
 */
export class LogisticsService {
    private adapters: Map<CarrierProvider, LogisticsAdapter> = new Map();

    constructor() {
        // Register mandatory adapters
        this.registerSendyAdapter();
        this.registerLocalParcelAdapter();
    }

    public registerAdapter(provider: CarrierProvider, adapter: LogisticsAdapter) {
        this.adapters.set(provider, adapter);
    }

    private registerSendyAdapter() {
        // Use environment variables for Sendy credentials
        const apiKey = import.meta.env.VITE_SENDY_API_KEY;
        const apiUsername = import.meta.env.VITE_SENDY_API_USERNAME;

        if (apiKey && apiUsername) {
            console.log('[Logistics] Registering real Sendy adapter');
            this.registerAdapter('sendy', new SendyAdapter(apiKey, apiUsername, true));
        } else {
            console.warn('[Logistics] Sendy credentials missing. Sendy rates will be unavailable.');
        }
    }

    private registerLocalParcelAdapter() {
        const localParcelAdapter: LogisticsAdapter = {
            getRates: async (req) => {
                return [
                    {
                        carrier_id: 'local_parcel',
                        carrier_name: 'Local Parcel (G4S, EasyCoach, etc)',
                        service_name: 'Station to Station / Doorstep',
                        service_code: 'LOCAL_PARCEL',
                        rate_amount: 0, // Fee communicated later
                        currency: 'KES',
                        estimated_delivery_days: 2
                    }
                ];
            },
            createShipment: async (req) => {
                return {
                    shipment_id: `PARCEL-${req.order_id}`,
                    tracking_number: 'PENDING_WAYBILL',
                    carrier_name: 'Local Parcel',
                    status: 'awaiting_seller_input'
                };
            },
            getTracking: async (num) => {
                return [
                    {
                        tracking_number: num,
                        status_code: 'AWAIT_SELLER',
                        status_description: 'Seller will provide waybill soon',
                        timestamp: new Date().toISOString(),
                        is_delivered: false
                    }
                ];
            }
        };
        this.registerAdapter('local_parcel', localParcelAdapter);
        // Also register as 'mock' for legacy/system fallback consistency
        this.registerAdapter('mock', localParcelAdapter);
    }

    public getAdapter(provider: CarrierProvider): LogisticsAdapter {
        const adapter = this.adapters.get(provider);
        if (!adapter) {
            // Fallback to local_parcel if requested provider is missing
            return this.adapters.get('local_parcel')!;
        }
        return adapter;
    }

    /**
     * Get all available rates from all registered adapters
     */
    public async getAllRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
        // Use a Set to ensure we only call each unique adapter once
        const uniqueAdapters = new Set(this.adapters.values());
        const ratePromises = Array.from(uniqueAdapters).map(adapter =>
            adapter.getRates(request).catch(err => {
                console.error('[Logistics] Error fetching rates from adapter:', err);
                return [];
            })
        );

        const rateResults = await Promise.all(ratePromises);
        const flatRates = rateResults.flat();

        // Final de-duplication by unique carrier + service
        const uniqueRatesMap = new Map();
        flatRates.forEach(rate => {
            const key = `${rate.carrier_id}-${rate.service_code}`;
            if (!uniqueRatesMap.has(key)) {
                uniqueRatesMap.set(key, rate);
            }
        });

        return Array.from(uniqueRatesMap.values());
    }

    /**
     * Singleton instance
     */
    private static instance: LogisticsService;
    public static getInstance(): LogisticsService {
        if (!LogisticsService.instance) {
            LogisticsService.instance = new LogisticsService();
        }
        return LogisticsService.instance;
    }
}

export const logistics = LogisticsService.getInstance();
